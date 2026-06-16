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
      <div className="grid grid-cols-[24px_auto_80px_70px] md:grid-cols-[24px_auto_80px_80px_70px] lg:grid-cols-[24px_auto_80px_80px_100px_80px_70px] gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        <div className="text-center">#</div>
        <div>File Name</div>
        <div className="hidden md:block">Size</div>
        <div>Status</div>
        <div className="hidden lg:block">Time Left</div>
        <div className="hidden lg:block">Transfer Rate</div>
        <div className="text-right">Actions</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-auto divide-y divide-black/5 dark:divide-white/5">
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
