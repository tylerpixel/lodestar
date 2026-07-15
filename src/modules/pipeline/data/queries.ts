import { getDb } from '../../../core/db/client';
import type { ApplicationRow, Stage } from './schema';

export const STALE_AFTER_DAYS = 7;

// Staleness clock (spec §4): calendar days from date(stage_changed_at) to
// today in local time, ticking at midnight. Terminal and interviewing rows
// are never stale.
const DAYS_IN_STAGE = `CAST(julianday(date('now','localtime')) - julianday(date(a.stage_changed_at)) AS INTEGER)`;
const IS_STALE = `(
  a.status IN ('applied', 'interviewed')
  AND ${DAYS_IN_STAGE} >= ${STALE_AFTER_DAYS}
)`;
const COMPUTED = `${DAYS_IN_STAGE} AS days_in_stage, ${IS_STALE} AS is_stale`;

// application_events stays write-only audit (spec §6): stage changes append
// rows, nothing reads them in views.
async function auditStageChange(id: number, stage: Stage): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO application_events (application_id, kind, detail) VALUES ($1, 'status_change', $2)`,
    [id, stage]
  );
}

/** Register order (spec §7): active stages first with stale rows on top by
 *  days descending; terminal rows grouped at the bottom, newest change first. */
export async function listApplications(): Promise<ApplicationRow[]> {
  const db = await getDb();
  return db.select<ApplicationRow[]>(
    `SELECT a.*, ${COMPUTED} FROM applications a
     ORDER BY (a.status IN ('rejected', 'hired')) ASC,
              is_stale DESC,
              CASE WHEN a.status IN ('rejected', 'hired')
                THEN julianday(a.stage_changed_at)
                ELSE days_in_stage
              END DESC`
  );
}

export async function createApplication(
  company: string,
  role: string,
  url: string | null = null
): Promise<number | undefined> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO applications (company, role, url, status, applied_at, last_activity_at, stage_changed_at)
     VALUES ($1, $2, $3, 'applied',
             datetime('now','localtime'), datetime('now','localtime'), datetime('now','localtime'))`,
    [company, role, url]
  );
  const id = result.lastInsertId;
  if (id != null) await auditStageChange(id, 'applied');
  return id;
}

/** Manual stage change. `interviewAt` (YYYY-MM-DD) is required when moving to
 *  `interviewing` and asked for on a manual move to `interviewed`. A manual
 *  `interviewed` backdates stage_changed_at to the interview date — same rule
 *  as the automatic transition — so the staleness clock starts at the
 *  interview, not the edit. */
export async function setStage(
  id: number,
  stage: Stage,
  interviewAt: string | null = null
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE applications
     SET status = $2,
         interview_at = CASE WHEN $3 IS NOT NULL THEN $3 ELSE interview_at END,
         stage_changed_at = CASE WHEN $2 = 'interviewed' AND $3 IS NOT NULL
           THEN $3 ELSE datetime('now','localtime') END,
         last_activity_at = datetime('now','localtime'),
         updated_at = datetime('now','localtime')
     WHERE id = $1`,
    [id, stage, interviewAt]
  );
  await auditStageChange(id, stage);
}

/** Inline register edits (company/role) are bookkeeping — updated_at only. */
export async function updateCompanyRole(
  id: number,
  company: string,
  role: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE applications
     SET company = $2, role = $3, updated_at = datetime('now','localtime')
     WHERE id = $1`,
    [id, company, role]
  );
}

/** Automatic transition (spec §3): interviewing rows whose interview date has
 *  passed become interviewed, stage_changed_at backdated to interview_at.
 *  Returns the number of rows moved. */
export async function transitionLapsedInterviews(): Promise<number> {
  const db = await getDb();
  const lapsed = await db.select<{ id: number }[]>(
    `SELECT id FROM applications
     WHERE status = 'interviewing'
       AND interview_at IS NOT NULL
       AND date(interview_at) < date('now','localtime')`
  );
  for (const { id } of lapsed) {
    await db.execute(
      `UPDATE applications
       SET status = 'interviewed',
           stage_changed_at = interview_at,
           updated_at = datetime('now','localtime')
       WHERE id = $1`,
      [id]
    );
    await auditStageChange(id, 'interviewed');
  }
  return lapsed.length;
}

/** Pipeline candidates for the day's current objective (spec §5), in rank
 *  order: today's interviews first, then stale rows stalest-first. Habit and
 *  ledger inputs rank after these. */
export type ObjectiveCandidate = {
  id: number;
  company: string;
  role: string;
  status: Stage;
  interview_at: string | null;
  days_in_stage: number;
};

export async function currentObjectiveCandidates(): Promise<ObjectiveCandidate[]> {
  const db = await getDb();
  return db.select<ObjectiveCandidate[]>(
    `SELECT a.id, a.company, a.role, a.status, a.interview_at, ${DAYS_IN_STAGE} AS days_in_stage
     FROM applications a
     WHERE (a.status = 'interviewing' AND date(a.interview_at) = date('now','localtime'))
        OR ${IS_STALE}
     ORDER BY (a.status = 'interviewing') DESC, days_in_stage DESC`
  );
}

export async function deleteApplications(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  await db.execute(
    `DELETE FROM application_events WHERE application_id IN (${placeholders})`,
    ids
  );
  await db.execute(`DELETE FROM applications WHERE id IN (${placeholders})`, ids);
}
