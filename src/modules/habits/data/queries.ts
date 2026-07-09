import { getDb } from '../../../core/db/client';
import type { Cadence, Habit, HabitEntry } from './schema';

export async function listActiveHabits(): Promise<Habit[]> {
  const db = await getDb();
  return db.select<Habit[]>(
    'SELECT * FROM habits WHERE active = 1 ORDER BY COALESCE(sort_order, id)'
  );
}

export async function createHabit(
  name: string,
  cadence: Cadence,
  cadenceDetail: string[] | null = null,
  targetPerPeriod = 1
): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO habits (name, cadence, cadence_detail, target_per_period) VALUES ($1, $2, $3, $4)',
    [name, cadence, cadenceDetail ? JSON.stringify(cadenceDetail) : null, targetPerPeriod]
  );
}

export async function archiveHabit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE habits SET active = 0, archived_at = datetime('now') WHERE id = $1`,
    [id]
  );
}

/** All entries on or after a local YYYY-MM-DD date. */
export async function entriesSince(date: string): Promise<HabitEntry[]> {
  const db = await getDb();
  return db.select<HabitEntry[]>(
    'SELECT * FROM habit_entries WHERE entry_date >= $1 ORDER BY entry_date',
    [date]
  );
}

export async function logEntry(habitId: number, date: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT OR IGNORE INTO habit_entries (habit_id, entry_date) VALUES ($1, $2)',
    [habitId, date]
  );
}

export async function unlogEntry(habitId: number, date: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM habit_entries WHERE habit_id = $1 AND entry_date = $2', [
    habitId,
    date,
  ]);
}
