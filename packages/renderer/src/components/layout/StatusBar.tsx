import { useEffect, useState } from 'react';
import { useDownloadStore } from '../../stores/download-store';
import { formatFileSize } from '@rdm/shared';
import type { QueueStatus } from '@rdm/shared';

export function StatusBar() {
  const downloads = useDownloadStore((s) => s.getAll());
  const [qStatus, setQStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    const unsub = window.api.queue.onStatus((status) => {
      setQStatus(status);
    });
    return unsub;
  }, []);

  const count = downloads.length;
  const activeCount = qStatus?.activeCount ?? downloads.filter((d) => d.status === 'downloading').length;
  const totalSpeed = qStatus?.totalSpeed ?? downloads.reduce((s, d) => s + d.speed, 0);
  const maxConcurrent = qStatus?.maxConcurrent ?? 5;
  const globalSpeedLimit = qStatus?.globalSpeedLimit ?? 0;

  return (
    <div className="flex items-center justify-between h-7 bg-slate-900 border-t border-slate-800 px-4 text-xs text-slate-500 flex-shrink-0">
      <span>
        {activeCount > 0
          ? `Downloading ${activeCount} / ${maxConcurrent} max${formatSpeed(totalSpeed)}`
          : count > 0
            ? `Ready — ${count} queued`
            : 'Ready'}
        {globalSpeedLimit > 0 && (
          <span className="text-slate-600"> | Limit: {formatFileSize(globalSpeedLimit, 1)}/s</span>
        )}
      </span>
      <span>{count} total</span>
    </div>
  );
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return '';
  return ` • ${formatFileSize(bps, 1)}/s`;
}
