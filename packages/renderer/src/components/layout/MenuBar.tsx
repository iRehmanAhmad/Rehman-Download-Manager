import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function MenuBar() {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus = [
    {
      id: 'actions',
      label: 'Actions',
      items: [
        { label: 'Add new download', action: () => window.dispatchEvent(new CustomEvent('open-add-url-dialog', { detail: '' })) },
        { label: 'Add batch download', action: () => window.dispatchEvent(new CustomEvent('open-batch-download-dialog', { detail: '' })) },
        { label: 'Add batch download from clipboard', action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            window.dispatchEvent(new CustomEvent('open-batch-download-dialog', { detail: text }));
          } catch (err) {
            window.dispatchEvent(new CustomEvent('open-batch-download-dialog', { detail: '' }));
          }
        }},
        { label: 'Run site grabber', action: () => window.location.hash = '#/grabber' },
        { divider: true },
        { label: 'Show drop target', action: () => {} },
        { divider: true },
        { label: 'Export...', action: () => {} },
        { label: 'Import...', action: () => {} },
        { divider: true },
        { label: 'Exit', action: () => window.api.app.close() },
      ],
    },
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Pause Download', action: () => {} },
        { label: 'Delete Download', action: () => {} },
        { label: 'Resume Download', action: () => {} },
        { label: 'Restart Download', action: () => {} },
      ],
    },
    {
      id: 'downloads',
      label: 'Downloads',
      items: [
        { label: 'Pause All Downloads', action: () => window.api.queue.pauseAll() },
        { label: 'Stop All Downloads', action: () => window.api.queue.pauseAll() },
        { divider: true },
        { label: 'Clear Completed Downloads', action: () => {} },
        { divider: true },
        { label: 'Search (Ctrl+F)', action: () => {} },
        { label: 'Find Next (F3)', action: () => {} },
        { divider: true },
        { label: 'Job Scheduler', action: () => window.location.hash = '#/scheduler' },
        { label: 'Start Queue...', action: () => window.api.queue.startAll() },
        { label: 'Stop Queue...', action: () => window.api.queue.pauseAll() },
        { divider: true },
        { label: 'Bandwidth Limiter...', action: () => {} },
        { divider: true },
        { label: 'Settings', action: () => window.location.hash = '#/settings' },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Hide sidebar', action: () => {} },
        { label: 'Sort files...', action: () => {} },
        { label: 'Top Toolbar...', action: () => {} },
        { label: 'System Tray Icon...', action: () => {} },
        { label: 'Customize List Columns...', action: () => {} },
        { label: 'Toggle Dark Mode', action: () => {} },
        { label: 'Font Settings...', action: () => {} },
        { divider: true },
        { label: 'Language...', action: () => window.location.hash = '#/settings' },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'About RDM', action: () => alert('RDM - Reactive Download Manager v1.0.0') },
      ],
    },
    {
      id: 'registration',
      label: 'Registration',
      items: [
        { label: 'Register RDM', action: () => alert('Free and Open Source!') },
      ],
    },
  ];

  return (
    <div ref={menuRef} className="flex items-center h-6 bg-slate-900 border-b border-slate-800 text-[13px] text-slate-300 px-2 select-none z-50 relative">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            className={`px-3 py-0.5 rounded-sm hover:bg-slate-700/50 hover:text-white transition-colors ${
              activeMenu === menu.id ? 'bg-slate-700/50 text-white' : ''
            }`}
          >
            {menu.label}
          </button>
          
          {activeMenu === menu.id && (
            <div className="absolute top-full left-0 mt-0.5 py-1 w-48 bg-slate-800 border border-slate-700 shadow-xl rounded-md flex flex-col">
              {menu.items.map((item, idx) => 
                item.divider ? (
                  <div key={idx} className="h-px bg-slate-700 my-1 mx-2" />
                ) : (
                  <button
                    key={idx}
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                    className="text-left px-4 py-1.5 hover:bg-brand-500/20 hover:text-brand-300 transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
