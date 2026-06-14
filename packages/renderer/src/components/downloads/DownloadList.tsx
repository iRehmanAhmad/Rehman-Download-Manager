import type { Download } from '@rdm/shared';
import { DownloadItem } from './DownloadItem';

interface DownloadListProps {
  downloads: Download[];
}

export function DownloadList({ downloads }: DownloadListProps) {
  return (
    <div className="space-y-2">
      {downloads.map((dl) => (
        <DownloadItem key={dl.id} download={dl} />
      ))}
    </div>
  );
}
