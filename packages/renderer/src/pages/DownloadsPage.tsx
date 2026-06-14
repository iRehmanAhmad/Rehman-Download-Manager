import { useState, useCallback, useEffect } from 'react';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';
import { DownloadList } from '../components/downloads/DownloadList';
import { useDownloadStore } from '../stores/download-store';
import type { Download, DownloadOptions } from '@rdm/shared';

export function DownloadsPage() {
  const downloads = useDownloadStore((s) => s.getAll());
  const addDownload = useDownloadStore((s) => s.addDownload);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const removeDownload = useDownloadStore((s) => s.removeDownload);

  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [connections, setConnections] = useState(8);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsubProgress = window.api.download.onProgress((dl: Download) => {
      updateDownload(dl.id, dl);
    });
    const unsubCompleted = window.api.download.onCompleted((dl: Download) => {
      updateDownload(dl.id, dl);
    });
    const unsubError = window.api.download.onError((dl: Download) => {
      updateDownload(dl.id, dl);
    });
    return () => {
      unsubProgress();
      unsubCompleted();
      unsubError();
    };
  }, [updateDownload]);

  const handleAddUrl = useCallback(async () => {
    if (!url.trim() || adding) return;
    setAdding(true);
    try {
      const options: DownloadOptions = {
        url: url.trim(),
        filename: filename.trim() || undefined,
        numConnections: connections,
      };
      const dl = await window.api.download.add(options);
      addDownload(dl);
      setUrl('');
      setFilename('');
      setConnections(8);
      setShowDialog(false);
    } catch (err) {
      console.error('Failed to add download:', err);
    } finally {
      setAdding(false);
    }
  }, [url, filename, connections, adding, addDownload]);

  const handleStartAll = useCallback(async () => {
    await window.api.queue.startAll();
    const all = await window.api.download.getAll();
    for (const dl of all) {
      updateDownload(dl.id, dl);
    }
  }, [updateDownload]);

  const handlePauseAll = useCallback(async () => {
    await window.api.queue.pauseAll();
    const all = await window.api.download.getAll();
    for (const dl of all) {
      updateDownload(dl.id, dl);
    }
  }, [updateDownload]);

  const handleClear = useCallback(async () => {
    const completed = downloads.filter(
      (d) => d.status === 'completed' || d.status === 'cancelled' || d.status === 'error',
    );
    for (const dl of completed) {
      await window.api.download.remove(dl.id);
      removeDownload(dl.id);
    }
  }, [downloads, removeDownload]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Downloads</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
          >
            <Play size={14} />
            Start All
          </button>
          <button
            onClick={handlePauseAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
          >
            <Pause size={14} />
            Pause All
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-md transition-colors ml-2"
          >
            <Plus size={14} />
            Add URL
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <ArrowDownIcon />
            <p className="mt-4 text-sm">No downloads yet</p>
            <p className="text-xs mt-1">Add a URL or drag a link here to start downloading</p>
          </div>
        ) : (
          <DownloadList downloads={downloads} />
        )}
      </div>

      {showDialog && (
        <AddUrlDialog
          url={url}
          filename={filename}
          connections={connections}
          adding={adding}
          onUrlChange={setUrl}
          onFilenameChange={setFilename}
          onConnectionsChange={setConnections}
          onAdd={handleAddUrl}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

function AddUrlDialog({
  url,
  filename,
  connections,
  adding,
  onUrlChange,
  onFilenameChange,
  onConnectionsChange,
  onAdd,
  onClose,
}: {
  url: string;
  filename: string;
  connections: number;
  adding: boolean;
  onUrlChange: (v: string) => void;
  onFilenameChange: (v: string) => void;
  onConnectionsChange: (v: number) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Add Download</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://example.com/file.zip"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Filename (optional)</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              placeholder="Leave blank to auto-detect"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Connections: {connections}</label>
            <input
              type="range"
              min={1}
              max={32}
              value={connections}
              onChange={(e) => onConnectionsChange(parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={!url.trim() || adding}
            className="flex-1 px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-800">
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
