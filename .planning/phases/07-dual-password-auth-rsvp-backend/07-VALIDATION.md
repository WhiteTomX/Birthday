---
phase: "07"
slug: dual-password-auth-rsvp-backend
status: partial
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — plain Cloudflare Pages project, no build step, no package.json |
| **Config file** | none |
| **Quick run command** | See in-plan verify blocks below (shell one-liners) |
| **Full suite command** | See in-plan verify blocks below |
| **Estimated runtime** | ~2 seconds (static checks only) |

**Note:** This project has no test framework and no automated test runner. Verification is provided by in-plan shell verify blocks (static structural checks) and UAT executed via Chrome DevTools MCP. All 4 requirements are verified as of 2026-06-21.

---

## Sampling Rate

- **After every task commit:** Run the in-plan `<verify><automated>` shell command for that task
- **After every plan wave:** Run all verify blocks for the wave
- **Before `/gsd-verify-work`:** All static checks green + UAT
- **Max feedback latency:** ~2 seconds (static) + UAT time

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 07-01-01 | 01 | 1 | RSVP-08 | T-07-01, T-07-02, T-07-03 | Additive migration only; wrangler tracking prevents re-run | in-plan shell | `node -e "const s=require('fs').readFileSync('wrangler.jsonc','utf8').replace(/\/\/.*$/gm,''); const j=JSON.parse(s); if(j.d1_databases[0].migrations_dir!=='migrations'){process.exit(1)}"` | ✅ green |
| 07-01-02 | 01 | 1 | RSVP-08 | T-07-01 | ALTER TABLE additive; idempotent backfill | in-plan shell | `test -f migrations/0001_add_host_ref.sql && grep -q "ALTER TABLE rsvps ADD COLUMN host_ref INTEGER" migrations/0001_add_host_ref.sql && grep -q "UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL" migrations/0001_add_host_ref.sql && echo OK` | ✅ green |
| 07-02-01 | 02 | 1 | AUTH-07 | T-07-06 | Credentials in .dev.vars (gitignored); old key removed | in-plan shell | `grep -q "^SITE_PASSWORD__0=" .dev.vars && grep -q "^SITE_PASSWORD__1=" .dev.vars && ! grep -q "^SITE_PASSWORD=" .dev.vars && echo OK` | ✅ green |
| 07-02-02 | 02 | 1 | AUTH-07, AUTH-08 | T-07-04, T-07-05, T-07-06, T-07-07 | Both passwords accepted; X-Host-Ref injected; password never exposed | in-plan shell | `node --input-type=module --check < functions/_middleware.js && grep -q "SITE_PASSWORD__0" functions/_middleware.js && grep -q "SITE_PASSWORD__1" functions/_middleware.js && grep -q "X-Host-Ref" functions/_middleware.js && ! grep -qE "env\.SITE_PASSWORD[^_]" functions/_middleware.js && echo OK` | ✅ green |
| 07-03-01 | 03 | 2 | RSVP-07 | T-07-08, T-07-09, T-07-10, T-07-11 | X-Host-Ref validated; host_ref in INSERT; no password read | in-plan shell | `node --input-type=module --check < functions/api/rsvp.js && grep -q "X-Host-Ref" functions/api/rsvp.js && grep -q "host_ref" functions/api/rsvp.js && grep -qE "VALUES \(\?, \?, \?, \?, \?, \?\)" functions/api/rsvp.js && echo OK` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

All 5 in-plan verify commands passed on 2026-06-21.

---

## Wave 0 Requirements

None — no test framework to install and no stub files needed. In-plan shell verify blocks cover static requirements. Runtime behavior verified via UAT.

*Existing infrastructure (in-plan shell checks + Chrome DevTools UAT) covers all phase requirements.*

---

## Manual-Only Verifications

All runtime behaviors are manual-only due to the lack of an automated test runner. All 4 were verified via Chrome DevTools MCP during UAT (2026-06-21, 4/4 passed).

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth with SITE_PASSWORD__0 → access granted + RSVP stores host_ref=0 | AUTH-07, RSVP-07 | Requires live Cloudflare Pages Functions runtime (wrangler dev) — static analysis cannot confirm `next(modifiedRequest)` propagation through CF runtime | `wrangler pages dev --port 8788`; authenticate with `geburtstag1`; submit RSVP; query `SELECT host_ref FROM rsvps ORDER BY submitted_at DESC LIMIT 1` expecting `0` |
| Auth with SITE_PASSWORD__1 → access granted + RSVP stores host_ref=1 | AUTH-07, RSVP-07 | Same CF runtime dependency | Same as above but authenticate with `geburtstag2`; expect `host_ref=1` |
| Invalid password → 401 + no row inserted | AUTH-07 | Runtime behavior confirmation | Attempt access with wrong password; expect 401 German hint page; confirm no new D1 row |
| "Not coming" decline with host attribution (CR-03 fix) | RSVP-07 | `not-coming.js` updated in commit b13d4c1; runtime confirmation required | Submit decline via `/api/not-coming` with each password; verify `host_ref` on decline rows matches password used |

**UAT result:** 4/4 passed on 2026-06-21 via Chrome DevTools MCP (see 07-UAT.md).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (in-plan shell blocks — all green)
- [x] No 3 consecutive tasks without automated verify
- [ ] No standalone test framework — wave 0 not applicable
- [x] No watch-mode flags
- [x] All runtime behaviors covered by UAT (4/4 passed)
- [ ] `nyquist_compliant: true` — NOT set; project has no test framework; marked partial/manual

**Approval:** partial 2026-06-21 — static checks green, UAT 4/4 passed, no automated test runner available for this project type.
