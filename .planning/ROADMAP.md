# Roadmap: Birthday Website

## Milestones

- ✅ **v1.0 RSVP Site** — Phases 1–4 (shipped 2026-05-10) · [Archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Password Hint Page** — Phase 5 (shipped 2026-05-10) · [Archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Not Coming** — Phase 6 (shipped 2026-06-14)
- ✅ **v1.3 Joint Birthday** — Phases 7–8 (shipped 2026-06-21)
- ◆ **v2.0 Actual Invitation** — Phase 9 (planned)

## Phases

<details>
<summary>✅ v1.0 RSVP Site (Phases 1–4) — SHIPPED 2026-05-10</summary>

- [x] Phase 1: Infrastructure & Auth (2/2 plans) — completed 2026-05-10
- [x] Phase 2: Save the Date Page + RSVP Form (2/2 plans) — completed 2026-05-10
- [x] Phase 3: RSVP Backend (2/2 plans) — completed 2026-05-10
- [x] Phase 4: Design & Content Rework (1/1 plan) — completed 2026-05-10

</details>

<details>
<summary>✅ v1.1 Password Hint Page (Phase 5) — SHIPPED 2026-05-10</summary>

- [x] Phase 5: Password Hint Page (1/1 plan) — completed 2026-05-10

</details>

<details>
<summary>✅ v1.2 Not Coming (Phase 6) — SHIPPED 2026-06-14</summary>

- [x] Phase 6: Not Coming RSVP Selection (2/2 plans) — completed 2026-06-14

</details>

### ✅ v1.3 Joint Birthday (Phases 7–8 — SHIPPED 2026-06-21)

**Goal:** Adapt the site for a joint 30th birthday celebration — two guest-facing passwords, RSVP records tagged by host, and updated German copy.

- [x] **Phase 7: Dual-Password Auth & RSVP Backend** - Dual-password middleware, host_ref propagation, and D1 migration (completed 2026-06-21)
- [x] **Phase 8: German Content Update** - Update all site copy to reflect joint celebration (completed 2026-06-21)

### ◆ v2.0 Actual Invitation (Phase 9 — Blocked at production gate)

**Milestone Goal:** Turn the authenticated RSVP page into the formal German invitation, collect fresh attendance and group drink preferences, support next-day buffet brunch and job sign-up, and preserve existing RSVP history on the current Cloudflare Pages/Pages Functions, D1, and plain HTML/CSS/JavaScript stack.

- [ ] **Phase 9: Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch** - Deliver the authenticated invitation, fresh RSVP round, reusable drink options, and described next-day brunch/job signup as one coherent guest workflow.

### Phase 9: Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch
**Goal**: Guests can use the authenticated invitation for a fresh attendance response, drink preferences, and next-day buffet brunch and job sign-up, while historical RSVP data remains intact on the current Cloudflare Pages/Pages Functions, D1, and plain HTML/CSS/JavaScript stack.
**Depends on**: Phase 8
**Requirements**: AUTH-09, INV-01, INV-02, INV-03, INV-04, RSVP-09, RSVP-10, DRINK-01, DRINK-02, DRINK-03, DRINK-04, BRUNCH-01, JOB-01, JOB-02, JOB-03, JOB-04, JOB-05
**Success Criteria** (what must be TRUE):
  1. Authenticated guests see the German joint-birthday invitation for 5 December at 17:00, configured venue/map details and park-entry directions; no street address or year is invented, private logistics remain behind authentication, and the optional buffet link appears only when configured.
  2. Guests can submit coming or not-coming responses to a separate fresh-round D1 table; declines have no drink selection, and historical RSVP records remain unchanged.
  3. Coming groups can select multiple fixed or catalogued drink options, submit safely reusable drink suggestions, and see the explanation that preferences are requests, not guarantees.
  4. Coming guests can select one combined “Abbau & Brunch am nächsten Tag” option; there is no separate Brunch option, form, or special headcount, and guests declining the birthday cannot select it.
  5. Guests can select Aufbau, Teilzeit Barkeeper nach Lust und Laune, Jemand der mit der Musikbox verbunden ist, Dinge, “Abbau & Brunch am nächsten Tag”, and “Getränkeeinkauf mit Auto (Freitag oder Samstag)”; each has a longer explanatory German description. Suggestions are shared only when selected in a submitted RSVP.
  6. Job capacity limits are optional per option; Aufbau is capped at 15, capped options stop accepting sign-ups when full, and signing up for Abbau includes buffet brunch.
**Plans**: 4/9 plans complete; Plan 09-05 local verification passed, production gate halted pending expanded local checks and owner authorization (dependency-ordered)

Plans:
**Wave 1**
- [x] 09-01: Add an additive D1 migration for the fresh yes/no RSVP table and a separate drink-options catalog; seed fixed options without changing historical RSVP rows.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 09-02: Add authenticated RSVP and drink-option endpoints, including decline-without-drinks behavior, safe validation, and unique reusable suggestions.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 09-03: Add authenticated invitation personalization for venue/map values, `PARK_ENTRY_DIRECTIONS`, and the optional `BUFFET_LIST_URL`.

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 09-04: Complete the German invitation, accessible fresh RSVP form, multi-select drink control, separate suggestion form, and immediate selector updates.

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 09-06-PLAN.md: Add the additive job catalog and one end-to-end fixed-job allocation path, preserving historical RSVP data.

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 09-07-PLAN.md: Enforce coming-only allocations, atomic capacity reservation, and selected-only drink/job suggestion publication.

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 09-08-PLAN.md: Complete accessible job descriptions, optional attendee counts, staged suggestions, and partial-acceptance confirmation.

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 09-09-PLAN.md: Verify all Phase 09 requirements and edge probes against isolated local Pages/D1, including concurrency and history preservation.

**Wave 9** *(blocked on Wave 8 completion)*
- [ ] 09-05: Re-run all local checks, then preserve the merged-schema, confirmed-target, and explicit owner-authorization production gates.
**UI hint**: yes

### 📋 v3.0 Event Day Experience (Planned)

*To be defined after the invitation milestone is complete.*

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Dual-Password Auth & RSVP Backend | 3/3 | Complete   | 2026-06-21 |
| 8. German Content Update | 1/1 | Complete   | 2026-06-21 |
| 9. Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch | 4/9 | Blocked | - |
