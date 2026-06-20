---
phase: "06"
slug: not-coming-rsvp-selection
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-20
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → /api/not-coming | Untrusted JSON body (guest-supplied name) crosses into the Cloudflare Worker | Guest name (PII) |
| Worker → D1 (rsvps table) | Application data crosses into persistent storage | Name, timestamp, UUID |
| guest input → DOM | Guest-supplied name is rendered into the confirmation message | Name (display only) |
| browser → /api/rsvp | Existing RSVP path (unchanged) | Name, contact method, attendee count |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | Tampering | SQL insert in `not-coming.js` | mitigate | D1 `prepare().bind()` parameterized statement — guest name bound, never interpolated into SQL string | closed |
| T-06-02 | Information Disclosure | D1 failure catch block | mitigate | Returns generic `{ ok: false, error: 'Database error' }` 500; internal `err` object never surfaced to client | closed |
| T-06-03 | Denial of Service | unauthenticated request flood | accept | See Accepted Risks Log — AR-06-01 | closed |
| T-06-04 | Spoofing / Elevation | direct access to `/api/not-coming` | mitigate | Auth enforced upstream by `functions/_middleware.js` for all non-public routes; no auth bypass added in this endpoint | closed |
| T-06-05 | Tampering | `attendees` forced > 0 via payload | mitigate | `attendees` hardcoded `0` in `.bind()` — never read from request body; a tampered decline payload cannot masquerade as an attendance | closed |
| T-06-06 | Tampering (XSS) | success/decline confirmation in `script.js` | mitigate | Guest name rendered only via `textContent` + `createElement`; `innerHTML` is never called with user-supplied input | closed |
| T-06-07 | Tampering | client selects endpoint / builds payload | accept | See Accepted Risks Log — AR-06-02 | closed |
| T-06-08 | Information Disclosure | inline submit-error DOM message | mitigate | Network/5xx failures show fixed German string ("Etwas ist schiefgelaufen…"); 4xx validation messages are intentional, non-sensitive user-facing strings (e.g. "Name required") with no internal detail | closed |
| T-06-SC | Tampering | package install surface | accept | See Accepted Risks Log — AR-06-03 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-03 | Private RSVP site behind Basic Auth (`functions/_middleware.js`) + Cloudflare free-tier edge DDoS protections. Low-value target with no financial or personal data beyond names. A rate-limiter adds operational complexity disproportionate to the risk. | WhiteTom | 2026-06-20 |
| AR-06-02 | T-06-07 | Endpoint routing and payload construction are client-side conveniences only. The `/api/not-coming` server independently validates name and hardcodes `attendees=0` / `contact_method=null` in the D1 bind — a tampered client cannot corrupt stored data. | WhiteTom | 2026-06-20 |
| AR-06-03 | T-06-SC | No package installs in either plan. Stack is plain HTML/CSS/JS + native Cloudflare Workers globals (`crypto`, `Response`, `env.DB`). Zero new supply-chain surface. | WhiteTom | 2026-06-20 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-20 | 9 | 9 | 0 | gsd-secure-phase (artifact analysis — register_authored_at_plan_time: true; short-circuit; all plan-time threats verified closed) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-20
