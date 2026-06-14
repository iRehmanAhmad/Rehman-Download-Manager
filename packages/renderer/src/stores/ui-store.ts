import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  activePage: string;
  isMaximized: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setActivePage: (page: string) => void;
  setMaximized: (maximized: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  activePage: 'downloads',
  isMaximized: false,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePage: (page) => set({ activePage: page }),
  setMaximized: (maximized) => set({ isMaximized: maximized }),
}));
