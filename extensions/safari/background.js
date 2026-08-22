const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:3984';

// Setup Context Menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'downlink-root',
    title: 'Downlink',
    contexts: ['page', 'link', 'video', 'audio', 'selection']
  });

  chrome.contextMenus.create({
    id: 'downlink-download-best',
    parentId: 'downlink-root',
    title: 'Download with Downlink (Best Quality)',
    contexts: ['page', 'link', 'video', 'audio', 'selection']
  });

  chrome.contextMenus.create({
    id: 'downlink-download-audio',
    parentId: 'downlink-root',
    title: 'Extract Audio (MP3 / FLAC)',
    contexts: ['page', 'link', 'video', 'audio', 'selection']
  });

  chrome.contextMenus.create({
    id: 'downlink-download-1080p',
    parentId: 'downlink-root',
    title: 'Download in 1080p Full HD',
    contexts: ['page', 'link', 'video', 'audio', 'selection']
  });

  chrome.storage.local.get(['gatewayUrl', 'autoStart', 'presetId'], (res) => {
    if (!res.gatewayUrl) {
      chrome.storage.local.set({
        gatewayUrl: DEFAULT_GATEWAY_URL,
        autoStart: true,
        presetId: 'recommended_best'
      });
    }
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.srcUrl || info.linkUrl || info.selectionText || info.pageUrl || (tab && tab.url);
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('magnet:'))) {
    showNotification('Invalid Link', 'No downloadable media or URL was detected in the selection.');
    return;
  }

  let presetId = 'recommended_best';
  if (info.menuItemId === 'downlink-download-audio') {
    presetId = 'audio_mp3';
  } else if (info.menuItemId === 'downlink-download-1080p') {
    presetId = 'video_1080p';
  }

  await captureUrlToDownlink(targetUrl, {
    title: tab ? tab.title : undefined,
    referer: tab ? tab.url : undefined,
    presetId,
    autoStart: true
  });
});

// Message Passing Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_GATEWAY_STATUS') {
    (async () => {
      try {
        const { gatewayUrl = DEFAULT_GATEWAY_URL } = await chrome.storage.local.get('gatewayUrl');
        const res = await fetch(`${gatewayUrl}/health`, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          sendResponse({ connected: true, data });
        } else {
          sendResponse({ connected: false, error: `HTTP ${res.status}` });
        }
      } catch (err) {
        sendResponse({ connected: false, error: err.message || 'Connection refused' });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (request.type === 'CAPTURE_URL') {
    (async () => {
      try {
        const result = await captureUrlToDownlink(request.url, request.options || {});
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

// Core Capture Function
async function captureUrlToDownlink(url, options = {}) {
  const { gatewayUrl = DEFAULT_GATEWAY_URL, autoStart = true, presetId = 'recommended_best' } = await chrome.storage.local.get([
    'gatewayUrl',
    'autoStart',
    'presetId'
  ]);

  // Extract cookies for authentication if host permission is available
  let cookieHeader = '';
  try {
    if (url.startsWith('http')) {
      const cookies = await chrome.cookies.getAll({ url });
      if (cookies && cookies.length > 0) {
        cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    }
  } catch (e) {
    console.debug('Cookie extraction skipped:', e);
  }

  const payload = {
    url,
    title: options.title,
    referer: options.referer || url,
    cookies: cookieHeader || undefined,
    user_agent: navigator.userAgent,
    preset_id: options.presetId || presetId,
    auto_start: options.autoStart !== undefined ? options.autoStart : autoStart
  };

  try {
    const res = await fetch(`${gatewayUrl}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      showNotification('Downlink Error', `Failed to queue download: ${errText || res.statusText}`);
      return { success: false, error: errText };
    }

    const data = await res.json();
    flashBadge('OK', '#10B981');
    showNotification('Captured to Downlink', options.title ? `"${options.title}" added to queue.` : 'Link added to Downlink queue.');
    return { success: true, data };
  } catch (err) {
    flashBadge('!', '#EF4444');
    showNotification(
      'Downlink Offline',
      'Downlink Desktop is not running. Please open Downlink to enable browser capture.'
    );
    return { success: false, error: 'Downlink app is not reachable on port 3984.' };
  }
}

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2500);
}

function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message
    });
  } catch (e) {
    console.debug('Notification failed:', e);
  }
}
