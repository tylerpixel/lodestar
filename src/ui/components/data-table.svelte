<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type Column<Row = Record<string, unknown>> = {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'right';
    mono?: boolean;
    sortable?: boolean;
    /** Display value; defaults to row[key]. */
    value?: (row: Row) => string | number;
    /** Sort value when display differs from sort order (e.g. relative time). */
    sortValue?: (row: Row) => string | number;
    /** Hover tooltip (e.g. absolute timestamp behind a relative one). */
    title?: (row: Row) => string;
  };
</script>

<script lang="ts" generics="Row extends Record<string, unknown>">
  let {
    columns,
    rows,
    empty = 'No records.',
    onRowClick,
    cells,
  }: {
    columns: Column<Row>[];
    rows: Row[];
    empty?: string;
    onRowClick?: (row: Row) => void;
    /** Custom cell renderers keyed by column key (e.g. status badges). */
    cells?: Record<string, Snippet<[Row]>>;
  } = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<1 | -1>(1);

  function raw(col: Column<Row>, row: Row): string | number {
    const v = col.sortValue?.(row) ?? col.value?.(row) ?? row[col.key];
    return typeof v === 'number' ? v : String(v ?? '');
  }

  function display(col: Column<Row>, row: Row): string {
    const v = col.value ? col.value(row) : row[col.key];
    return v == null ? '' : String(v);
  }

  function sortBy(col: Column<Row>) {
    if (col.sortable === false) return;
    if (sortKey === col.key) {
      sortDir = sortDir === 1 ? -1 : 1;
    } else {
      sortKey = col.key;
      sortDir = 1;
    }
  }

  const sorted = $derived.by(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const av = raw(col, a);
      const bv = raw(col, b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return cmp * sortDir;
    });
  });
</script>

<table>
  <thead>
    <tr>
      {#each columns as col (col.key)}
        <th style:width={col.width} class:right={col.align === 'right'}>
          <button onclick={() => sortBy(col)} disabled={col.sortable === false}>
            {col.label}{sortKey === col.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
          </button>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#if sorted.length === 0}
      <tr><td class="empty" colspan={columns.length}>{empty}</td></tr>
    {:else}
      {#each sorted as row, i (i)}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <tr class:clickable={!!onRowClick} onclick={() => onRowClick?.(row)}>
          {#each columns as col (col.key)}
            <td
              class:mono={col.mono}
              class:right={col.align === 'right'}
              title={col.title?.(row)}
            >
              {#if cells?.[col.key]}
                {@render cells[col.key](row)}
              {:else}
                {display(col, row)}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    {/if}
  </tbody>
</table>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  th button {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  th button:not(:disabled):hover {
    color: var(--color-text);
  }

  .right {
    text-align: right;
  }

  .right button {
    text-align: right;
    width: 100%;
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  tr.clickable:hover td {
    background: var(--color-surface);
  }

  .empty {
    color: var(--color-text-muted);
    padding: var(--space-4) var(--space-2);
  }
</style>
