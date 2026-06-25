import { EventEmitter } from 'events';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import type { Download, ChunkInfo } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import {
  PROGRESS_UPDATE_INTERVAL,
  DEFAULT_CONNECTIONS,
  MAX_CONNECTIONS,
  SETTINGS_KEY,
} from '@rdm/shared';
import { DownloadRepository } from '../storage/download.repository';
import { getDatabase } from '../storage/database';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { spawn } from 'node:child_process';
import { YtdlpDownloadTask } from './ytdlp.task';

const MIN_CHUNK_SIZE = 1024 * 256;
const SPEED_AVERAGE_WINDOW = 3000;
const BASE_RETRY_DELAY = 2000;
const MAX_CHUNK_RETRIES = 5;
const CHUNK_RETRY_DELAY = 1500;

interface SpeedSample {
  time: number;
  bytes: number;
}

interface ChunkStream {
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

export interface DownloadEngineEvents {
  progress: (download: Download) => void;
  completed: (download: Download) => void;
  error: (download: Download) => void;
  statusChanged: (download: Download) => void;
}

export interface IDownloadTask extends EventEmitter {
  speedLimit: number;
  numConnections: number;
  readonly status: string;
  readonly currentSpeed: number;
  snapshot(): Download;
  updateFilePath(filepath: string): void;
  updateOptions(opts: Partial<Download>): void;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  cancel(): void;
}



export class HttpDownloadTask extends EventEmitter implements IDownloadTask {
  private dl: Download;
  private tempDir: string;
  private activeChunks: Set<ChunkStream> = new Set();
  private speedSamples: SpeedSample[] = [];
  private paused = false;
  private cancelled = false;
  private lastProgressTime = 0;
  private globalRetryCount = 0;
  private chunkRetries = new Map<string, number>();
  private getGlobalLimit: () => number;
  private isThrottleTimer: ReturnType<typeof setInterval> | null = null;

  speedLimit = 0;

  get status() {
    return this.dl.status;
  }

  get numConnections() {
    return this.dl.numConnections;
  }

  set numConnections(n: number) {
    this.dl.numConnections = n;
  }

  get currentSpeed(): number {
    return this.dl.speed;
  }

  constructor(download: Download, tempDir: string, getGlobalLimit: () => number) {
    super();
    this.dl = { ...download };
    this.tempDir = tempDir;
    this.speedLimit = download.speedLimit || 0;
    this.getGlobalLimit = getGlobalLimit;
  }

  private getSetting(key: string): string {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? row.value : '';
    } catch {
      return '';
    }
  }

  snapshot(): Download {
    return { ...this.dl };
  }

  updateFilePath(filepath: string) {
    this.dl.filepath = filepath;
  }

  updateOptions(opts: Partial<Download>) {
    if (opts.filename) this.dl.filename = opts.filename;
    if (opts.filepath !== undefined) this.dl.filepath = opts.filepath;
    if (opts.categoryId !== undefined) this.dl.categoryId = opts.categoryId;
    if (opts.numConnections) this.dl.numConnections = opts.numConnections;
    if (opts.metadata) this.dl.metadata = opts.metadata;
    if (opts.priority) this.dl.priority = opts.priority;
  }

  async start(): Promise<void> {
    if (this.dl.status === 'downloading' && this.activeChunks.size > 0) return;
    this.dl.status = 'downloading';
    this.dl.startedAt = Date.now();

    try {
      await this.performDownload();
    } catch (err) {
      if (this.cancelled) return;
      if (this.globalRetryCount < this.dl.maxRetries) {
        await this.retryWithBackoff(err);
      } else {
        this.dl.status = 'error';
        this.dl.errorMessage = String(err);
        this.emit('error', this.snapshot());
      }
    }
  }

  private async retryWithBackoff(err: unknown): Promise<void> {
    this.globalRetryCount++;
    this.dl.retryCount = this.globalRetryCount;
    this.dl.status = 'queued';
    this.dl.errorMessage = `Retry ${this.globalRetryCount}/${this.dl.maxRetries}: ${String(err)}`;

    const delay = BASE_RETRY_DELAY * Math.pow(2, this.globalRetryCount - 1);
    await new Promise<void>((resolve) => setTimeout(resolve, delay));

    if (this.cancelled || this.paused) return;
    await this.start();
  }

