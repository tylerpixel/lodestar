<script lang="ts">
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { router } from '../../../core/router.svelte';
  import { relTime, absTime } from '../../../ui/time';
  import {
    getApplication,
    listEvents,
    setStatus,
    logEvent,
    updateDetails,
  } from '../data/queries';
  import {
    STATUSES,
    STATUS_TONE,
    EVENT_KINDS,
    type ApplicationRow,
    type ApplicationEvent,
    type ApplicationStatus,
    type EventKind,
  } from '../data/schema';

  const id = $derived(Number(router.params.id ?? 0));

  let app = $state<ApplicationRow | null>(null);
  let evts = $state<ApplicationEvent[]>([]);
  let draft = $state({
    source: '',
    url: '',
    salary_min: '',
    salary_max: '',
    next_action: '',
    next_action_due: '',
    notes: '',
  });
  let eventKind = $state<EventKind>('note');
  let eventText = $state('');

  async function load() {
    if (!id) {
      app = null;
      return;
    }
    app = await getApplication(id);
    evts = await listEvents(id);
    if (app) {
      draft = {
        source: app.source ?? '',
        url: app.url ?? '',
        salary_min: app.salary_min?.toString() ?? '',
        salary_max: app.salary_max?.toString() ?? '',
        next_action: app.next_action ?? '',
        next_action_due: app.next_action_due ?? '',
        notes: app.notes ?? '',
      };
    }
  }

  $effect(() => {
    void id;
    void load();
    return events.on('pipeline:changed', () => void load());
  });

  async function changeStatus(status: ApplicationStatus) {
    if (!app || app.status === status) return;
    await setStatus(id, status);
    events.emit('pipeline:changed');
  }

  async function saveDetails() {
    await updateDetails(id, {
      source: draft.source.trim() || null,
      url: draft.url.trim() || null,
      salary_min: draft.salary_min ? Number(draft.salary_min) : null,
      salary_max: draft.salary_max ? Number(draft.salary_max) : null,
      next_action: draft.next_action.trim() || null,
      next_action_due: draft.next_action_due || null,
      notes: draft.notes.trim() || null,
    });
    events.emit('pipeline:changed');
  }

  async function submitEvent(e: SubmitEvent) {
    e.preventDefault();
    const text = eventText.trim();
    if (!text) return;
    await logEvent(id, eventKind, text);
    eventText = '';
    events.emit('pipeline:changed');
  }

  const eventColumns: Column<ApplicationEvent>[] = [
    { key: 'kind', label: 'kind', mono: true, width: '110px' },
    { key: 'detail', label: 'detail', value: (r) => r.detail ?? '' },
    {
      key: 'occurred_at',
      label: 'when',
      mono: true,
      width: '100px',
      value: (r) => relTime(r.occurred_at),
      sortValue: (r) => r.occurred_at,
      title: (r) => absTime(r.occurred_at),
    },
  ];
</script>

{#if !app}
  <p class="none">No application selected. Pick one from the Pipeline board.</p>
{:else}
  <div class="detail">
    <header>
      <button class="back" onclick={() => router.go('pipeline')}>← Pipeline</button>
      <h1>{app.company} — {app.role}</h1>
      <StatusBadge label={app.status} tone={STATUS_TONE[app.status]} />
      {#if app.is_stale}
        <StatusBadge label="stale" tone="warn" />
      {/if}
      <span class="age" title={absTime(app.applied_at)}>applied {relTime(app.applied_at)}</span>
    </header>

    <Panel title="Status">
      <div class="statuses">
        {#each STATUSES as status (status)}
          <button
            class:current={app.status === status}
            onclick={() => changeStatus(status)}
          >
            {status}
          </button>
        {/each}
      </div>
    </Panel>

    <Panel title="Details">
      <div class="fields">
        <label>source <input bind:value={draft.source} placeholder="seek, linkedin, referral…" /></label>
        <label>url <input bind:value={draft.url} placeholder="https://…" /></label>
        <label>salary min <input bind:value={draft.salary_min} inputmode="numeric" /></label>
        <label>salary max <input bind:value={draft.salary_max} inputmode="numeric" /></label>
        <label>next action <input bind:value={draft.next_action} placeholder="follow up Friday" /></label>
        <label>due <input type="date" bind:value={draft.next_action_due} /></label>
        <label class="wide">notes <textarea rows="3" bind:value={draft.notes}></textarea></label>
      </div>
      <div class="actions">
        <button class="primary" onclick={saveDetails}>Save details</button>
      </div>
    </Panel>

    <Panel title="Activity">
      <form onsubmit={submitEvent}>
        <select bind:value={eventKind}>
          {#each EVENT_KINDS as kind (kind)}
            <option value={kind}>{kind}</option>
          {/each}
        </select>
        <input bind:value={eventText} placeholder="What happened? Enter to log — refreshes activity" />
        <button type="submit">Log</button>
      </form>
      <DataTable columns={eventColumns} rows={evts} empty="No events yet." />
    </Panel>
  </div>
{/if}

<style>
  .none {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 820px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  h1 {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .back {
    background: none;
    border: none;
    color: var(--color-text-muted);
    padding: 0;
    font-size: var(--text-sm);
  }

  .back:hover {
    color: var(--color-text);
  }

  .age {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .statuses {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .statuses button.current {
    border-color: var(--color-accent);
    color: var(--color-text);
    background: var(--color-accent-muted);
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  label.wide {
    grid-column: 1 / -1;
  }

  textarea {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font: inherit;
    padding: var(--space-2) var(--space-3);
    outline: none;
    resize: vertical;
  }

  textarea:focus {
    border-color: var(--color-accent);
  }

  select {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
  }

  .actions {
    margin-top: var(--space-3);
  }

  form {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  form input {
    flex: 1;
  }
</style>
