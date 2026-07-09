<script lang="ts">
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Checkbox from '../../../ui/components/checkbox.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { getSetting } from '../../../core/settings';
  import { cadenceLabel, type Habit } from '../data/schema';
  import { localDateStr, addDays } from '../data/dates';
  import { isDueToday } from '../data/due';
  import { listActiveHabits, entriesSince, logEntry, unlogEntry } from '../data/queries';

  type TodayRow = {
    habit: Habit;
    done: boolean;
    due: boolean;
    atRisk: boolean;
  };

  let rows = $state<TodayRow[]>([]);
  let atRiskHour = $state(18);

  async function load() {
    const setting = await getSetting('habits.at_risk_hour');
    atRiskHour = setting != null && setting !== '' ? Number(setting) : 18;

    const habits = await listActiveHabits();
    const today = localDateStr();
    const weekStart = localDateStr(addDays(new Date(), -6));
    const entries = await entriesSince(weekStart);

    const doneToday = new Set(
      entries.filter((e) => e.entry_date === today).map((e) => e.habit_id)
    );
    const weekCounts = new Map<number, number>();
    for (const e of entries) {
      weekCounts.set(e.habit_id, (weekCounts.get(e.habit_id) ?? 0) + 1);
    }

    const now = new Date();
    const pastRiskHour = now.getHours() >= atRiskHour;
    rows = habits.map((habit) => {
      const done = doneToday.has(habit.id);
      const due = isDueToday(habit, weekCounts.get(habit.id) ?? 0, now);
      return { habit, done, due, atRisk: due && !done && pastRiskHour };
    });
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
</script>

<div class="today">
  <Panel title={`Today (${dueRows.filter((r) => r.done).length}/${dueRows.length})`}>
    {#if rows.length === 0}
      <p class="hint">No habits. ⌘K → Add habit (e.g. "Gym - mon,wed,fri").</p>
    {:else if dueRows.length === 0}
      <p class="hint">Nothing due today.</p>
    {:else}
      <ul>
        {#each dueRows as row (row.habit.id)}
          <li class:done={row.done}>
            <Checkbox checked={row.done} onToggle={() => toggle(row)}>
              <span class="name">{row.habit.name}</span>
              <span class="cadence">{cadenceLabel(row.habit)}</span>
              {#if row.atRisk}
                <StatusBadge label="at risk" tone="warn" />
              {/if}
            </Checkbox>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  {#if restRows.length}
    <Panel title="Not due today">
      <ul>
        {#each restRows as row (row.habit.id)}
          <li class="muted">
            <Checkbox checked={row.done} onToggle={() => toggle(row)}>
              <span class="name">{row.habit.name}</span>
              <span class="cadence">{cadenceLabel(row.habit)}</span>
            </Checkbox>
          </li>
        {/each}
      </ul>
    </Panel>
  {/if}

  <p class="hint">At-risk flags appear from {String(atRiskHour).padStart(2, '0')}:00 — configurable in Settings.</p>
</div>

<style>
  .today {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 560px;
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
