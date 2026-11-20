---
phase: quick
plan: 261120-qtj
subsystem: ui
tags: [rsvp, css, accessibility]
requires: []
provides:
  - Compact RSVP help-job cards with no redundant uncapped capacity sentence
affects: [Phase 09 RSVP UI]
tech-stack:
  added: []
  patterns:
    - Absolutely positioned count controls with reserved details-column space
key-files:
  created: []
  modified:
    - public/script.js
    - public/style.css
    - tests/phase-9-ui.test.mjs
key-decisions:
  - Keep the capacity status element and its accessibility relationship for uncapped jobs, but leave its text empty.
duration: 6 min
started: 2026-11-20T18:20:50Z
completed: 2026-11-20
status: complete
---

# Quick Task 261120-qtj Summary

**RSVP help-job cards now place Anzahl in the upper-right, reserve text space responsively, tighten capacity spacing, and omit uncapped status copy.**

## Accomplishments

- Removed “Keine feste Begrenzung.” while retaining uncapped-availability validation and the status element referenced by `aria-describedby`.
- Positioned count controls outside normal card flow, reserving room for them at desktop and mobile widths.
- Tightened description-to-capacity spacing; preserved capped/full copy, full-job disabling, focus styles, and input sizing.
- Added focused rendering, accessibility, and stylesheet contract assertions.

## TDD Gate Compliance

- **RED:** `renders job descriptions safely and communicates full, partial, and uncapped availability` failed specifically because uncapped cards still contained “Keine feste Begrenzung.” RED evidence was accepted by `gsd-tools check tdd-red-evidence` (`RED_EVIDENCE_OK`).
- **GREEN:** The target test passed after implementation. No refactor was needed.

## Verification

- Passed: `node --experimental-default-type=module --test --test-name-pattern='renders job descriptions safely and communicates full, partial, and uncapped availability' tests/phase-9-ui.test.mjs`
- The requested full focused suite ran **23 tests: 22 passed, 1 failed**. The pre-existing event-details test expects `<!-- VENUE_DETAILS -->`, absent from the current `public/rsvp/index.html`; it failed the same way before implementation. This unrelated issue is recorded in `261120-qtj-deferred-items.md`.
- Desktop/mobile visual inspection was not performed; the responsive positioning and spacing rules are covered by focused CSS assertions.

## Task Commits

1. **RED test:** `136fd95` — `test(261120-qtj): cover compact job options and uncapped copy`
2. **GREEN implementation:** `5c65f84` — `fix(261120-qtj): compact job cards and omit uncapped status`

Both commits include the `GSD-Task: 261120-qtj` trailer.

## Files Modified

- `public/script.js` — Leaves uncapped capacity status text empty while retaining validation and accessibility references.
- `public/style.css` — Anchors count controls in the upper-right, reserves responsive text space, and reduces status spacing.
- `tests/phase-9-ui.test.mjs` — Covers uncapped copy, capped/full behavior, accessibility relationships, and desktop/mobile layout rules.

## Deviations from Plan

None. The unrelated existing suite failure was left unchanged and recorded as deferred.

## Deferred Issues

- The full UI suite's event-details marker assertion is pre-existing and outside this task's scope.
- Manual desktop/narrow-mobile visual inspection remains outstanding and is recorded as an open `unrun-verify` in `.planning/WINDOWS.md`.

## Self-Check: PASSED

- Summary and plan files exist.
- RED (`136fd95`) and GREEN (`5c65f84`) commits are ancestors of `HEAD`.
- No tracked files were deleted by the task commits.
