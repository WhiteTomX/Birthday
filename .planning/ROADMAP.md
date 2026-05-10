# Roadmap: Birthday Website — v1.0 RSVP Site

## Overview

Three phases deliver a password-protected save-the-date RSVP site on Cloudflare. Phase 1 gets the Cloudflare infrastructure live with auth enforcement. Phase 2 builds the German save-the-date page and RSVP form UI. Phase 3 wires the form to a Worker endpoint and D1 database so submissions persist as unique records.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure & Auth** - Cloudflare Pages + Workers deployed, Basic Auth protecting a live URL
- [x] **Phase 2: Save-the-Date Page & RSVP Form** - German page with event info and fully functional RSVP form UI
- [x] **Phase 3: RSVP Backend** - Worker endpoint receives submissions and persists unique records in D1
- [x] **Phase 4: Design & Content Rework** - Celebratory visual redesign + "Save the Date" made prominent throughout content

## Phase Details

### Phase 1: Infrastructure & Auth
**Goal**: The site is live on Cloudflare and inaccessible without the correct password
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. Visiting the site URL without credentials shows a browser native login prompt
  2. Entering the correct password grants access (protected content loads)
  3. Entering a wrong password is rejected — the prompt re-appears or shows 401
**Plans**: 2 plans

Plans:
- [x] 01-PLAN-scaffold.md — Project scaffold: auth middleware, German placeholder page, .gitignore
- [x] 01-PLAN-deploy.md — Cloudflare Pages setup: connect GitHub, set SITE_PASSWORD secret, verify live auth

### Phase 2: Save-the-Date Page & RSVP Form
**Goal**: Authenticated guests see a German save-the-date page and can fill out the RSVP form (frontend only — submission not yet wired)
**Depends on**: Phase 1
**Requirements**: PAGE-01, PAGE-02, PAGE-03, RSVP-01, RSVP-02, RSVP-03, RSVP-04
**Success Criteria** (what must be TRUE):
  1. Page displays event description and the date (5 December) entirely in German
  2. Guest can enter their name, choose one of the 7 contact methods, and set a plus-one count (including zero)
  3. Submitting with empty required fields shows inline German error messages and does not proceed
  4. Page renders correctly and is comfortably usable on both a phone and a desktop browser
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Replace placeholder page with German save-the-date content, RSVP form HTML/CSS/JS (frontend only)
**UI hint**: yes

### Phase 3: RSVP Backend
**Goal**: RSVP submissions reach a Cloudflare Worker, are stored as unique records in D1, and guests see a German confirmation
**Depends on**: Phase 2
**Requirements**: RSVP-05, RSVP-06, RSVP-07
**Success Criteria** (what must be TRUE):
  1. Submitting the form sends a network request to the Worker endpoint (visible in DevTools)
  2. Each submission creates a new row in the D1 database with a unique ID (visible in the D1 dashboard)
  3. Submitting the same name twice results in two separate records — no overwrite occurs
  4. After a successful submission, the guest sees a confirmation message in German on the page
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — D1 infrastructure: schema.sql, wrangler.jsonc D1 binding, database creation checkpoint
- [x] 03-02-PLAN.md — Worker endpoint: functions/api/rsvp.js with validation, D1 insert, JSON responses
- [x] 03-03-PLAN.md — Frontend wiring: script.js fetch submission, success/error states, end-to-end verification

### Phase 4: Design & Content Rework
**Goal**: Redesign the site with celebratory aesthetics and make "Save the Date" prominent throughout the content (not just the browser title)
**Depends on**: Phase 3
**Requirements**: PAGE-01, PAGE-02
**Success Criteria** (what must be TRUE):
  1. "Save the Date" appears visibly on the page as content (heading or prominent label) — not only in the `<title>`
  2. The visual design is noticeably more festive/celebratory (warm or vibrant palette, celebration-oriented typography, less sparse layout)
  3. All existing functionality (RSVP form, validation, submission, German copy) remains intact
  4. Page is still responsive and usable on mobile and desktop
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — HTML DOM insertions (eyebrow badge + divider) + full CSS design system rework (festive palette, typography, spacing, new component styles)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Auth | 2/2 | ✅ Complete | 2026-05-10 |
| 2. Save-the-Date Page & RSVP Form | 1/1 | ✅ Complete | 2026-05-10 |
| 3. RSVP Backend | 3/3 | ✅ Complete | 2026-05-10 |
| 4. Design & Content Rework | 1/1 | ✅ Complete | 2026-05-10 |
