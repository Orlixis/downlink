# Downlink Browser Extensions

The official browser extensions for **Downlink Desktop**, enabling 1-click downloads, context menu media interception, authenticated session stream forwarding, and direct video badge triggers across Chrome, Firefox, and Safari.

---

## 📁 Directory Structure
- **`extensions/chrome/`**: Chromium extension (Manifest V3) for Google Chrome, Brave, Microsoft Edge, Opera, Arc, and Vivaldi.
- **`extensions/firefox/`**: Gecko extension (Manifest V3 with `browser_specific_settings`) for Mozilla Firefox, Librewolf, Floorp, and Zen.
- **`extensions/safari/`**: WebExtension for Apple Safari on macOS and iOS.

---

## 🚀 How to Load Unpacked (Developer Mode)

### 1. Chrome / Brave / Edge / Opera / Arc
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory: `downlink/extensions/chrome`.
5. Pin the **Downlink Companion** icon in your browser toolbar!

### 2. Firefox / Librewolf
1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on...**.
3. Select the file: `downlink/extensions/firefox/manifest.json`.

### 3. Safari (macOS)
1. In Safari, open **Settings > Advanced** and check **"Show features for web developers"**.
2. Under the **Develop** menu in the menu bar, enable **"Allow Unsigned Extensions"**.
3. Load the extension from `downlink/extensions/safari`.

---

## ⚙️ Architecture & Local Gateway
- **Loopback Gateway**: Embedded inside Downlink running on `http://127.0.0.1:3984`
- **Protocol**: JSON RPC over HTTP (`/health`, `/api/status`, `/api/capture`)
- **Security**: Bound exclusively to loopback interface with strict CORS headers (`Content-Type`, `Authorization`).
