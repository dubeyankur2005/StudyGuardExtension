# 🛡️ StudyGuard — YouTube Study Mode Chrome Extension

StudyGuard is a local-only Chrome Extension built with **JavaScript and Chrome Extension Manifest V3** that helps students stay focused while learning on YouTube.

It identifies videos using configurable study keywords, blocks videos that do not match the allowed classification rules, suppresses blocked video previews, and provides timed Focus Sessions to help users maintain their concentration.

No backend or database is required. StudyGuard stores its settings locally in the browser.

---

## ✨ Features

### 📚 1. Study Mode

Enable Study Mode to reduce distractions while browsing YouTube.

- Allows videos matching configured study keywords.
- Blurs and blocks videos classified as entertainment or unrelated content.
- Blocks unknown titles by default.
- Hides supported YouTube Shorts entry points.
- Places a blocking overlay over blocked watch pages.
- Reclassifies videos when allowed keywords change.
- Processes dynamically loaded YouTube content.
- Supports YouTube homepage, search results, subscriptions, channel pages, playlists, and watch pages.

### 🚫 2. Blocked Video Preview Protection

StudyGuard helps prevent blocked videos from playing in the background.

When Study Mode is enabled:

- Blocked video cards suppress hover-entry events.
- Blocked preview media is paused if playback starts.
- Already-playing blocked media is stopped when protection is applied.
- Blocked cards remain protected when YouTube dynamically loads more content.
- Keyword changes trigger reclassification of affected videos.
- Turning Study Mode off restores normal YouTube interactions, although previously paused videos do not automatically resume.

**Note:** YouTube's internal behavior and selectors may change. A browser extension cannot guarantee tamper-proof blocking against every possible playback method or future YouTube layout.

### ⏱️ 3. Focus Sessions

Start a timed focus session to keep Study Mode enabled while you concentrate.

Available durations:

- 30 minutes
- 1 hour
- 2 hours
- 3 hours
- Custom duration from **1 to 180 minutes**

For example, you can choose a custom duration of **5 minutes** for a quick test or a short study session.

During an active Focus Session:

- Study Mode stays enabled.
- The Study Mode toggle is locked.
- The session duration cannot be changed.
- Another session cannot replace the active session.
- Allowed study keywords cannot be added or removed.
- The popup displays the remaining time.
- Closing the popup does not cancel the session.
- The session uses a saved end timestamp to calculate the remaining time.
- A Chrome alarm helps handle session expiration while the popup is closed.

When the session expires:

- The session lock is released.
- Keyword editing becomes available again.
- The Study Mode toggle becomes available again.
- **Study Mode remains ON** until you turn it off manually.

This feature encourages users to remain focused for their chosen duration.

### 🔑 4. Custom Study Keywords

Customize which study subjects StudyGuard recognizes.

Example keywords:

- Java
- DSA
- React
- Node.js
- Python
- System Design

You can add keywords for your own courses, subjects, and learning goals.

When no Focus Session is active, you can add or remove custom keywords through the popup.

When a Focus Session is active, keyword editing is locked until the session expires.

StudyGuard stores custom keywords separately from its built-in classification rules.

### 🔒 5. Local Storage and Privacy

StudyGuard works locally in Chrome.

- No backend server is required.
- No database is required.
- No account or sign-in is required.
- Settings are stored using Chrome extension storage.
- Classification happens locally in the browser.
- The extension does not send browsing information to a remote server.
- No analytics, advertising, or remote code are included.

---

## 📥 Installation Guide — Downloading from GitHub

Follow these instructions if you downloaded `StudyGuardExtension-v2.zip` or another StudyGuard ZIP package from GitHub.

### Step 1: Download the ZIP

1. Open the StudyGuard GitHub repository:

   **GitHub Repository:** https://github.com/dubeyankur2005/StudyGuard

2. Find the extension ZIP file in the repository.
3. Click the ZIP file.
4. Click **Download raw file** or the available download icon.
5. Wait for the download to finish.

Alternatively, if a ZIP is attached to a GitHub Release, download it from the release page.

### Step 2: Extract the ZIP

1. Open your computer's Downloads folder.
2. Locate the downloaded ZIP file.
3. Right-click the ZIP file.
4. Select **Extract All**.
5. Choose a location and extract the files.
6. Open the extracted folder.

**Important:** Make sure `manifest.json` is directly inside the folder you intend to load into Chrome.

Do not select the ZIP file itself.

### Step 3: Open Chrome Extensions

1. Open Google Chrome.
2. Enter the following address in the address bar:

   `chrome://extensions`

3. Press Enter.

