<script lang="ts">
  import Overview from './overview.svelte';
  import Transactions from './transactions.svelte';
  import Budgets from './budgets.svelte';

  let tab = $state<'overview' | 'transactions' | 'budgets'>('overview');
</script>

<div class="ledger">
  <div class="tabs">
    <button class:active={tab === 'overview'} onclick={() => (tab = 'overview')}>Overview</button>
    <button class:active={tab === 'transactions'} onclick={() => (tab = 'transactions')}>
      Transactions
    </button>
    <button class:active={tab === 'budgets'} onclick={() => (tab = 'budgets')}>Budgets</button>
  </div>
  {#if tab === 'overview'}
    <Overview />
  {:else if tab === 'transactions'}
    <Transactions />
  {:else}
    <Budgets />
  {/if}
</div>

<style>
  .ledger {
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
