CREATE TABLE IF NOT EXISTS rsvps (
  id            TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL,
  contact_method TEXT,
  attendees     INTEGER NOT NULL,
  submitted_at  TEXT    NOT NULL
);
