import type { Download } from '@rdm/shared';
import { DownloadItem } from './DownloadItem';

interface DownloadListProps {
  downloads: Download[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function DownloadList({ downloads, onMoveUp, onMoveDown }: DownloadListProps) {
  return (
    <div className="space-y-2">
      {downloads.map((dl, i) => (
        <DownloadItem
          key={dl.id}
          download={dl}
          index={i}
          total={downloads.length}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
}
