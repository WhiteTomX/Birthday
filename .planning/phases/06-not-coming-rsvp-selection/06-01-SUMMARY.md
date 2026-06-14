---
phase: 06-not-coming-rsvp-selection
plan: "01"
subsystem: backend
tags: [cloudflare-pages-functions, d1, rsvp, api]
dependency_graph:
  requires: []
  provides: ["/api/not-coming POST endpoint"]
  affects: ["env.DB (rsvps table)"]
tech_stack:
  added: []
  patterns: ["Cloudflare Pages Function onRequestPost", "D1 prepare().bind().run()", "Response.json()"]
key_files:
  created:
    - functions/api/not-coming.js
  modified: []
decisions:
  - "attendees hardcoded to 0 in bind() — never read from request body (T-06-05: prevents payload tampering)"
  - "contact_method hardcoded to null — decline submissions carry only name per D-08"
  - "Generic 'Database error' 500 response — internal err details never surfaced to client (T-06-02)"
  - "No auth logic in endpoint — covered automatically by functions/_middleware.js (T-06-04)"
metrics:
  duration: "86s"
  completed: "2026-06-14"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 06 Plan 01: /api/not-coming Backend Endpoint Summary

**One-liner:** New Cloudflare Pages Function at `functions/api/not-coming.js` stores guest decline records in existing `rsvps` table with `attendees=0` and `contact_method=null` via parameterized D1 insert.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create /api/not-coming Pages Function | ddd19fa | functions/api/not-coming.js (created) |

## What Was Built

`functions/api/not-coming.js` — a new Cloudflare Pages Function that:

- Auto-routes to `POST /api/not-coming` via Cloudflare Pages Functions file-path routing
- Accepts `{ name }` JSON body (decline payload — no contact method, no attendees)
- Validates name: returns `{ ok: false, error: 'Name required' }` 400 on missing/blank
- Handles malformed JSON: returns `{ ok: false, error: 'Invalid JSON' }` 400
- Generates `crypto.randomUUID()` and `new Date().toISOString()` for each record
- Inserts into `rsvps` table with `attendees = 0` and `contact_method = null` (D-06, D-08)
- Returns `{ ok: true }` 200 on success
- Returns `{ ok: false, error: 'Database error' }` 500 on D1 failure (no internal details exposed)
- Contains no auth logic — auth is enforced upstream by `functions/_middleware.js`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `attendees` hardcoded `0` in `.bind()` | Never read from body — prevents payload tampering (T-06-05) |
| `contact_method` hardcoded `null` in `.bind()` | Decline path has no contact field per D-08 |
| Generic `'Database error'` on D1 failure | Avoids information disclosure (T-06-02, mirrors rsvp.js) |
| No auth logic in endpoint | Covered upstream by `_middleware.js` for all non-public routes (T-06-04) |
| Parameterized `prepare().bind()` | SQL injection prevention — no string concatenation (T-06-01) |

## Verification

- `node --input-type=module --check < functions/api/not-coming.js` exits 0 (ESM syntax valid)
- `grep -q "onRequestPost"` — export found
- `grep -q "INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at)"` — exact insert string found
- `grep -q ".bind(id, name.trim(), null, 0, now)"` — correct bind arguments found
- No `body.contact` or `body.attendees` references in file
- `git diff --quiet functions/api/rsvp.js` — rsvp.js unchanged
- `functions/_middleware.js` and `schema.sql` unmodified

## Deviations from Plan

None - plan executed exactly as written.

The automated verify step in the plan uses `node --check` which fails for ESM `export` syntax without a `package.json` with `"type": "module"` (no package.json exists in this project — it's a plain Cloudflare Pages site). The correct check for this project is `node --input-type=module --check`. The file is syntactically valid and the pattern is identical to `functions/api/rsvp.js` which uses the same `export async function` syntax and works correctly on Cloudflare Workers runtime.

## Known Stubs

None — the endpoint is fully wired to `env.DB` (D1) with real parameterized SQL.

## Threat Flags

No new security surfaces beyond those documented in the plan's threat model. All T-06-01 through T-06-05 mitigations are implemented as specified.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `functions/api/not-coming.js` exists | FOUND |
| Commit `ddd19fa` in git log | FOUND |
| `06-01-SUMMARY.md` exists | FOUND |
