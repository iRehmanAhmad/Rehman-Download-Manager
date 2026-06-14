import { create } from 'zustand';
import type { Category } from '@rdm/shared';

interface SettingsState {
  settings: Record<string, string>;
  categories: Category[];
  loading: boolean;
  setSettings: (settings: Record<string, string>) => void;
  setValue: (key: string, value: string) => Promise<void>;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  loadAll: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  categories: [],
  loading: true,

  setSettings: (settings) => set({ settings }),

  setValue: async (key, value) => {
    await window.api.settings.set(key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),

  loadAll: async () => {
    try {
      const [settings, categories] = await Promise.all([
        window.api.settings.getAll(),
        window.api.categories.getAll(),
      ]);
      set({ settings, categories, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
