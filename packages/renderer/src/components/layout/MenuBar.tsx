import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownloadStore } from '../../stores/download-store';

export function MenuBar() {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [queues, setQueues] = useState<import('@rdm/shared').QueueSettings[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeMenu === 'downloads') {
      window.api.queue.getAll().then(setQueues).catch(console.error);
    }
  }, [activeMenu]);

  const downloads = useDownloadStore(s => s.downloads);
  const selectedIdsSet = useDownloadStore(s => s.selectedIds);
  const searchQuery = useDownloadStore(s => s.searchQuery);
  const selectedIds = Array.from(selectedIdsSet);

  const downloadsList = Array.from(downloads.values());
  const canPauseAll = downloadsList.some(d => d.status === 'downloading' || d.status === 'queued');
  const canClearCompleted = downloadsList.some(d => d.status === 'completed');
  const canFindNext = searchQuery.trim().length > 0;

  const canPause = selectedIds.length > 0 && selectedIds.some(id => {
    const d = downloads.get(id);
    return d && ['downloading', 'queued'].includes(d.status);
  });
  const canResume = selectedIds.length > 0 && selectedIds.some(id => {
    const d = downloads.get(id);
    return d && ['paused', 'error'].includes(d.status);
  });
  const canDelete = selectedIds.length > 0;
  const canRestart = selectedIds.length > 0;

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
        { label: 'Export', subItems: [
          { label: 'To RDM export file', action: () => window.dispatchEvent(new CustomEvent('open-export-dialog', { detail: 'ef2' })) },
          { label: 'To text file', action: () => window.dispatchEvent(new CustomEvent('open-export-dialog', { detail: 'txt' })) }
        ]},
        { label: 'Import', subItems: [
          { label: 'From RDM export file', action: async () => {
            try {
              const text = await window.api.download.import('ef2');
              if (text && text !== 'success') {
                const downloads = JSON.parse(text);
                const prefilled = downloads.map((d: any, i: number) => ({
                  id: i.toString(),
                  url: d.url,
                  filename: d.filename,
                  type: 'Unknown',
                  size: d.totalSize || -1,
                  selected: true,
                  loading: false, // Don't need to load if we have it!
                  linkText: ''
                }));
                window.dispatchEvent(new CustomEvent('open-import-links-dialog', { detail: { prefilled } }));
              }
            } catch (err) {
              console.error(err);
            }
          }},
          { label: 'From text file', action: async () => {
            try {
              const text = await window.api.download.import('txt');
              if (text) {
                const urls = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
                window.dispatchEvent(new CustomEvent('open-import-links-dialog', { detail: { urls } }));
              }
            } catch (err) {
              console.error(err);
            }
          }}
        ]},
        { divider: true },
        { label: 'Exit', action: () => window.api.app.close() },
      ],
    },
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Pause Download', disabled: !canPause, action: () => selectedIds.forEach(id => window.api.download.pause(id)) },
        { label: 'Delete Download', disabled: !canDelete, action: () => selectedIds.forEach(id => window.api.download.delete(id)) },
        { label: 'Resume Download', disabled: !canResume, action: () => selectedIds.forEach(id => window.api.download.resume(id)) },
        { label: 'Restart Download', disabled: !canRestart, action: () => selectedIds.forEach(id => window.api.download.restart(id)) },
      ],
    },
    {
      id: 'downloads',
      label: 'Downloads',
      items: [
        { label: 'Pause All Downloads', disabled: !canPauseAll, action: () => window.api.queue.pauseAll() },
        { label: 'Stop All Downloads', disabled: !canPauseAll, action: () => window.api.queue.pauseAll() },
        { divider: true },
        { label: 'Clear Completed Downloads', disabled: !canClearCompleted, action: async () => {
          await window.api.download.clearCompleted();
          useDownloadStore.getState().clearCompletedDownloads();
        }},
        { divider: true },
        { label: 'Search (Ctrl+F)', action: () => window.dispatchEvent(new CustomEvent('open-find-dialog')) },
        { label: 'Find Next (F3)', disabled: !canFindNext, action: () => window.dispatchEvent(new CustomEvent('find-next')) },
        { divider: true },
        { label: 'Job Scheduler', action: () => window.location.hash = '#/scheduler' },
        { label: 'Start queue', subItems: queues.map(q => ({
          label: `Start ${q.name}`,
          action: () => window.api.queue.start(q.id)
        }))},
        { label: 'Stop queue', subItems: queues.map(q => ({
          label: `Stop ${q.name}`,
          action: () => window.api.queue.stop(q.id)
        }))},
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
    <div ref={menuRef} className="flex items-center h-6 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 px-1 select-none z-50 relative">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            className={`px-2 py-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors ${
              activeMenu === menu.id ? 'bg-slate-200 text-slate-900 dark:bg-slate-700/50 dark:text-white' : ''
            }`}
          >
            {menu.label}
          </button>
          
          {activeMenu === menu.id && (
            <div className="absolute top-full left-0 mt-0.5 py-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md flex flex-col text-slate-800 dark:text-slate-200">
              {menu.items.map((item, idx) => 
                item.divider ? (
                  <div key={idx} className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />
                ) : item.subItems ? (
                  <div key={idx} className="relative group">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-brand-500/20 hover:text-brand-300 transition-colors flex justify-between items-center">
                      <span>{item.label}</span>
                      <span className="text-slate-500 text-[10px]">▶</span>
                    </button>
                    <div className="absolute top-0 left-[100%] py-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md flex-col hidden group-hover:flex">
                      {item.subItems.map((sub, sidx) => (
                        <button
                          key={sidx}
                          onClick={() => {
                            sub.action?.();
                            setActiveMenu(null);
                          }}
                          className="text-left px-4 py-1.5 hover:bg-brand-500/20 hover:text-brand-300 transition-colors"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    key={idx}
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) return;
                      item.action?.();
                      setActiveMenu(null);
                    }}
                    className={`text-left px-4 py-1.5 transition-colors w-full ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed text-slate-500' 
                        : 'hover:bg-brand-500/20 hover:text-brand-300'
                    }`}
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
