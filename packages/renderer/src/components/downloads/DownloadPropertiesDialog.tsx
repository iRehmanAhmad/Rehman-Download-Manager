import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Music, Video, Archive, FileText, FileIcon } from 'lucide-react';
import type { Download } from '@rdm/shared';
import { formatFileSize } from '@rdm/shared';

interface DownloadPropertiesDialogProps {
  download: Download;
  onClose: () => void;
  onOpen: () => void;
}

export function DownloadPropertiesDialog({ download, onClose, onOpen }: DownloadPropertiesDialogProps) {
  const [description, setDescription] = useState(download.metadata?.description || '');

  const handleMove = async () => {
    // Only attempt to move if the download is complete, otherwise we just update the target directory
    // Wait, download.ipc.ts already handles the logic!
    const newPath = await window.api.system.selectSavePath(download.filepath);
    if (newPath && newPath !== download.filepath) {
      await window.api.download.move(download.id, newPath);
    }
  };

  const getCategoryIcon = (catName: string) => {
    const name = (catName || '').toLowerCase();
    if (name === 'music') return <Music className="w-16 h-16 text-yellow-500" />;
    if (name === 'video') return <Video className="w-16 h-16 text-yellow-500" />;
    if (name === 'compressed') return <Archive className="w-16 h-16 text-yellow-500" />;
    if (name === 'documents') return <FileText className="w-16 h-16 text-yellow-500" />;
    return <FileIcon className="w-16 h-16 text-yellow-500" />;
  };

  const statusLabel =
    download.status === 'queued' ? 'Queued'
    : download.status === 'downloading' ? 'Downloading'
    : download.status === 'paused' ? 'Paused'
    : download.status === 'completed' ? 'Complete'
    : download.status === 'error' ? 'Error'
    : 'Cancelled';

  const typeLabel = download.categoryId ? `${download.categoryId.charAt(0).toUpperCase() + download.categoryId.slice(1)} File` : 'File';

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-100 rounded-lg shadow-2xl z-50 text-slate-900 border border-slate-300">
          
          <div className="flex items-center justify-between px-4 py-2 bg-slate-200 rounded-t-lg border-b border-slate-300">
            <Dialog.Title className="text-sm font-semibold flex items-center gap-2">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230ea5e9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 2v20'/%3E%3Cpath d='M2 12h20'/%3E%3C/svg%3E" alt="icon" className="w-4 h-4" />
              File Properties
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-slate-300 rounded transition-colors" title="Close">
                <X size={16} className="text-slate-600" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 flex flex-col gap-4 text-sm">
            {/* Header: Icon + Filename */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-300">
              {getCategoryIcon(download.categoryId || '')}
              <span className="font-semibold text-base truncate flex-1" title={download.filename}>{download.filename}</span>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-y-2">
              <span className="text-slate-600">Type:</span>
              <span className="font-medium">{typeLabel}</span>

              <span className="text-slate-600">Status:</span>
              <span className="font-medium">{statusLabel}</span>

              <span className="text-slate-600">Size:</span>
              <span className="font-medium">{formatFileSize(download.fileSize)} ({download.fileSize} Bytes)</span>
            </div>

            {/* Save To */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 w-[88px]">Save To:</span>
              <input 
                type="text" 
                value={download.filepath} 
                readOnly 
                className="flex-1 bg-white border border-slate-300 px-2 py-1 rounded text-slate-800 focus:outline-none focus:border-brand-500 selection:bg-brand-500 selection:text-white"
              />
              <button 
                onClick={handleMove}
                className="px-4 py-1 bg-slate-200 border border-slate-300 rounded hover:bg-slate-300 text-slate-800 transition-colors"
              >
                Move
              </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 w-[88px]">Address:</span>
              <input 
                type="text" 
                value={download.url} 
                readOnly 
                className="flex-1 bg-white border border-slate-300 px-2 py-1 rounded text-slate-800 focus:outline-none selection:bg-brand-500 selection:text-white"
              />
            </div>

            {/* Description */}
            <div className="flex items-center gap-3">
              <span className="text-slate-600 w-[88px]">Description:</span>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-white border border-slate-300 px-2 py-1 rounded text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-3 bg-slate-100 rounded-b-lg border-t border-slate-300">
            <button
              onClick={() => {
                onOpen();
                onClose();
              }}
              disabled={download.status !== 'completed'}
              className="px-6 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open
            </button>
            <button
              onClick={onClose}
              className="px-6 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-800 transition-colors font-semibold shadow-sm"
            >
              OK
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
