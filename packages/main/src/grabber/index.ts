import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export interface GrabResult {
  url: string;
  type: 'video' | 'audio' | 'image' | 'archive' | 'document' | 'other';
  filename: string;
  sizeHint?: string;
  pageUrl: string;
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.3gp'];
const AUDIO_EXTS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma', '.opus'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const ARCHIVE_EXTS = ['.zip', '.rar', '.7z', '.tar.gz', '.tar', '.gz', '.bz2', '.xz'];

const VIDEO_SOURCE_PATTERNS = [
  /"(https?:\/\/[^"]+\.(?:mp4|webm|mkv|m3u8|ts)[^"]*)"/gi,
  /'(https?:\/\/[^']+\.(?:mp4|webm|mkv|m3u8|ts)[^']*)'/gi,
  /https?:\/\/[^\s<>"']+\.(?:mp4|webm|mkv|flv|m3u8)/gi,
];

const LINK_PATTERN = /href=["'](https?:\/\/[^"']+)["']/gi;
const SRC_PATTERN = /src=["'](https?:\/\/[^"']+)["']/gi;

export async function detectVideos(url: string): Promise<GrabResult[]> {
  const results: GrabResult[] = [];
  const seen = new Set<string>();

  try {
    const parsedUrl = new URL(url);
    const html = await fetchPage(parsedUrl);

    for (const pattern of VIDEO_SOURCE_PATTERNS) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(html)) !== null) {
        const videoUrl = match[1] || match[0];
        if (seen.has(videoUrl)) continue;
        seen.add(videoUrl);

        const normalized = normalizeUrl(videoUrl, parsedUrl);
        results.push({
          url: normalized,
          type: 'video',
          filename: extractFilename(normalized),
          pageUrl: url,
        });
      }
    }
  } catch (err) {
    console.error(`[grabber] Error fetching ${url}:`, err);
  }

  return results;
}

export async function crawlSite(url: string): Promise<GrabResult[]> {
  const results: GrabResult[] = [];
  const seen = new Set<string>();

  try {
    const parsedUrl = new URL(url);
    const html = await fetchPage(parsedUrl);

    const patterns = [
      { regex: LINK_PATTERN, group: 1 },
      { regex: SRC_PATTERN, group: 1 },
    ];

    for (const { regex } of patterns) {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(html)) !== null) {
        const linkUrl = match[1];
        if (seen.has(linkUrl)) continue;
        seen.add(linkUrl);

        const type = detectType(linkUrl);
        if (type === 'other') continue;

        const normalized = normalizeUrl(linkUrl, parsedUrl);
        results.push({
          url: normalized,
          type,
          filename: extractFilename(normalized),
          pageUrl: url,
        });
      }
    }
  } catch (err) {
    console.error(`[grabber] Error crawling ${url}:`, err);
  }

  return results;
}

function fetchPage(parsedUrl: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = parsedUrl.protocol === 'https:' ? https : http;

    const req = mod.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, `${parsedUrl.protocol}//${parsedUrl.host}`);
          fetchPage(redirectUrl).then(resolve).catch(reject);
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

function detectType(url: string): GrabResult['type'] {
  const lower = url.toLowerCase().split('?')[0].split('#')[0];
  for (const ext of VIDEO_EXTS) if (lower.endsWith(ext)) return 'video';
  for (const ext of AUDIO_EXTS) if (lower.endsWith(ext)) return 'audio';
  for (const ext of IMAGE_EXTS) if (lower.endsWith(ext)) return 'image';
  for (const ext of ARCHIVE_EXTS) if (lower.endsWith(ext)) return 'archive';
  if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.xls') || lower.endsWith('.pptx')) return 'document';
  if (lower.includes('video') || lower.includes('stream')) return 'video';
  if (lower.includes('audio') || lower.includes('music')) return 'audio';
  return 'other';
}

function extractFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) return decodeURIComponent(last);
    if (last) return decodeURIComponent(last);
  } catch {}
  return 'download';
}

function normalizeUrl(url: string, base: URL): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `${base.protocol}${url}`;
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}
