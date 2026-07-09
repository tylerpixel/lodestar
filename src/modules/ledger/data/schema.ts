export const ACCOUNT_KINDS = ['transaction', 'savings', 'credit', 'cash'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const CATEGORY_KINDS = ['expense', 'income'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export type Account = {
  id: number;
  name: string;
  kind: AccountKind;
  currency: string;
  opening_balance_cents: number;
  active: number;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  kind: CategoryKind;
  budget_cents: number | null;
  sort_order: number | null;
};

export type Transaction = {
  id: number;
  account_id: number;
  category_id: number | null;
  amount_cents: number;
  currency: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
};

// ── Money ──────────────────────────────────────────────────────────────
// All money is integer cents; formatting is the only place a decimal
// appears. Signed: negative = spend.

export function formatCents(cents: number, currency = 'AUD'): string {
  const abs = Math.abs(cents);
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(abs / 100);
  return cents < 0 ? `−${formatted}` : formatted;
}

/** Signed with an explicit + on income, for movement figures. */
export function formatSignedCents(cents: number, currency = 'AUD'): string {
  return cents > 0 ? `+${formatCents(cents, currency)}` : formatCents(cents, currency);
}

/**
 * "12.50" | "$12.50" | "1,250" → integer cents, or null if unparseable.
 * Sign is the caller's concern (palette treats bare amounts as spend).
 */
export function parseAmountCents(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0') || 0);
}

// ── Dates ──────────────────────────────────────────────────────────────
// occurred_at is a full ISO 8601 UTC instant; range boundaries are
// computed in TS from local time so "this week" means the user's week.

export function isoNow(): string {
  return new Date().toISOString();
}

/** ISO instant for local midnight `days` ago. */
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** ISO instant for local midnight on Monday of the current week. */
export function isoStartOfWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString();
}

/** ISO instant for local midnight on the 1st of the current month. */
export function isoStartOfMonth(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}
