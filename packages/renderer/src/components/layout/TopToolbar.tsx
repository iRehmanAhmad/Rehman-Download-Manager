import {
  Plus,
  Play,
  Pause,
  PauseCircle,
  StopCircle,
  Trash2,
  Trash,
  Settings,
  Clock,
} from 'lucide-react';

export function TopToolbar() {
  const handleAddUrl = () => {
    // This will ideally trigger a global state or event to open the Add URL dialog
    window.dispatchEvent(new CustomEvent('open-add-url-dialog'));
  };

  const handleStartAll = async () => {
    await window.api.queue.startAll();
  };

  const handlePauseAll = async () => {
    await window.api.queue.pauseAll();
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-surface-hover/50 backdrop-blur-md border-b border-surface-border">
      <ToolbarButton icon={Plus} label="Add URL" onClick={handleAddUrl} primary />
      <div className="w-px h-10 bg-white/10 mx-2" />
      <ToolbarButton icon={Play} label="Resume" />
      <ToolbarButton icon={Pause} label="Pause" />
      <ToolbarButton icon={PauseCircle} label="Pause All" onClick={handlePauseAll} />
      <ToolbarButton icon={StopCircle} label="Stop All" />
      <div className="w-px h-10 bg-white/10 mx-2" />
      <ToolbarButton icon={Trash2} label="Delete" />
      <ToolbarButton icon={Trash} label="Clear Completed" />
      <div className="w-px h-10 bg-white/10 mx-2" />
      <ToolbarButton icon={Clock} label="Scheduler" />
      <ToolbarButton icon={Settings} label="Settings" />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-xl transition-all duration-200 hover:-translate-y-0.5 ${
        primary
          ? 'bg-gradient-to-b from-brand-500/20 to-brand-600/20 hover:from-brand-500/40 hover:to-brand-600/40 text-brand-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-brand-500/30'
          : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent hover:border-white/10'
      }`}
    >
      <Icon size={24} className={primary ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''} />
      <span className="text-[10px] font-medium leading-none text-center px-1">{label}</span>
    </button>
  );
}
