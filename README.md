# StudyGuard

StudyGuard is a local-only Chrome Extension (Manifest V3) that makes YouTube less distracting while Study Mode is on. It recognizes a configurable set of study words in visible video titles, blurs and blocks other videos, hides Shorts entry points, and places a blocking layer over a non-study watch page.

## Load and use

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Open YouTube, select the StudyGuard toolbar button, and switch on **Study Mode**.
5. Verify a recognizable learning title remains clickable and an entertainment or unrecognized title is blurred and blocked. Turn the switch off to restore YouTube immediately.

The setting is saved in `chrome.storage.local`; a fresh install starts OFF. The starter allowed subjects are Java, DSA, React, Node.js, Python, and System Design; add or remove them in the popup's **Allowed Subjects / Keywords** section. Changes are stored in a separate `customStudyKeywords` key and content scripts reclassify open YouTube tabs when it changes. Toggling Study Mode updates all currently open YouTube tabs. Tabs without an active receiver receive the bundled content script through Chrome's scripting API when possible; pages Chrome will not permit are safely skipped and read the saved setting when their content script starts.

## What it does and limitations

- Processes home, search, Shorts entry points, subscriptions, channel, playlist, and watch surfaces as YouTube renders them.
- Allows titles matching the study allowlist. Unknown titles are blocked by default.
- Blurs blocked thumbnails and places a hit-tested card overlay above video links; capture-phase pointer, click, and Enter/Space handlers also stop navigation from marked links.
- Hides identified Shorts shelves and links, and overlays blocked watch pages.
- On a blocked watch page, pauses the HTML video and catches subsequent `play`/`playing` events to pause again. A brief title-loading grace period avoids treating a temporarily empty title as unknown; no video is automatically resumed when protection is disabled.
- Reprocesses dynamic content and YouTube single-page route changes without a full reload.

Classification is a practical title keyword heuristic, not an understanding of video content. Titles may be misleading, localized, absent, or match multiple lists. Obvious blocked terms take priority over built-in and custom allowed keywords. Custom phrases match case-insensitively on word boundaries, with repeated whitespace normalized; a custom `Java` entry itself does not match inside `JavaScript` (the separate built-in JavaScript rule may still allow that title). Removing a chip removes that custom match, while an overlapping built-in keyword can still allow the title; edit `STUDY_KEYWORDS` in `content/classifier.js` to change built-in behavior too. Unknown titles remain blocked while Study Mode is on. A blocked watch-page overlay and repeated playback pausing are the strongest safe controls used here, but direct URL entry, script-driven playback/navigation, alternate YouTube layouts, and selector changes cannot be made tamper-proof by a browser extension. YouTube selectors are undocumented and may change. The extension does not inspect video/audio or bypass browser security.

## Files

- `manifest.json`: MV3 metadata, minimum permissions, and YouTube script registration.
- `background.js`: initializes the OFF default and applies popup changes to open tabs.
- `popup/`: accessible reference-matched dark interface, Study Mode toggle, custom keyword chips/form, functional quick actions/help, and privacy details.
- `content/classifier.js`: dependency-free pure title classifier and keyword lists.
- `content/content.js`: dynamic page processing, route handling, reversible state, and input interception.
- `content/content.css`: scoped blur, overlays, and Shorts hiding.
- `tests/classifier.test.js`: Node built-in tests for classification behavior.
- `icons/`: original shield-and-book extension icons.

No server or database is needed: the only preference is stored locally, and all classification happens in the browser. StudyGuard does not send browsing information anywhere and contains no analytics, tracking, remote code, or advertising.

## Permissions and privacy

- `storage`: save the Study Mode preference on the device.
- `scripting`: apply bundled local content files to already-open YouTube pages that have no active content-script receiver.
- YouTube host access: run the content script on YouTube and target open YouTube tabs. No other sites are accessed.

No sign-in, network service, history collection, or analytics are used.

## Test

Run the pure unit tests from the project folder:

```sh
node --test tests/classifier.test.js
```

The extension is native JavaScript and has no build step. The popup's **Open YouTube**, **View Settings**, and **Help** actions work locally; help explains classification limits and View Settings opens the subject editor. After loading it unpacked, verify that typed subject text, caret, placeholder, and selection are readable; add with both the button and Enter, then test empty and duplicate messages and remove a chip while a draft is in the input. Start an entertainment video and turn Study Mode on while it is playing; verify it pauses and stays paused if you try to resume. Also test a known learning title, adding/removing a custom phrase across multiple open tabs, blocked thumbnail/card keyboard activation, OFF restoration (the paused video should not auto-resume), reload while ON, and YouTube Back/Forward and search navigation. Live browser testing is a manual step; automated unit tests do not simulate popup rendering, YouTube's DOM, or player behavior.

## Troubleshooting

If YouTube changes its layout and cards are missed, reload the extension at `chrome://extensions`, reload the YouTube tab, then review the selector-dependent card and Shorts handling in `content/content.js`. If the toggle reports an error, ensure StudyGuard is enabled and reopen its popup.

## Chrome Web Store preparation

Before publishing, create and review store screenshots and promotional artwork, confirm the final icon assets and metadata, test the packaged extension against current Chrome and YouTube, and complete the store privacy/disclosure and listing forms. Verify that the store's current policies accept the requested YouTube host permissions and content restriction behavior.
