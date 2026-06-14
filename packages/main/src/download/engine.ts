import { EventEmitter } from 'events';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { Download, ChunkInfo, DownloadOptions } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import {
  PROGRESS_UPDATE_INTERVAL,
  DEFAULT_CONNECTIONS,
  MAX_CONNECTIONS,
} from '@rdm/shared';

const MIN_CHUNK_SIZE = 1024 * 256;
const SPEED_AVERAGE_WINDOW = 3000;

interface SpeedSample {
  time: number;
  bytes: number;
}

export interface DownloadEngineEvents {
  progress: (download: Download) => void;
  completed: (download: Download) => void;
  error: (download: Download) => void;
  statusChanged: (download: Download) => void;
}

export class DownloadEngine extends EventEmitter {
  private tasks = new Map<string, DownloadTask>();
  private queue: string[] = [];
  private maxConcurrent: number;
  private globalSpeedLimit: number;
  private tempDir: string;

  constructor(maxConcurrent = 5, globalSpeedLimit = 0) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.globalSpeedLimit = globalSpeedLimit;
    this.tempDir = path.join(app.getPath('temp'), 'rdm');
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  add(download: Download): void {
    this.tasks.set(download.id, new DownloadTask(download, this.tempDir));
    this.queue.push(download.id);
    this.processQueue();
  }

  pause(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.pause();
    this.queue = this.queue.filter((qid) => qid !== id);
    this.processQueue();
    return true;
  }

  resume(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.resume();
    this.queue.push(id);
    this.processQueue();
    return true;
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.cancel();
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
    return true;
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

  pauseAll(): void {
    for (const [, task] of this.tasks) {
      task.pause();
    }
    this.queue = [];
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

  private processQueue(): void {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const id = this.queue.shift()!;
      const task = this.tasks.get(id);
      if (!task) continue;
      if (task.status === 'cancelled' || task.status === 'completed') continue;

      task.on('progress', (dl: Download) => this.emit('progress', dl));
      task.on('completed', (dl: Download) => {
        this.emit('completed', dl);
        this.processQueue();
      });
      task.on('error', (dl: Download) => {
        this.emit('error', dl);
        this.processQueue();
      });

      task.start();
    }
  }
}

class DownloadTask extends EventEmitter {
  private dl: Download;
  private tempDir: string;
  private activeChunks: Map<number, ChunkDownloader> = new Map();
  private speedSamples: SpeedSample[] = [];
  private paused = false;
  private cancelled = false;
  private lastProgressTime = 0;

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

  constructor(download: Download, tempDir: string) {
    super();
    this.dl = { ...download };
    this.tempDir = tempDir;
    this.speedLimit = download.speedLimit || 0;
  }

  snapshot(): Download {
    return { ...this.dl };
  }

  async start(): Promise<void> {
    this.dl.status = 'downloading';
    this.dl.startedAt = Date.now();

    try {
      const parsedUrl = new URL(this.dl.url);
      const mod = parsedUrl.protocol === 'https:' ? https : http;

      const resumeInfo = await this.getResumeInfo(mod, parsedUrl);

      if (resumeInfo.supportsRange && resumeInfo.fileSize > 0) {
        this.dl.fileSize = resumeInfo.fileSize;
        await this.downloadChunked(mod, parsedUrl, resumeInfo);
      } else {
        this.dl.numConnections = 1;
        await this.downloadSequential(mod, parsedUrl);
      }
    } catch (err) {
      if (!this.cancelled) {
        this.dl.status = 'error';
        this.dl.errorMessage = String(err);
        this.emit('error', this.snapshot());
      }
    }
  }

