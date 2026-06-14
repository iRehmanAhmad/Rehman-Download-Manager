import { getDatabase } from './database';
import type { Download, ChunkInfo } from '@rdm/shared';

export class DownloadRepository {
  static saveDownload(dl: Download): void {
    const db = getDatabase();
    
    // Upsert download
    const stmt = db.prepare(`
      INSERT INTO downloads (
        id, url, filename, filepath, temp_dir, file_size, downloaded, status, priority, 
        category_id, added_at, completed_at, error_message, retry_count, max_retries, 
        speed_limit, num_connections, checksum
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        filename=excluded.filename,
        filepath=excluded.filepath,
        file_size=excluded.file_size,
        downloaded=excluded.downloaded,
        status=excluded.status,
        completed_at=excluded.completed_at,
        error_message=excluded.error_message,
        retry_count=excluded.retry_count,
        speed_limit=excluded.speed_limit,
        num_connections=excluded.num_connections
    `);

    stmt.run(
      dl.id, dl.url, dl.filename, dl.filepath || null, dl.tempDir, dl.fileSize, dl.downloaded,
      dl.status, dl.priority, dl.categoryId || null, dl.addedAt, dl.completedAt || null,
      dl.errorMessage || null, dl.retryCount, dl.maxRetries, dl.speedLimit || 0,
      dl.numConnections, dl.checksum || null
    );

    // Upsert chunks
    if (dl.chunks && dl.chunks.length > 0) {
      const chunkStmt = db.prepare(`
        INSERT INTO chunks (
          id, download_id, chunk_index, start_byte, end_byte, downloaded, status, retry_count
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(download_id, chunk_index) DO UPDATE SET
          end_byte=excluded.end_byte,
          downloaded=excluded.downloaded,
          status=excluded.status
      `);

      for (const chunk of dl.chunks) {
        chunkStmt.run(
          chunk.id, chunk.downloadId, chunk.index, chunk.startByte, chunk.endByte,
          chunk.downloaded, chunk.status, 0
        );
      }
    }
  }

  static loadAllDownloads(): Download[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM downloads').all() as any[];
    
    return rows.map(row => {
      const chunkRows = db.prepare('SELECT * FROM chunks WHERE download_id = ? ORDER BY chunk_index ASC').all(row.id) as any[];
      const chunks: ChunkInfo[] = chunkRows.map(c => ({
        id: c.id,
        downloadId: c.download_id,
        index: c.chunk_index,
        startByte: c.start_byte,
        endByte: c.end_byte,
        downloaded: c.downloaded,
        status: c.status,
        speed: 0
      }));

      // Calculate aggregated progress & downloaded
      const totalDownloaded = chunks.reduce((sum, c) => sum + c.downloaded, 0);
      let progress = 0;
      if (row.file_size > 0) {
        progress = Math.min(100, (totalDownloaded / row.file_size) * 100);
      }

      // If it was downloading but app crashed, it should be paused
      let status = row.status;
      if (status === 'downloading' || status === 'merging' || status === 'completing') {
        status = 'paused'; 
        for (const c of chunks) {
          if (c.status === 'downloading') c.status = 'pending';
        }
      }

      return {
        id: row.id,
        url: row.url,
        filename: row.filename,
        filepath: row.filepath,
        tempDir: row.temp_dir,
        fileSize: row.file_size,
        downloaded: totalDownloaded, // use actual chunk progress
        status: status,
        priority: row.priority,
        categoryId: row.category_id,
        addedAt: row.added_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        speedLimit: row.speed_limit,
        numConnections: row.num_connections,
        checksum: row.checksum,
        chunks,
        speed: 0,
        progress,
        eta: 0
      };
    });
  }

  static removeDownload(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM downloads WHERE id = ?').run(id);
  }
}
