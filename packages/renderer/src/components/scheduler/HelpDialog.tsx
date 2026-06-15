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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-800 bg-slate-900 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg flex flex-col max-h-[85vh]">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left border-b border-slate-800 pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight text-white">Job Scheduler Help</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-400">
              Learn how to automate your downloads.
            </Dialog.Description>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-slate-300">
            <h3 className="text-lg font-medium text-slate-100">Understanding Queues</h3>
            <p>
              The Job Scheduler lets you group downloads into <strong>Queues</strong>. A queue can be started and stopped manually, or automatically according to a schedule.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Main download queue:</strong> The default queue for all new downloads.</li>
              <li><strong>Synchronization queue:</strong> A special queue used to periodically check and update files.</li>
              <li><strong>Custom queues:</strong> You can create as many queues as you need to organize your downloads.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-100 mt-6">Scheduling Types</h3>
            <p>
              <strong>One-time downloading:</strong> The queue will start at the specified time, download all files, and then stop. You can schedule it to run once on a specific date, or run daily on certain days of the week.
            </p>
            <p>
              <strong>Periodic synchronization:</strong> The queue will start and re-check files every X hours/minutes. This is useful for keeping files up to date.
            </p>

            <h3 className="text-lg font-medium text-slate-100 mt-6">Files in the Queue</h3>
            <p>
              Switch to the "Files in the queue" tab to manage which files belong to the selected queue. You can change their order using the Up/Down arrows. The <strong>Download X files at the same time</strong> setting controls how many concurrent connections are used specifically for this queue.
            </p>
            
            <h3 className="text-lg font-medium text-slate-100 mt-6">Post-Download Actions</h3>
            <p>
              You can instruct RDM to perform actions automatically once the queue finishes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hang up modem (disconnect from the internet)</li>
              <li>Exit RDM completely</li>
              <li>Turn off, sleep, or hibernate your computer</li>
            </ul>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800 mt-2">
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
