import { useState, useCallback } from 'react';
import type { Download } from '@rdm/shared';
import { formatFileSize } from '@rdm/shared';
import { Pause, Play, X, RotateCcw, GripVertical, Settings2 } from 'lucide-react';
import { useDownloadStore } from '../../stores/download-store';

interface DownloadItemProps {
  download: Download;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function DownloadItem({ download, index, total, onMoveUp, onMoveDown }: DownloadItemProps) {
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const removeDownload = useDownloadStore((s) => s.removeDownload);
  const [showSettings, setShowSettings] = useState(false);
  const [speedLimitInput, setSpeedLimitInput] = useState(
    download.speedLimit ? String(download.speedLimit) : '',
  );
  const [connectionsInput, setConnectionsInput] = useState(String(download.numConnections));

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

  const handleSpeedLimitApply = useCallback(() => {
    const limit = parseInt(speedLimitInput, 10);
    const v = isNaN(limit) || limit <= 0 ? 0 : limit;
    window.api.download.setSpeedLimit(download.id, v);
    updateDownload(download.id, { speedLimit: v });
  }, [speedLimitInput, download.id, updateDownload]);

  const handleConnectionsApply = useCallback(() => {
    const c = parseInt(connectionsInput, 10);
    const v = isNaN(c) ? 8 : Math.max(1, Math.min(c, 32));
    setConnectionsInput(String(v));
    window.api.download.setConnections(download.id, v);
    updateDownload(download.id, { numConnections: v });
  }, [connectionsInput, download.id, updateDownload]);

  const statusColor =
    download.status === 'downloading'
      ? 'bg-brand-500'
      : download.status === 'paused'
        ? 'bg-yellow-500'
        : download.status === 'completed'
          ? 'bg-green-500'
          : download.status === 'error'
            ? 'bg-red-500'
            : download.status === 'merging' || download.status === 'completing'
              ? 'bg-blue-500'
              : 'bg-slate-600';

  const statusLabel =
    download.status === 'queued'
      ? 'Queued'
      : download.status === 'downloading'
        ? `${formatFileSize(download.speed)}/s • ${formatEta(download.eta)}`
        : download.status === 'paused'
          ? 'Paused'
          : download.status === 'completed'
            ? 'Completed'
            : download.status === 'error'
              ? download.errorMessage || 'Error'
              : download.status === 'merging'
                ? 'Merging chunks...'
                : download.status === 'completing'
                  ? 'Finishing...'
                  : 'Cancelled';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
          <span className="text-[10px] text-slate-600 w-4 text-center">{index + 1}</span>
          <div className="flex flex-col gap-0">
            <button
              onClick={() => onMoveUp(download.id)}
              disabled={index === 0}
              className="text-slate-600 hover:text-slate-300 disabled:opacity-30 leading-none"
            >
              ▲
            </button>
            <button
              onClick={() => onMoveDown(download.id)}
              disabled={index === total - 1}
              className="text-slate-600 hover:text-slate-300 disabled:opacity-30 leading-none"
            >
              ▼
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-200 truncate">
              {download.filename}
            </p>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 ${showSettings ? 'bg-slate-800 text-slate-300' : ''}`}
            >
              <Settings2 size={13} />
            </button>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {statusLabel}
            {download.priority !== 'normal' && (
              <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-slate-800">{download.priority}</span>
            )}
            {download.retryCount > 0 && download.status !== 'completed' && (
              <span className="ml-2 text-yellow-500">Retry {download.retryCount}/{download.maxRetries}</span>
            )}
          </p>
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
            <span>{formatFileSize(download.downloaded)} / {formatFileSize(download.fileSize)}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                download.status === 'downloading'
                  ? 'bg-brand-500'
                  : download.status === 'completed'
                    ? 'bg-green-500'
                    : download.status === 'merging' || download.status === 'completing'
                      ? 'bg-blue-500'
                      : 'bg-slate-600'
              }`}
              style={{ width: `${download.progress}%` }}
            />
          </div>
        </div>
      )}

      {showSettings && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Speed limit (bytes/s, 0 = off)</label>
            <div className="flex gap-1">
              <input
                type="number"
                min="0"
                step="1024"
                value={speedLimitInput}
                onChange={(e) => setSpeedLimitInput(e.target.value)}
                placeholder="Unlimited"
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 w-0"
              />
              <button
                onClick={handleSpeedLimitApply}
                className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded"
              >
                Set
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Connections (1-32)</label>
            <div className="flex gap-1">
              <input
                type="number"
                min="1"
                max="32"
                value={connectionsInput}
                onChange={(e) => setConnectionsInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 w-0"
              />
              <button
                onClick={handleConnectionsApply}
                className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '...';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
