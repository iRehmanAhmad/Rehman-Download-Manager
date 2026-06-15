export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completing'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'merging'
  | 'scanning';

export type DownloadPriority = 'low' | 'normal' | 'high' | 'immediate';

export interface ChunkInfo {
  id: string;
  downloadId: string;
  index: number;
  startByte: number;
  endByte: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  speed: number;
}

export interface Download {
  id: string;
  url: string;
  filename: string;
  filepath?: string;
  tempDir: string;
  fileSize: number;
  downloaded: number;
  status: DownloadStatus;
  priority: DownloadPriority;
  categoryId?: string;
  queueId?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  speedLimit?: number;
  numConnections: number;
  headers?: Record<string, string>;
  referer?: string;
  userAgent?: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  chunks: ChunkInfo[];
  speed: number;
  progress: number;
  eta: number;
}

export interface DownloadOptions {
  url: string;
  filename?: string;
  filepath?: string;
  categoryId?: string;
  queueId?: string;
  priority?: DownloadPriority;
  numConnections?: number;
  speedLimit?: number;
  headers?: Record<string, string>;
  referer?: string;
  checksum?: string;
  paused?: boolean;
  metadata?: Record<string, unknown>;
  preId?: string;
}

export interface QueueStatus {
  queue: string[];
  activeCount: number;
  maxConcurrent: number;
  globalSpeedLimit: number;
  totalSpeed: number;
}
