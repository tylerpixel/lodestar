import type { Command } from '../../core/command-palette/registry.svelte';
import { events } from '../../core/events';
import { router } from '../../core/router.svelte';
import { CADENCES, WEEKDAYS, type Cadence, type Weekday } from './data/schema';
import { createHabit } from './data/queries';

// "Name - cadence" where cadence is daily | weekdays | weekly | weekly x3
// | a weekday list like "mon,wed,fri". No cadence means daily.
function parseHabit(text: string): {
  name: string;
  cadence: Cadence;
  detail: string[] | null;
  target: number;
} {
  let name = text;
  let spec = '';
  for (const sep of [' - ', ' – ', '|']) {
    const at = text.lastIndexOf(sep);
    if (at > 0) {
      name = text.slice(0, at).trim();
      spec = text.slice(at + sep.length).trim().toLowerCase();
      break;
    }
  }
  if (!spec) return { name, cadence: 'daily', detail: null, target: 1 };

  const weeklyTimes = spec.match(/^weekly\s*[x×]\s*(\d+)$/);
  if (weeklyTimes) {
    return { name, cadence: 'weekly', detail: null, target: Number(weeklyTimes[1]) };
  }
  if ((CADENCES as readonly string[]).includes(spec)) {
    return { name, cadence: spec as Cadence, detail: null, target: 1 };
  }
  const days = spec
    .split(/[,\s]+/)
    .map((d) => d.slice(0, 3))
    .filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d));
  if (days.length) return { name, cadence: 'custom', detail: days, target: 1 };

  // Unrecognised spec: treat the whole text as the name, daily cadence
  return { name: text, cadence: 'daily', detail: null, target: 1 };
}

export const habitsCommands: Command[] = [
  {
    id: 'habits:add',
    label: 'Add habit',
    hint: 'Name - daily | weekdays | weekly x3 | mon,wed,fri',
    capture: true,
    input: { placeholder: 'Name - daily | weekdays | weekly x3 | mon,wed,fri' },
    run: async (text) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const { name, cadence, detail, target } = parseHabit(trimmed);
      await createHabit(name, cadence, detail, target);
      events.emit('habits:changed');
      router.go('habits');
    },
  },
];
