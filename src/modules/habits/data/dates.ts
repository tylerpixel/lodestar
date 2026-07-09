import { WEEKDAYS, type Weekday } from './schema';

/** Local calendar date as YYYY-MM-DD — habits are logged in local time. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function weekdayKey(d: Date = new Date()): Weekday {
  return WEEKDAYS[d.getDay()];
}
