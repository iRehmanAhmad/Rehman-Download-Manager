const RDM_HOST = 'com.rdm.native_messaging_host';

function sendToRdm(message) {
  return browser.runtime.sendNativeMessage(RDM_HOST, message);
}

async function checkConnection() {
  const statusEl = document.getElementById('status');
  try {
    await sendToRdm({ action: 'ping' });
    statusEl.textContent = '\u25CF Connected to RDM';
    statusEl.className = 'status connected';
  } catch {
    statusEl.textContent = '\u25CF RDM not running';
    statusEl.className = 'status disconnected';
  }
}

document.getElementById('btn-download-page').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const statusEl = document.getElementById('status');
  try {
    await sendToRdm({ action: 'add-download', url: tab.url, source: 'popup', pageUrl: tab.url });
    statusEl.textContent = '\u2713 Sent to RDM';
    statusEl.className = 'status connected';
  } catch (err) {
    statusEl.textContent = '\u2717 Failed: ' + err;
    statusEl.className = 'status disconnected';
  }
});

document.getElementById('btn-grab-media').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const statusEl = document.getElementById('status');
  browser.tabs.sendMessage(tab.id, { type: 'GRAB_MEDIA' }).then((response) => {
    if (response?.urls?.length > 0) {
      statusEl.textContent = '\u2713 Sending ' + response.urls.length + ' files...';
      statusEl.className = 'status connected';
    } else {
      statusEl.textContent = 'No media found on page';
      statusEl.className = 'status';
    }
  }).catch(() => {
    statusEl.textContent = '\u2717 Could not scan page';
    statusEl.className = 'status disconnected';
  });
});

document.getElementById('btn-add-url').addEventListener('click', async () => {
  const input = document.getElementById('url-input');
  const url = input.value.trim();
  if (!url) return;
  const statusEl = document.getElementById('status');
  try {
    await sendToRdm({ action: 'add-download', url, source: 'popup-manual' });
    statusEl.textContent = '\u2713 Sent to RDM';
    statusEl.className = 'status connected';
    input.value = '';
  } catch (err) {
    statusEl.textContent = '\u2717 Failed: ' + err;
    statusEl.className = 'status disconnected';
  }
});

document.getElementById('url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-add-url').click();
});

checkConnection();
setInterval(checkConnection, 5000);
