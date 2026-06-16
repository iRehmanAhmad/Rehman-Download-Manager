import * as Dialog from '@radix-ui/react-dialog';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg max-h-[85vh]">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight text-white">Job Scheduler Help</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Learn how to automate your downloads.
            </Dialog.Description>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Getting Started</h3>
            <p>
              The Scheduler lets you organize downloads into <strong>Queues</strong>. You can manually run a queue, or set it to run automatically on a schedule.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Main download queue:</strong> The default list for all new downloads.</li>
              <li><strong>Synchronization queue:</strong> A system queue used to periodically check and update files.</li>
              <li><strong>Custom queues:</strong> Create your own queues to organize and schedule specific tasks (e.g., "Nightly Media").</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">Scheduling Types</h3>
            <p>
              <strong>Run once / daily:</strong> The queue will start at a specific time, complete its downloads, and then stop. You can limit this to certain days of the week.
            </p>
            <p>
              <strong>Repeat every X:</strong> The queue will continuously restart at regular hour/minute intervals to keep its files synchronized.
            </p>

            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">Queue Concurrency</h3>
            <p>
              In the "Files in the queue" tab, you can reorder your downloads to prioritize certain files. The <strong>Download X files at the same time</strong> setting controls how many parallel downloads are allowed for this specific queue.
            </p>
            
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">Automation Actions</h3>
            <p>
              You can set RDM to perform system actions automatically once a queue finishes its tasks:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open a specific file</li>
              <li>Exit the application</li>
              <li>Turn off, sleep, or hibernate your computer</li>
            </ul>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-500 rounded text-sm text-white transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
