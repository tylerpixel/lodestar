import { getDb } from '../../../core/db/client';
import {
  isoDaysAgo,
  isoNow,
  isoStartOfWeek,
  type Account,
  type AccountKind,
  type Category,
  type CategoryKind,
  type Transaction,
} from './schema';

// ── Accounts ───────────────────────────────────────────────────────────

export async function listActiveAccounts(): Promise<Account[]> {
  const db = await getDb();
  return db.select<Account[]>('SELECT * FROM accounts WHERE active = 1 ORDER BY id');
}

export async function createAccount(
  name: string,
  kind: AccountKind,
  openingBalanceCents = 0
): Promise<number | null> {
  const db = await getDb();
  const result = await db.execute(
    'INSERT INTO accounts (name, kind, opening_balance_cents) VALUES ($1, $2, $3)',
    [name, kind, openingBalanceCents]
  );
  return result.lastInsertId ?? null;
}

/** Case-insensitive prefix match against active accounts. */
export async function findAccountByPrefix(prefix: string): Promise<Account | null> {
  const db = await getDb();
  const rows = await db.select<Account[]>(
    "SELECT * FROM accounts WHERE active = 1 AND name LIKE $1 || '%' COLLATE NOCASE ORDER BY id LIMIT 1",
    [prefix]
  );
  return rows[0] ?? null;
}

/** First active account, creating a default "Cash" one if none exist. */
export async function ensureDefaultAccount(): Promise<Account> {
  const accounts = await listActiveAccounts();
  if (accounts.length) return accounts[0];
  await createAccount('Cash', 'cash');
  return (await listActiveAccounts())[0];
}

export type AccountBalance = Account & { balance_cents: number };

export async function accountBalances(): Promise<AccountBalance[]> {
  const db = await getDb();
  return db.select<AccountBalance[]>(
    `SELECT a.*, a.opening_balance_cents + COALESCE(SUM(t.amount_cents), 0) AS balance_cents
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id
     WHERE a.active = 1
     GROUP BY a.id
     ORDER BY a.id`
  );
}

// ── Categories ─────────────────────────────────────────────────────────

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select<Category[]>('SELECT * FROM categories ORDER BY COALESCE(sort_order, id)');
}

export async function createCategory(
  name: string,
  kind: CategoryKind = 'expense',
  budgetCents: number | null = null
): Promise<number | null> {
  const db = await getDb();
  const result = await db.execute(
    'INSERT INTO categories (name, kind, budget_cents) VALUES ($1, $2, $3)',
    [name, kind, budgetCents]
  );
  return result.lastInsertId ?? null;
}

export async function findCategoryByPrefix(prefix: string): Promise<Category | null> {
  const db = await getDb();
  const rows = await db.select<Category[]>(
    "SELECT * FROM categories WHERE name LIKE $1 || '%' COLLATE NOCASE ORDER BY COALESCE(sort_order, id) LIMIT 1",
    [prefix]
  );
  return rows[0] ?? null;
}

export async function setCategoryBudget(id: number, budgetCents: number | null): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE categories SET budget_cents = $1 WHERE id = $2', [budgetCents, id]);
}

// ── Transactions ───────────────────────────────────────────────────────

export async function createTransaction(
  accountId: number,
  amountCents: number,
  description: string | null,
  categoryId: number | null,
  occurredAt = isoNow()
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO transactions (account_id, category_id, amount_cents, description, occurred_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [accountId, categoryId, amountCents, description, occurredAt]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM transactions WHERE id = $1', [id]);
}

export type TransactionRow = Transaction & {
  account_name: string;
  category_name: string | null;
};

export async function listTransactions(limit = 500): Promise<TransactionRow[]> {
  const db = await getDb();
  return db.select<TransactionRow[]>(
    `SELECT t.*, a.name AS account_name, c.name AS category_name
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.occurred_at DESC, t.id DESC
     LIMIT $1`,
    [limit]
  );
}

// ── Metrics (PRD §7.3 ops-board set) ───────────────────────────────────

export type LedgerMetrics = {
  /** Opening balances of active accounts plus all their transactions. */
  balanceCents: number;
  /** Positive number: total spend over the trailing 30 days. */
  burn30Cents: number;
  /** Net movement (income − spend) since Monday local time. */
  weekNetCents: number;
  /** balance ÷ weekly burn; null when there is no burn. */
  runwayWeeks: number | null;
};

export async function ledgerMetrics(): Promise<LedgerMetrics> {
  const db = await getDb();
  const [balanceRow] = await db.select<{ balance: number }[]>(
    `SELECT COALESCE(SUM(a.opening_balance_cents), 0) +
            COALESCE((SELECT SUM(t.amount_cents) FROM transactions t
                      JOIN accounts a2 ON a2.id = t.account_id AND a2.active = 1), 0)
            AS balance
     FROM accounts a WHERE a.active = 1`
  );
  const [burnRow] = await db.select<{ burn: number }[]>(
    'SELECT COALESCE(-SUM(amount_cents), 0) AS burn FROM transactions WHERE amount_cents < 0 AND occurred_at >= $1',
    [isoDaysAgo(30)]
  );
  const [weekRow] = await db.select<{ net: number }[]>(
    'SELECT COALESCE(SUM(amount_cents), 0) AS net FROM transactions WHERE occurred_at >= $1',
    [isoStartOfWeek()]
  );

  const balanceCents = balanceRow?.balance ?? 0;
  const burn30Cents = burnRow?.burn ?? 0;
  const weeklyBurn = (burn30Cents / 30) * 7;
  return {
    balanceCents,
    burn30Cents,
    weekNetCents: weekRow?.net ?? 0,
    runwayWeeks: weeklyBurn > 0 ? balanceCents / weeklyBurn : null,
  };
}

export type CategoryMovement = {
  category_id: number | null;
  category_name: string | null;
  net_cents: number;
};

/** Net movement since a given ISO instant, grouped by category. */
export async function movementByCategory(sinceIso: string): Promise<CategoryMovement[]> {
  const db = await getDb();
  return db.select<CategoryMovement[]>(
    `SELECT t.category_id, c.name AS category_name, SUM(t.amount_cents) AS net_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.occurred_at >= $1
     GROUP BY t.category_id
     ORDER BY SUM(t.amount_cents) ASC`,
    [sinceIso]
  );
}

export type CategorySpend = Category & { spent_cents: number };

/** Month-to-date spend (positive number) per category, for budgets. */
export async function monthSpendByCategory(sinceIso: string): Promise<CategorySpend[]> {
  const db = await getDb();
  return db.select<CategorySpend[]>(
    `SELECT c.*, COALESCE(-SUM(CASE WHEN t.amount_cents < 0 AND t.occurred_at >= $1
                                    THEN t.amount_cents END), 0) AS spent_cents
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id
     GROUP BY c.id
     ORDER BY COALESCE(c.sort_order, c.id)`,
    [sinceIso]
  );
}
