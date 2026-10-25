(function () {
  "use strict";
  if (window.__studyGuardController) return;
  const C = window.StudyGuardClassifier;
  if (!C) return;
  window.__studyGuardController = true;

  const ATTR = "data-studyguard-category";
  const CARD_SELECTOR = "ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-playlist-video-renderer, ytd-reel-item-renderer";
  let enabled = false;
  let observer;
  let processTimer;
  let routeTimer;
  let watchGraceTimer;
  let lastUrl = location.href;
  let watchRouteStarted = Date.now();
  let processing = false;
  let classifierRevision = 0;
  const titleCache = new WeakMap();
  const videoListeners = new WeakSet();

  function categoryFor(element, title) {
    const cached = titleCache.get(element);
    if (cached?.title === title && cached.revision === classifierRevision) return cached.category;
    const category = C.classifyTitle(title).category;
    titleCache.set(element, { title, category, revision: classifierRevision });
    return category;
  }

  function titleOf(anchor) {
    const card = anchor.closest(CARD_SELECTOR) || anchor;
    const candidates = [anchor.querySelector("#video-title")?.textContent,
      card.querySelector("#video-title, h3, .yt-core-attributed-string")?.textContent,
      anchor.getAttribute("title"), anchor.getAttribute("aria-label"), anchor.querySelector("img")?.getAttribute("alt")];
    return candidates.find(value => value && value.trim())?.trim() || "";
  }

  function isVideoAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    try {
      const url = new URL(anchor.href, location.href);
      return (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") &&
        ((url.pathname === "/watch" && url.searchParams.has("v")) || url.pathname.startsWith("/shorts/"));
    } catch { return false; }
  }

  function cardOf(anchor) { return anchor.closest(CARD_SELECTOR) || anchor; }

  function makeCardOverlay(thumbnail) {
    if (thumbnail.querySelector(":scope > .sg-card-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "sg-card-overlay";
    overlay.setAttribute("aria-label", "Blocked by StudyGuard. Study Mode is enabled.");
    overlay.setAttribute("role", "note");
    overlay.innerHTML = '<span class="sg-lock" aria-hidden="true">🔒</span><span class="sg-card-title">Blocked by StudyGuard</span><span class="sg-card-copy">Study Mode is enabled</span>';
    thumbnail.append(overlay);
  }

  function processAnchor(anchor, protectPreviews = true) {
    if (!isVideoAnchor(anchor)) return;
    const card = cardOf(anchor);
    const title = titleOf(anchor);
    const category = categoryFor(card, title);
    card.setAttribute(ATTR, category);
    if (category === "study") {
      card.classList.remove("sg-blocked-card");
      card.classList.add("sg-study-card");
      card.querySelectorAll(".sg-blocked-thumbnail").forEach(thumbnail => thumbnail.classList.remove("sg-blocked-thumbnail"));
      card.querySelectorAll(".sg-card-overlay").forEach(overlay => overlay.remove());
      card.querySelectorAll("a[data-studyguard-link]").forEach(link => {
        link.removeAttribute("data-studyguard-link");
      });
    } else {
      card.classList.remove("sg-study-card");
      card.classList.add("sg-blocked-card");
      card.querySelectorAll("a").forEach(link => {
        if (isVideoAnchor(link)) link.setAttribute("data-studyguard-link", "blocked");
      });
      const thumbnail = card.querySelector("a#thumbnail[href*='/watch'], a#thumbnail[href^='/shorts/'], a[href*='/watch?v='], a[href^='/shorts/']") || anchor;
      thumbnail.classList.add("sg-blocked-thumbnail");
      makeCardOverlay(thumbnail);
      if (protectPreviews) guardCardPreviews(card);
    }
  }

  function previewCardFor(video) {
    return video.closest(CARD_SELECTOR);
  }

  function isBlockedCard(card) {
    if (!enabled || !card) return false;
    const anchor = card.querySelector("a[href*='/watch?v='], a[href^='/shorts/']");
    if (anchor) processAnchor(anchor, false);
    return card.hasAttribute(ATTR) && card.getAttribute(ATTR) !== "study";
  }

  function stopBlockedPreview(video) {
    const card = previewCardFor(video);
    if (!isBlockedCard(card)) return;
    pauseVideo(video);
    // Preview media can start before metadata is ready; seeking is best-effort.
    try { if (video.currentTime !== 0) video.currentTime = 0; } catch { /* Not seekable yet. */ }
  }

  function guardCardPreviews(card) {
    card.querySelectorAll("video").forEach(stopBlockedPreview);
  }

  function guardPreviewsInSubtree(node) {
    if (!(node instanceof Element) || node.closest(".sg-card-overlay, .sg-watch-blocker")) return;
    const card = node.matches(CARD_SELECTOR) ? node : node.closest(CARD_SELECTOR);
    if (!card) return;
    const anchor = card.querySelector("a[href*='/watch?v='], a[href^='/shorts/']");
    if (anchor) processAnchor(anchor, false);
    if (node.matches("video")) stopBlockedPreview(node);
    node.querySelectorAll?.("video").forEach(stopBlockedPreview);
  }

  function processShortEntries() {
    document.querySelectorAll("ytd-reel-shelf-renderer, a[href^='/shorts/']").forEach(element => {
      element.classList.add("sg-short-entry");
      element.setAttribute(ATTR, "short");
    });
  }

  function isWatchBlocked() {
    return enabled && document.querySelector("#player[" + ATTR + "]:not([data-studyguard-category='study'])") !== null;
  }

  function pauseVideo(video) {
    if (!video.paused) {
      try { video.pause(); } catch { /* The element may be detaching. */ }
    }
  }

  function attachVideoGuard(video) {
    if (videoListeners.has(video)) return;
    videoListeners.add(video);
    const stopIfBlocked = () => { if (isWatchBlocked()) pauseVideo(video); };
    video.addEventListener("play", stopIfBlocked, true);
    video.addEventListener("playing", stopIfBlocked, true);
  }

  function watchTitle() {
    return document.querySelector("ytd-watch-metadata #title h1, #above-the-fold #title h1, h1.ytd-watch-metadata")?.textContent?.trim() || "";
  }

  function processWatch() {
    if (!location.pathname.startsWith("/watch")) {
      document.querySelectorAll(".sg-watch-blocker").forEach(el => el.remove());
      document.querySelectorAll(`#player[${ATTR}]`).forEach(player => player.removeAttribute(ATTR));
      return;
    }
    const player = document.querySelector("#player, ytd-player #player");
    if (!player) return;
    const title = watchTitle();
    const age = Date.now() - watchRouteStarted;
    if (!title && age < 1800) {
      clearTimeout(watchGraceTimer);
      watchGraceTimer = setTimeout(scheduleProcess, Math.max(50, 1800 - age));
      return;
    }
    const category = categoryFor(player, title);
    player.setAttribute(ATTR, category);
    const videos = player.querySelectorAll("video");
    videos.forEach(attachVideoGuard);
    const blocked = enabled && category !== "study";
    if (!blocked) {
      player.querySelector(":scope > .sg-watch-blocker")?.remove();
      return;
    }
    videos.forEach(pauseVideo);
    if (!player.querySelector(":scope > .sg-watch-blocker")) {
      const blocker = document.createElement("div");
      blocker.className = "sg-watch-blocker";
      blocker.setAttribute("role", "alert");
      blocker.innerHTML = '<span class="sg-watch-lock" aria-hidden="true">🔒</span><strong>Video Blocked by StudyGuard</strong><span>This video is not related to study. Study Mode is enabled.</span>';
      player.append(blocker);
    }
  }

  function process() {
    if (!enabled || processing || !document.documentElement) return;
    processing = true;
    try {
      document.querySelectorAll("a[href*='/watch?v='], a[href^='/shorts/']").forEach(anchor => {
        if (anchor.closest(CARD_SELECTOR)) processAnchor(anchor);
      });
      document.querySelectorAll(`${CARD_SELECTOR} video`).forEach(stopBlockedPreview);
      processShortEntries();
      processWatch();
    } catch (error) { console.warn("StudyGuard could not process part of the page", error); }
    finally { processing = false; }
  }

  function scheduleProcess() {
    clearTimeout(processTimer);
    processTimer = setTimeout(process, 100);
  }

  function restore() {
    document.documentElement.classList.remove("sg-study-mode");
    document.querySelectorAll(`[${ATTR}]`).forEach(element => {
      element.removeAttribute(ATTR);
      element.classList.remove("sg-blocked-card", "sg-study-card", "sg-short-entry");
    });
    document.querySelectorAll("[data-studyguard-link]").forEach(element => element.removeAttribute("data-studyguard-link"));
    document.querySelectorAll(".sg-blocked-thumbnail").forEach(element => element.classList.remove("sg-blocked-thumbnail"));
    document.querySelectorAll(".sg-card-overlay, .sg-watch-blocker").forEach(element => element.remove());
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) {
      document.documentElement.classList.add("sg-study-mode");
      scheduleProcess();
    } else {
      clearTimeout(watchGraceTimer);
      restore();
    }
  }

  function blockedTarget(target) {
    if (!(target instanceof Element)) return null;
    const link = target.closest("a[data-studyguard-link='blocked']");
    if (link) return link;
    return target.closest(`.sg-blocked-card[${ATTR}]:not([${ATTR}='study'])`);
  }

  ["click", "auxclick", "pointerdown", "pointerup", "contextmenu"].forEach(type => {
    document.addEventListener(type, event => {
      if (!enabled || !blockedTarget(event.target)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
  });
  // Capture non-bubbling media events once at document level. YouTube can start
  // previews through delayed/internal hover handlers, so pointer events alone
  // are not a sufficient guard.
  ["play", "playing"].forEach(type => {
    document.addEventListener(type, event => {
      if (event.target instanceof HTMLVideoElement) stopBlockedPreview(event.target);
    }, true);
  });
  document.addEventListener("keydown", event => {
    if (!enabled || !["Enter", " "].includes(event.key) || !blockedTarget(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "STUDYGUARD_SETTINGS") {
      if (Array.isArray(message.customStudyKeywords)) {
        C.setCustomKeywords(message.customStudyKeywords);
        classifierRevision++;
      }
      setEnabled(message.enabled);
    } else if (message?.type === "STUDYGUARD_SET") setEnabled(message.enabled);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.customStudyKeywords) return;
    C.setCustomKeywords(changes.customStudyKeywords.newValue);
    classifierRevision++;
    scheduleProcess();
  });
  chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]).then(value => {
    C.setCustomKeywords(Array.isArray(value.customStudyKeywords) ? value.customStudyKeywords : C.DEFAULT_CUSTOM_KEYWORDS);
    classifierRevision++;
    setEnabled(Boolean(value.studyModeEnabled));
  }).catch(() => setEnabled(false));

  observer = new MutationObserver(records => {
    if (!enabled) return;
    records.forEach(record => {
      record.addedNodes?.forEach(guardPreviewsInSubtree);
    });
    const relevant = records.some(record => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!target || target.closest(".sg-card-overlay, .sg-watch-blocker")) return false;
      if (record.type !== "attributes") return true;
      if (record.attributeName === ATTR) return !target.hasAttribute(ATTR);
      if (record.attributeName === "data-studyguard-link") {
        return target.closest(`.sg-blocked-card[${ATTR}]:not([${ATTR}='study'])`) && !target.hasAttribute("data-studyguard-link");
      }
      if (["href", "title", "aria-label"].includes(record.attributeName)) return true;
      if (record.attributeName === "class" && target.hasAttribute(ATTR)) {
        const category = target.getAttribute(ATTR);
        return category === "short" ? !target.classList.contains("sg-short-entry") :
          category !== "study" ? !target.classList.contains("sg-blocked-card") : target.classList.contains("sg-blocked-card");
      }
      if (record.attributeName === "class" && target.closest(`.sg-blocked-card[${ATTR}]:not([${ATTR}='study'])`) &&
          target.matches("a[href*='/watch?v='], a[href^='/shorts/']")) return !target.classList.contains("sg-blocked-thumbnail");
      return false;
    });
    if (relevant) scheduleProcess();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });

  function checkRoute() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      watchRouteStarted = Date.now();
      const player = document.querySelector("#player");
      if (player) {
        player.removeAttribute(ATTR);
        player.querySelector(":scope > .sg-watch-blocker")?.remove();
        titleCache.delete(player);
      }
      clearTimeout(watchGraceTimer);
      scheduleProcess();
    }
  }
  window.addEventListener("yt-navigate-finish", checkRoute);
  window.addEventListener("popstate", checkRoute);
  routeTimer = setInterval(checkRoute, 800);
  window.addEventListener("pagehide", () => {
    observer?.disconnect(); clearTimeout(processTimer); clearTimeout(watchGraceTimer); clearInterval(routeTimer); restore();
  }, { once: true });
})();
