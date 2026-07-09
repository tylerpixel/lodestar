-- Ledger schema v1 (PRD §7.3). Aligned with Sort.cash concepts so
-- extraction carries the data model, not just the code.
-- All money is integer cents. No floats anywhere in the ledger.

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- transaction | savings | credit | cash
  currency TEXT NOT NULL DEFAULT 'AUD',
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',  -- expense | income
  budget_cents INTEGER,                  -- monthly budget, nullable
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  amount_cents INTEGER NOT NULL,         -- signed: negative = spend
  currency TEXT NOT NULL DEFAULT 'AUD',
  description TEXT,
  occurred_at TEXT NOT NULL,             -- ISO 8601
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
