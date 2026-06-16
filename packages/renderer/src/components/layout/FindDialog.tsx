import { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDownloadStore } from '../../stores/download-store';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

export function FindDialog() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const downloadsMap = useDownloadStore(s => s.downloads);
  const query = useDownloadStore(s => s.searchQuery);
  const setQuery = useDownloadStore(s => s.setSearchQuery);
  const setActiveMatchId = useDownloadStore(s => s.setActiveMatchId);
  
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
    if (matchingIds.length > 0) {
      if (currentMatchIndex >= matchingIds.length || currentMatchIndex === -1) {
        setCurrentMatchIndex(0);
        jumpToTarget(matchingIds[0]);
      } else {
        jumpToTarget(matchingIds[currentMatchIndex]);
      }
    } else {
      setCurrentMatchIndex(-1);
      setActiveMatchId(null);
    }
  }, [matchingIds.join(',')]);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveMatchId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          findPrev();
        } else {
          findNext();
        }
      }
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchingIds, currentMatchIndex, open]);

  const jumpToTarget = (targetId: string) => {
    setActiveMatchId(targetId);
    setTimeout(() => {
      const el = document.getElementById(`download-row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const findNext = () => {
    if (matchingIds.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matchingIds.length;
    setCurrentMatchIndex(nextIndex);
    jumpToTarget(matchingIds[nextIndex]);
  };

  const findPrev = () => {
    if (matchingIds.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matchingIds.length) % matchingIds.length;
    setCurrentMatchIndex(prevIndex);
    jumpToTarget(matchingIds[prevIndex]);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }} />
        <Dialog.Content 
          className="fixed z-[100] top-24 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-2xl w-[360px] pointer-events-auto flex flex-col gap-3 font-sans transition-all"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onInteractOutside={(e) => {
            // allow interaction outside
            e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Search size={16} className="text-brand-500" />
              Jump to match
            </Dialog.Title>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="relative">
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) findPrev();
                  else findNext();
                }
              }}
              placeholder="Search filename or URL..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-3 pr-16 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {query.length > 0 && matchingIds.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
                {currentMatchIndex + 1} of {matchingIds.length}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {query.length > 0 && matchingIds.length === 0 ? (
                <span className="text-red-500 dark:text-red-400">No downloads match this text.</span>
              ) : (
                "Matches substring in filename or URL."
              )}
            </span>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={findPrev}
                disabled={matchingIds.length === 0}
                className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent dark:border-slate-700"
                title="Find Previous (Shift+F3)"
              >
                <ChevronUp size={16} />
              </button>
              <button 
                onClick={findNext}
                disabled={matchingIds.length === 0}
                className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent dark:border-slate-700"
                title="Find Next (F3 or Enter)"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
