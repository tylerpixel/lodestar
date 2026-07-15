ALTER TABLE applications ADD COLUMN stage_changed_at TEXT;
ALTER TABLE applications ADD COLUMN interview_at TEXT;

UPDATE applications SET stage_changed_at = COALESCE(last_activity_at, applied_at);

UPDATE applications SET status = 'interviewing' WHERE status IN ('screening', 'interview');
UPDATE applications SET status = 'rejected' WHERE status IN ('withdrawn', 'ghosted');
UPDATE applications SET status = 'hired' WHERE status = 'offer';
