<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Checkbox from '../../../ui/components/checkbox.svelte';
  import ConfirmButton from '../../../ui/components/confirm-button.svelte';
  import Overlay from '../../../ui/components/overlay.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { parseUtc } from '../../../ui/time';
  import {
    listApplications,
    setStage,
    updateCompanyRole,
    deleteApplications,
  } from '../data/queries';
  import { STAGES, STAGE_TONE, isTerminal, type ApplicationRow, type Stage } from '../data/schema';

  let rows = $state<ApplicationRow[]>([]);
  let hideTerminal = $state(false);
  let selected = $state<(string | number)[]>([]);
  let working = $state(false);

  /** Row id whose stage dropdown is open. */
  let stageMenuFor = $state<number | null>(null);
  /** Pending interview-date prompt for a stage change (value: YYYY-MM-DD). */
  let datePrompt = $state<{ id: number; stage: 'interviewing' | 'interviewed'; value: string } | null>(null);
  /** Inline company/role edit in progress. */
  let editing = $state<{ id: number; field: 'company' | 'role'; value: string } | null>(null);

  async function refresh() {
    rows = await listApplications();
    const alive = new Set(rows.map((r) => r.id as string | number));
    selected = selected.filter((id) => alive.has(id));
  }

  $effect(() => {
    void refresh();
    return events.on('pipeline:changed', () => void refresh());
  });

  const activeCount = $derived(rows.filter((r) => !isTerminal(r.status)).length);
  const visible = $derived(hideTerminal ? rows.filter((r) => !isTerminal(r.status)) : rows);

  // ---- display helpers ------------------------------------------------

  /** `dd mmm`. Bare dates are local; datetimes are stored UTC (see ui/time). */
  function ddmmm(value: string | null): string {
    if (!value) return '';
    const d = value.includes(':') ? parseUtc(value) : new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toLowerCase();
  }

  /** Interview / outcome column (spec §7): interview date while in play,
   *  close date for terminal rows, blank for applied. */
  function outcomeDate(r: ApplicationRow): string | null {
    if (r.status === 'interviewing' || r.status === 'interviewed') return r.interview_at;
    if (isTerminal(r.status)) return r.stage_changed_at;
    return null;
  }

  function daysLabel(r: ApplicationRow): string {
    if (isTerminal(r.status)) return '';
    if (r.status === 'interviewing')
      return r.interview_at ? `interview ${ddmmm(r.interview_at)}` : 'needs interview date';
    return r.is_stale ? `stale ${r.days_in_stage}d — follow up` : `waiting ${r.days_in_stage}d`;
  }

  function daysSort(r: ApplicationRow): number {
    if (isTerminal(r.status)) return -1000;
    if (r.status === 'interviewing') return -1;
    return r.days_in_stage;
  }

  const columns: Column<ApplicationRow>[] = [
    { key: 'company', label: 'company', width: '160px' },
    { key: 'role', label: 'role', width: '180px' },
    { key: 'url', label: 'listing', width: '60px', sortValue: (r) => r.url ?? '' },
    { key: 'status', label: 'stage', width: '130px' },
    {
      key: 'applied_at',
      label: 'applied',
      mono: true,
      width: '80px',
      value: (r) => ddmmm(r.applied_at),
      sortValue: (r) => r.applied_at,
    },
    {
      key: 'interview_at',
      label: 'interview / outcome',
      mono: true,
      width: '140px',
      value: (r) => ddmmm(outcomeDate(r)),
      sortValue: (r) => outcomeDate(r) ?? '',
    },
    {
      key: 'days',
      label: 'days',
      mono: true,
      width: '170px',
      value: daysLabel,
      sortValue: daysSort,
    },
  ];

  // ---- stage dropdown --------------------------------------------------

  function toggleStageMenu(e: MouseEvent, id: number) {
    e.stopPropagation();
    stageMenuFor = stageMenuFor === id ? null : id;
  }

  // Deferred so the opening click doesn't immediately close the menu
  $effect(() => {
    if (stageMenuFor === null) return;
    const close = () => (stageMenuFor = null);
    queueMicrotask(() => window.addEventListener('click', close));
    return () => window.removeEventListener('click', close);
  });

  function today(): string {
    return new Date().toLocaleDateString('en-CA');
  }

  async function chooseStage(e: MouseEvent, row: ApplicationRow, stage: Stage) {
    e.stopPropagation();
    stageMenuFor = null;
    if (stage === 'interviewing' || stage === 'interviewed') {
      // Interview date required for interviewing; asked for on a manual
      // interviewed too, so the staleness clock starts at the interview.
      datePrompt = { id: row.id, stage, value: row.interview_at?.slice(0, 10) ?? today() };
      return;
    }
    if (stage === row.status) return;
    await setStage(row.id, stage);
    events.emit('pipeline:changed');
  }

  async function confirmDate() {
    if (!datePrompt?.value) return;
    const { id, stage, value } = datePrompt;
    datePrompt = null;
    await setStage(id, stage, value);
    events.emit('pipeline:changed');
  }

  // ---- inline company/role edit -----------------------------------------

  function beginEdit(row: ApplicationRow, field: 'company' | 'role') {
    editing = { id: row.id, field, value: row[field] };
  }

  function focusSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  async function saveEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    editing = null;
    const row = rows.find((r) => r.id === id);
    const next = value.trim();
    if (!row || !next || next === row[field]) return;
    await updateCompanyRole(
      id,
      field === 'company' ? next : row.company,
      field === 'role' ? next : row.role
    );
    events.emit('pipeline:changed');
  }

  function onEditKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editing = null;
    }
  }

  // ---- selection / delete ------------------------------------------------

  function onSelectedChange(ids: (string | number)[]) {
    selected = ids;
  }

  async function bulkDelete() {
    if (!selected.length || working) return;
    working = true;
    await deleteApplications(selected.map(Number));
    working = false;
    selected = [];
    events.emit('pipeline:changed');
  }

  function openLink(e: MouseEvent, url: string) {
    e.stopPropagation();
    void openUrl(url);
  }
