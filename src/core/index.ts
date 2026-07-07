import type { ModuleManifest } from './module';
import initSql from './db/migrations/001_init.sql?raw';

export const coreManifest: ModuleManifest = {
  id: 'core',
  migrations: [{ version: 1, name: 'init', sql: initSql }],
};
