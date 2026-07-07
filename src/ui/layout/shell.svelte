<script lang="ts">
  import type { Snippet } from 'svelte';

  type NavItem = { id: string; label: string };

  let {
    items,
    activeId,
    onNavigate,
    onHeaderMouseDown,
    footer,
    children,
  }: {
    items: NavItem[];
    activeId: string;
    onNavigate: (id: string) => void;
    onHeaderMouseDown?: (e: MouseEvent) => void;
    footer?: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="shell">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header onmousedown={onHeaderMouseDown}>
    <span class="wordmark">LODESTAR</span>
  </header>
  <div class="body">
    <nav>
      {#each items as item (item.id)}
        <button class:active={item.id === activeId} onclick={() => onNavigate(item.id)}>
          {item.label}
        </button>
      {/each}
    </nav>
    <main>{@render children()}</main>
  </div>
  {#if footer}
    <footer>{@render footer()}</footer>
  {/if}
</div>

<style>
  .shell {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  header {
    display: flex;
    align-items: center;
    /* left inset clears the macOS traffic lights; header doubles as drag region */
    padding: var(--space-3) var(--space-4) var(--space-3) var(--titlebar-inset);
    border-bottom: 1px solid var(--color-border);
  }

  .wordmark {
    font-family: var(--font-mono);
    font-size: var(--text-base);
    letter-spacing: 0.18em;
  }

  .body {
    display: grid;
    grid-template-columns: 168px 1fr;
    overflow: hidden;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-3) var(--space-2);
    border-right: 1px solid var(--color-border);
  }

  nav button {
    background: none;
    border: none;
    text-align: left;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    transition: color var(--motion-fast);
  }

  nav button:hover {
    color: var(--color-text);
  }

  nav button.active {
    color: var(--color-text);
    background: var(--color-accent-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }

  main {
    overflow-y: auto;
    padding: var(--space-6);
  }

  footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border);
    font-size: var(--text-xs);
  }
</style>
