import { useState, useCallback } from 'react';
import { Globe, Search, Film, Link, Loader2, Plus } from 'lucide-react';
import type { GrabResult } from '@rdm/shared';

const TYPE_ICONS: Record<string, string> = {
  video: '🎬',
  audio: '🎵',
  image: '🖼️',
  archive: '📦',
  document: '📄',
  other: '🔗',
};

const TYPE_COLORS: Record<string, string> = {
  video: 'text-purple-400',
  audio: 'text-green-400',
  image: 'text-blue-400',
  archive: 'text-yellow-400',
  document: 'text-orange-400',
  other: 'text-slate-400',
};

export function GrabberPage() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<GrabResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const handleScanVideos = useCallback(async () => {
    if (!url.trim()) return;
    setScanning(true);
    setResults([]);
    setStatusMsg('Scanning for videos...');
    try {
      const detected = await window.api.grabber.detectVideos(url.trim());
      setResults(detected);
      setStatusMsg(detected.length > 0 ? `Found ${detected.length} video links` : 'No videos detected');
    } catch (err) {
      setStatusMsg('Failed to scan: ' + String(err));
    } finally {
      setScanning(false);
    }
  }, [url]);

  const handleCrawlSite = useCallback(async () => {
    if (!url.trim()) return;
    setScanning(true);
    setResults([]);
    setStatusMsg('Crawling site for media...');
    try {
      const found = await window.api.grabber.crawlSite(url.trim());
      setResults(found);
      setStatusMsg(found.length > 0 ? `Found ${found.length} links` : 'No media found');
    } catch (err) {
      setStatusMsg('Failed to crawl: ' + String(err));
    } finally {
      setScanning(false);
    }
  }, [url]);

  const handleAddAll = useCallback(async () => {
    const filtered = filter === 'all' ? results : results.filter((r) => r.type === filter);
    for (const item of filtered) {
      try {
        await window.api.download.add({ url: item.url, filename: item.filename });
      } catch {}
    }
    setStatusMsg(`Added ${filtered.length} downloads`);
  }, [results, filter]);

  const filteredResults = filter === 'all' ? results : results.filter((r) => r.type === filter);

  const typeCounts = results.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Grabber</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a web page URL to scan for media..."
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              onKeyDown={(e) => e.key === 'Enter' && handleScanVideos()}
            />
            <button
              onClick={handleScanVideos}
              disabled={scanning || !url.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              Scan Videos
            </button>
            <button
              onClick={handleCrawlSite}
              disabled={scanning || !url.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm rounded-lg transition-colors"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Crawl All
            </button>
          </div>

          {statusMsg && (
            <p className="text-sm text-slate-500 mt-3">{statusMsg}</p>
          )}

          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-6 mb-3">
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                  >
                    <option value="all">All ({results.length})</option>
                    {Object.entries(typeCounts).map(([type, count]) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md transition-colors"
                >
                  <Plus size={13} />
                  Add {filteredResults.length} to queue
                </button>
              </div>

              <div className="space-y-2">
                {filteredResults.map((item, i) => (
                  <div
                    key={`${item.url}-${i}`}
                    className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 hover:border-slate-700 transition-colors"
                  >
                    <span className="text-lg">{TYPE_ICONS[item.type] || '🔗'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{item.filename}</p>
                      <p className="text-xs text-slate-500 truncate">{item.url}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded bg-slate-800 ${TYPE_COLORS[item.type] || 'text-slate-400'}`}>
                      {item.type}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await window.api.download.add({ url: item.url, filename: item.filename });
                          setStatusMsg(`Added: ${item.filename}`);
                        } catch {}
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-brand-400"
                      title="Add to downloads"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {results.length === 0 && !scanning && !statusMsg && (
            <div className="flex flex-col items-center justify-center mt-24 text-slate-600">
              <Globe size={48} strokeWidth={1.5} />
              <p className="mt-4 text-sm">Enter a website URL to scan for downloadable media</p>
              <p className="text-xs mt-1">Detects videos, audio, images, archives, and documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
