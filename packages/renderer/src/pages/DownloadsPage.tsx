import { Plus, Play, Pause, Trash2 } from 'lucide-react';
import { DownloadList } from '../components/downloads/DownloadList';
import { useDownloadStore } from '../stores/download-store';

export function DownloadsPage() {
  const downloads = useDownloadStore((s) => s.getAll());

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Downloads</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors">
            <Play size={14} />
            Start All
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors">
            <Pause size={14} />
            Pause All
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors">
            <Trash2 size={14} />
            Clear
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-md transition-colors ml-2">
            <Plus size={14} />
            Add URL
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <ArrowDownIcon />
            <p className="mt-4 text-sm">No downloads yet</p>
            <p className="text-xs mt-1">Add a URL or drag a link here to start downloading</p>
          </div>
        ) : (
          <DownloadList downloads={downloads} />
        )}
      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-800">
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
