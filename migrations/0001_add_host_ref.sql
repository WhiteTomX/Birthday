-- Migration: add host_ref column to rsvps
-- Backfill existing rows to 0 (legacy records treated as host 0's circle — D-05)

ALTER TABLE rsvps ADD COLUMN host_ref INTEGER;
UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL;
