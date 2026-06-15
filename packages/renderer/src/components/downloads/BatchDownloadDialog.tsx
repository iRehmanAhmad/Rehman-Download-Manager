import { useState, useEffect, useCallback, useRef } from 'react';

export function BatchDownloadDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState('');
  const [wildcardType, setWildcardType] = useState<'numbers' | 'letters'>('numbers');
  const [fromStr, setFromStr] = useState('0');
  const [toStr, setToStr] = useState('100');
  const [wildcardSize, setWildcardSize] = useState('2');
  const [useAuth, setUseAuth] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);

  // Focus tracking
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setUrl(customEvent.detail || '');
      setShowDialog(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    window.addEventListener('open-batch-download-dialog', handleOpen);
    return () => window.removeEventListener('open-batch-download-dialog', handleOpen);
  }, []);

  const handleClose = useCallback(() => {
    if (!adding) {
      setShowDialog(false);
    }
  }, [adding]);

  // Generators
  const getSubstitutions = useCallback((): string[] => {
    const results: string[] = [];
    if (wildcardType === 'numbers') {
      const start = parseInt(fromStr, 10);
      const end = parseInt(toStr, 10);
      if (isNaN(start) || isNaN(end) || start > end || (end - start) > 10000) return [];
      
      const padSize = parseInt(wildcardSize, 10) || 1;
      
      for (let i = start; i <= end; i++) {
        let str = i.toString();
        while (str.length < padSize) {
          str = '0' + str;
        }
        results.push(str);
      }
    } else {
      const startCode = fromStr.charCodeAt(0);
      const endCode = toStr.charCodeAt(0);
      if (!fromStr || !toStr || startCode > endCode || (endCode - startCode) > 10000) return [];
      
      for (let i = startCode; i <= endCode; i++) {
        results.push(String.fromCharCode(i));
      }
    }
    return results;
  }, [wildcardType, fromStr, toStr, wildcardSize]);

  // Previews
  let firstFile = '';
  let secondFile = '';
  let lastFile = '';

  if (url.includes('*')) {
    const subs = getSubstitutions();
    if (subs.length > 0) {
      firstFile = url.replace('*', subs[0]);
      if (subs.length > 1) {
        secondFile = url.replace('*', subs[1]);
      }
      lastFile = url.replace('*', subs[subs.length - 1]);
    }
  }

  const handleAdd = async () => {
    if (!url.trim() || !url.includes('*')) return;
    setAdding(true);
    
    try {
      const subs = getSubstitutions();
      const generatedUrls: string[] = [];
      
      for (const sub of subs) {
        let finalUrl = url.replace('*', sub);
        
        // If basic auth is checked, prepend credentials to URL
        if (useAuth && login && password) {
            try {
                const u = new URL(finalUrl);
                u.username = encodeURIComponent(login);
                u.password = encodeURIComponent(password);
                finalUrl = u.toString();
            } catch (e) {
                // Ignore parsing errors, just append basic auth manually or let it fail
                const schemeMatch = finalUrl.match(/^https?:\/\//);
                if (schemeMatch) {
                    finalUrl = finalUrl.replace(schemeMatch[0], `${schemeMatch[0]}${encodeURIComponent(login)}:${encodeURIComponent(password)}@`);
                }
            }
        }
        generatedUrls.push(finalUrl);
      }
      
      // Extract the filename pattern (e.g. img*.jpg) from the URL
      let filenamePattern = url.split('/').pop() || '';
      if (!filenamePattern.includes('*')) {
        filenamePattern = `*_${filenamePattern}`;
      }
      
      // Dispatch to list dialog
      window.dispatchEvent(new CustomEvent('open-batch-download-list-dialog', { 
        detail: { urls: generatedUrls, pattern: filenamePattern } 
      }));
      
      setShowDialog(false);
    } catch (err) {
      console.error('Failed to generate batch downloads:', err);
    } finally {
      setAdding(false);
    }
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onMouseDown={handleClose}>
      <div
        className="bg-[#f0f0f0] border border-[#a0a0a0] rounded-sm p-4 w-full max-w-[550px] shadow-2xl text-black font-sans relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h2 className="text-[15px] text-black">Batch download</h2>
            <p className="text-[12px] text-[#333] leading-snug mt-2">
              It's possible to add a group of sequential file names like img001.jpg, img002.jpg, etc., img100.jpg to RDM download queue. Use the asterisk wildcard for the file name pattern.<br/>
              For example: https://example.com/assets/photos/img*.jpg
            </p>
          </div>
          <button onClick={handleClose} className="absolute top-2 right-2 text-slate-500 hover:text-black px-1 text-lg leading-none">✕</button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <label className="text-[12px] text-black w-14">Address</label>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-2 py-1 bg-white border border-[#0078d7] outline-none text-[12px] text-black"
          />
        </div>

        <fieldset className="border border-[#c0c0c0] p-3 pt-2 mb-4">
          <legend className="text-[12px] px-1 text-black">Replace asterisk to</legend>
          
          <div className="flex gap-6 mb-3">
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input
                type="radio"
                name="wildcardType"
                checked={wildcardType === 'numbers'}
                onChange={() => setWildcardType('numbers')}
                className="accent-[#0078d7]"
              />
              Numbers
            </label>
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input
                type="radio"
                name="wildcardType"
                checked={wildcardType === 'letters'}
                onChange={() => setWildcardType('letters')}
                className="accent-[#0078d7]"
              />
              Letters
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <label className="text-[12px]">From:</label>
              <input
                type="text"
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
                className="w-16 px-2 py-1 bg-white border border-[#a0a0a0] outline-none text-[12px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[12px]">To:</label>
              <input
                type="text"
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
                className="w-16 px-2 py-1 bg-white border border-[#a0a0a0] outline-none text-[12px]"
              />
            </div>
            
            {wildcardType === 'numbers' && (
              <div className="flex items-center gap-1 ml-auto">
                <label className="text-[12px]">Wildcard size</label>
                <input
                  type="text"
                  value={wildcardSize}
                  onChange={(e) => setWildcardSize(e.target.value)}
                  className="w-12 px-2 py-1 bg-white border border-[#a0a0a0] outline-none text-[12px]"
                />
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="border border-[#c0c0c0] p-3 pt-2 mb-4 relative">
          <legend className="text-[12px] px-1 text-black flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useAuth} 
              onChange={(e) => setUseAuth(e.target.checked)} 
              className="accent-[#0078d7]" 
            />
            Use authorization
          </legend>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[12px] text-[#808080]">Login</label>
              <input
                type="text"
                disabled={!useAuth}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="flex-1 px-2 py-1 bg-[#f0f0f0] border border-[#d0d0d0] outline-none text-[12px] disabled:bg-[#f0f0f0]"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[12px] text-[#808080]">Password</label>
              <input
                type="password"
                disabled={!useAuth}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-2 py-1 bg-[#f0f0f0] border border-[#d0d0d0] outline-none text-[12px] disabled:bg-[#f0f0f0]"
              />
            </div>
          </div>
        </fieldset>

        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-[12px] w-[70px]">First file:</label>
            <input type="text" readOnly value={firstFile} className="flex-1 px-2 py-0.5 bg-[#f0f0f0] border border-[#d0d0d0] outline-none text-[12px] text-[#606060]" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] w-[70px]">Second file:</label>
            <input type="text" readOnly value={secondFile} className="flex-1 px-2 py-0.5 bg-[#f0f0f0] border border-[#d0d0d0] outline-none text-[12px] text-[#606060]" />
          </div>
          <div className="text-[12px] text-center w-[70px]">...</div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] w-[70px]">Last file:</label>
            <input type="text" readOnly value={lastFile} className="flex-1 px-2 py-0.5 bg-[#f0f0f0] border border-[#d0d0d0] outline-none text-[12px] text-[#606060]" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleAdd}
            disabled={adding || !url.includes('*')}
            className="w-20 py-1 bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-black text-[12px] rounded-sm transition-colors disabled:opacity-50"
          >
            OK
          </button>
          <button
            onClick={handleClose}
            className="w-20 py-1 bg-[#e1e1e1] hover:bg-[#e5f1fb] border border-[#adadad] hover:border-[#0078d7] text-black text-[12px] rounded-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
