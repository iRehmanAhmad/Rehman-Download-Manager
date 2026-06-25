// global-interceptor.js

// List of common file extensions to intercept
const INTERCEPT_EXTENSIONS = [
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso',
  // Executables
  '.exe', '.msi', '.apk', '.dmg', '.pkg', '.deb', '.rpm', '.AppImage',
  // Media (Audio/Video)
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.epub', '.mobi'
];

document.addEventListener('click', (e) => {
  // If the user holds Alt, allow normal browser behavior (Bypass key)
  if (e.altKey) return;

  // Find the closest anchor tag that was clicked
  const anchor = e.target.closest('a');
  if (!anchor || !anchor.href) return;

  const url = anchor.href;
  
  // Ignore javascript:, mailto:, data:, blob: links
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
    return;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check if the link explicitly has the 'download' attribute
    const hasDownloadAttr = anchor.hasAttribute('download');
    
    // Check if the URL ends with a known file extension
    const hasKnownExtension = INTERCEPT_EXTENSIONS.some(ext => pathname.endsWith(ext));

    if (hasDownloadAttr || hasKnownExtension) {
      // Prevent the browser from starting the download
      e.preventDefault();
      e.stopPropagation();
      
      // Determine filename from the download attribute or URL
      let filename = anchor.getAttribute('download') || '';
      if (!filename && pathname.includes('/')) {
        filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      }

      // Send the intercepted download to our background script
      chrome.runtime.sendMessage({
        action: 'send-to-rdm',
        payload: {
          url: url,
          filename: filename,
          pageUrl: window.location.href
        }
      });
      
      console.log(`[RDM] Intercepted click for ${url}`);
    }
  } catch (err) {
    // Invalid URL or cross-origin issue, ignore
  }
}, true); // Use capture phase to intercept before other scripts stop propagation
