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
          
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <Dialog.Title className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <FileText className="w-4 h-4 text-brand-500" />
              File Properties
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-slate-100 rounded transition-colors" title="Close">
                <X size={16} className="text-slate-500 hover:text-slate-700" />
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
            <div className="flex items-center gap-2">
              <span className="text-slate-600 w-[70px]">Save To:</span>
              <input 
                type="text" 
                value={download.filepath} 
                readOnly 
                className="flex-1 bg-white border border-slate-300 px-2 py-1.5 rounded text-slate-800 focus:outline-none focus:border-brand-500 selection:bg-brand-500 selection:text-white truncate"
              />
              <button
                onClick={() => navigator.clipboard.writeText(download.filepath)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 text-slate-700 transition-colors"
                title="Copy Save Path"
              >
                Copy
              </button>
              <button 
                onClick={handleMove}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap"
              >
                Change path
              </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 w-[70px]">Address:</span>
              <input 
                type="text" 
                value={download.url} 
                readOnly 
                className="flex-1 bg-white border border-slate-300 px-2 py-1.5 rounded text-slate-800 focus:outline-none selection:bg-brand-500 selection:text-white truncate"
              />
              <button
                onClick={() => navigator.clipboard.writeText(download.url)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 text-slate-700 transition-colors"
                title="Copy URL"
              >
                Copy
              </button>
            </div>
    

          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-3 bg-slate-50 rounded-b-lg border-t border-slate-200">
            <button
              onClick={() => {
                onOpen();
                onClose();
              }}
              disabled={download.status !== 'completed'}
              className="px-4 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              Open file
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-brand-500 border border-transparent rounded hover:bg-brand-600 text-white transition-colors font-semibold shadow-sm"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
