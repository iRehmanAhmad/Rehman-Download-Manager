import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';

export interface ConnectionException {
  id: string;
  protocol: string;
  server: string;
  maxConnections: number;
}

interface ConnectionExceptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exception?: ConnectionException | null;
  onSave: (exception: ConnectionException) => void;
}

const PROTOCOLS = ['*', 'http://', 'https://', 'ftp://'];
const CONNECTIONS = [1, 2, 4, 8, 16, 24, 32];

export function ConnectionExceptionsDialog({ open, onOpenChange, exception, onSave }: ConnectionExceptionsDialogProps) {
  const [protocol, setProtocol] = useState('http://');
  const [server, setServer] = useState('');
  const [maxConnections, setMaxConnections] = useState(1);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      setProtocol(exception?.protocol || 'http://');
      setServer(exception?.server || '');
      setMaxConnections(exception?.maxConnections || 1);
    }
  }, [open, exception]);

  const handleSave = () => {
    if (!server.trim()) return; // Server is required
    onSave({
      id: exception?.id || crypto.randomUUID(),
      protocol,
      server: server.trim(),
      maxConnections,
    });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-[450px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm">
          
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300 gap-2">
            <Dialog.Title className="text-sm font-normal">Max. connections number for a server</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-black">
              <span className="text-lg leading-none">&times;</span>
            </Dialog.Close>
          </div>

          <div className="p-5 flex flex-col gap-6">
            
            {/* Server input */}
            <div className="flex flex-col gap-1 items-center">
              <label className="mb-1 text-center pr-12">Server</label>
              <div className="flex w-full gap-2 px-6">
                <select 
                  value={protocol} 
                  onChange={(e) => setProtocol(e.target.value)}
                  className="border border-gray-400 p-1 bg-white outline-none w-24 text-center"
                >
                  {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input 
                  type="text" 
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  className="border border-gray-400 border-b-blue-600 border-b-2 p-1 bg-white outline-none flex-1"
                  autoFocus
                />
              </div>
              <div className="text-xs mt-1 text-black pr-12">
                You may use asterisk as a wildcard pattern
              </div>
            </div>

            {/* Connections Dropdown */}
            <div className="flex items-center justify-end px-6 gap-3 pt-2">
              <label>Max. connections number</label>
              <select 
                value={maxConnections} 
                onChange={(e) => setMaxConnections(Number(e.target.value))}
                className="border border-gray-400 p-1 bg-white outline-none w-16 text-center"
              >
                {CONNECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-4 pt-4 pb-2">
              <button 
                onClick={handleSave}
                className="px-8 py-1 bg-white border border-blue-500 rounded hover:bg-blue-50 w-28 border-2"
              >
                OK
              </button>
              <Dialog.Close asChild>
                <button className="px-8 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0] w-28">
                  Cancel
                </button>
              </Dialog.Close>
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
