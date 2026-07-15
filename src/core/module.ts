import { runMigrations, type Migration } from './db/migrator';
import { router, type Route } from './router.svelte';
import { palette, type Command } from './command-palette/registry.svelte';

// Every module (and core/home themselves) registers through this manifest.
// Migrations run before routes/commands appear, so views never see a
// missing table.
export interface ModuleManifest {
  id: string;
  migrations?: Migration[];
  /** Boot-time module work (schedulers, data upkeep). Runs after migrations. */
  init?: () => void | Promise<void>;
  routes?: Route[];
  commands?: Command[];
}

export async function registerModule(manifest: ModuleManifest): Promise<void> {
  if (manifest.migrations?.length) await runMigrations(manifest.id, manifest.migrations);
  if (manifest.init) await manifest.init();
  if (manifest.routes?.length) router.register(...manifest.routes);
  if (manifest.commands?.length) palette.register(...manifest.commands);
}
