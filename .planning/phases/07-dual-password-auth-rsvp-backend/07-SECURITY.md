---
phase: "07"
slug: dual-password-auth-rsvp-backend
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-21
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Middleware | HTTP Basic Auth gate (Cloudflare Pages Function) | Basic Auth credentials (sensitive — password never stored beyond auth check) |
| Middleware → RSVP API | X-Host-Ref request header injected after successful auth | Host index (0 or 1) — derived, non-sensitive; password value never crosses this boundary |
| RSVP API → D1 | Prepared-statement INSERT | RSVP payload (name, contact, attendees) + host_ref integer; no credentials |
| Wrangler CLI → D1 | Migration application (local & production) | DDL statements (ALTER TABLE, UPDATE backfill) — additive only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | Tampering | migrations/0001_add_host_ref.sql | mitigate | Migration uses additive `ALTER TABLE ADD COLUMN` only — no DROP/destructive ops. Backfill is idempotent `UPDATE … WHERE host_ref IS NULL`. Verified locally before any remote apply. | closed |
| T-07-02 | Tampering | D1 Migration Infrastructure | mitigate | Wrangler migration tracking table prevents re-application of an already-applied numbered migration. Backfill UPDATE only touches NULL rows (idempotent). | closed |
| T-07-03 | Tampering | Schema source of truth | mitigate | `schema.sql` retired as runtime artifact (D-03). `migrations/` is now canonical; no code reads `schema.sql` at runtime. `wrangler.jsonc` `migrations_dir` key confirmed pointing at `migrations/`. | closed |
| T-07-04 | Information Disclosure | functions/_middleware.js (timing) | mitigate | Both passwords use the same `===` string-equality operator with fixed check order (`__0` then `__1`). No early-exit path leaks which slot was tried beyond the intended host index output. Acceptable for ASVS L1 on a low-value invite site. | closed |
| T-07-05 | Spoofing | functions/_middleware.js (X-Host-Ref) | mitigate | Middleware constructs `modifiedRequest` with `X-Host-Ref` set from server-derived `hostRef`, overwriting any client-supplied value. RSVP API additionally validates strict `0` or `1` (parseInt). Header is set on the forwarded request only, never on the Response (not exposed to browser). | closed |
| T-07-06 | Information Disclosure | functions/_middleware.js (credential leakage) | mitigate | Password value is never logged, never written to a header, never returned in any response. Only the derived index (0 or 1) leaves the middleware via `X-Host-Ref`. `.dev.vars` holds secrets locally and is gitignored. | closed |
| T-07-07 | Elevation of Privilege | functions/_middleware.js (401 bypass) | mitigate | The only code paths calling `next()` are: (a) the public-route allowlist (`/`, `/index.html`, `/style.css`) and (b) the post-match branch after a password equals `SITE_PASSWORD__0` or `SITE_PASSWORD__1`. Missing/non-Basic auth header returns 401 before the password check. All other paths return `unauthorizedResponse()`. | closed |
| T-07-08 | Spoofing | functions/api/rsvp.js (X-Host-Ref spoofing) | mitigate | Middleware always overwrites `X-Host-Ref` on the forwarded request after authenticating, so a client-supplied value cannot reach this handler. API validates `hostRef` is strictly `0` or `1` and rejects anything else with 400 (D-06). | closed |
| T-07-09 | Spoofing | functions/api/rsvp.js (middleware bypass) | mitigate | Handler returns 400 when `X-Host-Ref` is absent or not `0`/`1`, before any DB write. This is the application-level NOT-NULL guarantee for new records (D-06), since the column is nullable for backfill reasons. | closed |
| T-07-10 | Injection | functions/api/rsvp.js (SQL injection) | mitigate | All values are passed through D1 prepared-statement `.bind(...)` parameters — no string interpolation into SQL. `hostRef` is a parsed integer (`parseInt(hostRefHeader, 10)`) before binding. | closed |
| T-07-11 | Information Disclosure | functions/api/rsvp.js (credential leakage) | mitigate | API never reads the Authorization header or any `SITE_PASSWORD*` env var. It only reads the derived `X-Host-Ref` index. No password value is logged or stored anywhere in this handler. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-21 | 11 | 11 | 0 | gsd-secure-phase (static verification — all mitigations confirmed in implementation files) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-21
