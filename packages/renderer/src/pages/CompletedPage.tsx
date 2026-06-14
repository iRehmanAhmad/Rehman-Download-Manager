import { CheckCircle } from 'lucide-react';
import { useDownloadStore } from '../stores/download-store';
import { formatFileSize } from '@rdm/shared';
import type { Download } from '@rdm/shared';

export function CompletedPage() {
  const downloads = useDownloadStore((s) => s.getAll());
  const completed = downloads.filter((d) => d.status === 'completed');

  if (completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <CheckCircle size={48} strokeWidth={1.5} className="text-slate-800" />
        <p className="mt-4 text-sm">No completed downloads yet</p>
        <p className="text-xs mt-1">Finished downloads will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Completed</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-2">
          {completed.map((dl) => (
            <CompletedItem key={dl.id} download={dl} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CompletedItem({ download }: { download: Download }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {download.filename}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{download.url}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm text-slate-300">
            {download.fileSize > 0 ? formatFileSize(download.fileSize) : 'Unknown'}
          </p>
          {download.completedAt && (
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(download.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
