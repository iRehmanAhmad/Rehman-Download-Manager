import { create } from 'zustand';
import type { Category } from '@rdm/shared';

interface SettingsState {
  settings: Record<string, unknown>;
  categories: Category[];
  loading: boolean;
  setSettings: (settings: Record<string, unknown>) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  categories: [],
  loading: true,

  setSettings: (settings) => set({ settings }),
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
}));
