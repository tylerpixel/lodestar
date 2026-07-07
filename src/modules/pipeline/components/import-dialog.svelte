<script lang="ts">
  import { events } from '../../../core/events';
  import { parseCsv } from '../data/csv';
  import { importApplications, type ImportApplication } from '../data/queries';

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  const TARGETS: [string, string][] = [
    ['', '— ignore —'],
    ['company', 'company (required)'],
    ['role', 'role'],
    ['source', 'source'],
    ['url', 'url'],
    ['status', 'status'],
    ['salary_min', 'salary min'],
    ['salary_max', 'salary max'],
    ['applied_at', 'applied date'],
    ['outcome_at', 'interview/rejection date'],
    ['next_action', 'next action'],
    ['next_action_due', 'next action due'],
    ['notes', 'notes'],
  ];

  let headers = $state<string[]>([]);
  let rows = $state<string[][]>([]);
  let mapping = $state<string[]>([]);
  let error = $state('');
  let done = $state('');
  let importing = $state(false);

  $effect(() => {
    if (open) {
      headers = [];
      rows = [];
      mapping = [];
      error = '';
      done = '';
      importing = false;
    }
  });

  function guess(header: string): string {
    const h = header.toLowerCase().replace(/[^a-z]/g, '');
    if (/company|employer|org/.test(h)) return 'company';
    if (/role|title|position|job/.test(h)) return 'role';
    if (/source|via|board/.test(h)) return 'source';
    if (/url|link/.test(h)) return 'url';
    if (/status|stage/.test(h)) return 'status';
    if (/salarymin|minsalary|min/.test(h)) return 'salary_min';
    if (/salarymax|maxsalary|max/.test(h)) return 'salary_max';
    if (/interview|reject|outcome|response/.test(h)) return 'outcome_at';
    if (/applied|date/.test(h)) return 'applied_at';
    if (/due/.test(h)) return 'next_action_due';
    if (/next|action|todo/.test(h)) return 'next_action';
    if (/note|comment/.test(h)) return 'notes';
    return '';
  }

  async function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      error = 'CSV needs a header row and at least one data row.';
      return;
    }
    headers = parsed[0];
    rows = parsed.slice(1);
    const seen = new Set<string>();
    mapping = headers.map((h) => {
      const target = guess(h);
      if (!target || seen.has(target)) return '';
      seen.add(target);
      return target;
    });
    error = '';
  }

  async function runImport() {
    const col = (target: string) => mapping.indexOf(target);
    if (col('company') === -1) {
      error = 'Map a column to company — it is required.';
      return;
    }
    error = '';
    importing = true;
    const get = (r: string[], target: string) => {
      const i = col(target);
      return i === -1 ? '' : (r[i] ?? '').trim();
    };
    const toNumber = (v: string) => {
      const n = Number(v.replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) && v !== '' ? Math.round(n) : null;
    };
    const records: ImportApplication[] = [];
    for (const r of rows) {
      const company = get(r, 'company');
      if (!company) continue;
      records.push({
        company,
        role: get(r, 'role') || '—',
        source: get(r, 'source') || null,
        url: get(r, 'url') || null,
        status: get(r, 'status').toLowerCase() || null,
        salary_min: toNumber(get(r, 'salary_min')),
        salary_max: toNumber(get(r, 'salary_max')),
        applied_at: get(r, 'applied_at') || null,
        outcome_at: get(r, 'outcome_at') || null,
        next_action: get(r, 'next_action') || null,
        next_action_due: get(r, 'next_action_due') || null,
        notes: get(r, 'notes') || null,
      });
    }
    const count = await importApplications(records);
    importing = false;
    events.emit('pipeline:changed');
    done = `Imported ${count} of ${rows.length} rows${
      count < rows.length ? ' (rows without a company were skipped)' : ''
    }.`;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="overlay" onmousedown={(e) => e.target === e.currentTarget && onClose()}>
    <div class="dialog">
      <h2>Import applications from CSV</h2>

      {#if done}
        <p class="done">{done}</p>
        <div class="actions">
          <button class="primary" onclick={onClose}>Done</button>
        </div>
      {:else if headers.length === 0}
        <p class="hint">
          Pick a CSV with a header row. You'll map its columns next — unmapped
          columns are simply not imported. Dates work best as YYYY-MM-DD.
        </p>
        <input type="file" accept=".csv,text/csv" onchange={onFile} />
        {#if error}<p class="error">{error}</p>{/if}
      {:else}
        <p class="hint">
          {rows.length} data rows. Map each CSV column to a field, or ignore it.
        </p>
        <div class="map-scroll">
          <table>
            <thead>
              <tr><th>csv column</th><th>first row</th><th>import as</th></tr>
            </thead>
            <tbody>
              {#each headers as header, i (i)}
                <tr>
                  <td class="mono">{header}</td>
                  <td class="sample">{rows[0]?.[i] ?? ''}</td>
                  <td>
                    <select bind:value={mapping[i]}>
                      {#each TARGETS as [value, label] (value)}
                        <option {value}>{label}</option>
                      {/each}
                    </select>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if error}<p class="error">{error}</p>{/if}
        <div class="actions">
          <button onclick={onClose}>Cancel</button>
          <button class="primary" onclick={runImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 10vh;
    z-index: 100;
  }

  .dialog {
    width: 620px;
    max-width: calc(100vw - 48px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h2 {
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .hint {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .done {
    font-size: var(--text-sm);
  }

  .error {
    font-size: var(--text-sm);
    color: var(--color-danger);
  }

  .map-scroll {
    max-height: 300px;
    overflow-y: auto;
  }

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

  th {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .mono {
    font-family: var(--font-mono);
  }

  .sample {
    color: var(--color-text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  select {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    width: 100%;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
