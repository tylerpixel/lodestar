<script lang="ts">
  import DataTable, { type Column } from '../../../ui/components/data-table.svelte';
  import ConfirmButton from '../../../ui/components/confirm-button.svelte';
  import { events } from '../../../core/events';
  import { relTime, absTime, parseUtc } from '../../../ui/time';
  import { formatSignedCents } from '../data/schema';
  import { deleteTransaction, listTransactions, type TransactionRow } from '../data/queries';

  let rows = $state<TransactionRow[]>([]);

  async function load() {
    rows = await listTransactions();
  }

  $effect(() => {
    void load();
    return events.on('ledger:changed', () => void load());
  });

  async function remove(row: TransactionRow) {
    await deleteTransaction(row.id);
    events.emit('ledger:changed');
  }

  const columns: Column<TransactionRow>[] = [
    {
      key: 'occurred_at',
      label: 'When',
      width: '90px',
      mono: true,
      value: (r) => relTime(r.occurred_at),
      sortValue: (r) => parseUtc(r.occurred_at).getTime(),
      title: (r) => absTime(r.occurred_at),
    },
    { key: 'description', label: 'Description', width: '220px', value: (r) => r.description ?? '' },
    {
      key: 'category_name',
      label: 'Category',
      width: '120px',
      value: (r) => r.category_name ?? '',
    },
    { key: 'account_name', label: 'Account', width: '110px' },
    {
      key: 'amount_cents',
      label: 'Amount',
      width: '110px',
      align: 'right',
      mono: true,
      value: (r) => formatSignedCents(r.amount_cents, r.currency),
      sortValue: (r) => r.amount_cents,
    },
    { key: 'actions', label: '', width: '80px', align: 'right', sortable: false },
  ];
</script>

{#snippet actionsCell(row: TransactionRow)}
  <ConfirmButton label="Delete" confirmLabel="Sure?" danger subtle onConfirm={() => remove(row)} />
{/snippet}

<DataTable
  {columns}
  {rows}
  rowId={(r) => r.id}
  cells={{ actions: actionsCell }}
  empty={'No transactions. ⌘K → Log transaction (e.g. "12.50 coffee #food @amex").'}
/>
