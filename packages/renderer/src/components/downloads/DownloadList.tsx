import { useState, useMemo } from 'react';
import type { Download } from '@rdm/shared';
import { DownloadItem } from './DownloadItem';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface DownloadListProps {
  downloads: Download[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function DownloadList({ downloads, onMoveUp, onMoveDown }: DownloadListProps) {
  const [sortColumn, setSortColumn] = useState<keyof Download | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof Download) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortColumn(null); setSortDirection('asc'); }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedDownloads = useMemo(() => {
    if (!sortColumn) return downloads;
    return [...downloads].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];
      
      if (sortColumn === 'filename') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [downloads, sortColumn, sortDirection]);

  const renderSortIcon = (column: keyof Download) => {
    if (sortColumn !== column) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="text-brand-500 ml-1" /> : <ArrowDown size={12} className="text-brand-500 ml-1" />;
  };

  const HeaderItem = ({ label, column, className = '' }: { label: string, column: keyof Download, className?: string }) => (
    <div 
      className={`flex items-center cursor-pointer select-none group hover:text-brand-500 dark:hover:text-brand-400 transition-colors pl-2 ${className}`}
      onClick={() => handleSort(column)}
    >
      <span>{label}</span>
      {renderSortIcon(column)}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-surface-hover/30 rounded-xl border border-white/5 overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="grid grid-cols-[24px_auto_80px_60px] md:grid-cols-[24px_auto_80px_110px_60px] lg:grid-cols-[24px_auto_70px_130px_120px_90px_60px] xl:grid-cols-[24px_auto_80px_130px_140px_100px_90px_60px] gap-2 px-3 py-0.5 bg-slate-200/70 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shadow-sm z-10 relative divide-x divide-slate-300/50 dark:divide-slate-600/50">
        <div className="text-center flex items-center justify-center">#</div>
        <HeaderItem label="File Name" column="filename" />
        <HeaderItem label="Size" column="fileSize" />
        <HeaderItem label="Status" column="status" className="hidden md:flex" />
        <HeaderItem label="Added On" column="addedAt" className="hidden lg:flex" />
        <HeaderItem label="Time Left" column="eta" className="hidden lg:flex" />
        <HeaderItem label="Transfer Rate" column="speed" className="hidden xl:flex" />
        <div className="text-right flex items-center justify-end">Actions</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-auto divide-y divide-black/5 dark:divide-white/5">
        {sortedDownloads.map((dl, i) => (
          <DownloadItem
            key={dl.id}
            download={dl}
            index={i}
            total={sortedDownloads.length}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </div>
    </div>
  );
}
