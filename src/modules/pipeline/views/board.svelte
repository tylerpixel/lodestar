<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import ImportDialog from '../components/import-dialog.svelte';
  import { events } from '../../../core/events';
  import { router } from '../../../core/router.svelte';
  import { relTime, absTime } from '../../../ui/time';
  import { listApplications } from '../data/queries';
  import { STATUS_TONE, type ApplicationRow } from '../data/schema';

  let rows = $state<ApplicationRow[]>([]);
  let importOpen = $state(false);

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
    { key: 'url', label: 'link', width: '48px', sortable: false },
  ];

  function openLink(e: MouseEvent, url: string) {
    e.stopPropagation();
    void openUrl(url);
  }
</script>

{#snippet statusCell(row: ApplicationRow)}
  <span class="status-cell">
    <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} />
    {#if row.is_stale}
      <StatusBadge label="stale" tone="warn" />
    {/if}
  </span>
{/snippet}

{#snippet linkCell(row: ApplicationRow)}
  {#if row.url}
    <button class="link" title={row.url} onclick={(e) => openLink(e, row.url!)}>link</button>
  {/if}
{/snippet}

<div class="board">
  <div class="toolbar">
    <button onclick={() => (importOpen = true)}>Import CSV</button>
  </div>
  <Panel
    title={`Applications (${rows.length}${staleCount ? ` · ${staleCount} stale` : ''})`}
  >
    <DataTable
      {columns}
      {rows}
      cells={{ status: statusCell, url: linkCell }}
      empty="No applications. ⌘K → Add application (Company - Role)."
      onRowClick={(r) => router.go('pipeline:detail', { id: r.id })}
    />
  </Panel>
</div>

<ImportDialog open={importOpen} onClose={() => (importOpen = false)} />

<style>
  .board {
    max-width: 1000px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .toolbar {
    display: flex;
    justify-content: flex-end;
  }

  .status-cell {
    display: inline-flex;
    gap: var(--space-2);
  }

  .link {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-accent);
    font-size: var(--text-sm);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .link:hover {
    color: var(--color-accent-hover);
  }
</style>
