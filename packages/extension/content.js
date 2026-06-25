// Create IDM-style floating button
function createFloatingButton() {
  const btn = document.createElement('div');
  btn.id = 'rdm-floating-btn';
  
  const icon = document.createElement('div');
  icon.className = 'rdm-btn-content';
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="rdm-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
    <span class="rdm-text">Download this video</span>
  `;
  btn.appendChild(icon);

  const dropdown = document.createElement('div');
  dropdown.id = 'rdm-dropdown';
  dropdown.style.display = 'none';
  
  btn.appendChild(dropdown);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
      return;
    }
    dropdown.style.display = 'block';
    
    // Check if we already have formats cached for the exact current URL
    if (dropdown.dataset.cachedUrl === window.location.href && dropdown.dataset.cachedHtml) {
      dropdown.innerHTML = dropdown.dataset.cachedHtml;
      rebindDropdownListeners(dropdown);
      return;
    }

    dropdown.innerHTML = '<div class="rdm-item">Loading formats...</div>';
    
    chrome.runtime.sendMessage(
      { action: 'get-formats', payload: { url: window.location.href } },
      (response) => {
        // Check for errors from the background script itself
        if (chrome.runtime.lastError) {
          dropdown.innerHTML = '<div class="rdm-item rdm-error">Extension error: ' + chrome.runtime.lastError.message + '</div>';
          return;
        }
        if (response && response.status === 'error') {
          dropdown.innerHTML = '<div class="rdm-item rdm-error">' + response.error + '</div>';
        }
        // If response.status === 'sent', the formats will arrive via onMessage
      }
    );
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  return { btn, dropdown };
}

let floatingBtn = null;
let dropdownEl = null;

function injectButton() {
  if (document.getElementById('rdm-floating-btn')) return;
  const player = document.querySelector('#movie_player') || document.querySelector('video')?.parentElement;
  if (player) {
    const { btn, dropdown } = createFloatingButton();
    floatingBtn = btn;
    dropdownEl = dropdown;
    player.appendChild(btn);
  }
}

// Watch for DOM changes to inject button
const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });

// Rebind listeners when using cached HTML
function rebindDropdownListeners(dropdown) {
  const items = dropdown.querySelectorAll('.rdm-item[data-format-id]');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      chrome.runtime.sendMessage({
        action: 'send-to-rdm',
        payload: {
          url: window.location.href,
          metadata: { ytdlpFormat: item.getAttribute('data-format-id') },
          pageUrl: window.location.href
        }
      });
    });
  });
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'formats-result') {
    if (!dropdownEl) return;
    if (msg.error) {
      dropdownEl.innerHTML = `<div class="rdm-item rdm-error">${msg.error}</div>`;
      return;
    }
    
    dropdownEl.innerHTML = '';
    const formats = msg.formats || [];
    if (formats.length === 0) {
      dropdownEl.innerHTML = '<div class="rdm-item">No formats found</div>';
      return;
    }
    
    formats.forEach(f => {
      const item = document.createElement('div');
      item.className = 'rdm-item';
      item.innerText = f.label;
      item.setAttribute('data-format-id', f.id);
      dropdownEl.appendChild(item);
    });

    // Save cache
    const floatingBtnScope = document.getElementById('rdm-floating-btn');
    if (floatingBtnScope) {
      // In JS, variables are enclosed. But since we need to update the scoped variables:
      // We can attach them to the dropdown element as dataset.
      dropdownEl.dataset.cachedUrl = window.location.href;
      dropdownEl.dataset.cachedHtml = dropdownEl.innerHTML;
    }

    rebindDropdownListeners(dropdownEl);
  }
});
