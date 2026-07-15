import type { Tone } from '../../../ui/components/status-badge.svelte';

// Five-stage model (pipeline register spec §2). "Stale" is a computed
// display state, never a stored stage.
export const STAGES = [
  'applied',
  'interviewing',
  'interviewed',
  'rejected',
  'hired',
] as const;

export type Stage = (typeof STAGES)[number];

/** Terminal stages: never stale, never a current objective, grouped last. */
export const TERMINAL_STAGES: readonly Stage[] = ['rejected', 'hired'];

export function isTerminal(stage: Stage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export const STAGE_TONE: Record<Stage, Tone> = {
  applied: 'neutral',
  interviewing: 'accent',
  interviewed: 'accent',
  rejected: 'danger',
  hired: 'accent',
};

export type Application = {
  id: number;
  company: string;
  role: string;
  source: string | null;
  url: string | null;
  status: Stage;
  salary_min: number | null;
  salary_max: number | null;
  applied_at: string;
  last_activity_at: string;
  /** When the row entered its current stage — drives the staleness clock. */
  stage_changed_at: string;
  /** Interview date; required while `interviewing` (spec §2). */
  interview_at: string | null;
  outcome_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Application with SQL-computed staleness: calendar days in the current
 *  stage and the 7-day stale flag (0/1; only `applied`/`interviewed`). */
export type ApplicationRow = Application & {
  days_in_stage: number;
  is_stale: number;
};
