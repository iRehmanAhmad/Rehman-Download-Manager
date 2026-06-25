import { EventEmitter } from 'events';
import type { Download } from '@rdm/shared';
import type { IDownloadTask } from './engine';
import { v4 as uuid } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import youtubedl, { exec } from 'youtube-dl-exec';

let ffmpegStatic: string | undefined;
try {
  ffmpegStatic = require('ffmpeg-static');
} catch (e) {
  console.error('Could not load ffmpeg-static', e);
}

export class YtdlpDownloadTask extends EventEmitter implements IDownloadTask {
  private dl: Download;
  private tempDir: string;
  private getGlobalLimit: () => number;
  private childProcess: any = null;
  private paused = false;
  private cancelled = false;
  private speedLimit = 0;

  // Cumulative Tracking State
  private previousStreamsTotalBytes = 0;
  private currentStreamTotalBytes = 0;
  private previousStreamsDownloadedBytes = 0;
  private currentStreamDestination: string | null = null;
  
  get status() { return this.dl.status; }
  get numConnections() { return this.dl.numConnections; }
  set numConnections(n: number) { this.dl.numConnections = n; }
  get currentSpeed() { return this.dl.speed; }

  constructor(download: Download, tempDir: string, getGlobalLimit: () => number) {
    super();
    this.dl = { ...download };
    this.tempDir = tempDir;
    this.getGlobalLimit = getGlobalLimit;
    this.speedLimit = download.speedLimit || 0;
  }

  snapshot(): Download {
    return { ...this.dl };
  }

  updateFilePath(filepath: string): void {
    this.dl.filepath = filepath;
  }

  updateOptions(opts: Partial<Download>): void {
    if (opts.filename) this.dl.filename = opts.filename;
    if (opts.filepath !== undefined) this.dl.filepath = opts.filepath;
    if (opts.categoryId !== undefined) this.dl.categoryId = opts.categoryId;
    if (opts.numConnections) this.dl.numConnections = opts.numConnections;
    if (opts.metadata) this.dl.metadata = opts.metadata;
    if (opts.priority) this.dl.priority = opts.priority;
  }

  async start(): Promise<void> {
    if (this.dl.status === 'downloading' && this.childProcess) return;
    this.dl.status = 'downloading';
    this.dl.startedAt = Date.now();
    this.paused = false;
    this.cancelled = false;

    if (!this.dl.chunks || this.dl.chunks.length === 0) {
      this.dl.chunks = [{
        id: uuid(),
        downloadId: this.dl.id,
        index: 0,
        startByte: 0,
        endByte: 0,
        downloaded: 0,
        status: 'downloading',
        speed: 0
      }];
    }

    try {
      await this.runYtdlp();
    } catch (err) {
      if (this.cancelled || this.paused) return;
      this.dl.status = 'error';
      this.dl.errorMessage = String(err);
      this.emit('error', this.snapshot());
    }
  }

  pause(): void {
    this.paused = true;
    this.dl.status = 'paused';
    if (this.childProcess) {
      this.childProcess.kill('SIGINT');
      this.childProcess = null;
    }
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
    if (this.childProcess) {
      this.childProcess.kill('SIGKILL');
      this.childProcess = null;
    }
    this.cleanupFiles();
  }

  private cleanupFiles() {
    try {
      if (this.dl.filepath) {
        const partFile = this.dl.filepath + '.part';
        const ytdlFile = this.dl.filepath + '.ytdl';
        if (fs.existsSync(partFile)) fs.unlinkSync(partFile);
        if (fs.existsSync(ytdlFile)) fs.unlinkSync(ytdlFile);
        if (fs.existsSync(this.dl.filepath)) fs.unlinkSync(this.dl.filepath);
      }
    } catch {
      // best effort
    }
  }

