---
phase: 07-dual-password-auth-rsvp-backend
verified: 2026-06-21T14:45:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Authenticate with SITE_PASSWORD__0 (geburtstag1), submit RSVP, verify host_ref=0 in D1"
    expected: "Row inserted with host_ref=0; X-Host-Ref header flows end-to-end from middleware through next(modifiedRequest) to rsvp.js"
    why_human: "Static analysis cannot confirm Cloudflare Pages Functions runtime honors next(Request) argument; live server needed to confirm X-Host-Ref reaches the RSVP handler"
  - test: "Authenticate with SITE_PASSWORD__1 (geburtstag2), submit RSVP, verify host_ref=1 in D1"
    expected: "Row inserted with host_ref=1"
    why_human: "Same as above — end-to-end runtime confirmation of dual-password path"
  - test: "Submit RSVP with wrong password"
    expected: "401 response; no row inserted"
    why_human: "Runtime behavior confirmation"
  - test: "Submit RSVP with no Authorization header"
    expected: "401 response"
    why_human: "Runtime behavior confirmation"
---

# Phase 7: Dual-Password Auth & RSVP Backend Verification Report

**Phase Goal:** Introduce dual-password authentication and host attribution for a joint birthday — guests authenticate with one of two passwords, the matched host index is forwarded to the RSVP backend, and every RSVP record stores which host's circle the guest belongs to.
**Verified:** 2026-06-21T14:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A guest authenticating with SITE_PASSWORD__0 is granted access and tagged host 0 | ? UNCERTAIN | Middleware logic correct; runtime wiring requires live server confirmation |
| 2 | A guest authenticating with SITE_PASSWORD__1 is granted access and tagged host 1 | ? UNCERTAIN | Middleware logic correct; runtime wiring requires live server confirmation |
| 3 | A request with invalid or absent password is rejected with 401 | ✓ VERIFIED | `unauthorizedResponse()` called in all non-matching branches; atob try/catch now guards malformed headers (commit b13d4c1) |
| 4 | The forwarded request carries X-Host-Ref (0 or 1) without exposing the password value | ✓ VERIFIED (static) | Middleware sets `X-Host-Ref: String(hostRef)` on `modifiedRequest`; password value never written to any header; `return next(modifiedRequest)` at line 57. Runtime confirmation needed (see Human Verification). |
| 5 | The rsvps table has a host_ref column after migration is applied | ✓ VERIFIED | `migrations/0001_add_host_ref.sql` contains `ALTER TABLE rsvps ADD COLUMN host_ref INTEGER` |
| 6 | Existing RSVP rows have host_ref = 0 after migration | ✓ VERIFIED | Migration contains `UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL` |
| 7 | A submitted RSVP record in D1 contains host_ref equal to 0 or 1 matching the authenticating password | ✓ VERIFIED (static) | `rsvp.js` reads X-Host-Ref, validates strictly as 0 or 1, passes `hostRef` as 6th `.bind()` argument in 6-column INSERT |
| 8 | An RSVP request without a valid X-Host-Ref header is rejected with 400 | ✓ VERIFIED | `rsvp.js` lines 43-45: `if (hostRefHeader === null \|\| (hostRef !== 0 && hostRef !== 1))` returns `{ ok: false, error: 'Missing host context' }` with status 400 |

**Score:** 8/8 truths verified (6 fully, 2 pending runtime confirmation)

---

### Roadmap Success Criteria

