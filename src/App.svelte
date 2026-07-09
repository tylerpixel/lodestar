<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Shell from './ui/layout/shell.svelte';
  import CommandPalette from './core/command-palette/palette.svelte';
  import { router } from './core/router.svelte';
  import { palette } from './core/command-palette/registry.svelte';
  import { updater } from './core/updater.svelte';

  let version = $state('—');

  $effect(() => {
    getVersion().then((v) => (version = v));
  });

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        palette.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Explicit startDragging: the data-tauri-drag-region attribute proved
  // unreliable (v0.0.3), so the header drives window drag directly.
  function onHeaderMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, a, select')) return;
    const win = getCurrentWindow();
    if (e.detail === 2) void win.toggleMaximize();
    else void win.startDragging();
  }

  const navItems = $derived(
    [...router.routes.filter((r) => !r.hidden)].sort(
      (a, b) => Number(a.id === 'settings') - Number(b.id === 'settings')
    )
  );

  const Current = $derived(router.current?.component);
</script>

<Shell
  items={navItems}
  activeId={router.currentId}
  onNavigate={(id) => router.go(id)}
  {onHeaderMouseDown}
>
  {#snippet footer()}
    <span class="mono">v{version}</span>
    <span class="status">{updater.status}</span>
    {#if updater.pending}
      <button class="primary" onclick={() => updater.install()}>
        Install v{updater.pending.version}
      </button>
    {:else}
      <button onclick={() => updater.check()}>Check for updates</button>
    {/if}
    <span class="kbd">⌘K</span>
  {/snippet}
  {#if Current}
    <Current />
  {/if}
</Shell>

<CommandPalette />

<style>
  .mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .status {
    color: var(--color-text-muted);
    flex: 1;
  }

  .kbd {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 5px;
  }
</style>
