import Database from '@tauri-apps/plugin-sql';

// Single connection to the app database. Lives in
// ~/Library/Application Support/com.tylerpixel.lodestar/lodestar.db
let db: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  db ??= Database.load('sqlite:lodestar.db');
  return db;
}
