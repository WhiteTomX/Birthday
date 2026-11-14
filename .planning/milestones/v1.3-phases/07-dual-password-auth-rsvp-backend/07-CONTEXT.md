# Phase 7: Dual-Password Auth & RSVP Backend - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 delivers: dual-password authentication middleware, host_ref propagation from middleware to the RSVP API via a request header, a D1 schema migration adding the `host_ref` column, and RSVP API changes to store `host_ref` on each submission.

**In scope:**
- Middleware rewrite: accept `SITE_PASSWORD__0` OR `SITE_PASSWORD__1`, on match set `X-Host-Ref` header on forwarded request
- D1 migration: add `host_ref INTEGER` column to `rsvps`, backfill existing rows to 0
- RSVP API: read `X-Host-Ref` header, validate it's present, include `host_ref` in INSERT
- `wrangler.jsonc` update: add `migrations_dir`
- New `migrations/` folder with the initial migration SQL file

**Out of scope:**
- Content/copy changes (Phase 8)
- Per-host dashboards or admin views
- Storing the password value anywhere
- Separate guest lists per host

</domain>

<decisions>
## Implementation Decisions

### D1 Migration Infrastructure

- **D-01:** Set up a `migrations/` folder and add `migrations_dir = "migrations"` to `wrangler.jsonc`. This becomes the canonical source of schema truth — `schema.sql` is no longer maintained after this phase.
- **D-02:** Migration SQL: `ALTER TABLE rsvps ADD COLUMN host_ref INTEGER;` followed by `UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL;` to backfill pre-v1.3 records to 0.
- **D-03:** `schema.sql` is **not** kept in sync — migrations folder is the single source of truth going forward. `schema.sql` can be deleted or left as a historical artifact.

### host_ref Column & Existing Records

- **D-04:** Column is **nullable** (`host_ref INTEGER`, no DEFAULT) in the schema — existing rows covered by the backfill UPDATE in the migration.
- **D-05:** Pre-v1.3 RSVPs are backfilled to `0` in the migration (not left as NULL). Admin queries will see 0 for legacy records.
- **D-06:** Application-level enforcement: the RSVP API validates that the `X-Host-Ref` header is present and contains `0` or `1` before inserting. If missing, return a 400. This is the "NOT NULL" guarantee for new records without requiring a schema constraint.

### Propagation Header

- **D-07 (Claude's discretion):** Middleware sets `X-Host-Ref: 0` or `X-Host-Ref: 1` on the forwarded request context. RSVP API reads `request.headers.get('X-Host-Ref')`. Header name: `X-Host-Ref`.

### Middleware Auth Logic

- **D-08:** Check password against `env.SITE_PASSWORD__0` first; if match, index = 0. Else check `env.SITE_PASSWORD__1`; if match, index = 1. If neither matches, return 401. Same `unauthorizedResponse()` as today — no change to the 401 HTML.

### Folded Todos

- **"Support two passwords for joint 30th birthday party"** (2026-06-20) — This todo captures the core problem: middleware only accepts one password, and `.dev.vars` / production secrets need both. Fully addressed by this phase. Files flagged in the todo: `functions/_middleware.js`, `public/index.html` (content changes deferred to Phase 8).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-07, AUTH-08, RSVP-07, RSVP-08 are the locked requirements for this phase. Read before planning.

### Existing Code to Modify
- `functions/_middleware.js` — Current single-password auth middleware. The pattern for `atob()`, `indexOf`/`slice` password extraction, and `unauthorizedResponse()` is reused. Needs: dual-password check + `X-Host-Ref` header injection.
- `functions/api/rsvp.js` — Current RSVP INSERT. Needs: read `X-Host-Ref` from request headers, validate, add `host_ref` to INSERT.
- `wrangler.jsonc` — Add `migrations_dir = "migrations"` to the D1 database config block.

### Schema
- `schema.sql` — Current schema (5 columns, no host_ref). Reference only — will become stale after this phase. The new canonical schema lives in `migrations/`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `unauthorizedResponse()` in `_middleware.js` — unchanged; reuse as-is for both invalid password and missing/invalid `X-Host-Ref`.
- Password extraction pattern (`atob` → `indexOf(':')` → `slice`) — reuse for the dual-check; colon-safe, no library needed.

### Established Patterns
- Middleware is the auth gate — RSVP API trusts that middleware ran first. `X-Host-Ref` header is set there and read in the API; the API does not re-check the password.
- `Response.json(...)` for API responses — consistent with existing `rsvp.js` style.
- `crypto.randomUUID()` for IDs — native Workers global, already in use.
- `env.DB.prepare(...).bind(...).run()` — D1 query pattern already established.

### Integration Points
- Middleware runs before every non-public route (`functions/_middleware.js` → `onRequest`) — the `X-Host-Ref` header is available to all downstream functions automatically via Cloudflare Pages' request propagation.
- RSVP INSERT: currently 5 columns; after this phase, 6 columns including `host_ref`.
- `.dev.vars` needs `SITE_PASSWORD__0` and `SITE_PASSWORD__1` added for local dev. `SITE_PASSWORD` (old key) can be removed.

</code_context>

<specifics>
## Specific Ideas

- The todo suggested `SITE_PASSWORD` and `SITE_PASSWORD_2` as the naming, but REQUIREMENTS.md locked the names as `SITE_PASSWORD__0` and `SITE_PASSWORD__1` (double underscore, zero-indexed). Use the REQUIREMENTS.md naming.
- Migration backfill: existing RSVPs get `host_ref = 0` (not NULL, not 1) — treat legacy records as belonging to host 0's circle.

</specifics>

<deferred>
## Deferred Ideas

- Content/copy updates (hint page riddle, RSVP page save-the-date text) — Phase 8.
- Per-host RSVP admin views or dashboards — out of scope for v1.3.

</deferred>

---

*Phase: 7-Dual-Password Auth & RSVP Backend*
*Context gathered: 2026-06-21*