  private runYtdlp(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.dl.filename === 'Fetching video...') {
        this.emitProgress();
        youtubedl(this.dl.url, { dumpJson: true })
          .then((output) => {
            if (this.cancelled) return resolve();
            const info = output as any;
            this.dl.filename = (info.title || 'video').replace(/[\\/:*?"<>|]/g, '') + '.mp4';
            if (this.dl.filepath) {
              const dir = path.dirname(this.dl.filepath);
              this.dl.filepath = path.join(dir, this.dl.filename);
            }
            this.executeDownload().then(resolve).catch(reject);
          })
          .catch((err) => {
             this.dl.filename = 'video.mp4';
             if (this.dl.filepath) {
               const dir = path.dirname(this.dl.filepath);
               this.dl.filepath = path.join(dir, this.dl.filename);
             }
             this.executeDownload().then(resolve).catch(reject);
          });
      } else {
        this.executeDownload().then(resolve).catch(reject);
      }
    });
  }

  private executeDownload(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dl.filepath) return reject(new Error('No output filepath'));
      
      const args: any = {
        output: this.dl.filepath,
        mergeOutputFormat: 'mp4',
        concurrentFragments: this.dl.numConnections || 4,
        noWarnings: true
      };

      if (ffmpegStatic) {
        let ffmpegPath = ffmpegStatic;
        if (ffmpegPath.includes('app.asar')) {
          ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
        }
        args.ffmpegLocation = ffmpegPath;
      }

      if (this.dl.metadata?.ytdlpFormat) {
        args.format = this.dl.metadata.ytdlpFormat;
      } else {
        args.format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
      }
      
      if (this.speedLimit > 0) {
        args.limitRate = `${this.speedLimit}K`;
      }

      console.log('[yt-dlp] executing with args:', args);

      this.childProcess = exec(this.dl.url, args);

      this.childProcess.catch((err: any) => {
        if (this.cancelled || this.paused) return;
        console.error('[yt-dlp] error:', err);
      });

      let lastError = '';
      if (this.childProcess.stderr) {
        this.childProcess.stderr.on('data', (data: any) => {
          const out = data.toString() as string;
          if (!out.includes('WARNING:')) {
            lastError += out;
          }
          console.error('[yt-dlp] stderr:', out);
        });
      }

      this.childProcess.stdout.on('data', (data: any) => {
        if (this.paused || this.cancelled) return;
        const out = data.toString() as string;
        
        const destMatch = out.match(/\[download\] Destination:\s+(.+)/);
        if (destMatch) {
          const dest = destMatch[1];
          if (this.currentStreamDestination && this.currentStreamDestination !== dest) {
            this.previousStreamsTotalBytes += this.currentStreamTotalBytes;
            this.previousStreamsDownloadedBytes += this.currentStreamTotalBytes;
            this.currentStreamTotalBytes = 0;
          }
          this.currentStreamDestination = dest;
        }

        const dlMatch = out.match(/\[download\]\s+([\d.]+)%\s+of\s+(~?[\d.]+)(KiB|MiB|GiB|B)?\s+at\s+([\d.]+)(KiB|MiB|GiB|B)?\s*\/\s*s\s+ETA\s+([\d:]+)/);
        if (dlMatch) {
          const percent = parseFloat(dlMatch[1]);
          const totalSizeStr = dlMatch[2];
          const totalSizeUnit = dlMatch[3];
          const speedStr = dlMatch[4];
          const speedUnit = dlMatch[5];
          
          let totalBytes = parseFloat(totalSizeStr.replace('~', ''));
          if (totalSizeUnit === 'KiB') totalBytes *= 1024;
          if (totalSizeUnit === 'MiB') totalBytes *= 1024 * 1024;
          if (totalSizeUnit === 'GiB') totalBytes *= 1024 * 1024 * 1024;

          let speedBytes = parseFloat(speedStr);
          if (speedUnit === 'KiB') speedBytes *= 1024;
          if (speedUnit === 'MiB') speedBytes *= 1024 * 1024;
          if (speedUnit === 'GiB') speedBytes *= 1024 * 1024 * 1024;

          let currentStreamDownloaded = (percent / 100) * totalBytes;

          if (this.currentStreamTotalBytes === 0) {
            this.currentStreamTotalBytes = totalBytes;
          } else if (totalBytes > this.currentStreamTotalBytes) {
            this.currentStreamTotalBytes = totalBytes;
          }

          const cumulativeFileSize = this.previousStreamsTotalBytes + this.currentStreamTotalBytes;
          const cumulativeDownloaded = this.previousStreamsDownloadedBytes + currentStreamDownloaded;
          const cumulativeProgress = (cumulativeDownloaded / cumulativeFileSize) * 100;

          let newFileSize = cumulativeFileSize;
          let newDownloaded = cumulativeDownloaded;
          let newProgress = cumulativeProgress;

          // Enforce monotonicity globally to hide DASH fluctuation jitter
          if (this.dl.downloaded && newDownloaded < this.dl.downloaded) {
             newDownloaded = this.dl.downloaded;
          }
          if (this.dl.progress && newProgress < this.dl.progress) {
             newProgress = this.dl.progress;
          }
          if (this.dl.fileSize && newFileSize < this.dl.fileSize) {
             newFileSize = this.dl.fileSize;
          }

          this.dl.fileSize = newFileSize;
          this.dl.downloaded = newDownloaded;
          this.dl.progress = newProgress;
          this.dl.speed = speedBytes;
          
          if (this.dl.chunks[0]) {
            this.dl.chunks[0].downloaded = this.dl.downloaded;
            this.dl.chunks[0].endByte = this.dl.fileSize;
            this.dl.chunks[0].speed = speedBytes;
          }
          
          this.emitProgress();
        } else if (out.includes('[Merger]')) {
          this.dl.status = 'merging';
          this.emitProgress();
        }
      });

      this.childProcess.on('close', (code: number) => {
        this.childProcess = null;
        if (this.cancelled || this.paused) {
          resolve();
          return;
        }
        if (code === 0) {
          this.dl.status = 'completed';
          this.dl.progress = 100;
          this.dl.downloaded = this.dl.fileSize;
          if (this.dl.chunks[0]) {
            this.dl.chunks[0].status = 'completed';
            this.dl.chunks[0].downloaded = this.dl.fileSize;
          }
          this.emit('completed', this.snapshot());
          resolve();
        } else {
          let cleanError = lastError.trim();
          if (cleanError) {
             const match = cleanError.match(/ERROR: (.*)/);
             if (match) cleanError = match[1];
             else cleanError = cleanError.split('\n')[0].substring(0, 100);
          }
          reject(new Error(cleanError || `yt-dlp exited with code ${code}`));
        }
      });

      this.childProcess.on('error', (err: any) => {
        this.childProcess = null;
        reject(err);
      });
    });
  }

  private emitProgress() {
    this.emit('progress', this.snapshot());
  }
}
