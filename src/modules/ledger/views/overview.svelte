<script lang="ts">
  import StatBlock from '../../../ui/components/stat-block.svelte';
  import Panel from '../../../ui/layout/panel.svelte';
  import { events } from '../../../core/events';
  import { formatCents, formatSignedCents, isoStartOfWeek } from '../data/schema';
  import {
    accountBalances,
    ledgerMetrics,
    movementByCategory,
    type AccountBalance,
    type CategoryMovement,
    type LedgerMetrics,
  } from '../data/queries';

  let metrics = $state<LedgerMetrics | null>(null);
  let accounts = $state<AccountBalance[]>([]);
  let weekMovement = $state<CategoryMovement[]>([]);

  async function load() {
    [metrics, accounts, weekMovement] = await Promise.all([
      ledgerMetrics(),
      accountBalances(),
      movementByCategory(isoStartOfWeek()),
    ]);
  }

  $effect(() => {
    void load();
    return events.on('ledger:changed', () => void load());
  });

  function runwayLabel(m: LedgerMetrics): string {
    if (m.runwayWeeks == null) return '—';
    if (m.runwayWeeks < 0) return '0w';
    return `${m.runwayWeeks.toFixed(1)}w`;
  }
</script>

<div class="overview">
  {#if metrics}
    <div class="stats">
      <StatBlock label="Balance" value={formatCents(metrics.balanceCents)} />
      <StatBlock label="30-day burn" value={formatCents(metrics.burn30Cents)} />
      <StatBlock
        label="Runway"
        value={runwayLabel(metrics)}
        hint={metrics.runwayWeeks == null ? 'no burn recorded' : 'at current weekly burn'}
      />
      <StatBlock label="This week" value={formatSignedCents(metrics.weekNetCents)} hint="net movement" />
    </div>
  {/if}

  <Panel title="Accounts">
    {#if accounts.length === 0}
      <p class="hint">No accounts. ⌘K → Add account (e.g. "Everyday - transaction - 1250.00").</p>
    {:else}
      <ul>
        {#each accounts as account (account.id)}
          <li>
            <span class="name">{account.name}</span>
            <span class="kind">{account.kind}</span>
            <span class="amount mono">{formatCents(account.balance_cents, account.currency)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <Panel title="This week by category">
    {#if weekMovement.length === 0}
      <p class="hint">No movement this week. ⌘K → Log transaction (e.g. "12.50 coffee #food").</p>
    {:else}
      <ul>
        {#each weekMovement as row (row.category_id ?? -1)}
          <li>
            <span class="name" class:muted={!row.category_name}>
              {row.category_name ?? 'uncategorised'}
            </span>
            <span class="amount mono">{formatSignedCents(row.net_cents)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>
</div>

<style>
  .overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 640px;
  }

  .stats {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  li {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-sm);
  }

  .name {
    flex: 1;
  }

  .name.muted {
    color: var(--color-text-muted);
  }

  .kind {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
