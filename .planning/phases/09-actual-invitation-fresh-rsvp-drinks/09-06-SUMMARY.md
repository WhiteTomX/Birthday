---
phase: 09-actual-invitation-fresh-rsvp-drinks
plan: 06
subsystem: api
tags: [d1, cloudflare-pages, rsvp, jobs, accessibility]

requires:
  - phase: 09-04
    provides: Accessible authenticated RSVP form and fresh RSVP API
provides:
  - Separate D1 job catalog with five fixed options and job-specific descriptions
  - Atomic fresh-RSVP job allocations with capped-place acceptance
  - Authenticated job catalog API and accessible capacity-aware controls
affects: [09-07, 09-08, 09-09, jobs, brunch]

actuals:
  tokens: 11394
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - Keep job identity and allocations in a separate catalog from drinks.
    - Reserve capped allocations in the same D1 batch as the fresh RSVP.
    - Render catalog labels and descriptions with DOM text APIs.

key-files:
  created:
    - migrations/0003_job_catalog.sql
    - functions/api/job-options.js
    - tests/phase-9-jobs-e2e.test.mjs
  modified:
    - functions/api/fresh-rsvp.js
    - public/rsvp/index.html
    - public/script.js
    - public/style.css
    - tests/phase-9-api.test.mjs
    - tests/phase-9-ui.test.mjs

key-decisions:
  - "Use the separately confirmed job catalog; keep drink and job records independent."
  - "Only Aufbau is capped, at 15; all other fixed jobs are uncapped."
  - "Keep the brunch and cleanup signup as one combined job; report accepted counts from D1."

requirements-completed: [BRUNCH-01, JOB-01, JOB-02, JOB-03, JOB-05]

coverage:
  - id: D1
    description: "An additive D1 migration seeds the five fixed jobs, their German descriptions, and Aufbau's 15-person cap without changing historical RSVP data."
    requirement: JOB-01
    verification:
      - kind: e2e
        ref: tests/phase-9-jobs-e2e.test.mjs#traces a fixed job allocation through authenticated Pages and isolated local D1
        status: pass
      - kind: integration
        ref: "Isolated local D1 seed audit: five fixed labels, descriptions >=40 Unicode code points, only Aufbau capped at 15"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Abbau & Brunch am nächsten Tag option is a single coming-only choice, and declines cannot persist job assignments."
    requirement: BRUNCH-01
    verification:
      - kind: e2e
        ref: tests/phase-9-jobs-e2e.test.mjs#traces a fixed job allocation through authenticated Pages and isolated local D1
        status: pass
    human_judgment: false
  - id: D3
    description: "Coming RSVPs validate unique known job counts, store allocations atomically, and receive the accepted count for each selected job."
    requirement: JOB-02
    verification:
      - kind: e2e
        ref: tests/phase-9-jobs-e2e.test.mjs#traces a fixed job allocation through authenticated Pages and isolated local D1
        status: pass
      - kind: unit
        ref: tests/phase-9-api.test.mjs#returns fixed jobs before stable suggestions with draft descriptions and current capacity
        status: pass
    human_judgment: false
  - id: D4
    description: "The job catalog reports deterministic ordering and current capped or uncapped availability without exposing RSVP records."
    requirement: JOB-03
    verification:
      - kind: unit
        ref: tests/phase-9-api.test.mjs#returns fixed jobs before stable suggestions with draft descriptions and current capacity
        status: pass
      - kind: e2e
        ref: tests/phase-9-jobs-e2e.test.mjs#traces a fixed job allocation through authenticated Pages and isolated local D1
        status: pass
    human_judgment: false
  - id: D5
    description: "Coming guests can read safe job descriptions, see full/partial/uncapped availability, and enter an attendee count for each job."
    requirement: JOB-05
    verification:
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#renders job descriptions safely and communicates full, partial, and uncapped availability
        status: pass
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#submits job attendee counts and confirms the server-accepted partial count
        status: pass
    human_judgment: true
    rationale: Automated DOM and CSS checks do not assess the live layout's visual quality at real viewport sizes.

duration: 1h 1m
completed: 2026-11-15
status: complete
---

# Phase 9 Plan 6: Separate Job Catalog and RSVP Signup Summary

**A separate D1 job catalog now supports atomic RSVP allocations, the 15-place Aufbau limit, and accessible descriptions with current capacity states.**

## Performance

- **Duration:** 1h 1m
- **Started:** 2026-11-15T10:40:43.277Z
- **Completed:** 2026-11-15T11:41:48.418Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added migration 0003 with five fixed jobs, German descriptions, one capped job, and coming-only allocation guards; historical RSVP rows remain unchanged.
- Extended fresh RSVP persistence to validate selected jobs, write assignments in the RSVP batch, and return requested versus accepted counts.
- Added the authenticated job catalog endpoint and accessible per-job count controls with safe descriptions and full, partial, and uncapped availability.
- Added a local Pages/D1 tracer plus API and UI coverage for validation, ordering, descriptions, availability, and partial acceptance.

## Task Commits

1. **Task 1 RED: Trace a fixed job allocation from the invitation to local D1** - `b246408` (test)
2. **Task 1 GREEN: Implement the fixed job allocation path** - `d4da50c` (feat)
3. **Task 2 RED: Cover job descriptions and capacity states** - `8ba7029` (test)
4. **Task 2 GREEN: Expose capacity states in the RSVP UI** - `868f5e5` (feat)

## Files Created/Modified

- `migrations/0003_job_catalog.sql` - Separate job options and allocation tables, guards, index, and five fixed seeds.
- `functions/api/fresh-rsvp.js` - Optional job validation, capacity-aware batch inserts, and accepted-count response.
- `functions/api/job-options.js` - Authenticated catalog and availability response in deterministic order.
- `public/rsvp/index.html` - Coming-only job controls within the RSVP form.
- `public/script.js` - Safe description rendering, job counts, availability states, and RSVP payload wiring.
- `public/style.css` - Responsive job cards and capacity/status styling using existing design tokens.
- `tests/phase-9-jobs-e2e.test.mjs` - Isolated local Pages/D1 tracer and historical-row check.
- `tests/phase-9-api.test.mjs` - Job catalog ordering, description, capacity, and error-response assertions.
- `tests/phase-9-ui.test.mjs` - Safe description rendering, accessibility, capacity states, and partial-acceptance confirmation.

## Decisions Made

- Used the separately confirmed `job_options` catalog rather than generalizing the drink catalog.
- Kept Aufbau capped at 15 and left all other fixed jobs uncapped.
- Preserved one combined “Abbau & Brunch am nächsten Tag” option and server-authoritative partial capacity acceptance.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None remaining. The local Pages/D1 tracer and the catalog/UI test suite passed after implementation.

## User Setup Required

None. Only isolated local D1 was used; no remote migration or production action was run.

## Next Phase Readiness

Plan 09-07 can proceed with selected-only suggestion publication and capacity edge cases. The production authorization, merged-schema, confirmed-target, and migration-list gates remain unchanged.

## Self-Check: PASSED

- `node --test tests/phase-9-jobs-e2e.test.mjs tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs` passed (53 tests).
- An isolated local D1 audit confirmed exactly five fixed labels, all descriptions exceed 40 Unicode code points, and only Aufbau has capacity 15.
- Both TDD RED evidence checks returned `RED_EVIDENCE_OK`; task GREEN checks passed.
- No remote command ran; `git diff --check` passed.

---
*Phase: 09-actual-invitation-fresh-rsvp-drinks*
*Completed: 2026-11-15*
