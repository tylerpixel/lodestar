import type { ModuleManifest } from '../../core/module';
import initSql from './migrations/001_init.sql?raw';
import Board from './views/board.svelte';
import Detail from './views/detail.svelte';
import { pipelineCommands } from './commands';

export const pipelineManifest: ModuleManifest = {
  id: 'pipeline',
  migrations: [{ version: 1, name: 'init', sql: initSql }],
  routes: [
    { id: 'pipeline', label: 'Pipeline', component: Board },
    { id: 'pipeline:detail', label: 'Application', component: Detail, hidden: true },
  ],
  commands: pipelineCommands,
};
