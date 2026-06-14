import { useDownloadStore } from '../stores/download-store';
import { formatFileSize } from '@rdm/shared';

export function StatusBar() {
  const downloads = useDownloadStore((s) => s.getAll());
  const count = downloads.length;
  const activeCount = downloads.filter((d) => d.status === 'downloading').length;
  const totalSpeed = downloads.reduce((s, d) => s + d.speed, 0);

  return (
    <div className="flex items-center justify-between h-7 bg-slate-900 border-t border-slate-800 px-4 text-xs text-slate-500 flex-shrink-0">
      <span>
        {activeCount > 0
          ? `Downloading ${activeCount} of ${count} ${formatSpeed(totalSpeed)}`
          : count > 0
            ? `Ready — ${count} queued`
            : 'Ready'}
      </span>
      <span>{count} total</span>
    </div>
  );
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return '';
  return `• ${formatFileSize(bps, 1)}/s`;
}
