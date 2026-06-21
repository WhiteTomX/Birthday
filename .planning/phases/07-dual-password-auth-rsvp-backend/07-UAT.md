---
status: complete
phase: 07-dual-password-auth-rsvp-backend
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-06-21T14:45:00Z
updated: 2026-06-21T16:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auth with SITE_PASSWORD__0 → RSVP stores host_ref=0

expected: |
  Start `wrangler pages dev --port 8788`. Authenticate with password `geburtstag1`.
  Submit a valid RSVP. Query D1:
    wrangler d1 execute birthday-rsvps --local --command "SELECT host_ref, name FROM rsvps ORDER BY submitted_at DESC LIMIT 1"
  Expected: row with host_ref=0; 200 response from API.
result: pass

### 2. Auth with SITE_PASSWORD__1 → RSVP stores host_ref=1

expected: |
  Same as above but authenticate with `geburtstag2` (SITE_PASSWORD__1).
  Submit RSVP. Query D1 — expected: row with host_ref=1; 200 response.
result: pass

### 3. Invalid password → 401

expected: |
  Attempt to access /rsvp/ with a wrong password.
  Expected: 401 response with German hint page HTML. No row inserted in D1.
result: pass

### 4. "Not coming" decline stores host_ref

expected: |
  Submit a "not coming" decline using each password.
  Query D1 — expected: decline rows have host_ref=0 or host_ref=1 matching the password used.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
