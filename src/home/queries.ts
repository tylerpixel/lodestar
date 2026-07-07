import { getDb } from '../core/db/client';

export type Note = { id: number; note: string; created_at: string };

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>('SELECT id, note, created_at FROM m0_smoke ORDER BY id DESC');
}

export async function addNote(text: string): Promise<void> {
  const db = await getDb();
  await db.execute('INSERT INTO m0_smoke (note) VALUES ($1)', [text]);
}
