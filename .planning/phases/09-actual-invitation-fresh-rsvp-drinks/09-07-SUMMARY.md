---
phase: 09-actual-invitation-fresh-rsvp-drinks
plan: 07
subsystem: api
tags: [d1, cloudflare-pages, rsvp, jobs, suggestions]

requires:
  - phase: 09-06
    provides: Separate job catalog, RSVP allocations, and capacity-aware signup
provides:
  - Atomic RSVP batches for selected drink/job suggestions and job allocations
  - Non-persistent NFC-normalized drink and job suggestion endpoints
  - Strict job-count validation and accepted-count responses
affects: [09-08, 09-09, suggestions, jobs]

actuals:
  tokens: 8619
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - Publish selected suggestions using targeted unique-key conflicts inside the RSVP batch.
    - Calculate and reserve capped job counts in conditional D1 inserts.

key-files:
  created: []
  modified:
    - functions/api/fresh-rsvp.js
    - functions/api/drink-suggestions.js
    - functions/api/job-options.js
    - tests/phase-9-api.test.mjs

key-decisions:
  - "Keep suggestion POST handlers as normalization-only staging operations; final RSVP submission publishes selected labels."
  - "Use targeted ON CONFLICT clauses for catalog label uniqueness so unrelated database errors still fail the batch."
  - "Give guest-proposed jobs a neutral description because the catalog requires one and the staged contract accepts labels only."

patterns-established:
  - "A selected staged catalog item, its RSVP association, and job allocation are written in one D1 batch."
  - "Job capacity acceptance is derived from the post-batch allocation rows, not a preflight availability read."

requirements-completed: [RSVP-09, RSVP-10, DRINK-02, DRINK-03, BRUNCH-01, JOB-02, JOB-03, JOB-04]

coverage:
  - id: D1
    description: "Coming RSVPs validate each job count independently and reserve capped capacity atomically, returning the accepted count."
    requirement: JOB-03
    verification:
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#reserves job capacity in the RSVP batch and reports only returned accepted counts"
        status: pass
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#rejects malformed, duplicate, unknown, and out-of-range job allocations"
        status: pass
    human_judgment: false
  - id: D2
    description: "Drink and job suggestion endpoints return normalized staged labels without reading or writing catalog data."
    requirement: DRINK-02
    verification:
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#stages a normalized drink suggestion without writing to the catalog"
        status: pass
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#stages normalized job suggestions without writing to the catalog"
        status: pass
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#staged drink and job labels enforce Unicode code-point length limits"
        status: pass
    human_judgment: false
  - id: D3
    description: "Only selected suggestions are published and associated with a successful RSVP; declines and failed batches publish none."
    requirement: JOB-04
    verification:
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#publishes selected drink and job suggestions atomically with the RSVP"
        status: pass
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#does not publish unselected staged suggestions or suggestions attached to a decline"
        status: pass
      - kind: unit
        ref: "tests/phase-9-api.test.mjs#rolls back selected suggestions when the RSVP batch fails"
        status: pass
    human_judgment: false

duration: 3h 44m
completed: 2026-11-15
status: complete
---

# Phase 09 Plan 07: Atomic Staged Suggestions and Job Capacity Summary

**Selected drink/job suggestions, RSVP links, and conditional job allocations now share one atomic D1 batch.**

## Performance

- **Duration:** 3h 44m
- **Started:** 2026-11-15T11:43:13.955Z
- **Completed:** 2026-11-15T15:27:10.609Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Tightened job allocation validation and clamped capacity reservations to nonnegative remaining capacity inside the RSVP batch; responses report the actual accepted count.
- Changed drink and job suggestion POST routes to normalize and stage labels without D1 access.
- Added selected-only suggestion publication, normalized job-key conflict resolution, and drink/job associations to the final RSVP batch.
- Added API tests for Unicode normalization and length limits, coming-only validation, independent allocations, atomic writes, duplicate handling, and failed-batch behavior.

## Task Commits

1. **Task 1 RED: Add job capacity contract coverage** - `9c6f751` (test)
2. **Task 1 GREEN: Enforce atomic job capacity allocations** - `9e7630e` (feat)
3. **Task 2 RED: Add suggestion staging coverage** - `0f7d436` (test)
4. **Task 2 RED: Cover atomic selected suggestion publication** - `d0897df` (test)
5. **Task 2 GREEN: Publish selected suggestions atomically** - `862c42e` (feat)

## Files Created/Modified

- `functions/api/fresh-rsvp.js` - Validates staged suggestions and writes selected catalog rows, RSVP associations, and capacity-limited allocations atomically.
- `functions/api/drink-suggestions.js` - Stages normalized drink labels without persisting or resolving them against the catalog.
- `functions/api/job-options.js` - Adds the non-persistent job-suggestion staging endpoint.
- `tests/phase-9-api.test.mjs` - Covers validation, Unicode code-point bounds, batching, capacity acceptance, staging, duplicates, and failure handling.

## TDD Evidence

- Task 1's target test failed on the missing nonnegative capacity clamp; `check tdd-red-evidence` returned `RED_EVIDENCE_OK`.
- Task 2's staging test failed because the existing endpoint persisted the suggestion, and its atomic-publication test failed because the RSVP endpoint rejected the staged fields; both RED records returned `RED_EVIDENCE_OK`.
- `node --test tests/phase-9-api.test.mjs` passed: 73 tests.

## Decisions Made

- Suggestion POST handlers only normalize and return labels; catalog publication happens only in a successful coming RSVP.
- Targeted `ON CONFLICT(label)` and `ON CONFLICT(normalized_label)` clauses recover only expected uniqueness conflicts.
- Guest-proposed jobs receive a neutral shared description because the catalog schema requires descriptions while staging accepts labels only.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None remaining. Actual local-D1 rollback and concurrency behavior remains assigned to Plan 09-09.

## User Setup Required

None - no remote or production configuration was changed.

## Next Phase Readiness

Plan 09-08 can proceed with the accessible UI and the new `drink_suggestions` / `job_suggestions` payload contract. Plan 09-09 remains responsible for actual isolated local Pages/D1 rollback and concurrency verification. Plan 09-05's production authorization, merged-schema, confirmed-target, and migration-list gates remain unchanged.

---
*Phase: 09-actual-invitation-fresh-rsvp-drinks*
*Completed: 2026-11-15*
