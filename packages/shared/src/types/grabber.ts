export interface GrabResult {
  url: string;
  type: 'video' | 'audio' | 'image' | 'archive' | 'document' | 'other';
  filename: string;
  sizeHint?: string;
  pageUrl: string;
}
