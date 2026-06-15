import { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDownloadStore } from '../../stores/download-store';

export function FindDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const downloadsMap = useDownloadStore(s => s.downloads);
  const toggleSelection = useDownloadStore(s => s.toggleSelection);
  const clearSelection = useDownloadStore(s => s.clearSelection);
  
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const matchingIds = useMemo(() => {
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase();
    
    return Array.from(downloadsMap.values())
      .filter(dl => 
        dl.filename.toLowerCase().includes(searchLower) || 
        dl.url.toLowerCase().includes(searchLower)
      )
      .map(dl => dl.id);
  }, [downloadsMap, query]);

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [query]);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    
    const handleFindNext = () => {
      findNext();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        findNext();
      }
    };

    window.addEventListener('open-find-dialog', handleOpen);
    window.addEventListener('find-next', handleFindNext);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-find-dialog', handleOpen);
      window.removeEventListener('find-next', handleFindNext);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [matchingIds, currentMatchIndex]);

  const findNext = () => {
    if (matchingIds.length === 0) return;
    
    const nextIndex = (currentMatchIndex + 1) % matchingIds.length;
    setCurrentMatchIndex(nextIndex);
    
    const targetId = matchingIds[nextIndex];
    clearSelection();
    toggleSelection(targetId, false);
    
    setTimeout(() => {
      const el = document.getElementById(`download-row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }} />
        <Dialog.Content 
          className="fixed z-[100] top-24 left-1/2 -translate-x-1/2 bg-surface-hover border border-white/10 p-4 rounded-xl shadow-2xl w-80 pointer-events-auto flex flex-col gap-3"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-slate-100">Find Download</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </Dialog.Close>
          </div>
          
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                findNext();
              }
            }}
            placeholder="Search filename or URL..."
            className="w-full bg-slate-900/50 border border-white/5 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500/50 placeholder:text-slate-500"
          />

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">
              {matchingIds.length > 0 ? `${matchingIds.length} match${matchingIds.length === 1 ? '' : 'es'}` : 'No matches'}
            </span>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button 
                onClick={findNext}
                disabled={matchingIds.length === 0}
                className="px-3 py-1.5 rounded text-xs font-medium bg-brand-500 hover:bg-brand-400 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find Next
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
