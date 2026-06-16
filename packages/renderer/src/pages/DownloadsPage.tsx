import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';
import { DownloadList } from '../components/downloads/DownloadList';
import { useDownloadStore } from '../stores/download-store';

export function DownloadsPage() {
  const { status, categoryId } = useParams<{ status: string; categoryId?: string }>();
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
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-600">
            <ArrowDownIcon />
            <p className="mt-4 text-sm">No downloads yet</p>
            <p className="text-xs mt-1">Add a URL or drag a link here to start downloading</p>
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
