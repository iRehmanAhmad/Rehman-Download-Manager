import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface NewQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  existingQueuesCount: number;
}

export function NewQueueDialog({ open, onOpenChange, onSubmit, existingQueuesCount }: NewQueueDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(`Queue No. ${existingQueuesCount + 1}`);
    }
  }, [open, existingQueuesCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-800 bg-slate-900 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight text-white">Create New Queue</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-400">
              Enter a name for the new download queue.
            </Dialog.Description>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Queue Name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
