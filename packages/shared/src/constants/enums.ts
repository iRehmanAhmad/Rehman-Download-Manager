export enum DownloadStatusEnum {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETING = 'completing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
  MERGING = 'merging',
}

export enum DownloadPriorityEnum {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  IMMEDIATE = 'immediate',
}

export enum ChunkStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}
