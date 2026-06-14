import type { Download } from '@rdm/shared';
import { Pause, Play, X, RotateCcw } from 'lucide-react';
import { useDownloadStore } from '../../stores/download-store';

interface DownloadItemProps {
  download: Download;
}

export function DownloadItem({ download }: DownloadItemProps) {
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const removeDownload = useDownloadStore((s) => s.removeDownload);

  const handlePause = () => {
    window.api.download.pause(download.id);
    updateDownload(download.id, { status: 'paused' });
  };

  const handleResume = () => {
    window.api.download.resume(download.id);
    updateDownload(download.id, { status: 'downloading' });
  };

  const handleCancel = () => {
    window.api.download.cancel(download.id);
    updateDownload(download.id, { status: 'cancelled' });
  };

  const handleRemove = () => {
    window.api.download.remove(download.id);
    removeDownload(download.id);
  };

  const statusColor =
    download.status === 'downloading'
      ? 'bg-brand-500'
      : download.status === 'paused'
        ? 'bg-yellow-500'
        : download.status === 'completed'
          ? 'bg-green-500'
          : download.status === 'error'
            ? 'bg-red-500'
            : 'bg-slate-600';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {download.filename}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{download.url}</p>
        </div>
        <div className="flex items-center gap-1">
          {download.status === 'downloading' && (
            <button
              onClick={handlePause}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-yellow-400"
            >
              <Pause size={16} />
            </button>
          )}
          {download.status === 'paused' && (
            <button
              onClick={handleResume}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400"
            >
              <Play size={16} />
            </button>
          )}
          {download.status === 'error' && (
            <button
              onClick={handleResume}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400"
            >
              <RotateCcw size={16} />
            </button>
          )}
          {(download.status === 'queued' || download.status === 'downloading') && (
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
            >
              <X size={16} />
            </button>
          )}
          {(download.status === 'completed' || download.status === 'cancelled' || download.status === 'error') && (
            <button
              onClick={handleRemove}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {download.fileSize > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{Math.round(download.progress)}%</span>
            <span>{download.downloaded} / {download.fileSize}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                download.status === 'downloading'
                  ? 'bg-brand-500'
                  : download.status === 'completed'
                    ? 'bg-green-500'
                    : 'bg-slate-600'
              }`}
              style={{ width: `${download.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
