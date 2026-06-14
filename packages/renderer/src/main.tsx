import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './i18n'; // Import i18n configuration

const rootEl = document.getElementById('root');
console.log('[renderer] Starting React, root found:', !!rootEl, 'api available:', !!(window as any).api);

try {
  if (!rootEl) throw new Error('No #root element');
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[renderer] React rendered');
} catch (err) {
  console.error('[renderer] Fatal error:', err);
  document.body.innerHTML = `<div style="color:white;padding:2rem;font-family:monospace;font-size:14px;"><h2>Render Error</h2><pre>${String(err)}</pre></div>`;
}
