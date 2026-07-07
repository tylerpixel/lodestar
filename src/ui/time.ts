// SQLite datetime('now') emits "YYYY-MM-DD HH:MM:SS" in UTC without a zone marker.
export function parseUtc(value: string): Date {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
}

export function relTime(value: string): string {
  const seconds = (Date.now() - parseUtc(value).getTime()) / 1000;
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function absTime(value: string): string {
  return parseUtc(value).toLocaleString();
}
