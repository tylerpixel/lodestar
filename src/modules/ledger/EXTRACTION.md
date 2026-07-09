# Ledger → Sort.cash extraction manifest

Living doc (PRD §6): every dependency this module has outside its own
directory, and what would need to travel with it into Sort.cash. Update this
file whenever ledger gains a dependency on `core/` or `ui/`.

**Success criterion (PRD §12):** copy `modules/ledger/` into a fresh Tauri
project and it compiles with only `core/db` and `ui/tokens` brought along —
everything below is either that, or a small file/type that travels trivially.

## Rule

Ledger imports only from `core/` and `ui/`. Zero references to pipeline,
habits, home, or app shell. Cross-module reads happen in `home/` by composing
ledger's exported queries — never the other way round.

## Dependencies on `core/`

| Import | Used by | What travels |
| --- | --- | --- |
| `core/db/client` → `getDb()` | `data/queries.ts` | The whole reason `core/db` travels. Thin wrapper over `@tauri-apps/plugin-sql` (`Database.load('sqlite:…')`). Sort.cash needs the same plugin + a db client exposing `select`/`execute`. |
| `core/db/migrator` → `Migration` type | `index.ts` (manifest) | Migration runner keyed by `(module, version)`. Travels with `core/db`, or Sort.cash runs `migrations/001_init.sql` its own way — the SQL file has no Lodestar-isms. |
| `core/module` → `ModuleManifest` type | `index.ts` | Type-only. The manifest shape (id, migrations, routes, commands) is trivially re-declarable. |
| `core/events` → `events` bus | views, `commands.ts` | Tiny typed pub/sub class. Only event used: `ledger:changed`. Copy the class or swap for any emitter. |
| `core/command-palette/registry.svelte` → `Command` type | `commands.ts` | Type-only. `commands.ts` exports a plain array; any palette that calls `run(input)` can host it. |
| `core/router.svelte` → `router.go('ledger')` | `commands.ts` | Post-capture navigation only. Two call sites; replace with Sort.cash's navigation or delete. |

## Dependencies on `ui/`

| Import | Used by |
| --- | --- |
| `ui/tokens.css` (implicit — all styles use its vars) | every view |
| `ui/layout/panel.svelte` | overview, budgets |
| `ui/components/stat-block.svelte` | overview |
| `ui/components/data-table.svelte` | transactions |
| `ui/components/confirm-button.svelte` | transactions |
| `ui/components/status-badge.svelte` | budgets |
| `ui/time.ts` (`relTime`, `absTime`, `parseUtc`) | transactions |

All ui components are prop-driven with no database access (PRD structural
rule), so they copy cleanly. Tokens used are the standard set: `--color-*`,
`--space-*`, `--text-*`, `--font-mono`, `--motion-fast`.

## Deliberately self-contained

- Money handling (`formatCents`, `parseAmountCents`) lives in `data/schema.ts`,
  not `ui/` — it is ledger domain logic and must travel with the module.
- Date-boundary helpers (`isoStartOfWeek`, `isoStartOfMonth`, `isoDaysAgo`)
  live in `data/schema.ts` for the same reason.
- All SQL lives in `data/queries.ts`. The schema (`migrations/001_init.sql`)
  matches Sort.cash concepts: accounts / categories / transactions, integer
  cents, signed amounts (negative = spend).

## Not dependencies

- `core/settings` — ledger has no settings yet. If it gains one, add it here.
- App shell, sidebar, footer — ledger only exports a route; the host renders it.
