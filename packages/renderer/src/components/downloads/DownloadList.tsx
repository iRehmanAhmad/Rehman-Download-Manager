import type { Download } from '@rdm/shared';
import { DownloadItem } from './DownloadItem';

interface DownloadListProps {
  downloads: Download[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function DownloadList({ downloads, onMoveUp, onMoveDown }: DownloadListProps) {
  return (
    <div className="flex flex-col h-full bg-surface-hover/30 rounded-xl border border-white/5 overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="grid grid-cols-[30px_auto_100px_100px_120px_100px_80px] gap-3 px-4 py-3 bg-slate-900/50 border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="text-center">#</div>
        <div>File Name</div>
        <div>Size</div>
        <div>Status</div>
        <div>Time Left</div>
        <div>Transfer Rate</div>
        <div className="text-right">Actions</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-auto divide-y divide-white/5">
        {downloads.map((dl, i) => (
          <DownloadItem
            key={dl.id}
            download={dl}
            index={i}
            total={downloads.length}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </div>
    </div>
  );
}