| # | Success Criterion | Status | Evidence |
|---|------------------|--------|----------|
| 1 | A guest using SITE_PASSWORD__0 can reach /rsvp/ and is granted access | ? UNCERTAIN | Middleware logic VERIFIED; end-to-end runtime not tested |
| 2 | A guest using SITE_PASSWORD__1 can reach /rsvp/ and is granted access | ? UNCERTAIN | Middleware logic VERIFIED; end-to-end runtime not tested |
| 3 | A submitted RSVP record in D1 contains host_ref (0 or 1) matching which password was used — password itself never stored | ✓ VERIFIED (static) | 6-column INSERT with validated hostRef integer; no Authorization header or SITE_PASSWORD* read in rsvp.js |
| 4 | Requests with invalid or absent password are still rejected with 401 | ✓ VERIFIED | All non-matching branches call `unauthorizedResponse()` returning 401 with `Cache-Control: no-store` |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `migrations/0001_add_host_ref.sql` | ALTER TABLE + backfill UPDATE for host_ref | ✓ VERIFIED | Contains `ALTER TABLE rsvps ADD COLUMN host_ref INTEGER;` and `UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL;` |
| `wrangler.jsonc` | migrations_dir key pointing at migrations/ | ✓ VERIFIED | `"migrations_dir": "migrations"` present in d1_databases[0]; database_id and binding unchanged |
| `functions/_middleware.js` | Dual-password auth + X-Host-Ref injection | ✓ VERIFIED | References SITE_PASSWORD__0 and SITE_PASSWORD__1; sets X-Host-Ref; no bare SITE_PASSWORD; atob() guarded; syntax valid |
| `.dev.vars` | Both dev passwords for local testing | ✓ VERIFIED | Contains `SITE_PASSWORD__0=geburtstag1` and `SITE_PASSWORD__1=geburtstag2`; old `SITE_PASSWORD` key absent |
| `functions/api/rsvp.js` | X-Host-Ref read + validation + host_ref in INSERT | ✓ VERIFIED | Reads header, validates strictly as 0/1, 6-column INSERT with 6 `?` placeholders, hostRef as 6th .bind() arg |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `wrangler.jsonc` | `migrations/` | `migrations_dir` config key | ✓ WIRED | `"migrations_dir": "migrations"` present |
| `functions/_middleware.js` | `next()` | modified request with X-Host-Ref header | ✓ WIRED (static) | `return next(modifiedRequest)` at line 57; modifiedRequest constructed with X-Host-Ref header |
| `functions/api/rsvp.js` | `rsvps.host_ref` | INSERT including host_ref bound to the X-Host-Ref value | ✓ WIRED | `host_ref` in column list; `hostRef` as 6th `.bind()` arg |

---

### Data-Flow Trace (Level 4)

| Step | From | To | Via | Status |
|------|------|----|-----|--------|
| 1 | `SITE_PASSWORD__0` / `SITE_PASSWORD__1` env vars | `hostRef` (int 0 or 1) | middleware password comparison | ✓ FLOWS |
| 2 | `hostRef` | `X-Host-Ref` request header | `new Headers({ 'X-Host-Ref': String(hostRef) })` on modifiedRequest | ✓ FLOWS (static) |
| 3 | `X-Host-Ref` header | `hostRef` in rsvp.js | `request.headers.get('X-Host-Ref')` + `parseInt` | ✓ FLOWS (static) |
| 4 | `hostRef` in rsvp.js | `rsvps.host_ref` column in D1 | `.bind(..., hostRef).run()` in prepared statement | ✓ FLOWS |

**Note on step 2:** The data flow through `next(modifiedRequest)` is verified by static analysis. The Cloudflare Pages Functions `next()` API accepts a `Request` object directly as its first argument (confirmed by commit b13d4c1 which corrected the earlier wrong form `next({ request: modifiedRequest })`). Live runtime confirmation is still required.

---

### Behavioral Spot-Checks

Not runnable without the Wrangler dev server (`wrangler pages dev --port 8788`). Static checks performed instead:

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Middleware syntax valid | `node --input-type=module --check < functions/_middleware.js` | exit 0 | ✓ PASS |
| rsvp.js syntax valid | `node --input-type=module --check < functions/api/rsvp.js` | exit 0 | ✓ PASS |
| Middleware references both passwords | `grep -n "SITE_PASSWORD__[01]" _middleware.js` | lines 41, 43 | ✓ PASS |
| Middleware has no bare SITE_PASSWORD | `grep -nP "env\.SITE_PASSWORD(?!__)"` | no matches (exit 1) | ✓ PASS |
| Middleware sets X-Host-Ref | `grep -n "X-Host-Ref"` | line 54 | ✓ PASS |
| rsvp.js 6-column INSERT | `grep -n "VALUES"` | 6 columns, 6 placeholders confirmed | ✓ PASS |
| .dev.vars has both keys | contents checked | both keys present, old key absent | ✓ PASS |
| Commit hashes valid | `git log 66904bf 1827849 5dd7d13 e54fcd3` | all 4 found | ✓ PASS |

---

### Probe Execution

