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

### ◆ v2.0 Actual Invitation (Phase 9 — Planned)

**Milestone Goal:** Turn the authenticated RSVP page into the formal German invitation, collect a fresh attendance confirmation and group drink preferences, and preserve the existing RSVP history on the current Cloudflare Pages/Pages Functions, D1, and plain HTML/CSS/JavaScript stack.

- [ ] **Phase 9: Actual Invitation, Fresh RSVP & Drinks** - Deliver the authenticated invitation, fresh RSVP round, and reusable drink-option catalog as one coherent guest workflow.

### Phase 9: Actual Invitation, Fresh RSVP & Drinks
**Goal**: Guests can read the complete invitation and submit a fresh attendance response with group drink preferences, while existing RSVP data remains intact on the current Cloudflare Pages/Pages Functions, D1, and plain HTML/CSS/JavaScript stack.
**Depends on**: Phase 8
**Requirements**: AUTH-09, INV-01, INV-02, INV-03, INV-04, RSVP-09, RSVP-10, DRINK-01, DRINK-02, DRINK-03, DRINK-04
**Success Criteria** (what must be TRUE):
  1. Authenticated guests see a natural German joint-birthday invitation for 5 December at 17:00, the configured venue name and map link, and park-entry directions from `PARK_ENTRY_DIRECTIONS`; no street address or year is invented.
  2. Venue, arrival, buffet, and RSVP details remain behind the existing authentication; the public page reveals none of these private logistics, and the optional link from `BUFFET_LIST_URL` appears only when configured.
  3. Guests can submit either a coming or not-coming confirmation to a separate fresh-round D1 table; declines have no drink selection, and all historical RSVP rows remain unchanged after the additive migration.
  4. A coming group can select multiple fixed drinks (Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, alkoholfreies Bier) or catalogued suggestions, while a separate suggestion form lets guests submit a drink that is safely displayed and selectable immediately and by later respondents.
  5. The drink form offers no “Keine Präferenz” choice and clearly explains that drink preferences are requests, not guarantees.
**Plans**: 2/5 plans executed (dependency-ordered)

Plans:
**Wave 1**
- [x] 09-01: Add an additive D1 migration for the fresh yes/no RSVP table and a separate drink-options catalog; seed fixed options without changing historical RSVP rows.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 09-02: Add authenticated RSVP and drink-option endpoints, including decline-without-drinks behavior, safe validation, and unique reusable suggestions.

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 09-03: Add authenticated invitation personalization for venue/map values, `PARK_ENTRY_DIRECTIONS`, and the optional `BUFFET_LIST_URL`.

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 09-04: Complete the German invitation, accessible fresh RSVP form, multi-select drink control, separate suggestion form, and immediate selector updates.

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 09-05: Verify public/authenticated behavior, both host credentials, populated and clean D1 migration outcomes, yes/no submissions, and drink suggestion reuse; apply the migration to the intended production database.
**UI hint**: yes

### 📋 v3.0 Event Day Experience (Planned)

*To be defined after the invitation milestone is complete.*

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Dual-Password Auth & RSVP Backend | 3/3 | Complete   | 2026-06-21 |
| 8. German Content Update | 1/1 | Complete   | 2026-06-21 |
| 9. Actual Invitation, Fresh RSVP & Drinks | 2/5 | In Progress | - |
