<script lang="ts">
  import Today from './today.svelte';
  import History from './history.svelte';

  let tab = $state<'today' | 'history'>('today');
</script>

<div class="habits">
  <div class="tabs">
    <button class:active={tab === 'today'} onclick={() => (tab = 'today')}>Today</button>
    <button class:active={tab === 'history'} onclick={() => (tab = 'history')}>History</button>
  </div>
  {#if tab === 'today'}
    <Today />
  {:else}
    <History />
  {/if}
</div>

<style>
  .habits {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
  }

  .tabs button {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-3);
  }

  .tabs button:hover {
    color: var(--color-text);
  }

  .tabs button.active {
    color: var(--color-text);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }
</style>