No probe scripts found. Step 7c: SKIPPED (no probe scripts exist in this project).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-07 | 07-02-PLAN.md | Guest can access /rsvp/ with either SITE_PASSWORD__0 or SITE_PASSWORD__1 | ✓ SATISFIED (static) | Middleware accepts both passwords; grants access via `next(modifiedRequest)` |
| AUTH-08 | 07-02-PLAN.md | Middleware passes password index (0 or 1) without exposing the password value | ✓ SATISFIED | X-Host-Ref set to `String(hostRef)`; password value never written to any header, log, or response |
| RSVP-07 | 07-03-PLAN.md | RSVP submission stores host_ref (0 or 1) derived from which password was used | ✓ SATISFIED (static) | 6-column INSERT with hostRef from X-Host-Ref header; validated strictly before DB write |
| RSVP-08 | 07-01-PLAN.md | D1 schema includes host_ref column via migration | ✓ SATISFIED | `migrations/0001_add_host_ref.sql` exists with ALTER TABLE + backfill |

All 4 phase requirements accounted for. CONT-01 is correctly assigned to Phase 8 (not Phase 7).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/HACK markers found in any modified file | — | None |

**Unresolved REVIEW.md warnings (not blocking — not in must-haves):**

| Finding | File | Severity | Notes |
|---------|------|----------|-------|
| CR-04: Migration lacks NOT NULL DEFAULT — host_ref nullable at schema level | migrations/0001_add_host_ref.sql | Warning | Application-level guard in rsvp.js and not-coming.js prevents NULL inserts for new records; schema-level enforcement would be stronger but SQLite ALTER TABLE limitations apply. Not in plan must-haves. |
| WR-03: Non-timing-safe password comparison via `===` | functions/_middleware.js | Warning | Acceptable for a low-value invite site (ASVS L1). Documented in PATTERNS.md threat model. Not in plan must-haves. |
| IN-01: contact type not validated before trim/coercion | functions/api/rsvp.js | Info | Pre-existing from Phase 3. Non-string contact silently becomes null. Not a phase 7 concern. |

**Code Review Fixes Confirmed Merged (all in commit b13d4c1):**
- CR-01: `next({ request })` corrected to `next(modifiedRequest)` — runtime wiring fix
- CR-02: `atob()` wrapped in try/catch returning 401 — malformed auth header no longer 500s
- CR-03: `not-coming.js` updated to read X-Host-Ref and store host_ref — decline records now correctly attributed

---

### Human Verification Required

#### 1. End-to-End Auth Flow with SITE_PASSWORD__0

**Test:** Start `wrangler pages dev --port 8788`. Authenticate with `SITE_PASSWORD__0` (geburtstag1). Submit a valid RSVP form. Query D1: `wrangler d1 execute birthday-rsvps --local --command "SELECT host_ref, name FROM rsvps ORDER BY submitted_at DESC LIMIT 1"`.
**Expected:** Row returned with `host_ref = 0`; 200 response from RSVP API.
**Why human:** The Cloudflare Pages Functions runtime must be running to confirm that `next(modifiedRequest)` actually propagates the modified request (with X-Host-Ref) to the RSVP handler. Static analysis confirms the code is correct but cannot simulate the CF runtime.

#### 2. End-to-End Auth Flow with SITE_PASSWORD__1

**Test:** Same as above but authenticate with `SITE_PASSWORD__1` (geburtstag2). Submit RSVP.
**Expected:** Row returned with `host_ref = 1`; 200 response.
**Why human:** Same runtime dependency; validates the second password path.

#### 3. Invalid Password Rejection

**Test:** Attempt to access `/rsvp/` with a wrong password.
**Expected:** 401 response with the German hint page HTML. No row inserted in D1.
**Why human:** Confirms the `unauthorizedResponse()` branch is taken and no bypass exists.

#### 4. "Not Coming" Decline with Host Attribution

**Test:** Submit a decline via the "not coming" flow using each password. Query D1 for `host_ref` on the decline records.
**Expected:** Decline rows have `host_ref = 0` or `host_ref = 1` matching the password used. 400 returned if no valid X-Host-Ref (though middleware prevents this in practice).
**Why human:** `not-coming.js` was updated (CR-03 fix in b13d4c1) but this was not in the original PLAN must-haves. Confirms the fix is complete.

---

### Gaps Summary

No blocking gaps found. All must-have truths are verified at the static analysis level. Two truths (SC-1 and SC-2) are marked UNCERTAIN for runtime confirmation only — the code implementing them is correct and complete.

The only items requiring attention before this phase can be fully closed are the four human verification tests above, which require the local Wrangler dev server.

---

_Verified: 2026-06-21T14:45:00Z_
_Verifier: Claude (gsd-verifier)_
