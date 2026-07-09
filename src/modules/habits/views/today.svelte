<script lang="ts">
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Checkbox from '../../../ui/components/checkbox.svelte';
  import StatBlock from '../../../ui/components/stat-block.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { getSetting } from '../../../core/settings';
  import { cadenceLabel, type Habit } from '../data/schema';
  import { localDateStr, addDays } from '../data/dates';
  import { isDueToday, currentStreak } from '../data/due';
  import { listActiveHabits, entriesSince, logEntry, unlogEntry } from '../data/queries';

  type DayDot = { date: string; done: boolean; isToday: boolean };

  type TodayRow = {
    habit: Habit;
    done: boolean;
    due: boolean;
    atRisk: boolean;
    streak: number | null;
    week: DayDot[];
  };

  let rows = $state<TodayRow[]>([]);
  let atRiskHour = $state(18);

  async function load() {
    const setting = await getSetting('habits.at_risk_hour');
    atRiskHour = setting != null && setting !== '' ? Number(setting) : 18;

    const habits = await listActiveHabits();
    const now = new Date();
    const today = localDateStr(now);
    // One year back so streaks can be computed from the same query
    const entries = await entriesSince(localDateStr(addDays(now, -365)));

    const doneDates = new Map<number, Set<string>>();
    for (const e of entries) {
      if (!doneDates.has(e.habit_id)) doneDates.set(e.habit_id, new Set());
      doneDates.get(e.habit_id)!.add(e.entry_date);
    }

    const weekDates = Array.from({ length: 7 }, (_, i) => localDateStr(addDays(now, i - 6)));
    const pastRiskHour = now.getHours() >= atRiskHour;

    rows = habits
      .map((habit) => {
        const dates = doneDates.get(habit.id) ?? new Set<string>();
        const weekCount = weekDates.filter((d) => dates.has(d)).length;
        const done = dates.has(today);
        const due = isDueToday(habit, weekCount, now);
        return {
          habit,
          done,
          due,
          atRisk: due && !done && pastRiskHour,
          streak: currentStreak(habit, dates, now),
          week: weekDates.map((d) => ({ date: d, done: dates.has(d), isToday: d === today })),
        };
      })
      .sort((a, b) => rank(a) - rank(b));
  }

  // at-risk → due-undone → done → not due
  function rank(r: TodayRow): number {
    if (r.atRisk) return 0;
    if (r.due && !r.done) return 1;
    if (r.done) return 2;
    return 3;
  }

  $effect(() => {
    void load();
    const offHabits = events.on('habits:changed', () => void load());
    const offSettings = events.on('settings:changed', () => void load());
    return () => {
      offHabits();
      offSettings();
    };
  });

  async function toggle(row: TodayRow) {
    const today = localDateStr();
    if (row.done) await unlogEntry(row.habit.id, today);
    else await logEntry(row.habit.id, today);
    events.emit('habits:changed');
  }

  const dueRows = $derived(rows.filter((r) => r.due || r.done));
  const restRows = $derived(rows.filter((r) => !r.due && !r.done));
  const doneCount = $derived(dueRows.filter((r) => r.done).length);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
</script>

{#snippet habitRow(row: TodayRow)}
  <li class:done={row.done} class:muted={!row.due && !row.done}>
    <Checkbox checked={row.done} onToggle={() => toggle(row)}>
      <span class="name">{row.habit.name}</span>
      {#if row.streak}
        <span class="streak mono" title="current streak">{row.streak}d</span>
      {/if}
      <span class="dots" title="last 7 days">
        {#each row.week as day (day.date)}
          <i class:filled={day.done} class:today={day.isToday}></i>
        {/each}
      </span>
      <span class="cadence">{cadenceLabel(row.habit)}</span>
      {#if row.atRisk}
        <StatusBadge label="at risk" tone="warn" />
      {/if}
    </Checkbox>
  </li>
{/snippet}

<div class="today">
  <StatBlock
    label="Today"
    value={`${doneCount}/${dueRows.length}`}
    hint={dateLabel}
    progress={dueRows.length ? doneCount / dueRows.length : null}
  />

  <Panel title="Due today">
    {#if rows.length === 0}
      <p class="hint">No habits. ⌘K → Add habit (e.g. "Gym - mon,wed,fri").</p>
    {:else if dueRows.length === 0}
      <p class="hint">Nothing due today.</p>
    {:else}
      <ul>
        {#each dueRows as row (row.habit.id)}
          {@render habitRow(row)}
        {/each}
      </ul>
    {/if}
  </Panel>

  {#if restRows.length}
    <Panel title="Not due today">
      <ul>
        {#each restRows as row (row.habit.id)}
          {@render habitRow(row)}
        {/each}
      </ul>
    </Panel>
  {/if}

  <p class="hint">
    At-risk flags appear from {String(atRiskHour).padStart(2, '0')}:00 — configurable in Settings.
  </p>
</div>

<style>
  .today {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 640px;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  li {
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-sm);
    transition: background var(--motion-fast);
  }

  li:hover {
    background: var(--color-surface);
  }

  li.done .name {
    color: var(--color-text-muted);
    text-decoration: line-through;
    text-decoration-color: var(--color-border);
  }

  li.muted .name {
    color: var(--color-text-muted);
  }

  .name {
    flex: 1;
  }

  .streak {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .dots {
    display: inline-flex;
    gap: 3px;
    align-items: center;
  }

  .dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-border);
  }

  .dots i.filled {
    background: var(--color-accent);
  }

  .dots i.today:not(.filled) {
    background: transparent;
    outline: 1px solid var(--color-accent);
    outline-offset: -1px;
  }

  .cadence {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
