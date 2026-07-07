import type { Command } from '../../core/command-palette/registry.svelte';
import { events } from '../../core/events';
import { router } from '../../core/router.svelte';
import { createApplication } from './data/queries';

// Quick capture: "Company - Role" (also accepts "|" or "," as separator).
function splitCompanyRole(text: string): [string, string] {
  for (const sep of [' - ', ' – ', '|', ',']) {
    const at = text.indexOf(sep);
    if (at > 0) {
      return [text.slice(0, at).trim(), text.slice(at + sep.length).trim() || '—'];
    }
  }
  return [text, '—'];
}

export const pipelineCommands: Command[] = [
  {
    id: 'pipeline:add',
    label: 'Add application',
    hint: 'Company - Role',
    capture: true,
    input: { placeholder: 'Company - Role' },
    run: async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const [company, role] = splitCompanyRole(trimmed);
      const id = await createApplication(company, role);
      events.emit('pipeline:changed');
      if (id != null) router.go('pipeline:detail', { id });
    },
  },
];
