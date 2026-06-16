import { useState } from 'react';
import {
  Plus,
  ClipboardPaste,
  Play,
  Pause,
  PauseCircle,
  StopCircle,
  Trash2,
  Trash,
  Settings,
  Clock,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDownloadStore } from '../../stores/download-store';

export function TopToolbar() {
  const navigate = useNavigate();
  const selectedIds = useDownloadStore((s) => s.selectedIds);
  const downloads = useDownloadStore((s) => s.downloads);
  const removeDownload = useDownloadStore((s) => s.removeDownload);
  const updateDownload = useDownloadStore((s) => s.updateDownload);

  const handleAddUrl = () => {
    window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
  };

  const handlePasteUrl = async () => {
    try {
      const clipText = await window.api.clipboard.readText();
      if (clipText && (clipText.startsWith('http://') || clipText.startsWith('https://') || clipText.startsWith('ftp://'))) {
        window.dispatchEvent(new CustomEvent('open-add-url-dialog', { detail: { url: clipText.trim() } }));
      } else {
        window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
    }
  };

  const [showMore, setShowMore] = useState(false);

  const handleResumeSelected = async () => {
    for (const id of selectedIds) {
      await window.api.download.resume(id);
      updateDownload(id, { status: 'downloading' });
    }
  };

  const handlePauseSelected = async () => {
    for (const id of selectedIds) {
      await window.api.download.pause(id);
      updateDownload(id, { status: 'paused' });
    }
  };

  const handlePauseAll = async () => {
    await window.api.queue.pauseAll();
    Array.from(downloads.values()).forEach((dl) => {
      if (dl.status === 'downloading' || dl.status === 'queued') {
        updateDownload(dl.id, { status: 'paused' });
      }
    });
  };

  const handleStopAll = async () => {
    // "Stop All" is essentially pausing all and cancelling them
    // Here we'll map it to cancel all active downloads
    for (const dl of Array.from(downloads.values())) {
      if (dl.status === 'downloading' || dl.status === 'queued' || dl.status === 'paused') {
        await window.api.download.cancel(dl.id);
        updateDownload(dl.id, { status: 'cancelled' });
      }
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await window.api.download.remove(id);
      removeDownload(id);
    }
  };

  const handleClearCompleted = async () => {
    const completed = Array.from(downloads.values()).filter(
      (d) => d.status === 'completed' || d.status === 'cancelled' || d.status === 'error',
    );
    for (const dl of completed) {
      await window.api.download.remove(dl.id);
      removeDownload(dl.id);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover/50 backdrop-blur-md border-b border-surface-border overflow-visible whitespace-nowrap">
      <ToolbarButton icon={Plus} label="Add URL" onClick={handleAddUrl} primary />
      <ToolbarButton icon={ClipboardPaste} label="Paste URL" onClick={handlePasteUrl} />
      <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1 flex-shrink-0" />
      <ToolbarButton icon={Play} label="Resume" onClick={handleResumeSelected} disabled={selectedIds.size === 0} />
      <ToolbarButton icon={Pause} label="Pause" onClick={handlePauseSelected} disabled={selectedIds.size === 0} />
      <ToolbarButton icon={PauseCircle} label="Pause All" onClick={handlePauseAll} />
      <ToolbarButton icon={StopCircle} label="Stop All" onClick={handleStopAll} />
      <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1 flex-shrink-0" />
      
      <div className="relative">
        <ToolbarButton icon={MoreVertical} label="More Actions" onClick={() => setShowMore(!showMore)} />
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 py-1 min-w-[180px] flex flex-col items-start overflow-hidden">
              <DropdownItem icon={Trash2} label="Delete Selected" onClick={() => { handleDeleteSelected(); setShowMore(false); }} disabled={selectedIds.size === 0} />
              <DropdownItem icon={Trash} label="Clear Completed" onClick={() => { handleClearCompleted(); setShowMore(false); }} />
              <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <DropdownItem icon={Clock} label="Scheduler" onClick={() => { navigate('/scheduler'); setShowMore(false); }} />
              <DropdownItem icon={Settings} label="Settings" onClick={() => { navigate('/settings'); setShowMore(false); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DropdownItem({ icon: Icon, label, onClick, disabled = false }: { icon: any, label: string, onClick: () => void, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${
        disabled 
          ? 'opacity-50 cursor-not-allowed text-slate-400' 
          : 'hover:bg-brand-500 hover:text-white text-slate-700 dark:text-slate-200'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 px-2.5 h-8 rounded-lg transition-all duration-200 ${
        disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:-translate-y-0.5 cursor-pointer'
      } ${
        primary && !disabled
          ? 'bg-brand-50 dark:bg-gradient-to-b dark:from-brand-500/20 dark:to-brand-600/20 hover:bg-brand-100 dark:hover:from-brand-500/40 dark:hover:to-brand-600/40 text-brand-600 dark:text-brand-400 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-brand-200 dark:border-brand-500/30'
          : !disabled
            ? 'hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent dark:hover:border-white/10'
            : 'text-slate-400 border border-transparent'
      }`}
    >
      <Icon size={14} className={primary && !disabled ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''} />
      <span className="text-[11px] font-medium leading-none text-center">{label}</span>
    </button>
  );
}
