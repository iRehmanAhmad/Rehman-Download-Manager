(function () {
  'use strict';

  if (window.__rdm_content_script_loaded) return;
  window.__rdm_content_script_loaded = true;

  const MEDIA_SELECTORS = {
    video: ['video', 'video source', 'a[href$=".mp4"]', 'a[href$=".webm"]', 'a[href$=".mkv"]'],
    audio: ['audio', 'audio source', 'a[href$=".mp3"]', 'a[href$=".m4a"]', 'a[href$=".flac"]', 'a[href$=".wav"]'],
    image: ['img', 'a[href$=".jpg"]', 'a[href$=".png"]', 'a[href$=".gif"]'],
    archive: ['a[href$=".zip"]', 'a[href$=".rar"]', 'a[href$=".7z"]', 'a[href$=".tar.gz"]'],
  };

  function isYouTube() {
    return /(?:youtube\.com|youtu\.be)/i.test(window.location.hostname);
  }

  function getDownloadUrl(element) {
    if (element.href) return element.href;
    if (element.src) return element.src;
    if (element.querySelector('source')) {
      const source = element.querySelector('source');
      return source.src;
    }
    return null;
  }

  function getSuggestedFilename(url, element) {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const parts = pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.')) return last;
    } catch {}

    const text = element?.title || element?.alt || element?.textContent?.trim();
    if (text && text.length < 100) return text;

    return '';
  }

  function injectDownloadButton(element, url) {
    if (element.dataset.rdmButtonInjected) return;
    element.dataset.rdmButtonInjected = '1';

    const button = document.createElement('div');
    button.className = 'rdm-download-btn';
    button.innerHTML = '⬇';
    button.title = 'Download with RDM';
    button.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 2147483647;
      width: 28px;
      height: 28px;
      background: #4f46e5;
      color: #fff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.15s;
      pointer-events: auto;
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const filename = getSuggestedFilename(url, element);

      chrome.runtime.sendMessage({
        type: 'SEND_TO_RDM',
        url,
        filename,
      });
    });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; display: inline-block;';
    element.parentNode?.insertBefore(wrapper, element);
    wrapper.appendChild(element);

    wrapper.style.position = 'relative';
    wrapper.style.display = element.style.display || 'inline-block';
    wrapper.appendChild(button);

    wrapper.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
    wrapper.addEventListener('mouseleave', () => { button.style.opacity = '0'; });
  }

  function scanAndInject() {
    const allSelectors = [
      ...MEDIA_SELECTORS.video,
      ...MEDIA_SELECTORS.audio,
    ];

    for (const selector of allSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const url = getDownloadUrl(el);
          if (url) {
            injectDownloadButton(el, url);
          }
        }
      } catch {}
    }
  }

  scanAndInject();

  const observer = new MutationObserver(() => {
    scanAndInject();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GRAB_MEDIA') {
      const urls = new Set();

      for (const [type, selectors] of Object.entries(MEDIA_SELECTORS)) {
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const url = getDownloadUrl(el);
              if (url) urls.add(url);
            }
          } catch {}
        }
      }

      chrome.runtime.sendMessage({
        type: 'GRAB_MEDIA_RESPONSE',
        urls: Array.from(urls),
        pageUrl: window.location.href,
      });
    }
    return true;
  });
})();
