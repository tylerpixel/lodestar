<script lang="ts">
  import Panel from '../../../ui/layout/panel.svelte';
  import Sparkline from '../../../ui/components/sparkline.svelte';
  import ConfirmButton from '../../../ui/components/confirm-button.svelte';
  import { events } from '../../../core/events';
  import { cadenceLabel, type Habit } from '../data/schema';
  import { localDateStr, addDays } from '../data/dates';
  import { isDueOnDate } from '../data/due';
  import { listActiveHabits, entriesSince, archiveHabit } from '../data/queries';

  const WEEKS = 12;

  type Cell = { date: string; count: number; due: boolean; future: boolean; isToday: boolean };
  type HistoryRow = { habit: Habit; weeks: Cell[][]; rate: number | null; spark: number[] };

  let rows = $state<HistoryRow[]>([]);
  let monthLabels = $state<string[]>([]);

  async function load() {
    const habits = await listActiveHabits();
    const now = new Date();
    const todayStr = localDateStr(now);
    // Grid starts on the Monday of (WEEKS - 1) weeks ago
    const mondayOffset = (now.getDay() + 6) % 7;
    const start = addDays(now, -(mondayOffset + (WEEKS - 1) * 7));
    const entries = await entriesSince(localDateStr(start));

    const counts = new Map<number, Map<string, number>>();
    for (const e of entries) {
      if (!counts.has(e.habit_id)) counts.set(e.habit_id, new Map());
      counts.get(e.habit_id)!.set(e.entry_date, e.count);
    }

    monthLabels = Array.from({ length: WEEKS }, (_, w) => {
      const label = addDays(start, w * 7).toLocaleDateString(undefined, { month: 'short' });
      const prev =
        w === 0
          ? ''
          : addDays(start, (w - 1) * 7).toLocaleDateString(undefined, { month: 'short' });
      return label === prev ? '' : label;
    });

    rows = habits.map((habit) => {
      const mine = counts.get(habit.id) ?? new Map<string, number>();
      const weeks: Cell[][] = [];
      const spark: number[] = [];
      let dueDays = 0;
      let doneDueDays = 0;
      for (let w = 0; w < WEEKS; w++) {
        const col: Cell[] = [];
        let weekDone = 0;
        for (let day = 0; day < 7; day++) {
          const date = addDays(start, w * 7 + day);
          const ds = localDateStr(date);
          const future = ds > todayStr;
          const count = future ? 0 : (mine.get(ds) ?? 0);
          const due = !future && isDueOnDate(habit, date);
          if (due) {
            dueDays++;
            if (count) doneDueDays++;
          }
          if (count) weekDone++;
          col.push({ date: ds, count, due, future, isToday: ds === todayStr });
        }
        weeks.push(col);
        spark.push(weekDone);
      }
      let rate: number | null;
      if (habit.cadence === 'weekly') {
        const expected = (habit.target_per_period || 1) * WEEKS;
        const total = spark.reduce((a, b) => a + b, 0);
        rate = Math.min(1, total / expected);
      } else {
        rate = dueDays ? doneDueDays / dueDays : null;
      }
      return { habit, weeks, rate, spark };
    });
  }

  $effect(() => {
    void load();
    return events.on('habits:changed', () => void load());
  });

  async function archive(id: number) {
    await archiveHabit(id);
    events.emit('habits:changed');
  }

  const DAY_LABELS = ['mon', '', 'wed', '', 'fri', '', ''];
</script>

<div class="history">
  <Panel title={`Last ${WEEKS} weeks`}>
    {#if rows.length === 0}
      <p class="hint">No habits. ⌘K → Add habit.</p>
    {:else}
      <div class="habits">
        {#each rows as row (row.habit.id)}
          <div class="habit">
            <div class="head">
              <span class="name">{row.habit.name}</span>
              <span class="cadence">{cadenceLabel(row.habit)}</span>
              <Sparkline values={row.spark} />
              <span class="rate mono">
                {row.rate == null ? '—' : `${Math.round(row.rate * 100)}%`}
              </span>
              <ConfirmButton label="Archive" subtle onConfirm={() => archive(row.habit.id)} />
            </div>
            <div class="chart">
              <div class="daylabels" aria-hidden="true">
                {#each DAY_LABELS as label, i (i)}
                  <span>{label}</span>
                {/each}
              </div>
              <div class="cols">
                <div class="months" aria-hidden="true">
                  {#each monthLabels as month, i (i)}
                    <span>{month}</span>
                  {/each}
                </div>
                <div class="grid">
                  {#each row.weeks as week, w (w)}
                    <div class="week">
                      {#each week as cell (cell.date)}
                        <span
                          class="cell"
                          class:done={cell.count > 0}
                          class:off={!cell.due && cell.count === 0}
                          class:future={cell.future}
                          class:today={cell.isToday}
                          title="{cell.date}{cell.count ? ' ✓' : ''}"
                        ></span>
                      {/each}
                    </div>
                  {/each}
                </div>
              </div>
            </div>
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

  .habits {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-bottom: var(--space-2);
  }

  .name {
    font-size: var(--text-sm);
    flex: 1;
  }

  .cadence {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .rate {
    width: 44px;
    text-align: right;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .chart {
    display: flex;
    gap: var(--space-2);
  }

  .daylabels {
    display: flex;
    flex-direction: column;
    gap: 3px;
    /* aligns with the grid below the month-label row */
    padding-top: 17px;
  }

  .daylabels span {
    height: 11px;
    line-height: 11px;
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-text-muted);
    width: 24px;
  }

  .months {
    display: flex;
    gap: 3px;
    height: 14px;
    margin-bottom: 3px;
  }

  .months span {
    width: 11px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: visible;
  }

  .grid {
    display: flex;
    gap: 3px;
  }

  .week {
    display: flex;
    flex-direction: column;
    gap: 3px;
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

  .cell.future {
    visibility: hidden;
  }

  .cell.today:not(.done) {
    border-color: var(--color-accent);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
