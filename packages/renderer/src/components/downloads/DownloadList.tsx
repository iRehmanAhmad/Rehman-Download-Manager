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
      <div className="grid grid-cols-[24px_auto_80px_70px] md:grid-cols-[24px_auto_80px_80px_70px] lg:grid-cols-[24px_auto_80px_80px_100px_80px_70px] gap-2 px-4 py-2 bg-slate-200/70 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shadow-sm z-10 relative">
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
