<script lang="ts">
  import StatusBadge from '../../../ui/components/status-badge.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { formatCents, isoStartOfMonth, parseAmountCents } from '../data/schema';
  import { monthSpendByCategory, setCategoryBudget, type CategorySpend } from '../data/queries';

  let categories = $state<CategorySpend[]>([]);
  let editingId = $state<number | null>(null);
  let draft = $state('');

  async function load() {
    categories = await monthSpendByCategory(isoStartOfMonth());
  }

  $effect(() => {
    void load();
    return events.on('ledger:changed', () => void load());
  });

  function startEdit(cat: CategorySpend) {
    editingId = cat.id;
    draft = cat.budget_cents != null ? (cat.budget_cents / 100).toFixed(2) : '';
  }

  async function commitEdit(cat: CategorySpend) {
    const text = draft.trim();
    // Empty clears the budget; unparseable input leaves it unchanged.
    if (text === '') await setCategoryBudget(cat.id, null);
    else {
      const cents = parseAmountCents(text);
      if (cents != null) await setCategoryBudget(cat.id, cents);
    }
    editingId = null;
    events.emit('ledger:changed');
  }

  function onKeydown(e: KeyboardEvent, cat: CategorySpend) {
    if (e.key === 'Enter') void commitEdit(cat);
    if (e.key === 'Escape') editingId = null;
  }

  const expenses = $derived(categories.filter((c) => c.kind === 'expense'));
  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
</script>

<div class="budgets">
  <Panel title={`Budgets — ${monthLabel}`}>
    {#if expenses.length === 0}
      <p class="hint">No expense categories. ⌘K → Add category (e.g. "Food - expense - 600").</p>
    {:else}
      <ul>
        {#each expenses as cat (cat.id)}
          {@const over = cat.budget_cents != null && cat.spent_cents > cat.budget_cents}
          <li>
            <div class="row">
              <span class="name">{cat.name}</span>
              {#if over}
                <StatusBadge label="over" tone="danger" />
              {/if}
              <span class="figures mono">
                {formatCents(cat.spent_cents)}
                {#if editingId === cat.id}
                  / <input
                    class="mono"
                    placeholder="none"
                    bind:value={draft}
                    onblur={() => void commitEdit(cat)}
                    onkeydown={(e) => onKeydown(e, cat)}
                    {@attach (el) => el.focus()}
                  />
                {:else}
                  <button class="budget mono" title="Set monthly budget" onclick={() => startEdit(cat)}>
                    / {cat.budget_cents != null ? formatCents(cat.budget_cents) : 'set budget'}
                  </button>
                {/if}
              </span>
            </div>
            {#if cat.budget_cents}
              <div class="bar">
                <div
                  class="fill"
                  class:over
                  style:width="{Math.min(100, Math.round((cat.spent_cents / cat.budget_cents) * 100))}%"
                ></div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>
  <p class="hint">Spend is month-to-date. Click a budget figure to change it; empty clears it.</p>
</div>

<style>
  .budgets {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 640px;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-sm);
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .name {
    flex: 1;
  }

  .figures {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  .budget {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .budget:hover {
    color: var(--color-text);
  }

  input {
    width: 90px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    padding: 0 var(--space-1);
  }

  input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .bar {
    height: 3px;
    background: var(--color-border);
  }

  .fill {
    height: 100%;
    background: var(--color-accent);
    transition: width var(--motion-fast);
  }

  .fill.over {
    background: var(--color-danger);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
