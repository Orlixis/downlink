// Downlink Content Script - Media & Stream Extractor

(function () {
  "use strict";

  function scanMediaElements() {
    const found = new Set();

    // 1. Scan HTML5 video and audio
    document.querySelectorAll("video, audio").forEach((el) => {
      if (el.src && !el.src.startsWith("blob:")) {
        found.add(el.src);
      }
      el.querySelectorAll("source").forEach((srcEl) => {
        if (srcEl.src) found.add(srcEl.src);
      });
    });

    // 2. Scan Magnet links and direct download links
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("magnet:?")) {
        found.add(href);
      }
    });

    return Array.from(found);
  }

  // Notify background worker when media elements are detected
  const mediaList = scanMediaElements();
  if (mediaList.length > 0) {
    chrome.runtime.sendMessage({
      type: "DOM_MEDIA_FOUND",
      urls: mediaList,
      pageTitle: document.title,
    });
  }

  // Observe dynamically inserted video elements (SPAs / YouTube / TikTok)
  const observer = new MutationObserver(() => {
    const updated = scanMediaElements();
    if (updated.length > mediaList.length) {
      chrome.runtime.sendMessage({
        type: "DOM_MEDIA_FOUND",
        urls: updated,
        pageTitle: document.title,
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
