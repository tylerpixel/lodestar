import { customDays, type Habit } from './schema';
import { weekdayKey, localDateStr } from './dates';

/**
 * Is this habit due today?
 * - daily: always
 * - weekdays: Mon–Fri
 * - weekly: until target_per_period entries exist in the trailing 7 days
 *   (rolling window, not ISO weeks — simpler and good enough for v1)
 * - custom: cadence_detail lists today's weekday
 */
export function isDueToday(
  habit: Habit,
  entriesLast7Days: number,
  today: Date = new Date()
): boolean {
  switch (habit.cadence) {
    case 'daily':
      return true;
    case 'weekdays': {
      const day = today.getDay();
      return day >= 1 && day <= 5;
    }
    case 'weekly':
      return entriesLast7Days < (habit.target_per_period || 1);
    case 'custom':
      return customDays(habit).includes(weekdayKey(today));
  }
}

/** Consecutive due days completed, walking back from today. Today being
 *  due-but-unlogged doesn't break the streak (the day isn't over yet).
 *  Weekly cadence has no daily streak — returns null. */
export function currentStreak(
  habit: Habit,
  doneDates: Set<string>,
  today: Date = new Date()
): number | null {
  if (habit.cadence === 'weekly') return null;
  let streak = 0;
  const d = new Date(today);
  if (isDueOnDate(habit, d) && !doneDates.has(localDateStr(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 366; i++) {
    if (isDueOnDate(habit, d)) {
      if (doneDates.has(localDateStr(d))) streak++;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Was the habit due on a given (past) date? Weekly is approximated as
 *  "any day counts toward the target" so history uses expected counts instead. */
export function isDueOnDate(habit: Habit, d: Date): boolean {
  switch (habit.cadence) {
    case 'daily':
      return true;
    case 'weekdays': {
      const day = d.getDay();
      return day >= 1 && day <= 5;
    }
    case 'weekly':
      return false; // handled via expected-count in history stats
    case 'custom':
      return customDays(habit).includes(weekdayKey(d));
  }
}
