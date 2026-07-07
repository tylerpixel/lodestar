<script lang="ts">
  import DataTable, { type Column } from '../ui/components/data-table.svelte';
  import Panel from '../ui/layout/panel.svelte';
  import { events } from '../core/events';
  import { relTime, absTime } from '../ui/time';
  import { listNotes, type Note } from './queries';

  let rows = $state<Note[]>([]);

  async function refresh() {
    rows = await listNotes();
  }

  $effect(() => {
    void refresh();
    return events.on('notes:changed', () => void refresh());
  });

  const columns: Column<Note>[] = [
    { key: 'id', label: 'id', mono: true, width: '56px', align: 'right' },
    { key: 'note', label: 'note' },
    {
      key: 'created_at',
      label: 'age',
      mono: true,
      width: '110px',
      value: (r) => relTime(r.created_at),
      sortValue: (r) => r.created_at,
      title: (r) => absTime(r.created_at),
    },
  ];
</script>

<div class="board">
  <Panel title={`Notes — persistence check (${rows.length})`}>
    <DataTable {columns} {rows} empty="No notes. ⌘K → Add note." />
  </Panel>
  <p class="coming">
    Pipeline (M2), Habits (M3), and Ledger (M4) summaries compose here at M5.
  </p>
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 720px;
  }

  .coming {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
