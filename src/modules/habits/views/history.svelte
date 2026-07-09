<script lang="ts">
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { cadenceLabel, type Habit } from '../data/schema';
  import { localDateStr, addDays } from '../data/dates';
  import { isDueOnDate } from '../data/due';
  import { listActiveHabits, entriesSince, archiveHabit } from '../data/queries';

  const DAYS = 28;

  type HistoryRow = {
    habit: Habit;
    cells: { date: string; done: boolean; due: boolean }[];
    rate: number | null;
  };

  let rows = $state<HistoryRow[]>([]);
  let archiveArmedId = $state<number | null>(null);

  async function load() {
    const habits = await listActiveHabits();
    const today = new Date();
    const dates = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
    const entries = await entriesSince(localDateStr(dates[0]));
    const byHabit = new Map<number, Set<string>>();
    for (const e of entries) {
      if (!byHabit.has(e.habit_id)) byHabit.set(e.habit_id, new Set());
      byHabit.get(e.habit_id)!.add(e.entry_date);
    }

    rows = habits.map((habit) => {
      const done = byHabit.get(habit.id) ?? new Set<string>();
      const cells = dates.map((d) => ({
        date: localDateStr(d),
        done: done.has(localDateStr(d)),
        due: isDueOnDate(habit, d),
      }));
      // Completion: weekly habits measure against expected count (4 weeks × target);
      // everything else against due days in the window.
      let rate: number | null = null;
      if (habit.cadence === 'weekly') {
        const expected = (habit.target_per_period || 1) * (DAYS / 7);
        rate = Math.min(1, done.size / expected);
      } else {
        const dueDays = cells.filter((c) => c.due).length;
        rate = dueDays ? cells.filter((c) => c.due && c.done).length / dueDays : null;
      }
      return { habit, cells, rate };
    });
  }

  $effect(() => {
    void load();
    return events.on('habits:changed', () => void load());
  });

  async function archive(id: number) {
    if (archiveArmedId !== id) {
      archiveArmedId = id;
      return;
    }
    archiveArmedId = null;
    await archiveHabit(id);
    events.emit('habits:changed');
  }
</script>

<div class="history">
  <Panel title={`Last ${DAYS} days`}>
    {#if rows.length === 0}
      <p class="hint">No habits. ⌘K → Add habit.</p>
    {:else}
      <div class="grid-rows">
        {#each rows as row (row.habit.id)}
          <div class="row">
            <div class="meta">
              <span class="name">{row.habit.name}</span>
              <span class="cadence">{cadenceLabel(row.habit)}</span>
            </div>
            <div class="cells">
              {#each row.cells as cell (cell.date)}
                <span
                  class="cell"
                  class:done={cell.done}
                  class:off={!cell.due && !cell.done}
                  title="{cell.date}{cell.done ? ' ✓' : ''}"
                ></span>
              {/each}
            </div>
            <span class="rate mono">
              {row.rate == null ? '—' : `${Math.round(row.rate * 100)}%`}
            </span>
            <button class="archive" onclick={() => archive(row.habit.id)}>
              {archiveArmedId === row.habit.id ? 'Confirm' : 'Archive'}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </Panel>
</div>

<style>
  .history {
    max-width: 760px;
  }

  .grid-rows {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .meta {
    width: 180px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .name {
    font-size: var(--text-sm);
  }

  .cadence {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .cells {
    display: flex;
    gap: 3px;
    flex: 1;
  }

  .cell {
    width: 11px;
    height: 11px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .cell.done {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .cell.off {
    opacity: 0.35;
  }

  .rate {
    width: 44px;
    text-align: right;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .archive {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
