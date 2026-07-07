<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Shell from './ui/layout/shell.svelte';
  import CommandPalette from './core/command-palette/palette.svelte';
  import { router } from './core/router.svelte';
  import { palette } from './core/command-palette/registry.svelte';

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

  const navItems = $derived(router.routes.filter((r) => r.id !== 'settings' && !r.hidden));
  const settingsRoute = $derived(router.routes.find((r) => r.id === 'settings'));

  const Current = $derived(router.current?.component);
</script>

<Shell
  items={navItems}
  activeId={router.currentId}
  onNavigate={(id) => router.go(id)}
  settings={settingsRoute}
  {onHeaderMouseDown}
>
  {#if Current}
    <Current />
  {/if}
</Shell>

<CommandPalette />
