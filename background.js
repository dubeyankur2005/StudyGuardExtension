// Push saved preferences to open YouTube tabs when the worker wakes.
importScripts("content/classifier.js");
const DEFAULT_ENABLED = false;
const SESSION_KEY = "focusSessionEndAt";
const SESSION_ALARM = "studyguard-focus-session-end";
let operationQueue = Promise.resolve();

function enqueueOperation(operation) {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.catch(() => {});
  return result;
}

async function syncYouTubeTabs(settings) {
  const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://youtube.com/*"] });
  const results = await Promise.allSettled(tabs.map(async tab => {
    if (tab.id == null) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "STUDYGUARD_SETTINGS", ...settings });
    } catch {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content/content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/classifier.js", "content/content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "STUDYGUARD_SETTINGS", ...settings });
    }
  }));
  return results.filter(result => result.status === "rejected").length;
}

async function readSession() {
  const stored = await chrome.storage.local.get(SESSION_KEY);
  const endAt = stored[SESSION_KEY];
  if (!Number.isFinite(endAt) || endAt <= Date.now()) {
    if (endAt !== undefined) await chrome.storage.local.remove(SESSION_KEY);
    await chrome.alarms.clear(SESSION_ALARM);
    return null;
  }
  return endAt;
}

async function getSettings() {
  const stored = await chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]);
  return {
    enabled: Boolean(stored.studyModeEnabled),
    customStudyKeywords: Array.isArray(stored.customStudyKeywords)
      ? stored.customStudyKeywords : StudyGuardClassifier.DEFAULT_CUSTOM_KEYWORDS
  };
}

async function startSession(durationMinutes) {
  const current = await readSession();
  if (current) return { ok: false, error: "A focus session is already active.", endAt: current };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
    return { ok: false, error: "Enter a whole number from 1 to 180 minutes." };
  }
  const endAt = Date.now() + durationMinutes * 60_000;
  await chrome.storage.local.set({ [SESSION_KEY]: endAt, studyModeEnabled: true });
  await chrome.alarms.create(SESSION_ALARM, { when: endAt });
  const settings = await getSettings();
  const skippedTabs = await syncYouTubeTabs(settings);
  return { ok: true, endAt, enabled: true, skippedTabs };
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]);
  if (typeof stored.studyModeEnabled !== "boolean") await chrome.storage.local.set({ studyModeEnabled: DEFAULT_ENABLED });
  if (!Array.isArray(stored.customStudyKeywords)) {
    await chrome.storage.local.set({ customStudyKeywords: StudyGuardClassifier.DEFAULT_CUSTOM_KEYWORDS });
  }
  const endAt = await readSession();
  if (endAt) await chrome.alarms.create(SESSION_ALARM, { when: endAt });
  await syncYouTubeTabs(await getSettings());
});

chrome.runtime.onStartup.addListener(async () => {
  const endAt = await readSession();
  if (endAt) await chrome.alarms.create(SESSION_ALARM, { when: endAt });
  await syncYouTubeTabs(await getSettings());
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== SESSION_ALARM) return;
  // The timestamp, not the alarm delivery time, determines whether the lock ended.
  const endAt = await readSession();
  if (endAt) await chrome.alarms.create(SESSION_ALARM, { when: endAt });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "STUDYGUARD_SESSION_GET") {
    readSession().then(endAt => sendResponse({ ok: true, endAt })).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "STUDYGUARD_SESSION_START") {
    enqueueOperation(() => startSession(message.durationMinutes)).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (!["STUDYGUARD_SET", "STUDYGUARD_KEYWORDS_SET"].includes(message?.type)) return;
  enqueueOperation(async () => {
    if ((message.type === "STUDYGUARD_SET" && !message.enabled) || message.type === "STUDYGUARD_KEYWORDS_SET") {
      const endAt = await readSession();
      if (endAt) return {
        ok: false,
        locked: true,
        endAt,
        error: message.type === "STUDYGUARD_KEYWORDS_SET"
          ? "Keywords are locked during your focus session."
          : "Study Mode is locked until your focus session ends."
      };
    }
    const setting = message.type === "STUDYGUARD_SET"
      ? { studyModeEnabled: Boolean(message.enabled) }
      : { customStudyKeywords: StudyGuardClassifier.setCustomKeywords(message.customStudyKeywords) };
    await chrome.storage.local.set(setting);
    const settings = await getSettings();
    const skippedTabs = await syncYouTubeTabs(settings);
    return { ok: true, enabled: settings.enabled, skippedTabs };
  }).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
