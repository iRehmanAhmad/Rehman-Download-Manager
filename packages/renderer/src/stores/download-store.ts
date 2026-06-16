import { create } from 'zustand';
import type { Download } from '@rdm/shared';

interface DownloadState {
  downloads: Map<string, Download>;
  selectedIds: Set<string>;
  addDownload: (download: Download) => void;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  getById: (id: string) => Download | undefined;
  getAll: () => Download[];
  toggleSelection: (id: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearCompletedDownloads: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeMatchId: string | null;
  setActiveMatchId: (id: string | null) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: new Map(),
  selectedIds: new Set(),
  searchQuery: '',
  activeMatchId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveMatchId: (id) => set({ activeMatchId: id }),

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
      const nextSelected = new Set(state.selectedIds);
      nextSelected.delete(id);
      return { downloads: next, selectedIds: nextSelected };
    }),

  clearCompletedDownloads: () =>
    set((state) => {
      const next = new Map(state.downloads);
      const nextSelected = new Set(state.selectedIds);
      for (const [id, dl] of next) {
        if (dl.status === 'completed') {
          next.delete(id);
          nextSelected.delete(id);
        }
      }
      return { downloads: next, selectedIds: nextSelected };
    }),

  getById: (id) => get().downloads.get(id),
  getAll: () => Array.from(get().downloads.values()),

  toggleSelection: (id, multi = false) =>
    set((state) => {
      const next = multi ? new Set(state.selectedIds) : new Set<string>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: () =>
    set((state) => ({ selectedIds: new Set(state.downloads.keys()) })),

  clearSelection: () => set({ selectedIds: new Set() }),
}));
