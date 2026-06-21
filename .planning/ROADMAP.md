# Roadmap: Birthday Website

## Milestones

- ✅ **v1.0 RSVP Site** — Phases 1–4 (shipped 2026-05-10) · [Archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Password Hint Page** — Phase 5 (shipped 2026-05-10) · [Archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Not Coming** — Phase 6 (shipped 2026-06-14)
- ◆ **v1.3 Joint Birthday** — Phases 7–8 (in progress)
- 📋 **v2.0 Full Invitation** — Phases 9+ (planned)

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

### ◆ v1.3 Joint Birthday (Phases 7–8 — In Progress)

**Goal:** Adapt the site for a joint 30th birthday celebration — two guest-facing passwords, RSVP records tagged by host, and updated German copy.

- [ ] **Phase 7: Dual-Password Auth & RSVP Backend** - Dual-password middleware, host_ref propagation, and D1 migration
- [ ] **Phase 8: German Content Update** - Update all site copy to reflect joint celebration

### Phase 7: Dual-Password Auth & RSVP Backend

**Goal**: Guests from either host's circle can access the site, and every RSVP is tagged with which host they belong to
**Depends on**: Phase 6
**Requirements**: AUTH-07, AUTH-08, RSVP-07, RSVP-08
**Success Criteria** (what must be TRUE):

  1. A guest using `SITE_PASSWORD__0` can reach `/rsvp/` and is granted access
  2. A guest using `SITE_PASSWORD__1` can reach `/rsvp/` and is granted access
  3. A submitted RSVP record in D1 contains a `host_ref` column with value `0` or `1` matching which password was used — the password itself is never stored
  4. Requests with an invalid or absent password are still rejected with 401

**Plans**: 3 plans (2 waves)
**Wave 1**

- [x] 07-01-PLAN.md — D1 migration infrastructure + add host_ref column [Wave 1]
- [x] 07-02-PLAN.md — Dual-password auth middleware + X-Host-Ref injection [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 07-03-PLAN.md — RSVP API reads/validates X-Host-Ref and stores host_ref [Wave 2]

### Phase 8: German Content Update

**Goal**: All visible site text reflects a shared celebration by two hosts, in German
**Depends on**: Phase 7
**Requirements**: CONT-01
**Success Criteria** (what must be TRUE):

  1. The hint page riddle refers to both hosts and a joint celebration (no single-host phrasing)
  2. The save-the-date copy on `/rsvp/` reads as a joint birthday invitation in German
  3. All other user-visible strings (labels, confirmations, decline page) are consistent with the joint-birthday framing

**Plans**: 1 plan (1 wave)
**Wave 1**

- [ ] 08-01-PLAN.md — Update hint page riddle, 401 inline riddle, and save-the-date body copy [Wave 1]

### 📋 v2.0 Full Invitation (Planned)

*To be defined when venue is confirmed.*

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Dual-Password Auth & RSVP Backend | 2/3 | In Progress|  |
| 8. German Content Update | 0/1 | Not started | - |
