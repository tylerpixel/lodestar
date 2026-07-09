<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type Column<Row = Record<string, unknown>> = {
    key: string;
    label: string;
    /** Initial width (e.g. '120px'); user can drag-resize from there. */
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
  import Checkbox from './checkbox.svelte';

  let {
    columns,
    rows,
    empty = 'No records.',
    onRowClick,
    cells,
    selectable = false,
    selected = [],
    onSelectedChange,
    rowId,
  }: {
    columns: Column<Row>[];
    rows: Row[];
    empty?: string;
    onRowClick?: (row: Row) => void;
    /** Custom cell renderers keyed by column key (e.g. status badges). */
    cells?: Record<string, Snippet<[Row]>>;
    /** Checkbox column; requires rowId. Parent owns the selection. */
    selectable?: boolean;
    selected?: (string | number)[];
    onSelectedChange?: (ids: (string | number)[]) => void;
    rowId?: (row: Row) => string | number;
  } = $props();

  const SELECT_WIDTH = 36;
  const DEFAULT_WIDTH = 140;
  const MIN_WIDTH = 40;

  function parseWidth(w?: string): number {
    const n = w ? parseInt(w, 10) : NaN;
    return Number.isFinite(n) ? n : DEFAULT_WIDTH;
  }

  // Only user-resized columns live here; everything else falls back to the
  // column's declared width, so dynamic column sets stay correct.
  let widths = $state<Record<string, number>>({});

  function colWidth(col: Column<Row>): number {
    return widths[col.key] ?? parseWidth(col.width);
  }

  const totalWidth = $derived(
    columns.reduce((sum, c) => sum + colWidth(c), 0) + (selectable ? SELECT_WIDTH : 0)
  );

  function startResize(e: MouseEvent, col: Column<Row>) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidth(col);
    const move = (ev: MouseEvent) => {
      widths[col.key] = Math.max(MIN_WIDTH, startWidth + ev.clientX - startX);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

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

  const ids = $derived(selectable && rowId ? sorted.map((r) => rowId(r)) : []);
  const allSelected = $derived(ids.length > 0 && ids.every((id) => selected.includes(id)));

  function toggleAll() {
    onSelectedChange?.(allSelected ? [] : [...ids]);
  }

  function toggleRow(e: Event, id: string | number) {
    e.stopPropagation();
    onSelectedChange?.(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }
</script>

<div class="scroll">
  <table style:width="{totalWidth}px">
    <thead>
      <tr>
        {#if selectable}
          <th class="sel" style:width="{SELECT_WIDTH}px">
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && selected.length > 0}
              onToggle={toggleAll}
            />
          </th>
        {/if}
        {#each columns as col (col.key)}
          <th style:width="{colWidth(col)}px" class:right={col.align === 'right'}>
            <button onclick={() => sortBy(col)} disabled={col.sortable === false}>
              {col.label}{sortKey === col.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
            </button>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="resizer" onmousedown={(e) => startResize(e, col)}></span>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if sorted.length === 0}
        <tr>
          <td class="empty" colspan={columns.length + (selectable ? 1 : 0)}>{empty}</td>
        </tr>
      {:else}
        {#each sorted as row, i (rowId ? rowId(row) : i)}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <tr class:clickable={!!onRowClick} onclick={() => onRowClick?.(row)}>
            {#if selectable && rowId}
              <td class="sel">
                <Checkbox
                  checked={selected.includes(rowId(row))}
                  onToggle={(e) => toggleRow(e, rowId(row))}
                />
              </td>
            {/if}
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
</div>

<style>
  .scroll {
    overflow-x: auto;
    max-width: 100%;
  }

  table {
    table-layout: fixed;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th {
    position: relative;
  }

  th button {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th button:not(:disabled):hover {
    color: var(--color-text);
  }

  .resizer {
    position: absolute;
    top: 0;
    bottom: 0;
    right: -4px;
    width: 8px;
    cursor: col-resize;
    z-index: 2;
  }

  .resizer:hover {
    box-shadow: inset -2px 0 0 var(--color-accent);
  }

  .sel {
    text-align: center;
    overflow: visible;
  }

  .right {
    text-align: right;
  }

  .right button {
    text-align: right;
    width: 100%;
  }

  tr.clickable:hover td {
    background: var(--color-surface);
  }

  .empty {
    color: var(--color-text-muted);
    padding: var(--space-4) var(--space-2);
  }
</style>
