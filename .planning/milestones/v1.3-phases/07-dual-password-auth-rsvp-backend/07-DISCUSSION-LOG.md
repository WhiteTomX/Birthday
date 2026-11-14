# Phase 7: Dual-Password Auth & RSVP Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 07-dual-password-auth-rsvp-backend
**Areas discussed:** D1 migration strategy, Existing RSVP records

---

## D1 Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| ALTER TABLE one-off | Run `wrangler d1 execute ... ALTER TABLE` once; update schema.sql | |
| Set up wrangler migrations folder | Create `migrations/` dir, add `migrations_dir` to wrangler.jsonc, write SQL migration file | ✓ |
| Recreate the table | Drop + recreate — only viable if prod data is expendable | |

**User's choice:** Set up wrangler migrations folder

| Option | Description | Selected |
|--------|-------------|----------|
| Keep schema.sql in sync | Update schema.sql alongside migration files — human-readable reference | |
| Migrations folder only | schema.sql becomes legacy; migrations are the canonical source | ✓ |

**User's choice:** Migrations folder only — schema.sql is not maintained after this phase.

**Notes:** User opted for proper migration infrastructure over a one-off command. This sets a clean pattern for future schema changes (e.g. Phase 8 or v2.0 schema additions).

---

## Existing RSVP Records

| Option | Description | Selected |
|--------|-------------|----------|
| NULL is fine | Legacy RSVPs stay NULL — signals they predate dual-password | |
| Default to 0 | Set DEFAULT 0 so existing rows get host_ref = 0 | |
| Default to 1 | Set DEFAULT 1 | |

**User's choice (initial):** Backfill existing to 0, NOT NULL for new records

| Option | Description | Selected |
|--------|-------------|----------|
| Recreate table (achieves NOT NULL) | Table recreation migration: CREATE new table, copy data with host_ref=0, drop old, rename | |
| Nullable schema + API enforcement | ALTER TABLE adds nullable column; UPDATE backfills to 0; API validates header presence | ✓ |

**User's choice:** Simpler approach — nullable schema, API-level enforcement. Application validates `X-Host-Ref` is present before insert; missing header returns 400. Existing records backfilled to 0 via migration UPDATE.

**Notes:** User initially wanted NOT NULL constraint, but opted for the simpler implementation path after learning SQLite can't add NOT NULL to existing columns without table recreation. Application-level enforcement achieves the same guarantee for new records.

---

## Claude's Discretion

- **Propagation header name:** User did not select the "Propagation header name" gray area — Claude chose `X-Host-Ref` as the header name. Conventional for Cloudflare Workers patterns, descriptive.
- **Middleware auth order:** Check `SITE_PASSWORD__0` first, then `SITE_PASSWORD__1`. Deterministic, no ambiguity.

## Deferred Ideas

- Content/copy updates (hint page riddle, RSVP page text) — Phase 8.
- Per-host admin dashboards — out of scope for v1.3.
