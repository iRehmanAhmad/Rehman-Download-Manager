import { create } from 'zustand';
import type { Download } from '@rdm/shared';

interface DownloadState {
  downloads: Map<string, Download>;
  addDownload: (download: Download) => void;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  getById: (id: string) => Download | undefined;
  getAll: () => Download[];
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: new Map(),

  addDownload: (download) =>
    set((state) => {
      const next = new Map(state.downloads);
      next.set(download.id, download);
      return { downloads: next };
    }),

  updateDownload: (id, updates) =>
    set((state) => {
      const existing = state.downloads.get(id);
      if (!existing) return state;
      const next = new Map(state.downloads);
      next.set(id, { ...existing, ...updates });
      return { downloads: next };
    }),

  removeDownload: (id) =>
    set((state) => {
      const next = new Map(state.downloads);
      next.delete(id);
      return { downloads: next };
    }),

  getById: (id) => get().downloads.get(id),
  getAll: () => Array.from(get().downloads.values()),
}));
