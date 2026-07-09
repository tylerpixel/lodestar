import type { ModuleManifest } from '../../core/module';
import initSql from './migrations/001_init.sql?raw';
import LedgerView from './views/ledger.svelte';
import { ledgerCommands } from './commands';

export const ledgerManifest: ModuleManifest = {
  id: 'ledger',
  migrations: [{ version: 1, name: 'init', sql: initSql }],
  routes: [{ id: 'ledger', label: 'Ledger', component: LedgerView }],
  commands: ledgerCommands,
};
