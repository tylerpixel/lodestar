import type { Command } from '../../core/command-palette/registry.svelte';
import { events } from '../../core/events';
import { router } from '../../core/router.svelte';
import { ACCOUNT_KINDS, parseAmountCents, type AccountKind } from './data/schema';
import {
  createAccount,
  createCategory,
  createTransaction,
  ensureDefaultAccount,
  findAccountByPrefix,
  findCategoryByPrefix,
} from './data/queries';

// Quick capture: "12.50 coffee #food @amex". Bare amounts are spend;
// "+" prefixes income. #category and @account are case-insensitive
// prefix matches and can appear anywhere after the amount.
type ParsedEntry = {
  amountCents: number;
  description: string | null;
  category: string | null;
  account: string | null;
};

function parseEntry(text: string): ParsedEntry | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  const income = tokens[0].startsWith('+');
  const abs = parseAmountCents(tokens[0].replace(/^[+-]/, ''));
  if (abs == null || abs === 0) return null;

  let category: string | null = null;
  let account: string | null = null;
  const words: string[] = [];
  for (const token of tokens.slice(1)) {
    if (token.startsWith('#') && token.length > 1) category = token.slice(1);
    else if (token.startsWith('@') && token.length > 1) account = token.slice(1);
    else words.push(token);
  }
  return {
    amountCents: income ? abs : -abs,
    description: words.join(' ') || null,
    category,
    account,
  };
}

// "Name - kind - opening balance", kind and balance optional.
// e.g. "Amex - credit", "Everyday - transaction - 1250.00", "Wallet"
function parseAccount(text: string): { name: string; kind: AccountKind; openingCents: number } {
  const parts = text.split(/\s+[-–|]\s+/).map((p) => p.trim());
  const name = parts[0];
  const kind = (ACCOUNT_KINDS as readonly string[]).includes(parts[1]?.toLowerCase())
    ? (parts[1].toLowerCase() as AccountKind)
    : 'transaction';
  const openingCents = parts[2] ? (parseAmountCents(parts[2]) ?? 0) : 0;
  return { name, kind, openingCents };
}

export const ledgerCommands: Command[] = [
  {
    id: 'ledger:log',
    label: 'Log transaction',
    hint: '12.50 coffee #food @amex — "+" for income',
    capture: true,
    input: { placeholder: 'Amount description #category @account (+ for income)' },
    run: async (text) => {
      const entry = parseEntry(text?.trim() ?? '');
      if (!entry) return;

      const account = entry.account
        ? ((await findAccountByPrefix(entry.account)) ?? (await ensureDefaultAccount()))
        : await ensureDefaultAccount();

      let categoryId: number | null = null;
      if (entry.category) {
        const found = await findCategoryByPrefix(entry.category);
        categoryId =
          found?.id ??
          (await createCategory(entry.category, entry.amountCents > 0 ? 'income' : 'expense'));
      }

      await createTransaction(account.id, entry.amountCents, entry.description, categoryId);
      events.emit('ledger:changed');
      router.go('ledger');
    },
  },
  {
    id: 'ledger:add-account',
    label: 'Add account',
    hint: 'Name - transaction|savings|credit|cash - opening balance',
    input: { placeholder: 'Name - kind - opening balance (kind, balance optional)' },
    run: async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const { name, kind, openingCents } = parseAccount(trimmed);
      await createAccount(name, kind, openingCents);
      events.emit('ledger:changed');
      router.go('ledger');
    },
  },
  {
    id: 'ledger:add-category',
    label: 'Add category',
    hint: 'Name - expense|income - monthly budget',
    input: { placeholder: 'Name - kind - monthly budget (kind, budget optional)' },
    run: async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/\s+[-–|]\s+/).map((p) => p.trim());
      const kind = parts[1]?.toLowerCase() === 'income' ? 'income' : 'expense';
      const budget = parts[2] ? parseAmountCents(parts[2]) : null;
      await createCategory(parts[0], kind, budget);
      events.emit('ledger:changed');
      router.go('ledger');
    },
  },
];
