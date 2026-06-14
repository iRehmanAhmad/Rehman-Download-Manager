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
      id: 'tasks',
      label: 'Tasks',
      items: [
        { label: 'Add new download', action: () => window.dispatchEvent(new CustomEvent('open-add-url-dialog', { detail: '' })) },
        { label: 'Add batch download', action: () => {} },
        { divider: true },
        { label: 'Exit', action: () => window.api.app.close() },
      ],
    },
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Import...', action: () => {} },
        { label: 'Export...', action: () => {} },
      ],
    },
    {
      id: 'downloads',
      label: 'Downloads',
      items: [
        { label: 'Pause All', action: () => window.api.queue.pauseAll() },
        { label: 'Resume All', action: () => window.api.queue.startAll() },
        { divider: true },
        { label: 'Scheduler', action: () => window.location.hash = '#/scheduler' },
        { label: 'Options', action: () => window.location.hash = '#/settings' },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Hide categories', action: () => {} },
        { label: 'Language', action: () => window.location.hash = '#/settings' },
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
