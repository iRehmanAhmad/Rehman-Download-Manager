const RDM_HOST = 'com.rdm.native_messaging_host';

function sendToRdm(message) {
  return new Promise((resolve, reject) => {
    try {
      browser.runtime.sendNativeMessage(
        RDM_HOST,
        message,
      ).then(resolve).catch((err) => reject(err.message));
    } catch (err) {
      reject(err.message);
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'rdm-download-link',
    title: 'Download with RDM',
    contexts: ['link'],
  });

  browser.contextMenus.create({
    id: 'rdm-download-page',
    title: 'Download current page',
    contexts: ['page'],
  });

  browser.contextMenus.create({
    id: 'rdm-download-image',
    title: 'Download image with RDM',
    contexts: ['image'],
  });

  browser.contextMenus.create({
    id: 'rdm-download-selection',
    title: 'Download with RDM',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'rdm-separator',
    type: 'separator',
    contexts: ['link', 'page', 'image', 'selection', 'video', 'audio'],
  });

  browser.contextMenus.create({
    id: 'rdm-grab-media',
    title: 'Grab all media from page',
    contexts: ['page'],
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = '';

  switch (info.menuItemId) {
    case 'rdm-download-link':
      url = info.linkUrl || '';
      break;
    case 'rdm-download-page':
      url = info.pageUrl || tab?.url || '';
      break;
    case 'rdm-download-image':
      url = info.srcUrl || '';
      break;
    case 'rdm-download-selection':
      url = info.selectionText || '';
      break;
    case 'rdm-grab-media':
      if (tab?.id) {
        browser.tabs.sendMessage(tab.id, { type: 'GRAB_MEDIA' });
        return;
      }
      return;
    default:
      return;
  }

  if (!url) return;

  try {
    const result = await sendToRdm({
      action: 'add-download',
      url: url,
      source: 'context-menu',
      pageUrl: tab?.url || info.pageUrl || '',
    });
  } catch (err) {
    console.error('Failed to send to RDM:', err);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TO_RDM' && message.url) {
    sendToRdm({
      action: 'add-download',
      url: message.url,
      filename: message.filename || '',
      source: 'content-script',
      pageUrl: sender.tab?.url || '',
    })
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err }));
    return true;
  }

  if (message.type === 'GRAB_MEDIA_RESPONSE' && message.urls) {
    const urls = message.urls;
    let index = 0;
    function addNext() {
      if (index >= urls.length) return;
      sendToRdm({
        action: 'add-download',
        url: urls[index],
        filename: '',
        source: 'grabber',
        pageUrl: sender.tab?.url || '',
      }).finally(() => {
        index++;
        addNext();
      });
    }
    addNext();
    sendResponse({ success: true, count: urls.length });
    return true;
  }
});
