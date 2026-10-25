const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const chips = document.getElementById("chips");
const subjectInput = document.getElementById("subject-input");
const subjectForm = document.getElementById("subject-form");
const subjectMessage = document.getElementById("subject-message");
const focusDuration = document.getElementById("focus-duration");
const customDurationWrap = document.getElementById("custom-duration-wrap");
const customDurationInput = document.getElementById("custom-duration");
const focusValidation = document.getElementById("focus-validation");
const startSessionButton = document.getElementById("start-session");
const focusState = document.getElementById("focus-state");
const focusCountdown = document.getElementById("focus-countdown");
const C = StudyGuardClassifier;
let customKeywords = [...C.DEFAULT_CUSTOM_KEYWORDS];
let savingKeywords = false;
let sessionEndAt = null;
let modeRequestPending = false;
let keywordLockRendered = false;

function sessionActive() { return Number.isFinite(sessionEndAt) && sessionEndAt > Date.now(); }

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

function renderSession() {
  const active = sessionActive();
  toggle.disabled = active || modeRequestPending;
  focusDuration.disabled = active;
  startSessionButton.disabled = active;
  subjectInput.disabled = active || savingKeywords;
  document.getElementById("add-subject").disabled = active || savingKeywords;
  customDurationInput.disabled = active || focusDuration.value !== "custom";
  if (active) {
    subjectMessage.textContent = "Keywords are locked during your focus session.";
    delete subjectMessage.dataset.error;
    delete subjectMessage.dataset.success;
  } else if (keywordLockRendered) {
    subjectMessage.textContent = "Keywords are matched against video titles.";
    delete subjectMessage.dataset.error;
    delete subjectMessage.dataset.success;
  }
  keywordLockRendered = active;
  focusState.dataset.active = String(active);
  focusCountdown.hidden = !active;
  if (active) {
    focusState.textContent = "Focus session active. Study Mode is locked until it ends.";
    focusCountdown.textContent = formatRemaining(sessionEndAt - Date.now());
  } else {
    focusState.textContent = "No active session.";
    focusCountdown.textContent = "";
  }
}

async function refreshSession() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "STUDYGUARD_SESSION_GET" });
    if (response?.ok) sessionEndAt = response.endAt;
  } catch { /* Popup may be closing; the persisted timestamp remains authoritative. */ }
  renderSession();
}

function renderMode(enabled) {
  toggle.checked = enabled;
  document.getElementById("mode-card").classList.toggle("is-on", enabled);
  document.getElementById("mode-state").textContent = enabled ? "ON" : "OFF";
  document.getElementById("mode-description").textContent = enabled
    ? "Only educational content is allowed." : "YouTube works normally.";
  if (sessionActive()) document.getElementById("mode-description").textContent = "Study Mode is locked until your focus session ends.";
  renderSession();
}

