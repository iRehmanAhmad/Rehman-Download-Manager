import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export function BatchDownloadDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState('');
  const [wildcardType, setWildcardType] = useState<'numbers' | 'letters'>('numbers');
  const [fromStr, setFromStr] = useState('1');
  const [toStr, setToStr] = useState('10');
  const [wildcardSize, setWildcardSize] = useState('1'); // Default padding 1
  const [useAuth, setUseAuth] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);

  // Focus tracking
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const initialUrl = customEvent.detail || '';
      setUrl(initialUrl);
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
      if (isNaN(start) || isNaN(end) || start > end || (end - start) > 1000) return [];
      
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
      if (!fromStr || !toStr || startCode > endCode || (endCode - startCode) > 1000) return [];
      
      for (let i = startCode; i <= endCode; i++) {
        results.push(String.fromCharCode(i));
      }
    }
    return results;
  }, [wildcardType, fromStr, toStr, wildcardSize]);

  // Validations
  const wildcardCount = (url.match(/\*/g) || []).length;
  const subs = getSubstitutions();
  const rangeError = wildcardType === 'numbers' 
    ? (parseInt(toStr, 10) - parseInt(fromStr, 10) > 1000 ? 'Range too large (max 1000)' : null)
    : (toStr.charCodeAt(0) - fromStr.charCodeAt(0) > 1000 ? 'Range too large (max 1000)' : null);

  const canGenerate = wildcardCount === 1 && !rangeError && subs.length > 0;

  // Previews
  let samples: string[] = [];
  if (wildcardCount === 1 && subs.length > 0) {
    if (subs.length <= 5) {
      samples = subs.map(s => url.replace('*', s));
    } else {
      samples = [
        url.replace('*', subs[0]),
        url.replace('*', subs[1]),
        '...',
        url.replace('*', subs[subs.length - 2]),
        url.replace('*', subs[subs.length - 1]),
      ];
    }
  }

  const handleAdd = async () => {
    if (!canGenerate) return;
    setAdding(true);
    
    try {
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
      
      let filenamePattern = url.split('/').pop() || '';
      if (!filenamePattern.includes('*')) {
        filenamePattern = `*_${filenamePattern}`;
      }
      
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

  const switchToSingle = () => {
    window.dispatchEvent(new CustomEvent('open-add-url-dialog', { detail: { url } }));
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onMouseDown={handleClose}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-[600px] shadow-2xl text-slate-800 dark:text-slate-200 font-sans relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Batch Download</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Step 1 of 2: Generate links, then review and confirm them in the next step.
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* URL Template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Template</label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/assets/photos/img*.jpg"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg outline-none text-sm transition-colors ${wildcardCount > 1 ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-600 focus:border-brand-500'}`}
            />
            {wildcardCount === 0 && url.length > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                <span>No wildcard (*) found. Switch to single download?</span>
                <button onClick={switchToSingle} className="text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1">
                  Open single download <ArrowRight size={14} />
                </button>
              </div>
            )}
            {wildcardCount > 1 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-500">
                <AlertCircle size={14} />
                <span>Exactly one wildcard (*) is supported. You have {wildcardCount}.</span>
              </div>
            )}
          </div>

          {/* Sequence Settings */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Generate Sequence</h3>
            
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="wildcardType"
                  checked={wildcardType === 'numbers'}
                  onChange={() => setWildcardType('numbers')}
                  className="accent-brand-600"
                />
                Numbers
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="wildcardType"
                  checked={wildcardType === 'letters'}
                  onChange={() => setWildcardType('letters')}
                  className="accent-brand-600"
                />
                Letters
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input
                  type="text"
                  value={fromStr}
                  onChange={(e) => setFromStr(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input
                  type="text"
                  value={toStr}
                  onChange={(e) => setToStr(e.target.value)}
                  className={`w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded-md outline-none text-sm ${rangeError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                />
              </div>
              {wildcardType === 'numbers' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Zero Padding</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={wildcardSize}
                    onChange={(e) => setWildcardSize(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md outline-none text-sm"
                  />
                </div>
              )}
            </div>
            {rangeError && (
              <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {rangeError}
              </div>
            )}
          </div>

          {/* Authentication */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white cursor-pointer mb-1">
              <input 
                type="checkbox" 
                checked={useAuth} 
                onChange={(e) => setUseAuth(e.target.checked)} 
                className="accent-brand-600 rounded" 
              />
              HTTP Authentication
            </label>
            <p className="text-xs text-slate-500 mb-3 ml-5">
              Credentials will be embedded into the generated URLs for basic auth.
            </p>
            
            {useAuth && (
              <div className="flex gap-4 ml-5">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Username</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md outline-none text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-2 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md outline-none text-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {wildcardCount === 1 && !rangeError && subs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Preview</label>
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full">
                  {subs.length} links will be generated
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1.5 overflow-hidden">
                {samples.map((s, idx) => (
                  <div key={idx} className={s === '...' ? 'text-center opacity-50' : 'truncate'} title={s}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !canGenerate}
              className="px-6 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {adding ? 'Generating...' : 'Continue to Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
