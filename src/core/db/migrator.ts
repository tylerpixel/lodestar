import { getDb } from './client';

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

// Naive statement split: fine for our schema files, which never contain
// semicolons inside strings or triggers. Revisit if that changes.
function statements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runMigrations(module: string, migrations: Migration[]): Promise<void> {
  const db = await getDb();
  await db.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      module TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (module, version)
    )`
  );
  const rows = await db.select<{ version: number }[]>(
    'SELECT version FROM _migrations WHERE module = $1',
    [module]
  );
  const applied = new Set(rows.map((r) => r.version));
  const pending = migrations
    .filter((m) => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    for (const stmt of statements(migration.sql)) {
      await db.execute(stmt);
    }
    await db.execute('INSERT INTO _migrations (module, version, name) VALUES ($1, $2, $3)', [
      module,
      migration.version,
      migration.name,
    ]);
  }
}
