<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { check, type Update } from '@tauri-apps/plugin-updater';
  import { relaunch } from '@tauri-apps/plugin-process';
  import { getDb } from './core/db/client';

  type SmokeRow = { id: number; note: string; created_at: string };

  let version = $state('—');
  let rows = $state<SmokeRow[]>([]);
  let note = $state('');
  let dbError = $state('');
  let pendingUpdate = $state<Update | null>(null);
  let updateStatus = $state('checking for updates…');

  async function refresh() {
    const db = await getDb();
    rows = await db.select<SmokeRow[]>(
      'SELECT id, note, created_at FROM m0_smoke ORDER BY id DESC'
    );
  }

  async function addNote(e: SubmitEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    const db = await getDb();
    await db.execute('INSERT INTO m0_smoke (note) VALUES ($1)', [text]);
    note = '';
    await refresh();
  }

  async function checkForUpdates() {
    updateStatus = 'checking for updates…';
    pendingUpdate = null;
    try {
      const update = await check();
      if (update) {
        pendingUpdate = update;
        updateStatus = `v${update.version} available`;
      } else {
        updateStatus = 'up to date';
      }
    } catch (e) {
      updateStatus = `update check failed: ${e}`;
    }
  }

  async function installUpdate() {
    if (!pendingUpdate) return;
    try {
      updateStatus = `downloading v${pendingUpdate.version}…`;
      await pendingUpdate.downloadAndInstall();
      updateStatus = 'installed — relaunching';
      await relaunch();
    } catch (e) {
      updateStatus = `install failed: ${e}`;
    }
  }

  $effect(() => {
    getVersion().then((v) => (version = v));
    getDb()
      .then(async (db) => {
        // M0 throwaway table; real schemas arrive with the M1 migrator.
        await db.execute(
          `CREATE TABLE IF NOT EXISTS m0_smoke (
            id INTEGER PRIMARY KEY,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        );
        await refresh();
      })
      .catch((e) => (dbError = String(e)));
    checkForUpdates();
  });
</script>

<div class="shell">
  <header data-tauri-drag-region>
    <span class="wordmark">LODESTAR</span>
    <span class="milestone">M0 · walking skeleton</span>
  </header>

  <main>
    <section class="panel">
      <h2>Persistence smoke test</h2>
      <p class="hint">
        Rows live in lodestar.db under Application Support. They must survive
        every update.
      </p>
      <form onsubmit={addNote}>
        <input
          bind:value={note}
          placeholder="Write a note, press enter"
          spellcheck="false"
        />
        <button type="submit">Add</button>
      </form>
      {#if dbError}
        <p class="error">{dbError}</p>
      {:else if rows.length === 0}
        <p class="hint">No rows. Add one, quit the app, reopen — it should still be here.</p>
      {:else}
        <table>
          <thead>
            <tr><th>id</th><th>note</th><th>created_at (utc)</th></tr>
          </thead>
          <tbody>
            {#each rows as row (row.id)}
              <tr>
                <td class="num">{row.id}</td>
                <td>{row.note}</td>
                <td class="num">{row.created_at}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  </main>

  <footer>
    <span class="num">v{version}</span>
    <span class="status">{updateStatus}</span>
    {#if pendingUpdate}
      <button class="primary" onclick={installUpdate}>Install v{pendingUpdate.version}</button>
    {:else}
      <button onclick={checkForUpdates}>Check for updates</button>
    {/if}
  </footer>
</div>

<style>
  .shell {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    /* left inset clears the macOS traffic lights; header doubles as drag region */
    padding: var(--space-3) var(--space-4) var(--space-3) var(--titlebar-inset);
    border-bottom: 1px solid var(--color-border);
  }

  .wordmark {
    font-family: var(--font-mono);
    font-size: var(--text-base);
    letter-spacing: 0.18em;
  }

  .milestone {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  main {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
  }

  .panel {
    max-width: 640px;
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

  .error {
    font-size: var(--text-sm);
    color: var(--color-danger);
    font-family: var(--font-mono);
  }

  form {
    display: flex;
    gap: var(--space-2);
  }

  input {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font: inherit;
    padding: var(--space-2) var(--space-3);
    outline: none;
    transition: border-color var(--motion-fast);
  }

  input:focus {
    border-color: var(--color-accent);
  }

  button {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    transition: border-color var(--motion-fast);
  }

  button:hover {
    border-color: var(--color-accent);
  }

  button.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-on-accent);
  }

  button.primary:hover {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }

  table {
    border-collapse: collapse;
    width: 100%;
    font-size: var(--text-sm);
  }

  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  th {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border);
    font-size: var(--text-xs);
  }

  footer .num {
    font-size: var(--text-xs);
  }

  .status {
    color: var(--color-text-muted);
    flex: 1;
  }
</style>
