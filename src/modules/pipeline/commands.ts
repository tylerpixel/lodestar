import type { Command } from '../../core/command-palette/registry.svelte';
import { events } from '../../core/events';
import { router } from '../../core/router.svelte';
import { createApplication } from './data/queries';

// Quick capture (spec §7): company, role, URL only — stage and dates are
// automatic. "Company - Role - URL" (also accepts "|" or "," as separator).
function splitParts(text: string): string[] {
  const parts: string[] = [];
  let rest = text;
  while (parts.length < 2) {
    if (/^https?:\/\//i.test(rest.trim())) break; // don't split inside a URL
    let at = -1;
    let sepLen = 0;
    for (const sep of [' - ', ' – ', '|', ',']) {
      const i = rest.indexOf(sep);
      if (i > 0 && (at === -1 || i < at)) {
        at = i;
        sepLen = sep.length;
      }
    }
    if (at === -1) break;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at + sepLen);
  }
  parts.push(rest.trim());
  return parts.filter(Boolean);
}

export const pipelineCommands: Command[] = [
  {
    id: 'pipeline:add',
    label: 'Add application',
    hint: 'Company - Role - URL',
    capture: true,
    input: { placeholder: 'Company - Role - URL (URL optional)' },
    run: async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const parts = splitParts(trimmed);
      let url: string | null = null;
      if (parts.length > 1 && /^https?:\/\//i.test(parts[parts.length - 1])) {
        url = parts.pop()!;
      }
      const [company, role = '—'] = parts;
      await createApplication(company, role, url);
      events.emit('pipeline:changed');
      router.go('pipeline');
    },
  },
];
