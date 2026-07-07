import type { ModuleManifest } from '../core/module';
import { events } from '../core/events';
import { router } from '../core/router.svelte';
import OpsBoard from './ops-board.svelte';
import Settings from './settings.svelte';
import { addNote } from './queries';

export const homeManifest: ModuleManifest = {
  id: 'home',
  routes: [
    { id: 'home', label: 'Ops', component: OpsBoard },
    { id: 'settings', label: 'Settings', component: Settings },
  ],
  commands: [
    {
      id: 'note:add',
      label: 'Add note',
      hint: 'quick capture',
      capture: true,
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
