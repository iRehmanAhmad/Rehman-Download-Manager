import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';

export interface SiteLogin {
  id: string;
  protocol: string;
  server: string;
  username: string;
  password?: string;
}

interface SiteLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteLogin?: SiteLogin | null;
  onSave: (login: SiteLogin) => void;
}

export function SiteLoginDialog({ open, onOpenChange, siteLogin, onSave }: SiteLoginDialogProps) {
  const [protocol, setProtocol] = useState('https://');
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      if (siteLogin) {
        setProtocol(siteLogin.protocol || 'https://');
        setServer(siteLogin.server || '');
        setUsername(siteLogin.username || '');
        setPassword(siteLogin.password || '');
      } else {
        setProtocol('https://');
        setServer('');
        setUsername('');
        setPassword('');
      }
    }
  }, [open, siteLogin]);

  const handleSave = () => {
    if (!server.trim() && protocol !== '*') return; // IDM requires server unless protocol is *
    
    onSave({
      id: siteLogin?.id || crypto.randomUUID(),
      protocol,
      server: server.trim(),
      username: username.trim(),
      password,
    });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-transparent z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-[480px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm outline-none">
          
          <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-300 gap-2">
            <Dialog.Title className="text-xs font-normal">Site login</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-black">
              <span className="text-lg leading-none">&times;</span>
            </Dialog.Close>
          </div>

          <div className="px-4 pt-6 pb-2 grid grid-cols-[100px_1fr] items-start gap-x-2 gap-y-4">
            <div className="col-span-2 grid grid-cols-[80px_1fr] items-center gap-2 pl-2 pr-28">
              <span className="invisible">Label offset</span>
              <span className="text-black col-span-1">Server/path</span>
            </div>
            
            <div className="col-span-2 grid grid-cols-[80px_1fr] items-center gap-2 pl-2">
              <select 
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="border border-gray-400 p-1 py-0.5 outline-none bg-white text-black"
              >
                <option value="*">*</option>
                <option value="http://">http://</option>
                <option value="https://">https://</option>
                <option value="ftp://">ftp://</option>
              </select>
              <input 
                type="text" 
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="border border-gray-400 p-1 py-0.5 outline-none bg-white w-full"
              />
            </div>

            <div className="col-span-2 pl-[90px] pr-4">
              <p className="text-black text-[13px] leading-tight">
                Note: Type the path only if you have different login names for different server directories.
              </p>
            </div>

            <div className="col-span-2 grid grid-cols-[80px_1fr_100px] items-center gap-x-2 gap-y-4 pl-[70px] pr-2 pt-4">
              <span className="text-right pr-2">User</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-gray-400 p-1 py-0.5 outline-none bg-white w-48"
              />
              <button 
                onClick={handleSave}
                className="px-6 py-1 bg-white border border-blue-500 rounded hover:bg-blue-50 w-24 border-2 ml-auto"
              >
                OK
              </button>

              <span className="text-right pr-2">Password</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-400 p-1 py-0.5 outline-none bg-white w-48"
              />
              <Dialog.Close asChild>
                <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0] w-24 ml-auto">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </div>
          
          <div className="h-4"></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
