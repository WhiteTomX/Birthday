-- Fresh RSVP round for Phase 9: actual invitation, fresh RSVP & drinks
-- Keeps historical RSVP rows intact; this is additive only.

CREATE TABLE fresh_rsvps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK(attendance IN ('coming', 'not_coming')),
  group_size INTEGER NOT NULL CHECK(
    (attendance = 'coming' AND group_size BETWEEN 1 AND 10)
    OR (attendance = 'not_coming' AND group_size = 0)
  ),
  submitted_at TEXT NOT NULL,
  host_ref INTEGER NOT NULL CHECK(host_ref IN (0, 1))
);

CREATE TABLE drink_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL COLLATE NOCASE UNIQUE,
  is_fixed INTEGER NOT NULL DEFAULT 0 CHECK(is_fixed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fresh_rsvp_drink_selections (
  fresh_rsvp_id TEXT NOT NULL,
  drink_option_id TEXT NOT NULL,
  PRIMARY KEY (fresh_rsvp_id, drink_option_id),
  FOREIGN KEY (fresh_rsvp_id) REFERENCES fresh_rsvps(id) ON DELETE CASCADE,
  FOREIGN KEY (drink_option_id) REFERENCES drink_options(id) ON DELETE CASCADE
);

CREATE TRIGGER fresh_rsvp_drinks_require_coming
BEFORE INSERT ON fresh_rsvp_drink_selections
WHEN (SELECT attendance FROM fresh_rsvps WHERE id = NEW.fresh_rsvp_id) != 'coming'
BEGIN
  SELECT RAISE(ABORT, 'drink selections require a coming RSVP');
END;

CREATE TRIGGER fresh_rsvp_drinks_update_require_coming
BEFORE UPDATE ON fresh_rsvp_drink_selections
WHEN (SELECT attendance FROM fresh_rsvps WHERE id = NEW.fresh_rsvp_id) != 'coming'
BEGIN
  SELECT RAISE(ABORT, 'drink selections require a coming RSVP');
END;

CREATE TRIGGER fresh_rsvp_cannot_decline_with_drinks
BEFORE UPDATE OF attendance ON fresh_rsvps
WHEN NEW.attendance = 'not_coming'
  AND EXISTS (
    SELECT 1
    FROM fresh_rsvp_drink_selections
    WHERE fresh_rsvp_id = NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'declining RSVP cannot have drink selections');
END;

INSERT INTO drink_options (id, label, is_fixed, created_at)
VALUES
  ('bier', 'Bier', 1, CURRENT_TIMESTAMP),
  ('wein', 'Wein', 1, CURRENT_TIMESTAMP),
  ('sekt', 'Sekt', 1, CURRENT_TIMESTAMP),
  ('kola', 'Kola', 1, CURRENT_TIMESTAMP),
  ('spezi', 'Spezi', 1, CURRENT_TIMESTAMP),
  ('fruchtlimonaden', 'Fruchtlimonaden', 1, CURRENT_TIMESTAMP),
  ('wasser', 'Wasser', 1, CURRENT_TIMESTAMP),
  ('alkoholfreies-bier', 'alkoholfreies Bier', 1, CURRENT_TIMESTAMP);
