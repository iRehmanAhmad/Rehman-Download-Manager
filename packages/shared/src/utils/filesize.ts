const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Unknown';

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${UNITS[i]}`;
}

export function formatSpeed(bytesPerSecond: number, decimals = 1): string {
  return `${formatFileSize(bytesPerSecond, decimals)}/s`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}
