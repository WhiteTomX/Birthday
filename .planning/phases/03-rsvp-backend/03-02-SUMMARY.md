---
phase: 03-rsvp-backend
plan: 02
subsystem: api
tags: [cloudflare-workers, cloudflare-pages-functions, d1, api, validation]

requires:
  - phase: 03-rsvp-backend/plan-01
    provides: D1 database + wrangler.jsonc binding (env.DB available)

provides:
  - Cloudflare Pages Function at /api/rsvp (functions/api/rsvp.js)
  - POST handler: validates name + attendees, inserts unique record with UUID into D1
  - Method routing: onRequestPost (other verbs auto-405 via Pages Functions)
  - Auth inherited from _middleware.js — no auth code needed in Worker

affects: [03-rsvp-backend/plan-03]

tech-stack:
  added: []
  patterns:
    - Parameterized D1 queries via .prepare().bind() — prevents SQL injection
    - Generic error response pattern — raw D1 errors not forwarded to client
    - crypto.randomUUID() as UUID primary key — native Workers global

key-files:
  created:
    - functions/api/rsvp.js
  modified: []

key-decisions:
  - "crypto.randomUUID() for PK — native Workers global, no import needed (D-10)"
  - "contact_method nullable — empty string coerced to null before insert (D-10)"
  - "No deduplication — every POST creates a new row with unique UUID (D-11)"
  - "Generic 500 error message — raw D1 errors never forwarded to client (T-03-02-03)"
  - "No upper-bound validation on attendees — frontend enforces MAX=10, backend only checks >= 1"

patterns-established:
  - "D1 parameterized query: stmt.prepare(sql).bind(args).run()"
  - "Pages Function method routing: export onRequestPost (not onRequest + method check)"

requirements-completed:
  - RSVP-05
  - RSVP-06

duration: ~15min
completed: 2026-05-10
---

# Plan 03-02 Summary: Worker Endpoint

## What Was Built

- `functions/api/rsvp.js` — Cloudflare Pages Function at `/api/rsvp`
- Exports `onRequestPost` (other HTTP methods automatically return 405)
- Auth inherited from `functions/_middleware.js` — no auth code in Worker

## Key Patterns

- **Parameterized D1 queries** via `.prepare().bind()` — prevents SQL injection
- **crypto.randomUUID()** used as primary key — native Workers global, no import
- **contact_method nullable** — empty string coerced to `null` before insert (D-10)
- **Generic error response** — raw D1 errors not forwarded to client (T-03-02-03)
- **No deduplication** — every POST creates a new row with unique UUID (D-11)

## Endpoints

| Method | Path | Response |
|--------|------|----------|
| POST | /api/rsvp | 200 `{ ok: true }` on success |
| POST | /api/rsvp | 400 `{ ok: false, error: "Name required" }` when name missing |
| POST | /api/rsvp | 400 `{ ok: false, error: "Invalid attendees" }` when attendees < 1 |
| POST | /api/rsvp | 400 `{ ok: false, error: "Invalid JSON" }` on malformed body |
| POST | /api/rsvp | 500 `{ ok: false, error: "Database error" }` on D1 failure |
| GET | /api/rsvp | 405 (automatic via Pages Functions method routing) |

## Commit

- `feat(03-02): add RSVP Worker endpoint functions/api/rsvp.js`

## Status: ✅ Complete
