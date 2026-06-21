---
status: testing
phase: 07-dual-password-auth-rsvp-backend
source: [07-VERIFICATION.md]
started: 2026-06-21T14:45:00Z
updated: 2026-06-21T14:45:00Z
---

## Current Test

number: 1
name: End-to-end auth flow with SITE_PASSWORD__0 (geburtstag1) — RSVP stores host_ref=0
expected: |
  Row inserted in D1 with host_ref = 0; 200 response from RSVP API.
  X-Host-Ref flows end-to-end from middleware through next(modifiedRequest) to rsvp.js.
awaiting: user response

## Tests

### 1. Auth with SITE_PASSWORD__0 → RSVP stores host_ref=0

expected: |
  Start `wrangler pages dev --port 8788`. Authenticate with password `geburtstag1`.
  Submit a valid RSVP. Query D1:
    wrangler d1 execute birthday-rsvps --local --command "SELECT host_ref, name FROM rsvps ORDER BY submitted_at DESC LIMIT 1"
  Expected: row with host_ref=0; 200 response from API.
result: [pending]

### 2. Auth with SITE_PASSWORD__1 → RSVP stores host_ref=1

expected: |
  Same as above but authenticate with `geburtstag2` (SITE_PASSWORD__1).
  Submit RSVP. Query D1 — expected: row with host_ref=1; 200 response.
result: [pending]

### 3. Invalid password → 401

expected: |
  Attempt to access /rsvp/ with a wrong password.
  Expected: 401 response with German hint page HTML. No row inserted in D1.
result: [pending]

### 4. "Not coming" decline stores host_ref

expected: |
  Submit a "not coming" decline using each password.
  Query D1 — expected: decline rows have host_ref=0 or host_ref=1 matching the password used.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
