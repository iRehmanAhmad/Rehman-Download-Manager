export type CloudProviderType = 'google-drive' | 'dropbox' | 'onedrive' | 's3';

export interface ICloudProvider {
  readonly type: CloudProviderType;
  readonly displayName: string;
  authenticate(): Promise<void>;
  isAuthenticated(): boolean;
  disconnect(): Promise<void>;
  uploadFile(
    localPath: string,
    remotePath: string,
    onProgress?: (bytesUploaded: number, totalBytes: number) => void
  ): Promise<string>;
  downloadFile(remoteId: string, localPath: string): Promise<void>;
  listFiles(folderId?: string): Promise<CloudFile[]>;
  createFolder(name: string, parentId?: string): Promise<string>;
  deleteFile(remoteId: string): Promise<void>;
  getQuota(): Promise<{ used: number; total: number }>;
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  isFolder: boolean;
  parentId?: string;
  modifiedAt: number;
}

export interface CloudProviderConfig {
  id: string;
  providerType: CloudProviderType;
  displayName?: string;
  credentials?: string;
  syncFolder?: string;
  autoUpload: boolean;
  enabled: boolean;
}
