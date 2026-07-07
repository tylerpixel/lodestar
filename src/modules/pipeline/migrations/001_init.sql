CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  source TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  salary_min INTEGER,
  salary_max INTEGER,
  applied_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  next_action TEXT,
  next_action_due TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS application_events (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  kind TEXT NOT NULL,
  detail TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