</script>

{#snippet textCell(row: ApplicationRow, field: 'company' | 'role')}
  {#if editing && editing.id === row.id && editing.field === field}
    <input
      class="cell-edit"
      bind:value={editing.value}
      onkeydown={onEditKey}
      onblur={saveEdit}
      use:focusSelect
      spellcheck="false"
    />
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="cell-text"
      title="Double-click to edit"
      ondblclick={() => beginEdit(row, field)}>{row[field]}</span
    >
  {/if}
{/snippet}

{#snippet companyCell(row: ApplicationRow)}
  {@render textCell(row, 'company')}
{/snippet}

{#snippet roleCell(row: ApplicationRow)}
  {@render textCell(row, 'role')}
{/snippet}

{#snippet linkCell(row: ApplicationRow)}
  {#if row.url}
    <button class="link" title={row.url} onclick={(e) => openLink(e, row.url!)}>↗</button>
  {/if}
{/snippet}

{#snippet stageCell(row: ApplicationRow)}
  <span class="stage-cell">
    <button
      class="stage-trigger"
      title="Change stage"
      onclick={(e) => toggleStageMenu(e, row.id)}
    >
      <StatusBadge label={row.status} tone={STAGE_TONE[row.status]} />
    </button>
    {#if stageMenuFor === row.id}
      <ul class="stage-menu">
        {#each STAGES as stage (stage)}
          <li>
            <button
              class:selected={stage === row.status}
              onclick={(e) => chooseStage(e, row, stage)}
            >
              {stage}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </span>
{/snippet}

{#snippet daysCell(row: ApplicationRow)}
  <span
    class="days"
    class:warn={row.is_stale === 1 || (row.status === 'interviewing' && !row.interview_at)}
    >{daysLabel(row)}</span
  >
{/snippet}

<div class="register">
  <div class="toolbar">
    <Checkbox checked={hideTerminal} onToggle={() => (hideTerminal = !hideTerminal)}>
      hide rejected &amp; hired
    </Checkbox>
  </div>
  <Panel title={`pipeline · ${activeCount} active · ${rows.length} total`}>
    <DataTable
      {columns}
      rows={visible}
      cells={{
        company: companyCell,
        role: roleCell,
        url: linkCell,
        status: stageCell,
        days: daysCell,
      }}
      empty="No applications. ⌘K → Add application (Company - Role - URL)."
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

{#if datePrompt}
  <Overlay top="20vh" onDismiss={() => (datePrompt = null)}>
    <div class="date-prompt">
      <p class="prompt-title">
        {datePrompt.stage === 'interviewing' ? 'interview date' : 'when was the interview?'}
      </p>
      <input type="date" bind:value={datePrompt.value} />
      <div class="prompt-actions">
        <button onclick={() => (datePrompt = null)}>Cancel</button>
        <button class="primary" disabled={!datePrompt.value} onclick={confirmDate}>Save</button>
      </div>
    </div>
  </Overlay>
{/if}

<style>
  .register {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .toolbar {
    display: flex;
    justify-content: flex-end;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Register look (spec §7): monospace, dense rows, hairline dividers.
     Scoped to this view — shared DataTable styling stays untouched. */
  .register :global(table) {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .register :global(th),
  .register :global(td) {
    border-bottom-width: 0.5px;
  }

  .cell-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell-edit {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    color: var(--color-text);
    font: inherit;
    padding: 0 var(--space-1);
    outline: none;
  }

  .link {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-accent);
    font-size: var(--text-sm);
  }

  .link:hover {
    color: var(--color-accent-hover);
  }

  .stage-cell {
    position: relative;
    display: inline-block;
    overflow: visible;
  }

  .stage-trigger {
    background: none;
    border: none;
    padding: 0;
  }

  .stage-menu {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    min-width: 120px;
    list-style: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-menu);
    padding: var(--space-1) 0;
    z-index: 90;
  }

  .stage-menu button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-3);
  }

  .stage-menu button:hover {
    background: var(--color-accent-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }

  .stage-menu button.selected {
    color: var(--color-accent);
  }

  .days.warn {
    color: var(--color-warn);
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

  .date-prompt {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 280px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-pop);
    padding: var(--space-4);
  }

  .prompt-title {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .date-prompt input {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font: inherit;
    padding: var(--space-1) var(--space-2);
    outline: none;
  }

  .date-prompt input:focus {
    border-color: var(--color-accent);
  }

  .prompt-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
