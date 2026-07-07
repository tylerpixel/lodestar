import type { ModuleManifest } from '../core/module';
import { events } from '../core/events';
import { router } from '../core/router.svelte';
import OpsBoard from './ops-board.svelte';
import System from './system.svelte';
import { addNote } from './queries';

export const homeManifest: ModuleManifest = {
  id: 'home',
  routes: [
    { id: 'home', label: 'Ops', component: OpsBoard },
    { id: 'system', label: 'System', component: System },
  ],
  commands: [
    {
      id: 'note:add',
      label: 'Add note',
      hint: 'quick capture',
      input: { placeholder: 'Note text — Enter to save' },
      run: async (text) => {
        const trimmed = text?.trim();
        if (!trimmed) return;
        await addNote(trimmed);
        events.emit('notes:changed');
        router.go('home');
      },
    },
  ],
};
