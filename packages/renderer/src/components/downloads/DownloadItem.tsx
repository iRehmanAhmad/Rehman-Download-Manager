import { useState, useCallback } from 'react';
import type { Download } from '@rdm/shared';
import { formatFileSize } from '@rdm/shared';
import { Pause, Play, X, RotateCcw, Settings2 } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useDownloadStore } from '../../stores/download-store';
import { DownloadProgressDialog } from './DownloadProgressDialog';
import { DownloadPropertiesDialog } from './DownloadPropertiesDialog';

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
  const selectedIds = useDownloadStore((s) => s.selectedIds);
  const toggleSelection = useDownloadStore((s) => s.toggleSelection);
  const activeMatchId = useDownloadStore((s) => s.activeMatchId);
  const searchQuery = useDownloadStore((s) => s.searchQuery);
  const [showDialog, setShowDialog] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const isSelected = selectedIds?.has(download.id);
  const isActiveMatch = activeMatchId === download.id;

  const handleOpen = () => {
    console.log('[DownloadItem] handleOpen called for id:', download.id);
    window.api.download.openFile(download.id);
  };

  const handleOpenFolder = () => {
    console.log('[DownloadItem] handleOpenFolder called for id:', download.id);
    window.api.download.openFolder(download.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    toggleSelection(download.id, e.ctrlKey || e.metaKey);
  };

  const handlePause = (e?: any) => {
    e?.stopPropagation();
    window.api.download.pause(download.id).catch(console.error);
    updateDownload(download.id, { status: 'paused' });
  };

  const handleResume = (e?: any) => {
    e?.stopPropagation();
    window.api.download.resume(download.id).catch(console.error);
    updateDownload(download.id, { status: 'downloading' });
  };

  const handleCancel = (e?: any) => {
    e?.stopPropagation();
    window.api.download.cancel(download.id).catch(console.error);
    updateDownload(download.id, { status: 'cancelled' });
    setShowDialog(false);
  };

  const handleRemove = (e?: any) => {
    e?.stopPropagation();
    window.api.download.remove(download.id).catch(console.error);
    removeDownload(download.id);
  };

  const statusColor =
    download.status === 'downloading'
      ? 'bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
      : download.status === 'paused'
        ? 'bg-yellow-500'
        : download.status === 'completed'
          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
          : download.status === 'error'
            ? 'bg-red-500'
            : download.status === 'merging' || download.status === 'completing' || download.status === 'scanning' || download.status === 'processing'
              ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
              : 'bg-slate-500';

  const statusLabel =
    download.status === 'queued'
      ? 'Queued'
      : download.status === 'downloading'
        ? 'Downloading'
        : download.status === 'paused'
          ? 'Paused'
          : download.status === 'completed'
            ? 'Completed'
            : download.status === 'error'
              ? 'Error'
              : download.status === 'merging'
                ? 'Merging'
                : download.status === 'completing'
                  ? 'Finishing'
                  : download.status === 'scanning'
                    ? 'Scanning'
                    : download.status === 'processing'
                      ? 'Processing'
                      : download.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Queued';

  const renderHighlightedText = (text: string) => {
    if (!searchQuery || !isActiveMatch) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text;
    
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-300 dark:bg-yellow-600/50 text-slate-900 dark:text-white rounded px-0.5">{text.slice(index, index + searchQuery.length)}</mark>
        {text.slice(index + searchQuery.length)}
      </>
    );
  };

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div 
            id={`download-row-${download.id}`}
            onClick={handleClick}
            onDoubleClick={() => setShowDialog(true)}
            className={`grid grid-cols-[24px_auto_80px_60px] md:grid-cols-[24px_auto_80px_110px_60px] lg:grid-cols-[24px_auto_70px_130px_120px_90px_60px] xl:grid-cols-[24px_auto_80px_130px_140px_100px_90px_60px] gap-2 px-3 py-0.5 items-center hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors group relative cursor-pointer divide-x divide-slate-200/50 dark:divide-white/5 ${
              isSelected ? 'bg-brand-50 dark:bg-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/30 border-l-4 border-brand-500' 
              : isActiveMatch ? 'bg-yellow-50/50 dark:bg-yellow-900/20 border-l-4 border-yellow-400' 
              : index % 2 === 0 ? 'bg-slate-500/5 dark:bg-white/[0.02] border-l-4 border-transparent'
              : 'border-l-4 border-transparent'
            }`}
          >
        {/* Background Progress Bar (IDM Style) */}
        {download.status === 'downloading' && (
          <div 
            className="absolute inset-0 bg-brand-500/10 pointer-events-none"
            style={{ width: `${download.progress}%` }}
          />
        )}

        {/* # */}
        <div className="text-center text-[11px] text-slate-500 pl-1">{index + 1}</div>

        {/* File Name */}
        <div className="min-w-0 flex items-center gap-2 pl-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor} ${isSelected ? 'shadow-[0_0_8px_currentColor]' : ''}`} />
          <span className={`text-[13px] truncate transition-colors ${isSelected ? 'text-brand-900 dark:text-brand-100 font-normal' : 'text-slate-800 dark:text-slate-200 font-normal group-hover:text-slate-900 dark:group-hover:text-white'}`}>
            {renderHighlightedText(download.filename)}
          </span>
        </div>

        {/* Size */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-2">
          {formatFileSize(download.fileSize)}
        </div>

        {/* Status */}
        <div className="hidden md:flex text-[11px] text-slate-500 dark:text-slate-400 items-center gap-1 pl-2">
          <span>{statusLabel}</span>
          {download.status === 'downloading' && (
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">{Math.round(download.progress)}%</span>
          )}
        </div>

        {/* Added On */}
        <div className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 pl-2">
          {download.addedAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(download.addedAt)) : '--'}
        </div>

        {/* Time Left */}
        <div className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 font-mono pl-2">
          {download.status === 'downloading' ? formatEta(download.eta) : '--'}
        </div>

        {/* Transfer Rate */}
        <div className="hidden xl:block text-[11px] text-slate-500 dark:text-slate-400 font-mono pl-2">
          {download.status === 'downloading' ? `${formatFileSize(download.speed)}/s` : '--'}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {download.status === 'downloading' && (
            <button onClick={handlePause} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-yellow-400" title="Pause">
              <Pause size={14} className="text-slate-500 dark:text-slate-400 group-hover/btn:text-yellow-600 dark:group-hover/btn:text-yellow-400" />
            </button>
          )}
          {download.status === 'paused' && (
            <button onClick={handleResume} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-brand-400" title="Resume">
              <Play size={14} />
            </button>
          )}
          {download.status === 'error' && (
            <button onClick={handleResume} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-brand-400" title="Retry">
              <RotateCcw size={14} />
            </button>
          )}
          {(download.status === 'queued' || download.status === 'downloading') && (
            <button onClick={handleCancel} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400" title="Cancel">
              <X size={14} />
            </button>
          )}
          {(download.status === 'completed' || download.status === 'cancelled' || download.status === 'error') && (
            <button onClick={handleRemove} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400" title="Remove">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content 
          className="min-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-md shadow-2xl p-1 text-sm text-slate-800 dark:text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <ContextMenu.Item 
            onSelect={handleOpen}
            className="px-3 py-1.5 rounded outline-none hover:bg-brand-500 hover:text-white cursor-default"
          >
            Open
          </ContextMenu.Item>
          
          <ContextMenu.Item 
            onSelect={handleOpenFolder}
            className="px-3 py-1.5 rounded outline-none hover:bg-brand-500 hover:text-white cursor-default"
          >
            Open folder
          </ContextMenu.Item>

          {download.status === 'paused' ? (
            <ContextMenu.Item 
              onSelect={handleResume}
              className="px-3 py-1.5 rounded outline-none hover:bg-brand-500 hover:text-white cursor-default"
            >
              Resume Download
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item 
              disabled
              className="px-3 py-1.5 rounded outline-none text-slate-500 cursor-not-allowed"
            >
              Resume Download
            </ContextMenu.Item>
          )}

          {download.status === 'downloading' ? (
            <ContextMenu.Item 
              onSelect={handlePause}
              className="px-3 py-1.5 rounded outline-none hover:bg-brand-500 hover:text-white cursor-default"
            >
              Stop Download
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item 
              disabled
              className="px-3 py-1.5 rounded outline-none text-slate-500 cursor-not-allowed"
            >
              Stop Download
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className="h-px bg-slate-200 dark:bg-white/10 my-1 mx-2" />

          <ContextMenu.Item 
            onSelect={handleRemove}
            className="px-3 py-1.5 rounded outline-none hover:bg-red-500 hover:text-white cursor-default"
          >
            Remove
          </ContextMenu.Item>

          <ContextMenu.Separator className="h-px bg-white/10 my-1 mx-2" />

          <ContextMenu.Item 
            onSelect={() => setShowProperties(true)}
            className="px-3 py-1.5 rounded outline-none hover:bg-brand-500 hover:text-white cursor-default"
          >
            Properties
          </ContextMenu.Item>

        </ContextMenu.Content>
      </ContextMenu.Portal>
      </ContextMenu.Root>

      {showDialog && (
        <DownloadProgressDialog
          download={download}
          onClose={() => setShowDialog(false)}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
        />
      )}

      {showProperties && (
        <DownloadPropertiesDialog
          download={download}
          onClose={() => setShowProperties(false)}
          onOpen={handleOpen}
        />
      )}
    </>
  );
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '...';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m} min ${s} sec`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} hours ${m} min`;
}
