const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const chips = document.getElementById("chips");
const subjectInput = document.getElementById("subject-input");
const subjectForm = document.getElementById("subject-form");
const subjectMessage = document.getElementById("subject-message");
const C = StudyGuardClassifier;
let customKeywords = [...C.DEFAULT_CUSTOM_KEYWORDS];
let savingKeywords = false;

function renderMode(enabled) {
  toggle.checked = enabled;
  document.getElementById("mode-card").classList.toggle("is-on", enabled);
  document.getElementById("mode-state").textContent = enabled ? "ON" : "OFF";
  document.getElementById("mode-description").textContent = enabled
    ? "Only educational content is allowed." : "YouTube works normally.";
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
    remove.disabled = savingKeywords;
    remove.addEventListener("click", () => void updateKeywords(C.removeCustomKeyword(customKeywords, keyword)));
    chip.append(label, remove);
    chips.append(chip);
  });
}

async function updateKeywords(next, clearAfterSave = false) {
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
    if (!response?.ok) throw new Error(response?.error || "Could not save keywords");
    customKeywords = [...next];
    renderKeywords();
    if (clearAfterSave) subjectInput.value = "";
    subjectMessage.textContent = response.skippedTabs
      ? "Saved. Some open YouTube tabs need a reload to apply the change."
      : "Saved. Changes are applied to open YouTube tabs.";
    subjectMessage.dataset.success = "true";
  } catch {
    subjectMessage.textContent = "Could not save keywords. Please try again.";
    subjectMessage.dataset.error = "true";
  } finally {
    savingKeywords = false;
    subjectInput.disabled = false;
    document.getElementById("add-subject").disabled = false;
    renderKeywords();
    if (clearAfterSave) subjectInput.focus();
  }
}

function submitSubject(event) {
  event?.preventDefault();
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

toggle.addEventListener("change", async () => {
  const requested = toggle.checked;
  toggle.disabled = true;
  status.textContent = "Updating Study Mode across YouTube tabs…";
  delete status.dataset.error;
  delete status.dataset.warning;
  try {
    const response = await chrome.runtime.sendMessage({ type: "STUDYGUARD_SET", enabled: requested });
    if (!response?.ok) throw new Error(response?.error || "Could not update setting");
    renderMode(response.enabled);
    status.textContent = response.skippedTabs > 0
      ? `Mode saved. ${response.skippedTabs} tab(s) could not be updated; reload them to apply.`
      : requested ? "Protection is active on your YouTube tabs." : "YouTube restrictions are off.";
    if (response.skippedTabs > 0) status.dataset.warning = "true";
  } catch {
    renderMode(!requested);
    status.textContent = "Could not update Study Mode. Please try again.";
    status.dataset.error = "true";
  } finally { toggle.disabled = false; }
});

subjectForm.addEventListener("submit", submitSubject);
subjectInput.addEventListener("keydown", event => {
  // Keep typing and Enter local to this popup form.
  event.stopPropagation();
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
});
