export const CADENCES = ['daily', 'weekdays', 'weekly', 'custom'] as const;
export type Cadence = (typeof CADENCES)[number];

/** Keys match JS Date.getDay() order. */
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Habit = {
  id: number;
  name: string;
  cadence: Cadence;
  /** JSON array of weekday keys for custom cadence, e.g. ["mon","wed","fri"]. */
  cadence_detail: string | null;
  target_per_period: number;
  active: number;
  sort_order: number | null;
  created_at: string;
  archived_at: string | null;
};

export type HabitEntry = {
  id: number;
  habit_id: number;
  entry_date: string;
  count: number;
  note: string | null;
};

export function customDays(habit: Habit): Weekday[] {
  try {
    const parsed = JSON.parse(habit.cadence_detail ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Human-readable cadence, e.g. "daily", "weekly ×3", "mon, wed, fri". */
export function cadenceLabel(habit: Habit): string {
  switch (habit.cadence) {
    case 'weekly':
      return habit.target_per_period > 1 ? `weekly ×${habit.target_per_period}` : 'weekly';
    case 'custom':
      return customDays(habit).join(', ') || 'custom';
    default:
      return habit.cadence;
  }
}