### Step 4: Enable Developer Mode

1. Find the **Developer mode** toggle in the top-right corner.
2. Turn it ON.

Developer mode allows you to install an unpacked extension for local testing.

### Step 5: Load StudyGuard

1. Click **Load unpacked**.
2. Navigate to the extracted StudyGuard extension folder.
3. Select the folder containing `manifest.json`.
4. Click **Select Folder**.

StudyGuard should now appear on your Chrome Extensions page.

### Step 6: Pin StudyGuard

1. Click the puzzle-piece icon in the Chrome toolbar.
2. Find StudyGuard.
3. Click the pin icon if available.

Pinning the extension makes it easier to open the popup.

**Installation complete!** You can now start using StudyGuard on YouTube.

---

## 🚀 How to Use StudyGuard

### 1. Enable Study Mode

1. Open YouTube in Chrome.
2. Click the StudyGuard extension icon.
3. Turn **Study Mode** ON.
4. Return to YouTube and inspect the video cards.

Videos matching allowed study keywords should remain accessible. Videos classified as blocked should be blurred and prevented from normal interaction.

### 2. Configure Allowed Subjects

1. Open the StudyGuard popup.
2. Find **Allowed Subjects / Keywords**.
3. Enter a keyword, such as `Machine Learning`.
4. Click the Add button or press Enter.
5. Confirm that the keyword appears as a chip.

To remove a custom keyword, use its remove button when keyword editing is available.

**Important:** Keyword classification is based on video titles, not an understanding of the actual video content. A title can be educational without matching your configured keywords.

### 3. Start a Focus Session

1. Open the StudyGuard popup.
2. Find the **Focus Session** section.
3. Select a preset duration or choose **Custom**, if available in your installed version.
4. If you select Custom, enter a whole-number duration in minutes.
5. For example, enter `5` for a five-minute session.
6. Click **Start Focus Session**.
7. Confirm that Study Mode is ON and the countdown is visible.

The duration must be a whole number between 1 and 180 minutes when using Custom.

Examples:

| Duration | Input |
|---|---:|
| 5 minutes | 5 |
| 10 minutes | 10 |
| 25 minutes | 25 |
| 45 minutes | 45 |
| 90 minutes | 90 |
| 180 minutes | 180 |

Values such as `0`, `-5`, `2.5`, `abc`, and `181` should be rejected.

### 4. Understand the Focus Session Lock

While a Focus Session is active:

- You cannot turn Study Mode OFF.
- You cannot change the selected duration.
- You cannot start another session.
- You cannot add or remove allowed keywords.
- The countdown continues when the popup is closed.

Wait until the session expires to unlock these controls.

After expiration, Study Mode remains ON, allowing you to continue studying or turn Study Mode off manually.

### 5. Turn Study Mode Off

When no Focus Session is active:

1. Open the StudyGuard popup.
2. Turn Study Mode OFF.
3. Return to YouTube.

Normal browsing behavior should be restored. Any video paused by StudyGuard may need to be played manually.

---

## 🧠 How Video Classification Works

StudyGuard uses a practical title-based keyword classifier.

Its behavior includes:

- Matching video titles against built-in study keywords.
- Matching custom allowed phrases.
- Giving configured blocked terms priority over allowed terms.
- Blocking unknown titles by default while Study Mode is enabled.
- Reclassifying visible videos when custom keywords change.

Custom phrases are matched case-insensitively using word boundaries, with repeated whitespace normalized.

For example, a custom `Java` phrase does not itself match inside `JavaScript`. However, a separate built-in JavaScript rule may allow that title.

Removing a custom keyword does not necessarily block a video if another built-in or custom keyword still matches.

To change the built-in classification rules, edit the relevant keyword definitions in `content/classifier.js`.

---

## 🗂️ Project Structure

The extension uses a modular folder structure.

```text
StudyGuardExtension/
├── manifest.json
├── background.js
├── README.md
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── classifier.js
│   ├── content.js
│   └── content.css
├── icons/
└── tests/
    └── classifier.test.js
```

The exact files may vary slightly between releases.

| File or folder | Responsibility |
|---|---|
| `manifest.json` | Defines extension metadata, permissions, and scripts. |
| `background.js` | Manages extension state and coordinates focus-session expiration. |
| `popup/` | Contains the popup interface, styling, and user interactions. |
| `content/classifier.js` | Contains the video title classification rules. |
| `content/content.js` | Processes YouTube pages, blocks videos, and handles dynamic content. |
| `content/content.css` | Defines visual blocking, blurring, overlays, and Shorts hiding. |
| `icons/` | Contains extension icon assets. |
| `tests/` | Contains automated tests. |

