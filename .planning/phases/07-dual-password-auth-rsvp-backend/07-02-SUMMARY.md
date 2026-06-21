---
plan: 07-02
phase: 07-dual-password-auth-rsvp-backend
status: complete
completed: 2026-06-21
tasks_completed: 2
tasks_total: 2
self_check: PASSED
---

# Plan 07-02: Dual-Password Auth + X-Host-Ref Middleware

## What Was Built

Rewrote `functions/_middleware.js` to accept two host passwords and propagate the matched host index downstream via an `X-Host-Ref` header. Updated `.dev.vars` with both local dev passwords.

## Tasks

### Task 1: Add both passwords to .dev.vars ✓
Updated `.dev.vars` to define `SITE_PASSWORD__0=geburtstag1` and `SITE_PASSWORD__1=geburtstag2`. Removed the old single `SITE_PASSWORD=` key. File is gitignored — change was applied to the working tree only (as expected for secret files).

### Task 2: Rewrite middleware for dual-password auth + X-Host-Ref injection ✓
Replaced the single-password check block in `functions/_middleware.js` with a dual-password check. After a successful match, constructs a modified request with `X-Host-Ref: 0|1` injected and calls `next({ request: modifiedRequest })`. The `unauthorizedResponse()` function and public-route allowlist are byte-for-byte identical to before.

**Commit:** `5dd7d13` — `feat(07-02): dual-password auth + X-Host-Ref injection in middleware`

## Key Files

### Modified
- `functions/_middleware.js` — dual-password check with X-Host-Ref injection

### Not Committed (gitignored)
- `.dev.vars` — updated locally with SITE_PASSWORD__0 and SITE_PASSWORD__1

## Verification

- Grep checks: `SITE_PASSWORD__0`, `SITE_PASSWORD__1`, `X-Host-Ref` present; bare `env.SITE_PASSWORD` absent ✓
- `node --check` produces an ES module warning (expected — Cloudflare Pages Functions use ES module syntax, not CJS) but finds no syntax errors
- `unauthorizedResponse()` function body unchanged (401, Cache-Control: no-store, same German hint HTML) ✓

## Note on .dev.vars

`.dev.vars` is gitignored and cannot be committed. The orchestrator must manually apply the two-password change to the main checkout after this worktree merges:
```
SITE_PASSWORD__0=geburtstag1
SITE_PASSWORD__1=geburtstag2
```
(Remove the old `SITE_PASSWORD=geburtstag1` line.)

## Self-Check

- [x] Task 1: .dev.vars updated with both passwords
- [x] Task 2: Middleware rewritten — dual-password check + X-Host-Ref injection committed
- [x] SUMMARY.md written and committed
- [x] STATE.md and ROADMAP.md NOT modified (orchestrator owns those)