  pause(): void {
    this.paused = true;
    this.dl.status = 'paused';
    for (const [, chunk] of this.activeChunks) {
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
    for (const [, chunk] of this.activeChunks) {
      chunk.destroy();
    }
    this.activeChunks.clear();
    this.cleanupTemp();
  }

  private getTempPath(id?: string): string {
    return path.join(this.tempDir, `rdm-${id || this.dl.id}`);
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
    return {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        ...(this.dl.headers || {}),
        ...(range ? { Range: range } : {}),
        ...(this.dl.referer ? { Referer: this.dl.referer } : {}),
        ...(this.dl.userAgent ? { 'User-Agent': this.dl.userAgent } : {}),
        'User-Agent': this.dl.userAgent || 'Mozilla/5.0',
      },
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
          const supportsRange =
            headers['accept-ranges'] === 'bytes' &&
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

  private async downloadSequential(
    mod: typeof http | typeof https,
    parsedUrl: URL,
  ): Promise<void> {
    const outputPath = this.getTempPath();
    const fileStream = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      const req = mod.request(this.getRequestOptions(parsedUrl), (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
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
          if (this.cancelled) return;
          this.dl.status = 'completing';
          const finalPath = path.join(
            this.tempDir,
            `rdm-final-${Date.now()}-${this.dl.filename}`,
          );
          fs.renameSync(outputPath, finalPath);
          this.dl.filepath = finalPath;
          this.dl.downloaded = this.dl.fileSize;
          this.dl.progress = 100;
          this.dl.status = 'completed';
          this.dl.completedAt = Date.now();
          this.emit('completed', this.snapshot());
          resolve();
        });

        res.on('error', (err) => {
          if (speedTimer) { clearInterval(speedTimer); speedTimer = null; }
          if (!this.cancelled) reject(err);
        });
      });

      req.on('error', (err) => {
        if (!this.cancelled) reject(err);
      });
      req.end();
    });
  }

  private async downloadChunked(
    mod: typeof http | typeof https,
    parsedUrl: URL,
    resumeInfo: { supportsRange: boolean; fileSize: number },
  ): Promise<void> {
    const chunkSize = Math.max(
      MIN_CHUNK_SIZE,
      Math.ceil(resumeInfo.fileSize / this.numConnections),
    );

    const chunks: ChunkInfo[] = [];
    for (let i = 0; i < this.numConnections; i++) {
      const start = i * chunkSize;
      const end = i === this.numConnections - 1 ? resumeInfo.fileSize - 1 : start + chunkSize - 1;
      chunks.push({
        id: uuid(),
        downloadId: this.dl.id,
        index: i,
        startByte: start,
        endByte: end,
        downloaded: 0,
        status: 'pending',
        speed: 0,
      });
    }
    this.dl.chunks = chunks;

    const promises = chunks.map((chunk) =>
      this.downloadChunk(mod, parsedUrl, chunk),
    );
    await Promise.all(promises);

    if (this.cancelled) return;
    if (this.paused) return;

    this.mergeChunks();
  }

  private downloadChunk(
    mod: typeof http | typeof https,
    parsedUrl: URL,
    chunk: ChunkInfo,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const partPath = `${this.getTempPath()}.part${chunk.index}`;
      const fileStream = fs.createWriteStream(partPath);

      const range = `bytes=${chunk.startByte}-${chunk.endByte}`;
      const req = mod.request(
        this.getRequestOptions(parsedUrl, range),
        (res) => {
          chunk.status = 'downloading';

          let lastBytes = 0;
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
            chunk.downloaded += data.length;
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            clearInterval(speedTimer);
            chunk.status = 'completed';
            resolve();
          });

          res.on('error', (err) => {
            clearInterval(speedTimer);
            reject(err);
          });
        },
      );

      req.on('error', reject);
      req.end();
    });
  }

  private mergeChunks(): void {
    if (this.cancelled) return;
    this.dl.status = 'merging';

    const outputPath = this.getTempPath();
    const writeStream = fs.createWriteStream(outputPath);

    for (const chunk of this.dl.chunks.sort(
      (a, b) => a.index - b.index,
    )) {
      const partPath = `${this.getTempPath()}.part${chunk.index}`;
      const data = fs.readFileSync(partPath);
      writeStream.write(data);
      fs.unlinkSync(partPath);
    }

    writeStream.end(() => {
      const finalPath = path.join(
        path.dirname(this.tempDir),
        this.dl.filename,
      );
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
      this.dl.status = 'completed';
      this.dl.completedAt = Date.now();
      this.dl.progress = 100;
      this.emit('completed', this.snapshot());
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
