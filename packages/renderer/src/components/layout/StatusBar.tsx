import { useEffect, useState } from 'react';
import { useDownloadStore } from '../../stores/download-store';
import { formatFileSize } from '@rdm/shared';
import type { QueueStatus } from '@rdm/shared';

export function StatusBar() {
  const downloadsMap = useDownloadStore((s) => s.downloads);
  const downloads = Array.from(downloadsMap.values());
  const [qStatus, setQStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    const unsub = window.api.queue.onStatus((status) => {
      setQStatus(status);
    });
    return unsub;
  }, []);

  const count = downloads.length;
  const activeDownloads = downloads.filter((d) => d.status === 'downloading');
  const activeCount = qStatus?.activeCount ?? activeDownloads.length;
  const totalSpeed = qStatus?.totalSpeed ?? downloads.reduce((s, d) => s + d.speed, 0);
  const globalSpeedLimit = qStatus?.globalSpeedLimit ?? 0;

  let remainingBytes = 0;
  for (const dl of activeDownloads) {
    if (dl.fileSize && dl.downloaded) {
      remainingBytes += (dl.fileSize - dl.downloaded);
    }
  }
  
  let etaStr = '';
  if (totalSpeed > 0 && remainingBytes > 0) {
    const seconds = remainingBytes / totalSpeed;
    if (seconds < 60) etaStr = ` • ~${Math.round(seconds)}s left`;
    else if (seconds < 3600) etaStr = ` • ~${Math.round(seconds / 60)}m left`;
    else etaStr = ` • ~${Math.round(seconds / 3600)}h left`;
  }

  return (
    <div className="flex items-center justify-between h-7 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 text-xs text-slate-500 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span>
          {activeCount > 0
            ? <span className="text-brand-600 dark:text-brand-400 font-medium">Downloading {activeCount} file{activeCount !== 1 ? 's' : ''}</span>
            : count > 0
              ? `Ready — ${count} item${count !== 1 ? 's' : ''}`
              : 'Ready'}
          {activeCount > 0 && (
            <span className="text-slate-600 dark:text-slate-400">
              {formatSpeed(totalSpeed)}{etaStr}
            </span>
          )}
        </span>
        {globalSpeedLimit > 0 && (
          <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            Speed Limited: {formatFileSize(globalSpeedLimit, 1)}/s
          </span>
        )}
      </div>
      <span>{count} total</span>
    </div>
  );
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return '';
  return ` • ${formatFileSize(bps, 1)}/s`;
}
