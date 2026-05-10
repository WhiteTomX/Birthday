# Requirements: Birthday Website

**Defined:** 2026-05-09
**Core Value:** Enable frictionless guest RSVPs and participation via a centralized, beautiful site.

## v1.0 Requirements — RSVP Site

Requirements for the initial milestone. Each maps to a roadmap phase.

### Access Control

- [ ] **AUTH-01**: User can access the site after entering the correct password (HTTP Basic Auth, Worker-enforced)
- [ ] **AUTH-02**: Unauthenticated requests are rejected with a 401 response and a browser login prompt

### RSVP Collection

- [ ] **RSVP-01**: Guest can submit their name via the RSVP form
- [ ] **RSVP-02**: Guest can select a preferred contact method (WhatsApp, Telegram, Signal, Discord, Matrix, SMS, Threema)
- [ ] **RSVP-03**: Guest can specify how many people they are bringing (plus-ones, including zero)
- [ ] **RSVP-04**: Form validates required fields before submission and shows inline error messages
- [ ] **RSVP-05**: Submission is sent to a Cloudflare Worker endpoint
- [ ] **RSVP-06**: Each RSVP is stored as a new record with a unique ID in Cloudflare D1 (no overwrites)
- [ ] **RSVP-07**: Guest sees a success confirmation message (in German) after submitting

### Presentation

- [ ] **PAGE-01**: Site displays a save-the-date page with event description and date (5 December)
- [ ] **PAGE-02**: All UI text is in German
- [ ] **PAGE-03**: Site is responsive and usable on mobile and desktop

## v2.0 Requirements — Full Invitation

Deferred to next milestone. Not in current roadmap.

### Venue & Invitation

- **VENUE-01**: Page displays confirmed venue name and address
- **VENUE-02**: Page displays parking information
- **VENUE-03**: Page displays event timing (arrival, start, end)
- **VENUE-04**: Page displays dress code (if applicable)

## v3.0 Requirements — Event Day Experience

Deferred to later milestone. Not in current roadmap.

### Guest Experience

- **PHOTO-01**: Guest can upload photos to a shared gallery
- **GAME-01**: Interactive game or activity is available on the site
- **WISH-01**: Wishlist scraped from external source is displayed on the site

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / login | Basic Auth is sufficient; no user accounts needed |
| RSVP editing or deletion | Each submission is a new record by design |
| Email confirmations | Frontend-only, no email infrastructure |
| RSVP cap or waitlist | Unlimited plus-ones by design |
| Complex analytics | Not needed for a personal event |
| Admin dashboard | RSVP data queried directly via D1 dashboard |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| RSVP-01 | — | Pending |
| RSVP-02 | — | Pending |
| RSVP-03 | — | Pending |
| RSVP-04 | — | Pending |
| RSVP-05 | — | Pending |
| RSVP-06 | — | Pending |
| RSVP-07 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| PAGE-03 | — | Pending |

**Coverage:**
- v1.0 requirements: 12 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-05-09*
*Last updated: 2026-05-09 — initial definition for milestone v1.0*
