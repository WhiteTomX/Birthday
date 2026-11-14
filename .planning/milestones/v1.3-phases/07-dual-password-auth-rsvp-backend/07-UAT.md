---
status: complete
phase: 07-dual-password-auth-rsvp-backend
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-06-21T14:45:00Z
updated: 2026-06-21T16:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auth with SITE_PASSWORD__0 → RSVP stores host_ref=0

expected: |
  Authenticate with geburtstag1 (SITE_PASSWORD__0). Submit a valid RSVP.
  Expected: 200 response; D1 row with host_ref=0.
result: pass

### 2. Auth with SITE_PASSWORD__1 → RSVP stores host_ref=1

expected: |
  Authenticate with geburtstag2 (SITE_PASSWORD__1). Submit a valid RSVP.
  Expected: 200 response; D1 row with host_ref=1.
result: pass

### 3. Invalid password → 401

expected: |
  Attempt access with a wrong password.
  Expected: 401 response with German hint page. No D1 row inserted.
result: pass

### 4. "Not coming" decline stores host_ref

expected: |
  Submit a decline via /api/not-coming using each password.
  Expected: D1 rows with host_ref=0 and host_ref=1 matching the password used.
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
