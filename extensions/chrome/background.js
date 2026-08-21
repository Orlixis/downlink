// Downlink Browser Companion - Background Service Worker (Manifest V3)

const DOWNLINK_SCHEME = "dlsniff://";
const LOCAL_RPC_PORT = 49152;

// Track detected media per tab
const detectedStreamsByTab = new Map();

// Initialize context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "downlink-download-link",
    title: "Download with Downlink",
    contexts: ["link", "video", "audio", "image"],
  });

  chrome.contextMenus.create({
    id: "downlink-download-page",
    title: "Download Current Media / Video with Downlink",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "downlink-separator",
    type: "separator",
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "downlink-open-app",
    title: "Open Downlink Desktop",
    contexts: ["action"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = null;

  if (info.menuItemId === "downlink-download-link") {
    targetUrl = info.linkUrl || info.srcUrl || info.pageUrl;
  } else if (info.menuItemId === "downlink-download-page") {
    targetUrl = tab?.url || info.pageUrl;
  } else if (info.menuItemId === "downlink-open-app") {
    sendToDownlink("open");
    return;
  }

  if (targetUrl) {
    sendToDownlink(targetUrl);
  }
});

// Intercept media streams (HLS, DASH, MP4, WebM)
const MEDIA_EXTENSIONS = [
  ".m3u8",
  ".mpd",
  ".mp4",
  ".webm",
  ".mkv",
  ".ts",
  ".flv",
  ".aac",
  ".mp3",
  ".m4a",
];

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const url = details.url;

    const isMedia = MEDIA_EXTENSIONS.some((ext) =>
      url.toLowerCase().includes(ext)
    );

    if (isMedia) {
      const tabId = details.tabId;
      const list = detectedStreamsByTab.get(tabId) || [];

      if (!list.some((item) => item.url === url)) {
        list.push({
          url,
          type: details.type,
          timestamp: Date.now(),
        });
        detectedStreamsByTab.set(tabId, list.slice(-20)); // keep last 20

        // Update badge count
        chrome.action.setBadgeText({
          tabId,
          text: String(list.length),
        });
        chrome.action.setBadgeBackgroundColor({
          tabId,
          color: "#3b82f6",
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedStreamsByTab.delete(tabId);
});

// Communication with Downlink Desktop via Custom Scheme & Loopback RPC
async function sendToDownlink(url) {
  if (!url) return;

  const encodedUrl = encodeURIComponent(url);
  const deepLink = `${DOWNLINK_SCHEME}?url=${encodedUrl}`;

  try {
    // Attempt local loopback HTTP endpoint first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    const res = await fetch(`http://127.0.0.1:${LOCAL_RPC_PORT}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      console.log("[Downlink Extension] Successfully sent to desktop via local RPC");
      return;
    }
  } catch {
    // Fallback: Trigger custom protocol handler
    chrome.tabs.create({ url: deepLink, active: false }, (tab) => {
      setTimeout(() => {
        if (tab?.id) chrome.tabs.remove(tab.id);
      }, 1200);
    });
  }
}

// Listen to messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TAB_STREAMS") {
    const tabId = message.tabId;
    const streams = detectedStreamsByTab.get(tabId) || [];
    sendResponse({ streams });
    return true;
  }

  if (message.type === "SEND_TO_DOWNLINK") {
    sendToDownlink(message.url);
    sendResponse({ success: true });
    return true;
  }
});
