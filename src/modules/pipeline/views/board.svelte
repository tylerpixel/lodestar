<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Select from '../../../ui/components/select.svelte';
  import ConfirmButton from '../../../ui/components/confirm-button.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import ImportDialog from '../components/import-dialog.svelte';
  import { events } from '../../../core/events';
  import { router } from '../../../core/router.svelte';
  import { relTime, absTime } from '../../../ui/time';
  import { listApplications, setStatus, deleteApplications } from '../data/queries';
  import { STATUSES, STATUS_TONE, type ApplicationRow, type ApplicationStatus } from '../data/schema';

  let rows = $state<ApplicationRow[]>([]);
  let importOpen = $state(false);
  let selected = $state<(string | number)[]>([]);
  let bulkStatus = $state<ApplicationStatus>('interview');
  const statusOptions = STATUSES.map((s) => ({ value: s, label: s }));
  let working = $state(false);

  async function refresh() {
    rows = await listApplications();
    const alive = new Set(rows.map((r) => r.id as string | number));
    selected = selected.filter((id) => alive.has(id));
  }

  $effect(() => {
    void refresh();
    return events.on('pipeline:changed', () => void refresh());
  });

  const staleCount = $derived(rows.filter((r) => r.is_stale).length);

  // Column set mirrors the owner's job-tracking spreadsheet (PRD §7.1):
  // company, role, stage, applied date, interview/rejection date, days between, notes, link.
  const columns: Column<ApplicationRow>[] = [
    { key: 'company', label: 'company', width: '150px' },
    { key: 'role', label: 'role', width: '170px' },
    { key: 'status', label: 'stage', width: '130px' },
    {
      key: 'applied_at',
      label: 'applied',
      mono: true,
      width: '100px',
      value: (r) => r.applied_at.slice(0, 10),
      title: (r) => `${relTime(r.applied_at)} · ${absTime(r.applied_at)}`,
    },
    {
      key: 'outcome_at',
      label: 'interview/rejection',
      mono: true,
      width: '130px',
      value: (r) => r.outcome_at?.slice(0, 10) ?? '',
      sortValue: (r) => r.outcome_at ?? '',
      title: (r) => (r.outcome_at ? `${relTime(r.outcome_at)} · ${absTime(r.outcome_at)}` : ''),
    },
    {
      key: 'days_to_outcome',
      label: 'days',
      mono: true,
      align: 'right',
      width: '60px',
      value: (r) => (r.days_to_outcome == null ? '' : String(r.days_to_outcome)),
      sortValue: (r) => r.days_to_outcome ?? -1,
    },
    { key: 'notes', label: 'notes', width: '220px', value: (r) => r.notes ?? '' },
    { key: 'url', label: 'link', width: '52px', sortable: false },
  ];

  function openLink(e: MouseEvent, url: string) {
    e.stopPropagation();
    void openUrl(url);
  }

  function onSelectedChange(ids: (string | number)[]) {
    selected = ids;
  }

  async function applyBulkStatus() {
    if (!selected.length || working) return;
    working = true;
    for (const id of selected) await setStatus(Number(id), bulkStatus);
    working = false;
    selected = [];
    events.emit('pipeline:changed');
  }

  async function bulkDelete() {
    if (!selected.length || working) return;
    working = true;
    await deleteApplications(selected.map(Number));
    working = false;
    selected = [];
    events.emit('pipeline:changed');
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
      selectable
      {selected}
      {onSelectedChange}
      rowId={(r) => r.id}
    />
  </Panel>
</div>

{#if selected.length}
  <div class="island">
    <span class="count">{selected.length} selected</span>
    <Select options={statusOptions} bind:value={bulkStatus} direction="up" />
    <button onclick={applyBulkStatus} disabled={working}>Set stage</button>
    <ConfirmButton
      label="Delete"
      confirmLabel="Confirm delete"
      danger
      pill
      disabled={working}
      onConfirm={bulkDelete}
    />
    <button class="dismiss" onclick={() => onSelectedChange([])}>✕</button>
  </div>
{/if}

<ImportDialog open={importOpen} onClose={() => (importOpen = false)} />

<style>
  .board {
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

  .island {
    position: fixed;
    bottom: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
    z-index: 60;
    animation: island-in var(--motion-fast) ease-out;
  }

  @keyframes island-in {
    from {
      transform: translate(-50%, 12px);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }

  .count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding-right: var(--space-1);
  }

  .island button {
    border-radius: 999px;
  }

  .dismiss {
    border: none;
    background: none;
    color: var(--color-text-muted);
  }
</style>
