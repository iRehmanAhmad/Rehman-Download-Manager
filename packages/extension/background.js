let nativePort = null;
let pendingCallbacks = new Map(); // tabId -> pending resolve

function ensureNativePort() {
  return new Promise((resolve, reject) => {
    if (nativePort) {
      resolve(nativePort);
      return;
    }

    try {
      nativePort = chrome.runtime.connectNative('com.rdm.native');

      nativePort.onMessage.addListener((msg) => {
        console.log('Received from native host:', msg);
        // Forward to the correct tab
        if (msg.tabId) {
          chrome.tabs.sendMessage(msg.tabId, msg);
        }
      });

      nativePort.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError;
        console.log('Native host disconnected:', err?.message || 'unknown reason');
        nativePort = null;
      });

      // Give the native host a moment to initialize
      setTimeout(() => resolve(nativePort), 100);
    } catch (e) {
      nativePort = null;
      reject(e);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (request.action === 'send-to-rdm' || request.action === 'get-formats') {
    ensureNativePort()
      .then((port) => {
        const msg = {
          ...request.payload,
          tabId: tabId,
          action: request.action === 'send-to-rdm' ? 'add-download' : request.action,
          source: 'extension'
        };
        port.postMessage(msg);
        sendResponse({ status: 'sent' });
      })
      .catch((err) => {
        console.error('Failed to connect to native host:', err);
        // If native host can't connect, tell the content script
        if (request.action === 'get-formats' && tabId) {
          chrome.tabs.sendMessage(tabId, {
            action: 'formats-result',
            error: 'RDM is not running. Please start the application first.',
            tabId: tabId
          });
        }
        sendResponse({ status: 'error', error: 'Native host not connected. Is RDM running?' });
      });
    return true; // keep channel open for async sendResponse
  }
});

// Intercept all browser downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  // Ignore downloads that don't have a URL yet or are just data URIs
  if (!downloadItem.url || downloadItem.url.startsWith('data:') || downloadItem.url.startsWith('blob:')) return;
  
  // Pause/Cancel the browser download
  chrome.downloads.cancel(downloadItem.id);

  // Send to RDM
  ensureNativePort().then((port) => {
    port.postMessage({
      action: 'add-download',
      url: downloadItem.url,
      filename: downloadItem.filename,
      pageUrl: downloadItem.referrer || '',
      source: 'extension'
    });
  }).catch((err) => {
    console.error('Failed to intercept download (native host error):', err);
  });
});
