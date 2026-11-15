---
phase: 09-actual-invitation-fresh-rsvp-drinks
plan: 08
subsystem: ui
tags: [rsvp-ui, vanilla-js, accessibility, jobs, suggestions]

requires:
  - phase: 09-07
    provides: Coming-only job allocation enforcement, staged suggestion payloads, and server-accepted allocation counts
provides:
  - Accessible fixed-job controls with optional independent per-job attendee counts
  - Locally staged job suggestions submitted only with selected RSVP allocations
  - Confirmation of accepted and unassigned job counts
affects: [09-09, RSVP UI, jobs, drink suggestions]

actuals:
  tokens: 10829
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - Keep suggested options local until selected in a successful RSVP.
    - Use canonical server-accepted counts for allocation confirmations.

key-files:
  created: []
  modified:
    - public/rsvp/index.html
    - public/script.js
    - public/style.css
    - tests/phase-9-ui.test.mjs

key-decisions: []

patterns-established:
  - "Optional job counts are validated independently; combined assignments may exceed party headcount."
  - "Staged job and drink suggestions are sent only when selected in the final coming RSVP."

requirements-completed: [BRUNCH-01, JOB-01, JOB-02, JOB-03, JOB-04, JOB-05]

coverage:
  - id: D1
    description: "Coming guests see the six fixed jobs, their descriptions and capacity state, with independent optional counts; declines cannot use job controls."
    requirement: JOB-01
    verification:
      - kind: unit
        ref: "node --test tests/phase-9-ui.test.mjs (22 tests)"
        status: pass
    human_judgment: true
    rationale: "The Node UI suite verifies structure and behavior but does not render the responsive interface in a real browser."
  - id: D2
    description: "Job suggestions are safely staged, deduplicated, and submitted only when selected with a positive allocation."
    requirement: JOB-04
    verification:
      - kind: unit
        ref: "node --test tests/phase-9-ui.test.mjs (22 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "RSVP confirmation reports the server-accepted job counts and any unassigned remainder."
    requirement: JOB-03
    verification:
      - kind: unit
        ref: "node --test tests/phase-9-ui.test.mjs (22 tests)"
        status: pass
    human_judgment: false

duration: 14 min
completed: 2026-11-15
status: complete
---

# Phase 09 Plan 08: Accessible Job Allocation UI Summary

**Coming guests can optionally allocate attendees to described jobs, stage new options, and see the actual accepted counts.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-15T16:39:50+01:00
- **Completed:** 2026-11-15T16:53:45+01:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added the fixed job catalog with longer descriptions, capacity states, blank optional counts, and independent count validation.
- Gated job and suggestion controls when the guest declines, while allowing combined allocations greater than the group size.
- Added safely rendered, locally staged job suggestions and aligned drink suggestions with the selected-only payload contract.
- Reported requested, accepted, and unassigned counts using the server response, including partial capacity outcomes.

## Task Commits

1. **Task 1 RED: Add failing tests for optional job controls** - `ea91483` (test)
2. **Task 1 GREEN: Add accessible optional job assignments** - `f68c9c7` (feat)
3. **Task 2 RED: Add failing tests for staged job suggestions** - `e589a6b` (test)
4. **Task 2 GREEN: Stage job suggestions in RSVP UI** - `8dc4dee` (feat)

## Files Created/Modified

- `public/rsvp/index.html` - Added the job allocation section and separate job-suggestion form.
- `public/script.js` - Added optional counts, decline gating, local suggestion staging, payload selection, and accepted-count confirmation.
- `public/style.css` - Styled the job-suggestion form and responsive allocation controls.
- `tests/phase-9-ui.test.mjs` - Covered job counts, fixed choices, capacity, declines, suggestions, Unicode limits, safe text, and accepted counts.

## TDD Evidence

- Task 1's blank-count and decline RED reports were classified `RED_EVIDENCE_OK`.
- All seven Task 2 RED reports for markup safety, drink/job staging, Unicode limits, decline gating, and full/partial confirmations were classified `RED_EVIDENCE_OK`.
- `node --test tests/phase-9-ui.test.mjs` passed (22 tests); `node --test tests/phase-9-api.test.mjs` passed (73 tests).
- `node --check public/script.js` and `git diff --check` passed.

## Decisions Made

None - followed the plan and the Plan 09-07 staging API contract.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration was changed.

## Next Phase Readiness

Plan 09-09 is ready to verify the complete flow against isolated local Pages/D1, including rollback, concurrency, and history preservation. Plan 09-05 remains halted; production actions still require its merged-schema, confirmed-target, migration-list, and explicit owner-authorization gates.

---
*Phase: 09-actual-invitation-fresh-rsvp-drinks*
*Completed: 2026-11-15*