function renderKeywords() {
  chips.replaceChildren();
  customKeywords.forEach(keyword => {
    const chip = document.createElement("span");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = keyword;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${keyword}`);
    remove.disabled = savingKeywords || sessionActive();
    remove.addEventListener("click", () => void updateKeywords(C.removeCustomKeyword(customKeywords, keyword)));
    chip.append(label, remove);
    chips.append(chip);
  });
}

async function updateKeywords(next, clearAfterSave = false) {
  if (sessionActive()) {
    subjectMessage.textContent = "Keywords are locked during your focus session.";
    subjectMessage.dataset.error = "true";
    return;
  }
  if (savingKeywords) return;
  savingKeywords = true;
  subjectInput.disabled = true;
  document.getElementById("add-subject").disabled = true;
  renderKeywords();
  subjectMessage.textContent = "Saving your keywords…";
  delete subjectMessage.dataset.error;
  delete subjectMessage.dataset.success;
  try {
    const response = await chrome.runtime.sendMessage({ type: "STUDYGUARD_KEYWORDS_SET", customStudyKeywords: next });
    if (!response?.ok) {
      if (response.locked) {
        sessionEndAt = response.endAt;
        renderSession();
      }
      throw new Error(response?.error || "Could not save keywords");
    }
    customKeywords = [...next];
    renderKeywords();
    if (clearAfterSave) subjectInput.value = "";
    subjectMessage.textContent = response.skippedTabs
      ? "Saved. Some open YouTube tabs need a reload to apply the change."
      : "Saved. Changes are applied to open YouTube tabs.";
    subjectMessage.dataset.success = "true";
  } catch (error) {
    subjectMessage.textContent = sessionActive()
      ? "Keywords are locked during your focus session."
      : error.message || "Could not save keywords. Please try again.";
    subjectMessage.dataset.error = "true";
  } finally {
    savingKeywords = false;
    renderSession();
    renderKeywords();
    if (clearAfterSave) subjectInput.focus();
  }
}

function submitSubject(event) {
  event?.preventDefault();
  if (sessionActive()) {
    subjectMessage.textContent = "Keywords are locked during your focus session.";
    subjectMessage.dataset.error = "true";
    return;
  }
  const updated = C.addCustomKeyword(customKeywords, subjectInput.value);
  if (updated.result === "empty") {
    subjectMessage.textContent = "Enter a subject or keyword first.";
    subjectMessage.dataset.error = "true";
    delete subjectMessage.dataset.success;
    subjectInput.focus();
    return;
  }
  if (updated.result === "duplicate") {
    subjectMessage.textContent = "That keyword is already in your list.";
    subjectMessage.dataset.error = "true";
    delete subjectMessage.dataset.success;
    subjectInput.focus();
    return;
  }
  void updateKeywords(updated.keywords, true);
}

chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]).then(value => {
  renderMode(Boolean(value.studyModeEnabled));
  if (Array.isArray(value.customStudyKeywords)) customKeywords = C.setCustomKeywords(value.customStudyKeywords);
  renderKeywords();
  status.textContent = "Settings are stored locally on this device.";
}).catch(() => {
  renderMode(false);
  renderKeywords();
  status.textContent = "Could not read saved settings. Check the extension and try again.";
  status.dataset.error = "true";
});

void refreshSession();
setInterval(() => {
  if (sessionEndAt && sessionEndAt <= Date.now()) void refreshSession();
  else renderSession();
}, 1000);

startSessionButton.addEventListener("click", async () => {
  focusValidation.hidden = true;
  delete focusValidation.dataset.error;
  let durationMinutes;
  if (focusDuration.value === "custom") {
    const rawDuration = customDurationInput.value.trim();
    if (!/^\d+$/.test(rawDuration) || Number(rawDuration) < 1 || Number(rawDuration) > 180) {
      focusValidation.textContent = "Enter a whole number from 1 to 180 minutes.";
      focusValidation.hidden = false;
      focusValidation.dataset.error = "true";
      return;
    }
    durationMinutes = Number(rawDuration);
  } else {
    durationMinutes = Number(focusDuration.value);
    if (![30, 60, 120, 180].includes(durationMinutes)) {
      focusValidation.textContent = "Choose a preset or enter a custom duration.";
      focusValidation.hidden = false;
      focusValidation.dataset.error = "true";
      return;
    }
  }
  startSessionButton.disabled = true;
  focusDuration.disabled = true;
  customDurationInput.disabled = true;
  focusState.textContent = "Starting focus session…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "STUDYGUARD_SESSION_START", durationMinutes });
    if (!response?.ok) throw new Error(response?.error || "Could not start focus session.");
    sessionEndAt = response.endAt;
    renderMode(true);
    status.textContent = response.skippedTabs > 0
      ? "Session started. Some open YouTube tabs need a reload."
      : "Focus session started. Study Mode is locked.";
    if (response.skippedTabs > 0) status.dataset.warning = "true";
  } catch (error) {
    const message = error.message || "Could not start focus session.";
    await refreshSession();
    if (!sessionActive()) {
      focusState.textContent = message;
      focusState.dataset.error = "true";
      focusDuration.disabled = false;
      customDurationInput.disabled = focusDuration.value !== "custom";
      startSessionButton.disabled = false;
    }
  }
  renderSession();
});

toggle.addEventListener("change", async () => {
  const requested = toggle.checked;
  if (sessionActive() && !requested) { renderMode(true); return; }
  modeRequestPending = true;
  toggle.disabled = true;
  status.textContent = "Updating Study Mode across YouTube tabs…";
  delete status.dataset.error;
  delete status.dataset.warning;
  try {
    const response = await chrome.runtime.sendMessage({ type: "STUDYGUARD_SET", enabled: requested });
    if (!response?.ok) {
      if (response.locked) { sessionEndAt = response.endAt; renderMode(true); }
      throw new Error(response?.error || "Could not update setting");
    }
    renderMode(response.enabled);
    status.textContent = response.skippedTabs > 0
      ? `Mode saved. ${response.skippedTabs} tab(s) could not be updated; reload them to apply.`
      : requested ? "Protection is active on your YouTube tabs." : "YouTube restrictions are off.";
    if (response.skippedTabs > 0) status.dataset.warning = "true";
  } catch (error) {
    renderMode(sessionActive() ? true : !requested);
    status.textContent = error.message || "Could not update Study Mode. Please try again.";
    status.dataset.error = "true";
  } finally { modeRequestPending = false; renderSession(); }
});

subjectForm.addEventListener("submit", submitSubject);
focusDuration.addEventListener("change", () => {
  const customSelected = focusDuration.value === "custom";
  customDurationWrap.hidden = !customSelected;
  customDurationInput.disabled = !customSelected || sessionActive();
  focusValidation.hidden = true;
  if (customSelected && !sessionActive()) customDurationInput.focus();
});
customDurationInput.addEventListener("input", () => { focusValidation.hidden = true; });
subjectInput.addEventListener("keydown", event => {
  // Keep typing and Enter local to this popup form.
  event.stopPropagation();
  if (sessionActive()) {
    event.preventDefault();
    subjectMessage.textContent = "Keywords are locked during your focus session.";
    subjectMessage.dataset.error = "true";
    return;
  }
  if (event.key === "Escape") {
    subjectInput.value = "";
    subjectMessage.textContent = "Keywords are matched against video titles.";
    delete subjectMessage.dataset.error;
    delete subjectMessage.dataset.success;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.studyModeEnabled) renderMode(Boolean(changes.studyModeEnabled.newValue));
  if (changes.customStudyKeywords && !savingKeywords) {
    customKeywords = C.setCustomKeywords(changes.customStudyKeywords.newValue);
    renderKeywords();
  }
  if (changes.focusSessionEndAt) {
    sessionEndAt = changes.focusSessionEndAt.newValue;
    void chrome.storage.local.get("studyModeEnabled").then(value => renderMode(Boolean(value.studyModeEnabled)));
  }
});
