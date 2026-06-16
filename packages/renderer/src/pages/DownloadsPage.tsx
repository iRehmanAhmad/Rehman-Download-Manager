import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Play, Pause, Trash2, ClipboardPaste, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DownloadList } from '../components/downloads/DownloadList';
import { useDownloadStore } from '../stores/download-store';

export function DownloadsPage() {
  const { status, categoryId } = useParams<{ status: string; categoryId?: string }>();
  const navigate = useNavigate();
  const downloadsMap = useDownloadStore((s) => s.downloads);
  const allDownloads = Array.from(downloadsMap.values());
  const removeDownload = useDownloadStore((s) => s.removeDownload);

  const downloads = useMemo(() => {
    let filtered = allDownloads;

    if (status === 'unfinished') {
      filtered = filtered.filter((d) => d.status !== 'completed' && d.status !== 'cancelled');
    } else if (status === 'finished') {
      filtered = filtered.filter((d) => d.status === 'completed');
    }

    if (categoryId) {
      filtered = filtered.filter((d) => d.categoryId === categoryId);
    }

    return filtered;
  }, [allDownloads, status, categoryId]);

  const handleStartAll = useCallback(async () => {
    await window.api.queue.startAll();
  }, []);

  const handlePauseAll = useCallback(async () => {
    await window.api.queue.pauseAll();
  }, []);

  const handleClear = useCallback(async () => {
    const completed = allDownloads.filter(
      (d) => d.status === 'completed' || d.status === 'cancelled' || d.status === 'error',
    );
    for (const dl of completed) {
      await window.api.download.remove(dl.id);
      removeDownload(dl.id);
    }
  }, [downloads, removeDownload]);

  const handleMoveUp = useCallback(
    async (id: string) => {
      const arr = allDownloads.filter(
        (d) => d.status === 'queued' || d.status === 'paused' || d.status === 'downloading',
      );
      const idx = arr.findIndex((d) => d.id === id);
      if (idx <= 0) return;
      const reordered = [...arr];
      [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
      const orderedIds = reordered.map((d) => d.id);
      await window.api.queue.reorder(orderedIds);
    },
    [downloads],
  );

  const handleMoveDown = useCallback(
    async (id: string) => {
      const arr = allDownloads.filter(
        (d) => d.status === 'queued' || d.status === 'paused' || d.status === 'downloading',
      );
      const idx = arr.findIndex((d) => d.id === id);
      if (idx === -1 || idx >= arr.length - 1) return;
      const reordered = [...arr];
      [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
      const orderedIds = reordered.map((d) => d.id);
      await window.api.queue.reorder(orderedIds);
    },
    [downloads],
  );

  return (
    <div className="flex flex-col h-full bg-surface p-4">
      <div className="flex-1 overflow-hidden flex flex-col">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowDownIcon />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">No downloads yet</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Get started by adding a new download or importing a link from your clipboard.
              </p>
              
              <div className="grid gap-3">
                <button
                  onClick={async () => {
                    try {
                      const clipText = await window.api.clipboard.readText();
                      if (clipText) {
                        window.dispatchEvent(new CustomEvent('open-add-url-dialog', { detail: { url: clipText.trim() } }));
                      } else {
                        window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
                      }
                    } catch (err) {
                      window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <ClipboardPaste size={18} />
                  Paste URL from Clipboard
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-url-dialog'))}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                >
                  <Plus size={18} />
                  Add new URL
                </button>
                <div className="flex items-center gap-4 mt-4">
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Or</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg font-medium transition-colors mt-2"
                >
                  <Settings size={18} />
                  Configure Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <DownloadList
            downloads={downloads}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        )}
      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 dark:text-slate-800">
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
