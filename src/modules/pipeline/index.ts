import type { ModuleManifest } from '../../core/module';
import initSql from './migrations/001_init.sql?raw';
import outcomeSql from './migrations/002_outcome.sql?raw';
import stageReworkSql from './migrations/003_stage_rework.sql?raw';
import Register from './views/register.svelte';
import { pipelineCommands } from './commands';
import { startLapsedInterviewCheck } from './data/transition';

export const pipelineManifest: ModuleManifest = {
  id: 'pipeline',
  migrations: [
    { version: 1, name: 'init', sql: initSql },
    { version: 2, name: 'outcome', sql: outcomeSql },
    { version: 3, name: 'stage_rework', sql: stageReworkSql },
  ],
  init: startLapsedInterviewCheck,
  routes: [{ id: 'pipeline', label: 'Pipeline', component: Register }],
  commands: pipelineCommands,
};
