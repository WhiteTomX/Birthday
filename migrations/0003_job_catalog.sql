CREATE TABLE job_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL CHECK(length(trim(label)) > 0),
  normalized_label TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL CHECK(length(trim(description)) > 0),
  is_fixed INTEGER NOT NULL DEFAULT 0 CHECK(is_fixed IN (0, 1)),
  display_order INTEGER,
  max_capacity INTEGER CHECK(max_capacity IS NULL OR max_capacity >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fresh_rsvp_job_allocations (
  fresh_rsvp_id TEXT NOT NULL,
  job_option_id TEXT NOT NULL,
  assigned_count INTEGER NOT NULL CHECK(assigned_count > 0),
  PRIMARY KEY (fresh_rsvp_id, job_option_id),
  FOREIGN KEY (fresh_rsvp_id) REFERENCES fresh_rsvps(id) ON DELETE CASCADE,
  FOREIGN KEY (job_option_id) REFERENCES job_options(id) ON DELETE CASCADE
);

CREATE INDEX fresh_rsvp_job_allocations_option_idx
  ON fresh_rsvp_job_allocations(job_option_id);

CREATE TRIGGER fresh_rsvp_jobs_require_coming
BEFORE INSERT ON fresh_rsvp_job_allocations
WHEN (SELECT attendance FROM fresh_rsvps WHERE id = NEW.fresh_rsvp_id) IS NOT 'coming'
BEGIN
  SELECT RAISE(ABORT, 'job allocations require a coming RSVP');
END;

CREATE TRIGGER fresh_rsvp_jobs_update_require_coming
BEFORE UPDATE ON fresh_rsvp_job_allocations
WHEN (SELECT attendance FROM fresh_rsvps WHERE id = NEW.fresh_rsvp_id) IS NOT 'coming'
BEGIN
  SELECT RAISE(ABORT, 'job allocations require a coming RSVP');
END;

CREATE TRIGGER fresh_rsvp_cannot_decline_with_jobs
BEFORE UPDATE OF attendance ON fresh_rsvps
WHEN NEW.attendance = 'not_coming'
  AND EXISTS (
    SELECT 1
    FROM fresh_rsvp_job_allocations
    WHERE fresh_rsvp_id = NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'declining RSVP cannot have job allocations');
END;

INSERT INTO job_options (
  id, label, normalized_label, description, is_fixed, display_order, max_capacity
) VALUES
  (
    'aufbau',
    'Aufbau',
    'aufbau',
    'Du möchten beim Vorbereiten helfen. Was gerade anfällt vermutlich vor 17:00 Uhr.',
    1,
    1,
    15
  ),
  (
    'teilzeit-barkeeper',
    'Teilzeit "Barkeeper" nach Lust und Laune',
    'teilzeit barkeeper nach lust und laune',
    'Du möchtest hinter der Bar unterstützen, wenn du gerade Lust hast. Ansonsten können sich die Gäste auch selbst bedienen.',
    1,
    2,
    NULL
  ),
  (
    'dinge',
    'Dinge',
    'dinge',
    'Du möchtest irgendwie helfen.',
    1,
    4,
    NULL
  ),
  (
    'abbau-brunch',
    'Brunch (& Abbau) am nächsten Tag',
    'abbau & brunch am nächsten tag',
    'Du möchtest am nächsten Tag die Reste brunchen und aufräumen.',
    1,
    5,
    NULL
  ),
  (
    'getraenkeeinkauf-auto',
    'Getränkeeinkauf mit Auto (Freitag oder Samstag)',
    'getränkeeinkauf mit auto (freitag oder samstag)',
    'Du möchtest am Freitag oder Samstag mit deinem Auto beim Einkaufen helfen.',
    1,
    6,
    NULL
  );
