CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'daily',
  cadence_detail TEXT,
  target_per_period INTEGER DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS habit_entries (
  id INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id),
  entry_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  UNIQUE(habit_id, entry_date)
);
