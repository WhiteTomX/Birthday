---
phase: 09-actual-invitation-fresh-rsvp-drinks
plan: 03
subsystem: auth
tags: [cloudflare-pages, html, invitation, environment]

# Dependency graph
requires:
  - phase: 09-02
    provides: Fresh RSVP endpoints and drink catalog foundation
provides:
  - Authenticated invitation personalization from environment-backed event logistics
  - Integrated invitation markup with optional buffet callout
  - Regression coverage for escaping, safe URLs, and public-root privacy
affects: [09-04, 09-05, invitation, auth]

# Actuals
actuals:
  tokens: 7097
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Validate environment-provided links as absolute HTTPS URLs without credentials, then escape text and attributes.
    - Keep private logistics in the authenticated invitation template and return personalized HTML with no-store caching.

key-files:
  created:
    - .planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-03-task-1-red-evidence.json
    - .planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-03-task-2-red-evidence.json
  modified:
    - functions/rsvp/index.js
    - public/rsvp/index.html
    - tests/phase-9-invitation.test.mjs

key-decisions:
  - "Accept map and buffet links only as absolute HTTPS URLs with hostnames and no embedded credentials."
  - "Place venue and arrival information in the invitation copy, with the optional buffet link as a separate callout."

requirements-completed: [AUTH-09, INV-01, INV-02, INV-03, INV-04]

coverage:
  - id: D1
    description: "Authenticated invitation logistics render safely, with the optional buffet callout omitted unless a valid URL is configured."
    requirement: INV-02
    verification:
      - kind: unit
        ref: tests/phase-9-invitation.test.mjs#renders configured invitation logistics as escaped text and a safe HTTPS map link
        status: pass
      - kind: unit
        ref: tests/phase-9-invitation.test.mjs#renders only a valid absolute HTTPS buffet URL without credentials
        status: pass
    human_judgment: false
  - id: D2
    description: "Venue, directions, and buffet insertion points are kept in the integrated invitation, while the public root has no private logistics and the date has no invented year or address."
    requirement: AUTH-09
    verification:
      - kind: unit
        ref: tests/phase-9-invitation.test.mjs#keeps venue and arrival details in the integrated invitation flow
        status: pass
      - kind: unit
        ref: tests/phase-9-invitation.test.mjs#keeps private logistics out of the public root and the date free of an invented year
        status: pass
    human_judgment: true
    rationale: "Static privacy assertions do not exercise the live Basic Auth boundary; authenticated route checks are reserved for Plan 09-05."
  - id: D3
    description: "The invitation presents 5 December at 17:00 without a year or fabricated street address."
    requirement: INV-01
    verification:
      - kind: unit
        ref: tests/phase-9-invitation.test.mjs#keeps private logistics out of the public root and the date free of an invented year
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-11-14
status: complete
---

# Phase 9 Plan 3: Authenticated Invitation Personalization

**Environment-backed venue, map, park-entry, and optional buffet details now appear in an integrated authenticated invitation, with unsafe links omitted and no invented address or year.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-14T20:08:25Z
- **Completed:** 2026-11-14T20:13:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added HTTPS-only URL validation and HTML escaping for configured venue, map, park-entry directions, and buffet values; personalized responses retain `Cache-Control: no-store`.
- Integrated venue and park-entry details into the invitation flow and kept the optional buffet contribution as a distinct callout.
- Added regression tests for safe personalization, private-root separation, invitation structure, and the 5 December at 17:00 date without a year or fabricated address.

## Task Commits

1. **Task 1 RED: Add failing invitation personalization tests** - `194b274` (test)
2. **Task 1 GREEN: Validate authenticated invitation URLs** - `ea41159` (feat)
3. **Task 2 RED: Verify integrated invitation structure** - `0a10d51` (test)
4. **Task 2 GREEN: Integrate private logistics into invitation** - `137dbeb` (feat)

## Files Created/Modified

- `functions/rsvp/index.js` - Validates and safely inserts environment-backed logistics into authenticated HTML.
- `public/rsvp/index.html` - Places venue, directions, and buffet insertion points in the invitation flow.
- `tests/phase-9-invitation.test.mjs` - Covers personalization safety, structure, and public-root privacy.
- `09-03-task-1-red-evidence.json` and `09-03-task-2-red-evidence.json` - Record validated failing tests for the two implementation tasks.

## Decisions Made

- Only absolute HTTPS URLs with a hostname and no username/password are eligible for map or buffet links.
- Missing or invalid optional values render no active link or callout; no fallback logistics are invented.
- The buffet insertion remains visually distinct while venue and arrival details flow with the invitation copy.

## Deviations from Plan

None. Task 2 assertions were also run test-first and their RED evidence was validated and committed.

## Issues Encountered

None. The personalization and markup suite passed all 19 tests.

## User Setup Required

None for this plan. Production environment requirements and migration gates remain part of Plan 09-05.

## Next Phase Readiness

Ready for Plan 09-04 to complete the guest form and styling. Live verification of the Basic Auth boundary remains for Plan 09-05.

## Self-Check: PASSED

- All five files listed under `key-files` exist.
- The plan has four committed task commits on the current branch.
- `node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs` passed (19 tests).
- `git diff --check` passed.

---
*Phase: 09-actual-invitation-fresh-rsvp-drinks*
*Completed: 2026-11-14*
