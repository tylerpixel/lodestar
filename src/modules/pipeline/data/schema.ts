import type { Tone } from '../../../ui/components/status-badge.svelte';

export const STATUSES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
] as const;

export type ApplicationStatus = (typeof STATUSES)[number];

/** Statuses excluded from staleness — the pipeline has concluded. */
export const TERMINAL_STATUSES: readonly ApplicationStatus[] = [
  'rejected',
  'withdrawn',
  'ghosted',
];

export const STATUS_TONE: Record<ApplicationStatus, Tone> = {
  applied: 'neutral',
  screening: 'accent',
  interview: 'accent',
  offer: 'accent',
  rejected: 'danger',
  withdrawn: 'neutral',
  ghosted: 'warn',
};

export type Application = {
  id: number;
  company: string;
  role: string;
  source: string | null;
  url: string | null;
  status: ApplicationStatus;
  salary_min: number | null;
  salary_max: number | null;
  applied_at: string;
  last_activity_at: string;
  /** Interview or rejection date — drives "days between" tracking. */
  outcome_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Application with SQL-computed flags: staleness (0/1) and days from
 *  applied to interview/rejection (null until an outcome date exists). */
export type ApplicationRow = Application & {
  is_stale: number;
  days_to_outcome: number | null;
};

export type EventKind = 'status_change' | 'note' | 'contact' | 'interview';

export const EVENT_KINDS: readonly EventKind[] = ['note', 'contact', 'interview'];

export type ApplicationEvent = {
  id: number;
  application_id: number;
  kind: EventKind;
  detail: string | null;
  occurred_at: string;
};
