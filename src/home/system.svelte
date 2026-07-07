<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import Panel from '../ui/layout/panel.svelte';
  import { updater } from '../core/updater.svelte';

  let version = $state('—');

  $effect(() => {
    getVersion().then((v) => (version = v));
  });
</script>

<div class="system">
  <Panel title="Application">
    <dl>
      <div>
        <dt>Version</dt>
        <dd class="mono">v{version}</dd>
      </div>
      <div>
        <dt>Data</dt>
        <dd class="mono">~/Library/Application Support/com.tylerpixel.lodestar/lodestar.db</dd>
      </div>
      <div>
        <dt>Updates</dt>
        <dd>
          <span class="status">{updater.status}</span>
          {#if updater.pending}
            <button class="primary" onclick={() => updater.install()}>
              Install v{updater.pending.version}
            </button>
          {:else}
            <button onclick={() => updater.check()}>Check now</button>
          {/if}
        </dd>
      </div>
    </dl>
  </Panel>
</div>

<style>
  .system {
    max-width: 720px;
  }

  dl {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }

  dl div {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: baseline;
    gap: var(--space-3);
  }

  dt {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  dd {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .status {
    color: var(--color-text-muted);
  }
</style>
