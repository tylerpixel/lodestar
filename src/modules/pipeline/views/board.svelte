<script lang="ts">
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { router } from '../../../core/router.svelte';
  import { relTime, absTime } from '../../../ui/time';
  import { listApplications } from '../data/queries';
  import { STATUS_TONE, type ApplicationRow } from '../data/schema';

  let rows = $state<ApplicationRow[]>([]);

  async function refresh() {
    rows = await listApplications();
  }

  $effect(() => {
    void refresh();
    return events.on('pipeline:changed', () => void refresh());
  });

  const staleCount = $derived(rows.filter((r) => r.is_stale).length);

  const columns: Column<ApplicationRow>[] = [
    { key: 'company', label: 'company' },
    { key: 'role', label: 'role' },
    { key: 'status', label: 'status', width: '130px' },
    { key: 'source', label: 'source', width: '90px', value: (r) => r.source ?? '' },
    {
      key: 'applied_at',
      label: 'applied',
      mono: true,
      width: '90px',
      value: (r) => relTime(r.applied_at),
      sortValue: (r) => r.applied_at,
      title: (r) => absTime(r.applied_at),
    },
    {
      key: 'last_activity_at',
      label: 'activity',
      mono: true,
      width: '90px',
      value: (r) => relTime(r.last_activity_at),
      sortValue: (r) => r.last_activity_at,
      title: (r) => absTime(r.last_activity_at),
    },
    {
      key: 'next_action',
      label: 'next action',
      width: '180px',
      value: (r) =>
        r.next_action
          ? r.next_action + (r.next_action_due ? ` · ${r.next_action_due}` : '')
          : '',
    },
  ];
</script>

{#snippet statusCell(row: ApplicationRow)}
  <span class="status-cell">
    <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} />
    {#if row.is_stale}
      <StatusBadge label="stale" tone="warn" />
    {/if}
  </span>
{/snippet}

<div class="board">
  <Panel
    title={`Applications (${rows.length}${staleCount ? ` · ${staleCount} stale` : ''})`}
  >
    <DataTable
      {columns}
      {rows}
      cells={{ status: statusCell }}
      empty="No applications. ⌘K → Add application (Company - Role)."
      onRowClick={(r) => router.go('pipeline:detail', { id: r.id })}
    />
  </Panel>
</div>

<style>
  .board {
    max-width: 1000px;
  }

  .status-cell {
    display: inline-flex;
    gap: var(--space-2);
  }
</style>
