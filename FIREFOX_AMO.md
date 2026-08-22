# Firefox Add-on (AMO) Listing Guide — Downlink Companion

> **Official Live Add-on URL**: [https://addons.mozilla.org/en-US/firefox/addon/downlink-companion/](https://addons.mozilla.org/en-US/firefox/addon/downlink-companion/)

## 1. Distribution Option (Screen 1)
- Select: **"On this site"** (public listing on addons.mozilla.org)
- Click **Continue**.

---

## 2. Upload File (Screen 2)
- Upload the generated zip file located at:
  `/Users/okantah/Projects/downlink/dist/extensions/downlink-firefox.zip`
- AMO will run automatic validation (all checks should pass cleanly with Manifest V3).
- **Source Code Question**:
  - *"Does your add-on contain minified, concatenated, or generated source code?"*
  - Select: **No** (Downlink extension uses pure, human-readable vanilla JavaScript / CSS).

---

## 3. General Information & Metadata

- **Name**: `Downlink — Media Downloader Companion`
- **Summary**: `Capture videos, playlists, audio streams, and web media directly into Downlink Desktop with 1 click.`
- **Categories**:
  - Primary: `Download Management` / `Photos & Media`
  - Secondary: `General / Other Tools`
- **Support Email**: Your contact / support email
- **Support Website / Homepage**: `https://downlink.app` (or your repo URL `https://github.com/okantah/downlink`)

---

## 4. Full Description (Markdown supported)

```markdown
Downlink Companion is the official Firefox browser extension for the **Downlink Desktop** application.

### Key Capabilities:
- **1-Click Video Player Downloader**: Automatically displays a sleek, non-intrusive floating download badge when hovering over web video players (YouTube, Vimeo, Dailymotion, Bilibili, anime streaming sites, and HTML5 video).
- **Comprehensive Context Menu Actions**: Right-click any video, audio, media link, or selected text to send it to Downlink with your preferred preset (Best Quality up to 4K/8K, 1080p Full HD, or Lossless Audio extraction).
- **Session Authentication Support**: Securely forwards active session cookies to Downlink Desktop so you can download private or member-only streams without encountering authentication errors.
- **Zero Cloud Intermediaries**: All communication is executed entirely on your local machine via loopback RPC (`127.0.0.1:3984`). Your URLs, cookies, and files never pass through external proxy servers.

*Note: Requires the free Downlink Desktop application running locally on your computer.*
```

---

## 5. Permissions Justification (For Mozilla Reviewers)

If Mozilla reviewer notes or permissions explanation is requested:

- **`contextMenus`**: Allows users to right-click links, media, or web pages to send them directly to Downlink.
- **`tabs` / `activeTab`**: Reads the current tab title, URL, and favicon to display in the companion popup and grab media links.
- **`storage`**: Saves user preferences (e.g., default quality preset, overlay display toggle) locally in Firefox.
- **`cookies`**: Reads session authentication cookies for requested media domains and forwards them locally to Downlink Desktop so user-authorized videos can be retrieved.
- **`notifications`**: Informs the user when a link was successfully sent to the desktop app or if the desktop app is closed.
- **`host_permissions` (`http://127.0.0.1:3984/*`, `<all_urls>`)**: Loopback connection to the local Downlink Desktop RPC server, and ability to detect video players across websites.

---

## 6. Privacy Policy

```markdown
Downlink Companion does not collect, log, track, or sell any user data or browsing activity. 
All data transfers occur strictly between the local Firefox browser and the locally running Downlink Desktop application on your machine (127.0.0.1). No personal data is ever sent to external cloud servers.
```
