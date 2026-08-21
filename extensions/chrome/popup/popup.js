// Downlink Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  const pageTitleEl = document.getElementById("page-title");
  const pageUrlEl = document.getElementById("page-url");
  const btnDownloadPage = document.getElementById("btn-download-page");
  const btnOpenApp = document.getElementById("btn-open-app");
  const streamListEl = document.getElementById("stream-list");
  const streamCountEl = document.getElementById("stream-count");

  // 1. Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    pageTitleEl.textContent = tab.title || "Web Page Media";
    pageUrlEl.textContent = tab.url || "";

    btnDownloadPage.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "SEND_TO_DOWNLINK",
        url: tab.url,
      });
      window.close();
    });

    // 2. Fetch detected streams for this tab
    chrome.runtime.sendMessage(
      { type: "GET_TAB_STREAMS", tabId: tab.id },
      (response) => {
        const streams = response?.streams || [];
        streamCountEl.textContent = String(streams.length);

        if (streams.length > 0) {
          streamListEl.innerHTML = "";
          streams.forEach((item) => {
            const row = document.createElement("div");
            row.className = "stream-item";

            const linkSpan = document.createElement("span");
            linkSpan.className = "stream-link";
            linkSpan.title = item.url;
            linkSpan.textContent = item.url.split("?")[0].split("/").pop() || item.url;

            const sendBtn = document.createElement("button");
            sendBtn.className = "btn-capture";
            sendBtn.textContent = "Send";
            sendBtn.addEventListener("click", () => {
              chrome.runtime.sendMessage({
                type: "SEND_TO_DOWNLINK",
                url: item.url,
              });
              window.close();
            });

            row.appendChild(linkSpan);
            row.appendChild(sendBtn);
            streamListEl.appendChild(row);
          });
        }
      }
    );
  }

  btnOpenApp.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "SEND_TO_DOWNLINK",
      url: "open",
    });
    window.close();
  });
});
