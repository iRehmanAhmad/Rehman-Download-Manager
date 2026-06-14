import { useState, useCallback, useEffect } from 'react';
import type { DownloadOptions } from '@rdm/shared';
import { useDownloadStore } from '../../stores/download-store';

export function GlobalAddUrlDialog() {
  const addDownload = useDownloadStore((s) => s.addDownload);

  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [connections, setConnections] = useState(8);
  const [checksum, setChecksum] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const handleOpenAddUrl = (e: Event) => {
      if (e instanceof CustomEvent && typeof e.detail === 'string') {
        setUrl(e.detail);
      }
      setShowDialog(true);
    };
    window.addEventListener('open-add-url-dialog', handleOpenAddUrl);

    return () => {
      window.removeEventListener('open-add-url-dialog', handleOpenAddUrl);
    };
  }, []);

  const handleAddUrl = useCallback(async () => {
    if (!url.trim() || adding) return;
    setAdding(true);
    try {
      const options: DownloadOptions = {
        url: url.trim(),
        filename: filename.trim() || undefined,
        numConnections: connections,
        checksum: checksum.trim() || undefined,
      };
      const dl = await window.api.download.add(options);
      addDownload(dl);
      setUrl('');
      setFilename('');
      setConnections(8);
      setChecksum('');
      setShowDialog(false);
    } catch (err) {
      console.error('Failed to add download:', err);
    } finally {
      setAdding(false);
    }
  }, [url, filename, connections, checksum, adding, addDownload]);

  const handleClose = () => setShowDialog(false);

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={handleClose}>
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
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/file.zip"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Filename (optional)</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Auto-detect"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">MD5 (optional)</label>
              <input
                type="text"
                value={checksum}
                onChange={(e) => setChecksum(e.target.value)}
                placeholder="d41d8cd98f..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Connections: {connections}</label>
            <input
              type="range"
              min={1}
              max={32}
              value={connections}
              onChange={(e) => setConnections(parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddUrl}
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
