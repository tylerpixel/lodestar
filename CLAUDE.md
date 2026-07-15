# Lodestar — Claude Code instructions

Lodestar is a local-first personal ops desktop app (Tauri 2, SQLite, macOS). Read these documents in order at the start of every session:

1. `docs/lodestar-prd.md` — the PRD, baseline source of truth
2. `docs/updates/*.md` — self-contained update specs; each states which PRD sections it replaces. Where an update and the PRD disagree, the update is correct.

Current updates:
- `docs/updates/pipeline-register.md` — pipeline module rework (ships as 0.4.1)
- `docs/updates/ops-board-c2.md` — app-wide design register + M5 ops board (ships as 0.5.0)

## Current state

- Released: 0.4.0 (M4 cycle). Next: pipeline register (0.4.1), then M5 ops board (0.5.0).
- Bundle ID `com.tylerpixel.lodestar` is locked. Never change it.

## Git and releases

- All work happens directly on `main`. There are no feature branches — ignore any branch instructions inside the update specs.
- Commit in small logical steps with clear messages as you work.
- Never bump the version, create tags, or push tags. Releases are triggered by version tags via GitHub Actions, and the user does that manually after verifying the build.
- Before starting any spec, confirm the working tree is clean (`git status`); if it isn't, stop and ask.

## Non-negotiable rules

- **Never edit or delete an existing migration file.** Schema changes = new numbered migration only, and only when a spec explicitly calls for one. The ops board spec requires zero schema changes; the pipeline register spec requires exactly one (`002_stage_rework.sql`).
- No cross-module imports: `modules/x` never imports from `modules/y`. Shared needs go through `core/` or the event bus.
- All SQL lives in each module's `data/queries.ts`. No inline SQL in views, components, or `src/home/`.
- `ui/` components are presentational only — no database access.
- Keep `modules/ledger/EXTRACTION.md` current whenever the ledger module gains a dependency on `core/` or `ui/`.
- Every user-facing string must be literally true. No invented vocabulary (missions, agents, codenames). See `docs/updates/ops-board-c2.md` §1.5.
- Data lives in `~/Library/Application Support/com.tylerpixel.lodestar/`. Never write inside the app bundle.

## Workflow

- One update spec at a time; stop at its acceptance criteria and wait for review.
- Each spec defines a stop-and-confirm checkpoint (the migration mapping report; the query plan). Always honour it before proceeding.
- If a task seems to require breaking any rule above, stop and ask.
