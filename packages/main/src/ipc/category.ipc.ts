import { ipcMain } from 'electron';
import type { Category } from '@rdm/shared';
import { getDatabase } from '../storage/database';
import { v4 as uuid } from 'uuid';

export function registerCategoryIpc(): void {
  ipcMain.handle('category:get-all', (): Category[] => {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT id, name, default_dir, color, sort_order FROM categories ORDER BY sort_order')
      .all() as {
      id: string;
      name: string;
      default_dir: string;
      color: string | null;
      sort_order: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      defaultDir: r.default_dir,
      color: r.color || undefined,
      icon: undefined,
      sortOrder: r.sort_order,
    }));
  });

  ipcMain.handle('category:create', (_event, category: Omit<Category, 'id'>): Category => {
    const db = getDatabase();
    const id = `cat-${uuid().slice(0, 8)}`;
    db.prepare(
      'INSERT INTO categories (id, name, default_dir, color, sort_order) VALUES (?, ?, ?, ?, ?)',
    ).run(id, category.name, category.defaultDir, category.color || null, category.sortOrder || 0);
    return { id, ...category };
  });

  ipcMain.handle('category:update', (_event, category: Category): boolean => {
    const db = getDatabase();
    const result = db
      .prepare(
        'UPDATE categories SET name = ?, default_dir = ?, color = ?, sort_order = ? WHERE id = ?',
      )
      .run(category.name, category.defaultDir, category.color || null, category.sortOrder || 0, category.id);
    return result.changes > 0;
  });

  ipcMain.handle('category:delete', (_event, id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
  });
}
