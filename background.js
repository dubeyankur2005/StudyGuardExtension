// Push a saved preference to open YouTube tabs when the service worker wakes.
importScripts("content/classifier.js");
const DEFAULT_ENABLED = false;

async function syncYouTubeTabs(settings) {
  const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://youtube.com/*"] });
  const results = await Promise.allSettled(tabs.map(async tab => {
    if (tab.id == null) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "STUDYGUARD_SETTINGS", ...settings });
    } catch {
      // Existing YouTube documents may predate the extension or lack a live receiver.
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content/content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/classifier.js", "content/content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "STUDYGUARD_SETTINGS", ...settings });
    }
  }));
  return results.filter(result => result.status === "rejected").length;
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]);
  if (typeof stored.studyModeEnabled !== "boolean") {
    await chrome.storage.local.set({ studyModeEnabled: DEFAULT_ENABLED });
  }
  if (!Array.isArray(stored.customStudyKeywords)) {
    await chrome.storage.local.set({ customStudyKeywords: StudyGuardClassifier.DEFAULT_CUSTOM_KEYWORDS });
  }
  await syncYouTubeTabs({ enabled: typeof stored.studyModeEnabled === "boolean" ? stored.studyModeEnabled : DEFAULT_ENABLED,
    customStudyKeywords: Array.isArray(stored.customStudyKeywords) ? stored.customStudyKeywords : StudyGuardClassifier.DEFAULT_CUSTOM_KEYWORDS });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["STUDYGUARD_SET", "STUDYGUARD_KEYWORDS_SET"].includes(message?.type)) return;
  const setting = message.type === "STUDYGUARD_SET"
    ? { studyModeEnabled: Boolean(message.enabled) }
    : { customStudyKeywords: StudyGuardClassifier.setCustomKeywords(message.customStudyKeywords) };
  chrome.storage.local.set(setting)
    .then(async () => {
      const stored = await chrome.storage.local.get(["studyModeEnabled", "customStudyKeywords"]);
      const enabled = Boolean(stored.studyModeEnabled);
      const skippedTabs = await syncYouTubeTabs({ enabled,
        customStudyKeywords: Array.isArray(stored.customStudyKeywords) ? stored.customStudyKeywords : StudyGuardClassifier.DEFAULT_CUSTOM_KEYWORDS });
      return { enabled, skippedTabs };
    })
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
