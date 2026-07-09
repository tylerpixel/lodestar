import type { ModuleManifest } from '../../core/module';
import initSql from './migrations/001_init.sql?raw';
import HabitsView from './views/habits.svelte';
import { habitsCommands } from './commands';

export const habitsManifest: ModuleManifest = {
  id: 'habits',
  migrations: [{ version: 1, name: 'init', sql: initSql }],
  routes: [{ id: 'habits', label: 'Habits', component: HabitsView }],
  commands: habitsCommands,
};
