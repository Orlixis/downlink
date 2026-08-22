# Chrome Web Store Listing — Downlink Companion

## General Metadata
- **Extension Name**: Downlink — Media Downloader Companion
- **Summary / Short Description**: Capture videos, playlists, audio streams, and web media directly into Downlink Desktop with 1 click.
- **Category**: Productivity / Tools
- **Version**: 1.0.0
- **Primary Language**: English

---

## Detailed Store Description
Downlink Companion is the official browser extension for the **Downlink Desktop** application.

### Key Capabilities:
- **1-Click Video Player Downloader**: Automatically renders a sleek, non-intrusive floating download badge when hovering over web video players (YouTube, Vimeo, Dailymotion, Bilibili, anime streaming sites, and HTML5 video).
- **Comprehensive Context Menu Actions**: Right-click any video, audio, media link, or selected text to send it to Downlink with your chosen preset (Best Quality up to 4K/8K, 1080p Full HD, or Lossless Audio extraction).
- **Session Authentication Support**: Securely forwards active session cookies to Downlink Desktop to download private or member-only streams without encountering `403 Forbidden` errors.
- **Zero Cloud Intermediaries**: All communication is executed entirely on your local machine via loopback RPC (`127.0.0.1:3984`). Your URLs, cookies, and files never pass through external proxy servers.

---

## Permissions Justification

| Permission | Justification |
|---|---|
| `contextMenus` | Used to create "Download with Downlink" right-click options for links, pages, audio, and video elements. |
| `tabs` | Used to query active tab title, URL, and favicon to display in the companion popup interface. |
| `activeTab` | Used to grant temporary access to the active page when the user initiates a download via the popup or shortcut. |
| `storage` | Used to save user preferences such as default quality preset (`recommended_best`, `video_1080p`, `audio_mp3`) and auto-start download options locally in the browser. |
| `notifications` | Used to notify the user when a link has been successfully captured and queued in Downlink Desktop, or if the desktop app is offline. |
| `cookies` | Used to extract session authentication cookies for the requested media URL so that protected or age-restricted videos can be retrieved by Downlink Desktop. |
| `host_permissions: http://127.0.0.1:3984/*` | Used to communicate directly with the local Downlink Desktop application running on your computer. |

---

## Privacy & Data Use Disclosure
- **Single Purpose**: Downlink Companion exists solely to capture media URLs and beam them to the locally installed Downlink Desktop app.
- **Data Collection**: No personal data, telemetry, analytics, or browsing histories are collected, stored remotely, or sold to third parties.
- **Local Transmission**: All data is transferred strictly between your browser and your local computer (`127.0.0.1`).