  private async performDownload(): Promise<void> {
    const parsedUrl = new URL(this.dl.url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;

    // If we already have chunks and a file size, we know it's resumable
    const alreadyChunked = this.dl.chunks && this.dl.chunks.length > 0 && this.dl.fileSize > 0;

    let resumeInfo = { supportsRange: false, fileSize: -1 };
    if (!alreadyChunked) {
      resumeInfo = await this.getResumeInfo(mod, parsedUrl);
    } else {
      resumeInfo = { supportsRange: true, fileSize: this.dl.fileSize };
    }

    if (resumeInfo.supportsRange && resumeInfo.fileSize > 0) {
      this.dl.fileSize = resumeInfo.fileSize;
      await this.downloadChunked(mod, parsedUrl, resumeInfo);
    } else {
      this.dl.numConnections = 1;
      await this.downloadSequential(mod, parsedUrl);
    }
  }

  pause(): void {
    this.paused = true;
    this.dl.status = 'paused';
    this.clearThrottleTimer();
    for (const chunk of this.activeChunks) {
      chunk.destroy();
    }
    this.activeChunks.clear();
  }

  resume(): void {
    this.paused = false;
    if (this.dl.status === 'paused') {
      this.dl.status = 'downloading';
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.dl.status = 'cancelled';
    this.clearThrottleTimer();
    for (const chunk of this.activeChunks) {
      chunk.destroy();
    }
    this.activeChunks.clear();
    this.cleanupTemp();
  }

  private getTempPath(id?: string): string {
    return path.join(this.tempDir, `rdm-${id || this.dl.id}`);
  }

  /**
   * Re-sync each chunk's `downloaded` counter to the actual size of its part
   * file on disk. Called when resuming a previously-started download so a
   * missing or truncated part file cannot cause an append at the wrong offset.
   */
  private reconcileChunksFromDisk(): void {
    for (const chunk of this.dl.chunks) {
      if (chunk.status === 'completed') continue;
      const partPath = `${this.getTempPath()}.part${chunk.index}`;
      let realBytes = 0;
      try {
        realBytes = fs.statSync(partPath).size;
      } catch {
        realBytes = 0; // part file gone — restart this chunk from scratch
      }

      const chunkSize = chunk.endByte - chunk.startByte + 1;
      // Never trust more bytes than the chunk is supposed to hold.
      realBytes = Math.min(realBytes, Math.max(0, chunkSize));

      if (realBytes !== chunk.downloaded) {
        chunk.downloaded = realBytes;
      }

      if (chunkSize > 0 && realBytes >= chunkSize) {
        chunk.status = 'completed';
      } else if (realBytes === 0) {
        chunk.status = 'pending';
      }
    }
    this.dl.downloaded = this.dl.chunks.reduce((sum, c) => sum + c.downloaded, 0);
  }

  private cleanupTemp(): void {
    try {
      const tmp = this.getTempPath();
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      for (let i = 0; i < this.dl.numConnections || 8; i++) {
        const ctmp = `${tmp}.part${i}`;
        if (fs.existsSync(ctmp)) fs.unlinkSync(ctmp);
      }
    } catch {
      // best effort
    }
  }

  private getRequestOptions(parsedUrl: URL, range?: string): http.RequestOptions {
    const proxyUrl = this.getSetting(SETTINGS_KEY.PROXY_URL);
    let agent;
    if (proxyUrl) {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    const headers: Record<string, string> = { ...this.dl.headers };
    
    // Auto-detect embedded Basic Auth in URL
    if (parsedUrl.username || parsedUrl.password) {
      const auth = Buffer.from(`${parsedUrl.username}:${parsedUrl.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    if (range) {
      headers['Range'] = range;
    }
    if (this.dl.referer) {
      headers['Referer'] = this.dl.referer;
    }
    headers['User-Agent'] = this.dl.userAgent || 'Mozilla/5.0';

    return {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      agent,
      headers,
    };
  }

  private async getResumeInfo(
    mod: typeof http | typeof https,
    parsedUrl: URL,
  ): Promise<{ supportsRange: boolean; fileSize: number }> {
    return new Promise((resolve) => {
      const req = mod.request(
        {
          ...this.getRequestOptions(parsedUrl),
          method: 'HEAD',
        },
        (res) => {
          const headers = res.headers;
          const acceptRanges = String(headers['accept-ranges'] || '');
          const supportsRange =
            acceptRanges.includes('bytes') &&
            headers['content-length'] != null;
          const fileSize = parseInt(headers['content-length'] || '-1', 10);
          res.destroy();
          resolve({ supportsRange, fileSize });
        },
      );
      req.on('error', () => resolve({ supportsRange: false, fileSize: -1 }));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ supportsRange: false, fileSize: -1 });
      });
      req.end();
    });
  }

  private applySpeedThrottle(): void {
    this.clearThrottleTimer();
    const effectiveLimit = this.getEffectiveSpeedLimit();
    if (effectiveLimit <= 0) return;

    this.isThrottleTimer = setInterval(() => {
      if (this.paused || this.cancelled) {
        this.clearThrottleTimer();
        return;
      }
      const currentBps = this.calculateSpeed();
      if (currentBps > effectiveLimit * 1.05) {
        const pauseTime = Math.max(50, ((currentBps - effectiveLimit) / currentBps) * 1000);
        for (const chunk of this.activeChunks) {
          chunk.pause();
        }
        setTimeout(() => {
          if (!this.paused && !this.cancelled) {
            for (const chunk of this.activeChunks) {
              chunk.resume();
            }
          }
        }, pauseTime);
      }
    }, 1000);
  }

  private clearThrottleTimer(): void {
    if (this.isThrottleTimer) {
      clearInterval(this.isThrottleTimer);
      this.isThrottleTimer = null;
    }
  }

  private getEffectiveSpeedLimit(): number {
    const global = this.getGlobalLimit();
    if (this.speedLimit > 0 && global > 0) return Math.min(this.speedLimit, global);
    if (this.speedLimit > 0) return this.speedLimit;
    if (global > 0) return global;
    return 0;
  }

  private async downloadSequential(
    mod: typeof http | typeof https,
    parsedUrl: URL,
  ): Promise<void> {
    const outputPath = this.getTempPath();
    const fileStream = fs.createWriteStream(outputPath);
    this.applySpeedThrottle();

    return new Promise((resolve, reject) => {
      const req = mod.request(this.getRequestOptions(parsedUrl), (res) => {
        const streamHandle: ChunkStream = {
          pause: () => res.pause(),
          resume: () => res.resume(),
          destroy: () => req.destroy(),
        };
        this.activeChunks.add(streamHandle);

        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
          this.activeChunks.clear();
          const redirectUrl = new URL(res.headers.location, this.dl.url);
          const rmod = redirectUrl.protocol === 'https:' ? https : http;
          this.downloadSequential(rmod, redirectUrl).then(resolve).catch(reject);
          return;
        }

        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        if (contentLength > 0) this.dl.fileSize = contentLength;

        this.dl.chunks = [
          {
            id: uuid(),
            downloadId: this.dl.id,
            index: 0,
            startByte: 0,
            endByte: contentLength > 0 ? contentLength - 1 : 0,
            downloaded: 0,
            status: 'downloading',
            speed: 0,
          },
        ];

        let lastBytes = 0;
        let speedTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
          const chunk = this.dl.chunks[0];
          if (!chunk) return;
          const now = Date.now();
          const bytesDelta = chunk.downloaded - lastBytes;
          lastBytes = chunk.downloaded;

          this.speedSamples.push({ time: now, bytes: bytesDelta });
          this.pruneSpeedSamples(now);

          const avgSpeed = this.calculateSpeed();
          this.dl.speed = avgSpeed;
          chunk.speed = avgSpeed;

          if (this.dl.fileSize > 0) {
            this.dl.downloaded = chunk.downloaded;
            this.dl.progress = Math.min(100, (this.dl.downloaded / this.dl.fileSize) * 100);
            if (avgSpeed > 0) {
              this.dl.eta = (this.dl.fileSize - this.dl.downloaded) / avgSpeed;
            }
          }

          this.emitProgress();
        }, PROGRESS_UPDATE_INTERVAL);

        res.on('data', (chunk: Buffer) => {
          if (this.paused || this.cancelled) {
            req.destroy();
            return;
          }
          this.dl.chunks[0].downloaded += chunk.length;
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          if (speedTimer) { clearInterval(speedTimer); speedTimer = null; }
          this.clearThrottleTimer();
          this.activeChunks.clear();
          if (this.cancelled) return;
          this.runAntivirusScanAndComplete(outputPath);
          resolve();
        });

        res.on('error', (err) => {
          if (speedTimer) { clearInterval(speedTimer); speedTimer = null; }
          this.clearThrottleTimer();
          this.activeChunks.clear();
          if (this.paused || this.cancelled) resolve(); else reject(err);
        });
      });

      req.on('error', (err) => {
        this.clearThrottleTimer();
        this.activeChunks.clear();
        if (this.paused || this.cancelled) resolve(); else reject(err);
      });
      req.end();
    });
  }

  private async downloadChunked(
    mod: typeof http | typeof https,
    parsedUrl: URL,
    resumeInfo: { supportsRange: boolean; fileSize: number },
  ): Promise<void> {
    this.applySpeedThrottle();

    if (!this.dl.chunks || this.dl.chunks.length === 0) {
      this.dl.chunks = [
        {
          id: uuid(),
          downloadId: this.dl.id,
          index: 0,
          startByte: 0,
          endByte: resumeInfo.fileSize - 1,
          downloaded: 0,
          status: 'pending',
          speed: 0,
        }
      ];
    } else {
      // Resuming: reconcile each chunk's recorded progress against the real
      // bytes on disk. The persisted `downloaded` value can drift from reality
      // if the part file was purged, truncated, or only partially flushed —
      // trusting it blindly would append at the wrong offset and corrupt the
      // merged file. The on-disk size is the source of truth.
      this.reconcileChunksFromDisk();

      // Reset any previously downloading chunks to pending so they restart properly
      for (const chunk of this.dl.chunks) {
        if (chunk.status === 'downloading') {
          chunk.status = 'pending';
        }
      }
    }

    return new Promise((resolve, reject) => {
      this.dispatchConnections(mod, parsedUrl, resolve, reject);
    });
  }

  private dispatchConnections(
    mod: typeof http | typeof https,
    parsedUrl: URL,
    resolve: () => void,
    reject: (err: any) => void
  ) {
    if (this.paused || this.cancelled) return;

    // Check if everything is completely downloaded
    const allCompleted = this.dl.chunks.every(c => c.status === 'completed');
    if (allCompleted) {
      this.clearThrottleTimer();
      this.activeChunks.clear();
      const outputPath = this.getTempPath();
      this.mergeChunks(outputPath).then(resolve).catch(reject);
      return;
    }

    while (this.activeChunks.size < this.numConnections) {
      let pendingChunk = this.dl.chunks.find(c => c.status === 'pending');
      if (pendingChunk) {
        this.downloadChunk(mod, parsedUrl, pendingChunk, resolve, reject);
        continue;
      }

      // No pending chunks. Find the largest active chunk to split dynamically.
      const splittable = this.dl.chunks
        .filter(c => c.status === 'downloading')
        .map(c => {
          const remaining = (c.endByte - c.startByte + 1) - c.downloaded;
          return { chunk: c, remaining };
        })
        .filter(c => c.remaining > MIN_CHUNK_SIZE * 2)
        .sort((a, b) => b.remaining - a.remaining);

      if (splittable.length === 0) break; // Nothing to split

      const target = splittable[0].chunk;
      const remaining = splittable[0].remaining;
      const currentPos = target.startByte + target.downloaded;

      const newEndByte = target.endByte;
      const splitPos = currentPos + Math.floor(remaining / 2);

      // Dynamically shrink the active chunk
      target.endByte = splitPos;

      // Create new chunk for the second half
      const newChunk: ChunkInfo = {
        id: uuid(),
        downloadId: this.dl.id,
        index: this.dl.chunks.length,
        startByte: splitPos + 1,
        endByte: newEndByte,
        downloaded: 0,
        status: 'pending',
        speed: 0
      };

      this.dl.chunks.push(newChunk);
      this.downloadChunk(mod, parsedUrl, newChunk, resolve, reject);
    }
  }

  /**
   * Handle a failed chunk. Retries the individual chunk up to
   * MAX_CHUNK_RETRIES (marking it pending and re-dispatching) before failing
   * the whole download. This prevents a single throttled/dropped range request
   * from aborting every other healthy chunk.
   */
  private handleChunkFailure(
    chunk: ChunkInfo,
    err: unknown,
    mod: typeof http | typeof https,
    parsedUrl: URL,
    resolve: () => void,
    reject: (err: any) => void,
  ): void {
    if (this.paused || this.cancelled) {
      resolve();
      return;
    }

    const attempts = (this.chunkRetries.get(chunk.id) || 0) + 1;
    this.chunkRetries.set(chunk.id, attempts);

    if (attempts > MAX_CHUNK_RETRIES) {
      chunk.status = 'error';
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // Re-queue this chunk; resume from whatever it has on disk already.
    chunk.status = 'pending';
    setTimeout(() => {
      if (this.paused || this.cancelled) {
        resolve();
        return;
      }
      try {
        this.dispatchConnections(mod, parsedUrl, resolve, reject);
      } catch (e) {
        reject(e);
      }
    }, CHUNK_RETRY_DELAY * attempts);
  }

  private downloadChunk(
    mod: typeof http | typeof https,
    parsedUrl: URL,
    chunk: ChunkInfo,
    resolve: () => void,
    reject: (err: any) => void
  ): void {
    const partPath = `${this.getTempPath()}.part${chunk.index}`;
    // If it's resuming, we open in 'a' (append) mode, otherwise 'w' (write) mode
    const fileStream = fs.createWriteStream(partPath, { flags: chunk.downloaded > 0 ? 'a' : 'w' });

    const currentStart = chunk.startByte + chunk.downloaded;
    if (currentStart > chunk.endByte) {
      // Chunk already finished
      chunk.status = 'completed';
      this.dispatchConnections(mod, parsedUrl, resolve, reject);
      return;
    }

    const range = `bytes=${currentStart}-${chunk.endByte}`;
    
    // Synchronously mark as downloading and add a placeholder to activeChunks
    // to prevent dispatchConnections from infinite looping.
    chunk.status = 'downloading';
    let resObject: any = null;
    let req: any = null;
    
    const streamHandle: ChunkStream = {
      pause: () => { if (resObject) resObject.pause(); },
      resume: () => { if (resObject) resObject.resume(); },
      destroy: () => { if (req) req.destroy(); },
    };
    this.activeChunks.add(streamHandle);

    req = mod.request(
      this.getRequestOptions(parsedUrl, range),
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
           req.destroy();
           this.activeChunks.delete(streamHandle);
           try { fileStream.close(); } catch {}
           this.handleChunkFailure(
             chunk,
             new Error(`Server responded with ${res.statusCode}`),
             mod,
             parsedUrl,
             resolve,
             reject,
           );
           return;
        }

        resObject = res;

        let lastBytes = chunk.downloaded;
        const speedTimer = setInterval(() => {
          const now = Date.now();
          const delta = chunk.downloaded - lastBytes;
          lastBytes = chunk.downloaded;

          this.speedSamples.push({ time: now, bytes: delta });
          this.pruneSpeedSamples(now);

          const avgSpeed = this.calculateSpeed();
          this.dl.speed = avgSpeed;
          chunk.speed = avgSpeed;

          this.dl.downloaded = this.dl.chunks.reduce(
            (sum, c) => sum + c.downloaded,
            0,
          );
          if (this.dl.fileSize > 0) {
            this.dl.progress = Math.min(
              100,
              (this.dl.downloaded / this.dl.fileSize) * 100,
            );
            if (avgSpeed > 0) {
              this.dl.eta = (this.dl.fileSize - this.dl.downloaded) / avgSpeed;
            }
          }

          this.emitProgress();
        }, PROGRESS_UPDATE_INTERVAL);

        res.on('data', (data: Buffer) => {
          if (this.paused || this.cancelled) {
            req.destroy();
            return;
          }

          // In case target.endByte was dynamically shrunk, only take what we need
          const remaining = (chunk.endByte - chunk.startByte + 1) - chunk.downloaded;
          
          if (data.length >= remaining) {
            chunk.downloaded += remaining;
            fileStream.write(data.slice(0, remaining));
            req.destroy(); // this triggers res.on('close') or res.on('end') eventually
            return;
          }

          chunk.downloaded += data.length;
          fileStream.write(data);
        });

        res.on('end', () => {
          clearInterval(speedTimer);
          this.activeChunks.delete(streamHandle);
          fileStream.close(() => {
            if (chunk.startByte + chunk.downloaded >= chunk.endByte) {
              chunk.status = 'completed';
            } else {
              chunk.status = 'pending'; // Incomplete, retry
            }
            try { this.dispatchConnections(mod, parsedUrl, resolve, reject); } catch(e) { reject(e); }
          });
        });

        res.on('close', () => {
          clearInterval(speedTimer);
          this.activeChunks.delete(streamHandle);
          fileStream.close(() => {
            if (chunk.status === 'downloading') {
              if (chunk.startByte + chunk.downloaded >= chunk.endByte) {
                chunk.status = 'completed';
              } else {
                chunk.status = 'pending';
              }
            }
            try { this.dispatchConnections(mod, parsedUrl, resolve, reject); } catch(e) { reject(e); }
          });
        });

        res.on('error', (err) => {
          clearInterval(speedTimer);
          this.activeChunks.delete(streamHandle);
          try { fileStream.close(); } catch {}
          this.handleChunkFailure(chunk, err, mod, parsedUrl, resolve, reject);
        });
      },
    );

    req.on('error', (err: Error) => {
      this.activeChunks.delete(streamHandle);
      try { fileStream.close(); } catch {}
      this.handleChunkFailure(chunk, err, mod, parsedUrl, resolve, reject);
    });
    req.end();
  }

  private async mergeChunks(outputPath: string): Promise<void> {
    if (this.cancelled) return;
    this.dl.status = 'merging';
    this.emitProgress();

    const writeStream = fs.createWriteStream(outputPath);
    const sortedChunks = this.dl.chunks.sort((a, b) => a.index - b.index);

    try {
      for (const chunk of sortedChunks) {
        if (this.cancelled) break;
        const partPath = `${this.getTempPath()}.part${chunk.index}`;
        if (!fs.existsSync(partPath)) continue;

        await new Promise<void>((res, rej) => {
          const readStream = fs.createReadStream(partPath);
          readStream.on('error', rej);
          readStream.on('end', () => {
            try { fs.unlinkSync(partPath); } catch {}
            res();
          });
          readStream.pipe(writeStream, { end: false });
        });
      }

      await new Promise<void>((res) => {
        writeStream.end(() => {
          if (!this.cancelled) {
            this.runAntivirusScanAndComplete(outputPath);
          }
          res();
        });
      });
    } catch (err) {
      writeStream.destroy();
      throw err;
    }
  }

  private runAntivirusScanAndComplete(outputPath: string): void {
    const avEnabled = this.getSetting(SETTINGS_KEY.ANTIVIRUS_ENABLED) === 'true';
    if (!avEnabled) {
      this.handleCompletion(outputPath);
      return;
    }

    const avCmd = this.getSetting(SETTINGS_KEY.ANTIVIRUS_CMD);
    if (!avCmd) {
      this.handleCompletion(outputPath);
      return;
    }

    this.dl.status = 'scanning';
    this.emitProgress();

    // Pass the scanner path and file as discrete argv entries with shell:false
    // so neither the configured command nor the file path can inject shell
    // metacharacters.
    const child = spawn(avCmd, [outputPath], { shell: false });
    let settled = false;

    child.on('error', () => {
      // Scanner failed to launch (bad path/permissions). Don't block the
      // download on a misconfigured scanner — complete it normally.
      if (settled) return;
      settled = true;
      this.handleCompletion(outputPath);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        this.dl.status = 'error';
        this.dl.errorMessage = 'Virus detected by Antivirus scanner!';
        try { fs.unlinkSync(outputPath); } catch {}
        this.emit('error', this.snapshot());
      } else {
        this.handleCompletion(outputPath);
      }
    });
  }

  private async handleCompletion(outputPath: string): Promise<void> {
    this.dl.status = 'completing';

    if (this.dl.checksum) {
      const verified = await this.verifyChecksum(outputPath);
      if (!verified) {
        this.dl.status = 'error';
        this.dl.errorMessage = 'Checksum verification failed';
        this.emit('error', this.snapshot());
        try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
        return;
      }
    }

    const finalPath = this.dl.filepath || path.join(
      path.dirname(this.tempDir),
      this.dl.filename,
    );
    try {
      fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    } catch {}
    try {
      fs.renameSync(outputPath, finalPath);
    } catch {
      const altPath = path.join(
        path.dirname(this.tempDir),
        `rdm-${Date.now()}-${this.dl.filename}`,
      );
      fs.renameSync(outputPath, altPath);
      this.dl.filepath = altPath;
    }
    this.dl.filepath = finalPath;
    this.dl.downloaded = this.dl.fileSize;
    this.dl.progress = 100;

    await this.runPostProcessing(finalPath);

    this.dl.status = 'completed';
    this.dl.completedAt = Date.now();
    this.emit('completed', this.snapshot());
  }

  /**
   * Run optional FFmpeg conversion / archive auto-extraction after the file is
   * in place. Never throws — post-processing failures are logged but the
   * download still counts as completed.
   */
  private async runPostProcessing(finalPath: string): Promise<void> {
    try {
      const { runPostProcessing } = await import('../postprocess');
      const wantsConvert = typeof this.dl.metadata?.convertTo === 'string';
      const autoExtract = this.getSetting(SETTINGS_KEY.AUTO_EXTRACT_ARCHIVES) === 'true';
      if (!wantsConvert && !autoExtract) return; // nothing configured — skip

      this.dl.status = 'processing';
      this.emitProgress();

      const res = await runPostProcessing(
        finalPath,
        this.dl.metadata,
        (key) => this.getSetting(key),
      );
      if (res.newFilePath) this.dl.filepath = res.newFilePath;
      if (res.messages.length > 0) {
        console.log(`[postprocess] ${this.dl.filename}: ${res.messages.join('; ')}`);
      }
    } catch (err) {
      console.error('[postprocess] error:', err);
    }
  }

  /** Pick the hash algorithm from the expected checksum's hex length. */
  private checksumAlgorithm(expected: string): string | null {
    switch (expected.trim().length) {
      case 32: return 'md5';
      case 40: return 'sha1';
      case 64: return 'sha256';
      case 128: return 'sha512';
      default: return null;
    }
  }

  private async verifyChecksum(filePath: string): Promise<boolean> {
    const expected = (this.dl.checksum || '').trim().toLowerCase();
    const algo = this.checksumAlgorithm(expected);
    if (!algo) return false; // unrecognized checksum format

    return new Promise((resolve) => {
      try {
        const hash = crypto.createHash(algo);
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => resolve(false));
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => {
          const fileHash = hash.digest('hex');
          resolve(fileHash.toLowerCase() === expected);
        });
      } catch {
        resolve(false);
      }
    });
  }

  private emitProgress(): void {
    const now = Date.now();
    if (now - this.lastProgressTime >= PROGRESS_UPDATE_INTERVAL) {
      this.lastProgressTime = now;
      this.emit('progress', this.snapshot());
    }
  }

  private pruneSpeedSamples(now: number): void {
    const cutoff = now - SPEED_AVERAGE_WINDOW;
    while (
      this.speedSamples.length > 0 &&
      this.speedSamples[0].time < cutoff
    ) {
      this.speedSamples.shift();
    }
  }

  private calculateSpeed(): number {
    if (this.speedSamples.length === 0) return 0;
    const total = this.speedSamples.reduce((s, samp) => s + samp.bytes, 0);
    const span =
      (this.speedSamples[this.speedSamples.length - 1].time -
        this.speedSamples[0].time) /
        1000 || 0.5;
    return total / span;
  }
}
export class DownloadEngine extends EventEmitter {
  private tasks = new Map<string, IDownloadTask>();
  private queue: string[] = [];
  private maxConcurrent: number;
  private globalSpeedLimit: number;
  private tempDir: string;
  private saveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxConcurrent = 5, globalSpeedLimit = 0) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.globalSpeedLimit = globalSpeedLimit;
    // Store partial chunks under userData (persistent) rather than the OS temp
    // dir, which can be purged on reboot/cleanup and silently truncate resumes.
    this.tempDir = path.join(app.getPath('userData'), 'partials');
    fs.mkdirSync(this.tempDir, { recursive: true });
    
    this.loadFromDB();
    this.startSaveLoop();
  }

  
  private createTask(download: Download): IDownloadTask {
    if (download.type === 'ytdlp') {
      return new YtdlpDownloadTask(download, this.tempDir, () => this.getGlobalBytesPerSecond());
    }
    return new HttpDownloadTask(download, this.tempDir, () => this.getGlobalBytesPerSecond());
  }

  private loadFromDB(): void {
    const dls = DownloadRepository.loadAllDownloads();
    for (const dl of dls) {
      // Defensive: loadAllDownloads already demotes crashed in-flight
      // downloads to 'paused', but normalize any stray 'downloading' too.
      if (dl.status === 'downloading') {
        dl.status = 'queued';
        DownloadRepository.saveDownload(dl);
      }
      const task = this.createTask(dl);
      this.tasks.set(dl.id, task);

      // Re-enqueue items that were genuinely waiting in the queue so they
      // resume after a restart. Crash-paused downloads stay paused for the
      // user to resume manually (safer than silently restarting them).
      if (dl.status === 'queued') {
        this.bindTaskListeners(task);
        this.queue.push(dl.id);
      }
    }
    this.processQueue();
  }

  /** Bind engine-level event forwarding onto a task. */
  private bindTaskListeners(task: IDownloadTask): void {
    task.removeAllListeners();
    task.on('progress', (dl: Download) => this.emit('progress', dl));
    task.on('completed', (dl: Download) => {
      this.emit('completed', dl);
      this.processQueue();
    });
    task.on('error', (dl: Download) => {
      this.emit('error', dl);
      this.processQueue();
    });
  }

  private startSaveLoop(): void {
    this.saveTimer = setInterval(() => {
      for (const [, task] of this.tasks) {
        if (task.status === 'downloading' || task.status === 'paused') {
          DownloadRepository.saveDownload(task.snapshot());
        }
      }
    }, 5000);
  }

  addPreDownload(download: Download): void {
    const task = this.createTask(download);
    this.tasks.set(download.id, task);
    // Do not queue, do not save. Start immediately.
    task.start().catch((err) => console.error('Pre-download error:', err));
  }

  discardPreDownload(preId: string): boolean {
    const task = this.tasks.get(preId);
    if (!task) return false;
    task.cancel();
    this.tasks.delete(preId);
    return true;
  }

  add(download: Download): void {
    let task = this.tasks.get(download.id);
    if (task) {
      // Promote pre-download
      task.updateOptions(download);
      if (download.status === 'paused' && task.status === 'downloading') {
        task.pause();
      }
      
      const snap = task.snapshot();
      if (snap.status === 'error') {
        // If it failed during pre-download (e.g. missing filepath for yt-dlp), reset it.
        (task as any).dl.status = 'queued';
      }

      this.bindTaskListeners(task);

      if (!this.queue.includes(task.snapshot().id)) {
        if (task.status !== 'paused') {
          this.queue.push(task.snapshot().id);
          this.processQueue();
        }
      }
    } else {
      task = this.createTask(download);
      this.tasks.set(download.id, task);
      if (task.status !== 'paused' && !this.queue.includes(task.snapshot().id)) {
        this.queue.push(task.snapshot().id);
        // We need to call processQueue to start it if there is room
        this.processQueue();
      }
    }
    
    // Explicitly emit progress to immediately update the UI with current state
    this.emit('progress', task.snapshot());
    DownloadRepository.saveDownload(task.snapshot());
    this.processQueue();
  }

  pause(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.pause();
    DownloadRepository.saveDownload(task.snapshot());
    this.queue = this.queue.filter((qid) => qid !== id);
    this.processQueue();
    return true;
  }

  resume(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.resume();
    DownloadRepository.saveDownload(task.snapshot());
    if (!this.queue.includes(id)) {
      this.queue.push(id);
    }
    this.processQueue();
    return true;
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.cancel();
    DownloadRepository.saveDownload(task.snapshot());
    this.queue = this.queue.filter((qid) => qid !== id);
    this.processQueue();
    return true;
  }

  remove(id: string): boolean {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
    }
    this.queue = this.queue.filter((qid) => qid !== id);
    this.tasks.delete(id);
    DownloadRepository.removeDownload(id);
    this.processQueue();
    return true;
  }

  updateFilePath(id: string, filepath: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.updateFilePath(filepath);
    DownloadRepository.saveDownload(task.snapshot());
    this.emit('progress', task.snapshot());
    return true;
  }

  reorder(orderedIds: string[]): void {
    const currentSet = new Set(this.queue);
    this.queue = orderedIds.filter((id) => currentSet.has(id));
    for (const id of this.queue) {
      if (!orderedIds.includes(id)) {
        this.queue.push(id);
      }
    }
  }

  setSpeedLimit(id: string, limit: number): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.speedLimit = limit;
    return true;
  }

  setConnections(id: string, count: number): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.numConnections = Math.max(1, Math.min(count, MAX_CONNECTIONS));
    return true;
  }

  setMaxConcurrent(n: number): void {
    this.maxConcurrent = n;
    this.processQueue();
  }

  setGlobalSpeedLimit(limit: number): void {
    this.globalSpeedLimit = limit;
  }

  getDownload(id: string): Download | undefined {
    return this.tasks.get(id)?.snapshot();
  }

  getAll(): Download[] {
    return Array.from(this.tasks.values()).map((t) => t.snapshot());
  }

  getQueueOrder(): string[] {
    return [...this.queue];
  }

  getQueueStatus(): { queue: string[]; activeCount: number; maxConcurrent: number; globalSpeedLimit: number; totalSpeed: number } {
    let totalSpeed = 0;
    for (const [, task] of this.tasks) {
      totalSpeed += task.currentSpeed;
    }
    return {
      queue: [...this.queue],
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      globalSpeedLimit: this.globalSpeedLimit,
      totalSpeed,
    };
  }

  pauseAll(): void {
    for (const [, task] of this.tasks) {
      task.pause();
    }
    this.queue = [];
  }

  clearCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed') {
        this.tasks.delete(id);
      }
    }
    this.queue = this.queue.filter(id => this.tasks.has(id));
  }

  resumeAll(): void {
    this.queue = Array.from(this.tasks.keys());
    this.processQueue();
  }

  get activeCount(): number {
    let count = 0;
    for (const [, task] of this.tasks) {
      if (task.status === 'downloading') count++;
    }
    return count;
  }

  private getGlobalBytesPerSecond(): number {
    if (this.globalSpeedLimit <= 0) return 0;
    const active = this.activeCount;
    if (active === 0) return 0;
    return this.globalSpeedLimit / active;
  }

  private processQueue(): void {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const id = this.queue.shift()!;
      const task = this.tasks.get(id);
      if (!task) continue;
      if (task.status === 'cancelled' || task.status === 'completed') continue;

      this.bindTaskListeners(task);
      task.start().catch((err) => {
        console.error('Unhandled task start error:', err);
      });
    }
  }
}

