const RDM_HOST = 'com.rdm.native_messaging_host';

function sendToRdm(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(RDM_HOST, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(response);
      }
    });
  });
}

async function checkConnection() {
  const statusEl = document.getElementById('status');
  try {
    await sendToRdm({ action: 'ping' });
    statusEl.textContent = '● Connected to RDM';
    statusEl.className = 'status connected';
  } catch {
    statusEl.textContent = '● RDM not running';
    statusEl.className = 'status disconnected';
  }
}

document.getElementById('btn-download-page').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const statusEl = document.getElementById('status');
  try {
    await sendToRdm({
      action: 'add-download',
      url: tab.url,
      source: 'popup',
      pageUrl: tab.url,
    });
    statusEl.textContent = '✓ Sent to RDM';
    statusEl.className = 'status connected';
  } catch (err) {
    statusEl.textContent = '✗ Failed: ' + err;
    statusEl.className = 'status disconnected';
  }
});

document.getElementById('btn-grab-media').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const statusEl = document.getElementById('status');
  chrome.tabs.sendMessage(tab.id, { type: 'GRAB_MEDIA' }, (response) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = '✗ Could not scan page';
      statusEl.className = 'status disconnected';
      return;
    }
    if (response?.urls?.length > 0) {
      statusEl.textContent = `✓ Sending ${response.urls.length} files...`;
      statusEl.className = 'status connected';
    } else {
      statusEl.textContent = 'No media found on page';
      statusEl.className = 'status';
    }
  });
});

document.getElementById('btn-add-url').addEventListener('click', async () => {
  const input = document.getElementById('url-input');
  const url = input.value.trim();
  if (!url) return;

  const statusEl = document.getElementById('status');
  try {
    const result = await sendToRdm({
      action: 'add-download',
      url,
      source: 'popup-manual',
    });
    statusEl.textContent = '✓ Sent to RDM';
    statusEl.className = 'status connected';
    input.value = '';
  } catch (err) {
    statusEl.textContent = '✗ Failed: ' + err;
    statusEl.className = 'status disconnected';
  }
});

document.getElementById('url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add-url').click();
  }
});

checkConnection();

setInterval(checkConnection, 5000);
