import { ipcMain } from 'electron';
import type { Category } from '@rdm/shared';

const categories: Category[] = [
  { id: 'music', name: 'Music', defaultDir: 'Music', color: '#ec4899', sortOrder: 1 },
  { id: 'videos', name: 'Videos', defaultDir: 'Videos', color: '#8b5cf6', sortOrder: 2 },
  { id: 'documents', name: 'Documents', defaultDir: 'Documents', color: '#3b82f6', sortOrder: 3 },
  { id: 'archives', name: 'Archives', defaultDir: 'Archives', color: '#f59e0b', sortOrder: 4 },
  { id: 'programs', name: 'Programs', defaultDir: 'Programs', color: '#10b981', sortOrder: 5 },
  { id: 'other', name: 'Other', defaultDir: 'Other', color: '#6b7280', sortOrder: 99 },
];

export function registerCategoryIpc(): void {
  ipcMain.handle('category:get-all', (): Category[] => {
    return categories;
  });

  ipcMain.handle('category:create', (_event, category: Omit<Category, 'id'>): Category => {
    const id = `cat-${Date.now()}`;
    const newCategory: Category = { id, ...category };
    categories.push(newCategory);
    return newCategory;
  });
}
