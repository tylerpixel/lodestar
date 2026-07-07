<script lang="ts">
  import type { Snippet } from 'svelte';
  import logotype from '../assets/logotype.svg';

  type NavItem = { id: string; label: string };

  let {
    items,
    activeId,
    onNavigate,
    captures = [],
    onCapture,
    settings,
    onHeaderMouseDown,
    children,
  }: {
    items: NavItem[];
    activeId: string;
    onNavigate: (id: string) => void;
    captures?: NavItem[];
    onCapture?: (id: string) => void;
    settings?: NavItem;
    onHeaderMouseDown?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();

  let addOpen = $state(false);

  $effect(() => {
    if (!addOpen) return;
    const close = () => (addOpen = false);
    // Deferred so the opening click doesn't immediately close it
    queueMicrotask(() => window.addEventListener('click', close, { once: true }));
    return () => window.removeEventListener('click', close);
  });
</script>

<div class="shell">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header onmousedown={onHeaderMouseDown}>
    <img class="logotype" src={logotype} alt="LODESTAR" draggable="false" />
    <nav>
      {#each items as item (item.id)}
        <button class:active={item.id === activeId} onclick={() => onNavigate(item.id)}>
          {item.label}
        </button>
      {/each}
      {#if captures.length && onCapture}
        <div class="add">
          <button class="primary" onclick={() => (addOpen = !addOpen)}>+ Add</button>
          {#if addOpen}
            <ul class="add-menu">
              {#each captures as capture (capture.id)}
                <li>
                  <button
                    onclick={() => {
                      addOpen = false;
                      onCapture(capture.id);
                    }}
                  >
                    {capture.label}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </nav>
  </header>
  <main>{@render children()}</main>
  {#if settings}
    <button
      class="settings-corner"
      class:active={settings.id === activeId}
      onclick={() => onNavigate(settings.id)}
    >
      {settings.label}
    </button>
  {/if}
</div>

<style>
  .shell {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    /* thin bar: logotype matches traffic-light height, no divider below */
    height: 40px;
    padding: 0 var(--space-3) 0 var(--titlebar-inset);
  }

  .logotype {
    height: 12px;
    width: auto;
    user-select: none;
    -webkit-user-drag: none;
  }

  nav {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  nav button {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-3);
    transition: color var(--motion-fast);
  }

  nav button:hover {
    color: var(--color-text);
  }

  nav button.active {
    color: var(--color-text);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }

  nav button.primary {
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: 600;
  }

  nav button.primary:hover {
    background: var(--color-accent-hover);
  }

  .add {
    position: relative;
    margin-left: var(--space-2);
  }

  .add-menu {
    position: absolute;
    top: calc(100% + var(--space-1));
    right: 0;
    min-width: 180px;
    list-style: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    padding: var(--space-1) 0;
    z-index: 50;
  }

  .add-menu button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
  }

  .add-menu button:hover {
    background: var(--color-accent-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }

  main {
    overflow-y: auto;
    padding: var(--space-6) var(--space-6) 56px;
  }

  .settings-corner {
    position: fixed;
    bottom: var(--space-3);
    left: var(--space-3);
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    transition: color var(--motion-fast);
    z-index: 40;
  }

  .settings-corner:hover {
    color: var(--color-text);
  }

  .settings-corner.active {
    color: var(--color-text);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }
</style>
