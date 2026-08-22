document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const tabFavicon = document.getElementById('tabFavicon');
  const tabTitle = document.getElementById('tabTitle');
  const tabUrl = document.getElementById('tabUrl');
  const presetSelect = document.getElementById('presetSelect');
  const downloadTabBtn = document.getElementById('downloadTabBtn');
  const manualUrlInput = document.getElementById('manualUrlInput');
  const manualSendBtn = document.getElementById('manualSendBtn');
  const autoStartToggle = document.getElementById('autoStartToggle');
  const toastMessage = document.getElementById('toastMessage');

  let currentTab = null;

  // Load active tab info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
      tabTitle.textContent = currentTab.title || 'Untitled Page';
      tabUrl.textContent = currentTab.url || '';
      if (currentTab.favIconUrl) {
        tabFavicon.src = currentTab.favIconUrl;
      }
    }
  } catch (err) {
    console.error('Failed to get active tab:', err);
  }

  // Load preferences from storage
  chrome.storage.local.get(['autoStart', 'presetId'], (res) => {
    if (res.autoStart !== undefined) {
      autoStartToggle.checked = res.autoStart;
    }
    if (res.presetId) {
      presetSelect.value = res.presetId;
    }
  });

  // Save changes to storage
  autoStartToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoStart: autoStartToggle.checked });
  });

  presetSelect.addEventListener('change', () => {
    chrome.storage.local.set({ presetId: presetSelect.value });
  });

  // Check Gateway Connectivity
  async function checkGateway() {
    chrome.runtime.sendMessage({ type: 'CHECK_GATEWAY_STATUS' }, (res) => {
      if (res && res.connected) {
        statusBadge.className = 'status-badge online';
        statusText.textContent = `Connected (${res.data?.version || 'v0.1.54'})`;
        downloadTabBtn.disabled = false;
        manualSendBtn.disabled = false;
      } else {
        statusBadge.className = 'status-badge offline';
        statusText.textContent = 'App Offline';
      }
    });
  }

  checkGateway();

  // Show Toast
  function showToast(msg, isSuccess = true) {
    toastMessage.textContent = msg;
    toastMessage.className = `toast-message show ${isSuccess ? 'success' : 'error'}`;
    setTimeout(() => {
      toastMessage.className = 'toast-message';
    }, 3000);
  }

  // Download Current Tab Media
  downloadTabBtn.addEventListener('click', async () => {
    if (!currentTab || !currentTab.url) return;

    downloadTabBtn.disabled = true;
    const btnSpan = downloadTabBtn.querySelector('span');
    const origText = btnSpan ? btnSpan.textContent : 'Download Active Media';
    if (btnSpan) btnSpan.textContent = 'Sending to Downlink...';

    chrome.runtime.sendMessage(
      {
        type: 'CAPTURE_URL',
        url: currentTab.url,
        options: {
          title: currentTab.title,
          referer: currentTab.url,
          presetId: presetSelect.value,
          autoStart: autoStartToggle.checked
        }
      },
      (res) => {
        downloadTabBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = origText;

        if (res && res.success) {
          showToast('Added to Downlink queue', true);
        } else {
          showToast(res?.error || 'Failed to connect to Downlink', false);
        }
      }
    );
  });

  // Manual URL send
  async function handleManualSend() {
    const url = manualUrlInput.value.trim();
    if (!url) return;

    manualSendBtn.disabled = true;

    chrome.runtime.sendMessage(
      {
        type: 'CAPTURE_URL',
        url,
        options: {
          presetId: presetSelect.value,
          autoStart: autoStartToggle.checked
        }
      },
      (res) => {
        manualSendBtn.disabled = false;
        if (res && res.success) {
          manualUrlInput.value = '';
          showToast('Link sent to Downlink', true);
        } else {
          showToast(res?.error || 'Failed to connect to Downlink', false);
        }
      }
    );
  }

  manualSendBtn.addEventListener('click', handleManualSend);
  manualUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleManualSend();
    }
  });
});