---

## 🔐 Permissions

StudyGuard uses Chrome extension permissions for its local functionality.

- **Storage:** Saves Study Mode preferences, keywords, and session state.
- **Scripting:** Applies bundled extension scripts to supported open YouTube tabs when necessary.
- **Alarms:** Helps handle Focus Session expiration when the popup is closed.
- **YouTube host access:** Allows the extension to operate on YouTube pages.

Review the actual `manifest.json` in the downloaded package for the exact permissions declared by that version.

---

## 🧪 Testing

The project includes automated tests for the pure classification logic.

From the project directory, run:

```bash
node --test tests/classifier.test.js
```

The extension uses native JavaScript and does not require a frontend build step unless a future version introduces one.

### Manual Test Checklist

After installing StudyGuard, verify the following.

**Study Mode**
- [ ] Study Mode can be enabled and disabled.
- [ ] Recognizable study titles remain accessible.
- [ ] Blocked titles are blurred and blocked.
- [ ] Blocked hover previews do not play.
- [ ] A blocked video that is already playing is paused.
- [ ] Turning Study Mode off restores normal browsing interactions.

**Keywords**
- [ ] A custom keyword can be added using the button.
- [ ] A custom keyword can be added using Enter.
- [ ] Duplicate and empty keyword inputs are handled.
- [ ] A custom keyword can be removed.
- [ ] Open YouTube tabs reclassify videos after keyword changes.

**Focus Sessions**
- [ ] Preset durations work.
- [ ] A custom five-minute session can be started.
- [ ] Invalid custom durations are rejected.
- [ ] The countdown remains correct after closing and reopening the popup.
- [ ] Study Mode cannot be disabled during a session.
- [ ] Keywords cannot be added or removed during a session.
- [ ] A second session cannot replace an active session.
- [ ] Session expiration unlocks the controls.
- [ ] Study Mode remains ON after expiration.

**Navigation and Persistence**
- [ ] Protection continues after YouTube refreshes.
- [ ] Back and Forward navigation work.
- [ ] Search and homepage navigation work.
- [ ] The active session is restored after a browser restart when applicable.

Automated classifier tests do not simulate YouTube's DOM, popup rendering, media playback, or actual browser restart behavior. Those features require manual testing in Chrome.

---

## ⚠️ Limitations

- Classification depends on video titles and keyword rules.
- A video may be educational even when its title does not match the allowlist.
- YouTube selectors and internal playback behavior can change.
- Some YouTube layouts or playback methods may not be fully covered.
- A browser extension cannot guarantee tamper-proof blocking against every possible direct URL, script-driven navigation, or future YouTube implementation.
- Chrome may restrict extension scripting on certain browser pages.
- The extension does not inspect the actual audio or video content to determine educational value.

---

## 🛠️ Troubleshooting

### StudyGuard does not appear in Chrome

1. Open `chrome://extensions`.
2. Confirm that StudyGuard is enabled.
3. If necessary, click **Load unpacked** again.
4. Select the extracted folder containing `manifest.json`.

### Study Mode does not affect YouTube

1. Confirm that Study Mode is ON.
2. Refresh the YouTube tab.
3. Check that the extension is enabled.
4. Confirm that the video title matches your expected classification rules.

### Keywords cannot be edited

If a Focus Session is active, keyword editing is intentionally locked.

Wait until the session expires, then try again.

### The countdown or session state appears incorrect

1. Reopen the popup.
2. Check whether the session has expired.
3. Reload the extension at `chrome://extensions` if necessary.
4. If the problem continues, report the issue with the relevant extension version and reproduction steps.

### YouTube layout changes

Reload the extension and the YouTube tab. If cards are still missed, selector-dependent handling may need updating in `content/content.js`.

---

## 🌐 Chrome Web Store Preparation

Before publishing StudyGuard on the Chrome Web Store:

- Test the packaged extension against current Chrome and YouTube versions.
- Prepare store screenshots and promotional artwork.
- Review the extension icon and listing metadata.
- Verify that the declared host permissions are necessary.
- Complete the required privacy and disclosure forms.
- Review current Chrome Web Store policies.
- Test the published package independently of the development folder.

Loading an unpacked extension is intended for local development and testing. It is not the same as installing an extension from the Chrome Web Store.

---

## 👨‍💻 Project

**StudyGuard — Stay focused. Learn more.**

Repository: https://github.com/dubeyankur2005/StudyGuard

If you encounter a bug or have a suggestion, report it through the project's GitHub repository.

---