import { getDb } from '../../../core/db/client';
import {
  STATUSES,
  type ApplicationRow,
  type ApplicationStatus,
  type ApplicationEvent,
  type EventKind,
} from './schema';

// Staleness rule (PRD §7.1): any non-terminal application with
// last_activity_at older than 7 days.
const IS_STALE = `(
  a.status IN ('applied', 'screening', 'interview', 'offer')
  AND a.last_activity_at < datetime('now', '-7 days')
)`;

export async function listApplications(): Promise<ApplicationRow[]> {
  const db = await getDb();
  return db.select<ApplicationRow[]>(
    `SELECT a.*, ${IS_STALE} AS is_stale FROM applications a ORDER BY a.last_activity_at DESC`
  );
}

export async function getApplication(id: number): Promise<ApplicationRow | null> {
  const db = await getDb();
  const rows = await db.select<ApplicationRow[]>(
    `SELECT a.*, ${IS_STALE} AS is_stale FROM applications a WHERE a.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createApplication(
  company: string,
  role: string,
  source: string | null = null
): Promise<number | undefined> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO applications (company, role, source, status, applied_at, last_activity_at)
     VALUES ($1, $2, $3, 'applied', datetime('now'), datetime('now'))`,
    [company, role, source]
  );
  const id = result.lastInsertId;
  if (id != null) {
    await db.execute(
      `INSERT INTO application_events (application_id, kind, detail) VALUES ($1, 'status_change', 'applied')`,
      [id]
    );
  }
  return id;
}

export async function setStatus(id: number, status: ApplicationStatus): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE applications
     SET status = $2, last_activity_at = datetime('now'), updated_at = datetime('now')
     WHERE id = $1`,
    [id, status]
  );
  await db.execute(
    `INSERT INTO application_events (application_id, kind, detail) VALUES ($1, 'status_change', $2)`,
    [id, status]
  );
}

/** Log activity (note/contact/interview). Refreshes last_activity_at. */
export async function logEvent(id: number, kind: EventKind, detail: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO application_events (application_id, kind, detail) VALUES ($1, $2, $3)`,
    [id, kind, detail]
  );
  await db.execute(
    `UPDATE applications
     SET last_activity_at = datetime('now'), updated_at = datetime('now')
     WHERE id = $1`,
    [id]
  );
}

export type DetailFields = {
  source: string | null;
  url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  next_action: string | null;
  next_action_due: string | null;
  notes: string | null;
};

/** Field edits are bookkeeping, not pipeline activity — updated_at only. */
export async function updateDetails(id: number, fields: DetailFields): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE applications
     SET source = $2, url = $3, salary_min = $4, salary_max = $5,
         next_action = $6, next_action_due = $7, notes = $8,
         updated_at = datetime('now')
     WHERE id = $1`,
    [
      id,
      fields.source,
      fields.url,
      fields.salary_min,
      fields.salary_max,
      fields.next_action,
      fields.next_action_due,
      fields.notes,
    ]
  );
}

export type ImportApplication = {
  company: string;
  role: string;
  source?: string | null;
  url?: string | null;
  status?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  applied_at?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
  notes?: string | null;
};

/** CSV import. Unknown statuses fall back to 'applied'; missing dates to now. */
export async function importApplications(records: ImportApplication[]): Promise<number> {
  const db = await getDb();
  let count = 0;
  for (const r of records) {
    const status: ApplicationStatus = (STATUSES as readonly string[]).includes(r.status ?? '')
      ? (r.status as ApplicationStatus)
      : 'applied';
    const result = await db.execute(
      `INSERT INTO applications
         (company, role, source, url, status, salary_min, salary_max,
          applied_at, last_activity_at, next_action, next_action_due, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               COALESCE($8, datetime('now')), COALESCE($8, datetime('now')), $9, $10, $11)`,
      [
        r.company,
        r.role,
        r.source ?? null,
        r.url ?? null,
        status,
        r.salary_min ?? null,
        r.salary_max ?? null,
        r.applied_at ?? null,
        r.next_action ?? null,
        r.next_action_due ?? null,
        r.notes ?? null,
      ]
    );
    if (result.lastInsertId != null) {
      await db.execute(
        `INSERT INTO application_events (application_id, kind, detail) VALUES ($1, 'note', 'imported from CSV')`,
        [result.lastInsertId]
      );
    }
    count++;
  }
  return count;
}

export async function listEvents(id: number): Promise<ApplicationEvent[]> {
  const db = await getDb();
  return db.select<ApplicationEvent[]>(
    `SELECT * FROM application_events WHERE application_id = $1 ORDER BY occurred_at DESC, id DESC`,
    [id]
  );
}
