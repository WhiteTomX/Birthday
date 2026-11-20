---
phase: 09-actual-invitation-fresh-rsvp-drinks
plan: 04
subsystem: ui
tags: [html, css, javascript, accessibility, rsvp]

# Dependency graph
requires:
  - phase: 09-03
    provides: Authenticated personalized invitation and private logistics markup
provides:
  - Accessible single-action RSVP form with coming-only headcount and drink choices
  - Separate drink suggestion form with immediate selection of saved options
  - Safe RSVP submission, inline confirmations, and visible request-error recovery
affects: [09-05, rsvp, invitation]

# Actuals
actuals:
  tokens: 10581
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Render catalog and guest-provided content using DOM nodes and textContent, never HTML interpolation.
    - Associate the RSVP submit button with its form while keeping drink suggestions in a separate form.

key-files:
  created:
    - tests/phase-9-ui.test.mjs
    - .planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-04-task-2-red-evidence.json
  modified:
    - public/rsvp/index.html
    - public/script.js
    - public/style.css

key-decisions:
  - "Use radio buttons for attendance and reveal headcount and drink controls only for coming responses."
  - "Keep the separate suggestion form immediately after the selector and auto-select a saved suggestion for the current RSVP."
  - "Use browser DOM APIs and textContent for untrusted drink labels and guest names."

requirements-completed: [AUTH-09, INV-01, INV-02, INV-03, INV-04, RSVP-10, DRINK-01, DRINK-02, DRINK-03, DRINK-04]

coverage:
  - id: D1
    description: "The authenticated invitation has accessible attendance choices, a 1–10 headcount, coming-only drink controls, and a separate suggestion form."
    requirement: RSVP-10
    verification:
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#uses one accessible RSVP form and a separate suggestion form
        status: pass
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#rejects a headcount outside the 1–10 range before submitting
        status: pass
    human_judgment: false
  - id: D2
    description: "Coming and declining responses submit exact branch-specific payloads; saved drinks are safely rendered and selected; success replaces only the RSVP interaction."
    requirement: DRINK-03
    verification:
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#renders drink options as text and submits multiple selected drinks with an auto-selected suggestion
        status: pass
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#submits a decline without headcount or drink fields and shows a personal confirmation
        status: pass
    human_judgment: false
  - id: D3
    description: "Request failures leave the RSVP and suggestion forms usable and report accessible feedback."
    requirement: DRINK-02
    verification:
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#keeps the form usable and reports a useful status after request failures
        status: pass
    human_judgment: false
  - id: D4
    description: "Responsive styling and focus states support the guest-facing form."
    verification:
      - kind: unit
        ref: tests/phase-9-ui.test.mjs#provides visible keyboard focus and responsive form layout styles
        status: pass
    human_judgment: true
    rationale: "Automated checks confirm focus and responsive CSS rules exist, but cannot assess the invitation's visual quality at real viewport sizes."

# Metrics
duration: 5min
completed: 2026-11-14
status: complete
---

# Phase 9 Plan 4: Accessible RSVP and Drink Workflow

**The authenticated invitation now offers accessible coming/declining choices, bounded group size, safe multi-select drinks and suggestions, and branch-specific inline confirmations.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-14T20:18:12Z
- **Completed:** 2026-11-14T20:24:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced attendance buttons with an accessible radio group, a 1–10 headcount, coming-only drink controls, and a separate suggestion form.
- Connected the guest workflow to the fresh RSVP and drink-suggestion APIs; saved suggestions become checked options immediately.
- Added safe DOM rendering, retryable request failures, and inline coming/decline confirmations that leave the invitation visible.
- Added dependency-free markup and interaction tests for payloads, validation, selection, confirmations, and error recovery.

## Task Commits

1. **Task 1: Build accessible invitation and RSVP structure** - `72d79d6` (feat)
2. **Task 2 RED: Cover RSVP interaction behavior** - `23d6068` (test)
3. **Task 2 GREEN: Wire RSVP drinks and confirmations** - `8c8856d` (feat)

## Files Created/Modified

- `public/rsvp/index.html` - Accessible attendance, headcount, drink selector, suggestion form, and submit structure.
- `public/script.js` - Catalog loading, safe option creation, suggestion and RSVP requests, validation, and confirmations.
- `public/style.css` - Responsive attendance-choice styling, numeric input treatment, and accessible focus states.
- `tests/phase-9-ui.test.mjs` - Static markup and dependency-free DOM-harness interaction coverage.
- `09-04-task-2-red-evidence.json` - Validated TDD evidence for suggestion auto-selection.

## Decisions Made

- A coming response submits `{ name, attendance, attendees, drinks }`; a decline submits only `{ name, attendance }`.
- Names and suggestion labels are inserted as text, while failed requests produce explicit, retryable feedback.
- The RSVP submit button is associated with its form so the separate suggestion form remains independent.

## Deviations from Plan

None - followed the plan as specified.

## Issues Encountered

None. The UI tests and the combined Phase 9 API, invitation, and UI test suite passed.

## User Setup Required

None for this plan. Local route and database integration checks remain part of Plan 09-05.

## Next Phase Readiness

Ready for Plan 09-05 local end-to-end verification. Production migration and deployment remain gated by the plan's explicit prerequisites and authorization.

## Self-Check: PASSED

- All five files listed under `key-files` exist.
- The plan has three committed task commits on the current branch.
- `node --experimental-default-type=module --test tests/phase-9-api.test.mjs tests/phase-9-invitation.test.mjs tests/phase-9-ui.test.mjs` passed (67 tests).
- Plan 09-04 RED evidence validated; `git diff --check` passed.

---
*Phase: 09-actual-invitation-fresh-rsvp-drinks*
*Completed: 2026-11-14*
