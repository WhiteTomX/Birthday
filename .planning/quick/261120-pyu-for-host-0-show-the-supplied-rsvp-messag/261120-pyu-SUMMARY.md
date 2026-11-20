---
phase: quick
plan: 261120-pyu
subsystem: ui
tags: [rsvp, host-personalization, html, node-test]
requires: []
provides:
  - "Host-0-only RSVP birthday notice gated by a strict UTC date."
  - "Optional Live-Standort link validated as credential-free HTTPS."
affects: [rsvp]
tech-stack:
  added: []
  patterns:
    - "Replace a dedicated HTML marker with escaped, conditional server-rendered markup."
key-files:
  created: []
  modified:
    - functions/rsvp/index.js
    - public/rsvp/index.html
    - tests/phase-9-invitation.test.mjs
key-decisions:
  - "Use the middleware-provided X-Host-Ref value exactly; absent or nonzero identity never receives the notice."
  - "Parse and round-trip strict YYYY-MM-DD values before date comparison or formatting."
  - "Keep the notice visible but unlinked when the optional location URL is absent or unsafe."
requirements-completed: []
duration: 7min
started: 2026-11-20T17:48:17Z
completed: 2026-11-20T17:55:04Z
status: complete
---

# Quick Task 261120-pyu Summary

**Host 0 receives the supplied birthday notice only from the configured UTC date onward, with an optional validated Live-Standort link.**

## Accomplishments

- Added the dedicated notice marker and rendered the exact supplied German copy with a `de-DE` UTC date.
- Restricted rendering to `X-Host-Ref: 0`; invalid dates and missing identity fail closed.
- Escaped the optional HTTPS URL and linked only “Live-Standort.”
- Added response-level tests for date boundaries, isolation, URL validation, response headers, and marker removal.
- Updated stale buffet-link and invitation-layout assertions to match the current RSVP template.
- Added the user-provided local settings to ignored `.dev.vars`; no production configuration was changed.

## Task Commits

1. **RED tests** - `8e78a0c` (`test(261120-pyu): add host 0 birthday notice regression coverage`)
2. **GREEN implementation** - `0106430` (`feat(261120-pyu): show host 0 birthday RSVP notice`)
3. **Template-aligned tests** - `0583ce1` (`test(261120-pyu): align invitation tests with current template`)

## Validation

- RED evidence: `RED_EVIDENCE_OK`; the target test failed specifically because the notice was absent.
- Passed: `node --experimental-default-type=module --test --test-name-pattern="host 0 birthday|Live-Standort" tests/phase-9-invitation.test.mjs` — 16 passed.
- Passed: `node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs` — 35 passed.

## Deviations from Plan

**1. [Rule 3 - Blocking issue] Guard nullable existing map and buffet URL parses**
- **Found during:** Task 1 verification.
- **Issue:** Existing renderer code dereferenced `.href` when the shared HTTPS validator returned `null`, causing response errors for missing or unsafe configured URLs.
- **Fix:** Omit the corresponding existing links unless validation succeeds.
- **Files modified:** `functions/rsvp/index.js`
- **Verification:** The focused run reached the two stale template-expectation failures instead of crashing on invalid/missing URL inputs.

## TDD Gate Compliance

- RED: `8e78a0c`; machine-validated intentional assertion failure.
- GREEN: `0106430`; all host-0 notice tests pass.
- The full invitation test file passes after aligning the stale expectations with the current template.

## User Setup Required

None.
