# Requirements: Birthday Website — v1.3 Joint Birthday

**Defined:** 2026-06-20
**Core Value:** Enable frictionless guest RSVPs via a password-protected, beautiful German site.

## v1.3 Requirements

### Auth

- [ ] **AUTH-07**: Guest can access `/rsvp/` with either `SITE_PASSWORD__0` or `SITE_PASSWORD__1`
- [ ] **AUTH-08**: Middleware passes password index (`0` or `1`) to downstream handlers without exposing the password value itself (e.g. via a request header)

### RSVP

- [ ] **RSVP-07**: RSVP submission stores a `host_ref` field (`0` or `1`) derived from which password the guest authenticated with
- [ ] **RSVP-08**: D1 schema includes `host_ref` column (added via migration or schema update)

### Content

- [ ] **CONT-01**: Site text (hint page riddle, save-the-date copy, RSVP page) updated in German to reflect a joint birthday celebration by two hosts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Separate guest lists per host | Not needed — all guests attend one shared party |
| Storing the actual password value | Security — only the index (0 or 1) is stored |
| Per-host RSVP dashboards | Out of scope for this milestone; raw D1 query covers admin needs |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-07 | Phase 7 | Pending |
| AUTH-08 | Phase 7 | Pending |
| RSVP-07 | Phase 7 | Pending |
| RSVP-08 | Phase 7 | Pending |
| CONT-01 | Phase 8 | Pending |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-20*
*Last updated: 2026-06-20 — phase assignments confirmed (Phase 7: AUTH-07, AUTH-08, RSVP-07, RSVP-08; Phase 8: CONT-01)*
