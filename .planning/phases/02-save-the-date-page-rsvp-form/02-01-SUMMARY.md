---
phase: 02-save-the-date-page-rsvp-form
plan: 01
subsystem: frontend
tags: [html, css, javascript, rsvp-form, german, responsive]

requires:
  - phase: 01-infrastructure-auth/plan-01
    provides: functions/_middleware.js Basic Auth middleware (all pages protected)

provides:
  - German save-the-date page with event date (5. Dezember) and host message
  - RSVP form with name input, 7-option contact dropdown, attendee stepper
  - Client-side validation with inline German error messages
  - Responsive single-column layout (mobile <600px + desktop ≥600px)

affects: [03-rsvp-backend]

tech-stack:
  added: []
  patterns:
    - Stepper pattern with btn-less/btn-more + count display + hidden input
    - Inline validation with dynamically-created error <p> element
    - event.preventDefault() + fetch-ready form (backend wired in Phase 3)

key-files:
  created: []
  modified:
    - public/index.html
    - public/style.css
    - public/script.js

key-decisions:
  - "Stepper min=1, max=10 — 1 means 'just me', reflects total people attending"
  - "Inline German error 'Bitte gib deinen Namen ein.' — no alert(), no page reload"
  - "Form action='#' method='get' — Phase 3 will update to real endpoint (left as TODO comment)"
  - "7 contact options in <select>: WhatsApp, Telegram, Signal, Discord, Matrix, SMS, Threema"

patterns-established:
  - "Stepper pattern: btn-less/btn-more buttons + count span + hidden #attendees input"
  - "Inline validation: dynamically-create <p id='name-error'> below field, remove on re-submit"

requirements-completed:
  - PAGE-01
  - PAGE-02
  - PAGE-03
  - RSVP-01
  - RSVP-02
  - RSVP-03
  - RSVP-04

duration: ~30min
completed: 2026-05-10
---

# Phase 2: Save-the-Date Page & RSVP Form — Plan 01 Summary

**German save-the-date page with event date, host message, and fully functional RSVP form UI (frontend only)**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-05-10
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Replaced placeholder `public/index.html` with full German save-the-date page
- Event date `5. Dezember` prominently displayed as `<h1>` heading
- Host message "Moin, Ich werde 30…" and deadline "Bitte bis Ende Mai anmelden." visible on page
- RSVP form with three fields: name (`<input type="text" id="name">`), contact method (`<select id="contact">` with 7 options), attendee count (stepper with btn-less/btn-more, min=1, max=10)
- Client-side validation: submitting with empty name field shows inline "Bitte gib deinen Namen ein." error — form does not navigate
- Page layout centred single-column, responsive via `@media (max-width: 599px)` breakpoint
- All UI text in German (`lang="de"`, labels, error messages, buttons)

## Task Commits

1. **Replace placeholder with German save-the-date and RSVP form** - `feat(02-01): German save-the-date page + RSVP form UI`

## Files Created/Modified

- `public/index.html` — Full page: save-the-date section (date, host message, deadline) + RSVP form (name input, contact select, stepper, submit button)
- `public/style.css` — Design system: palette, typography, layout, form component styles, stepper component, responsive breakpoint
- `public/script.js` — Stepper interaction (btn-less/btn-more click handlers, count display, hidden input sync) + client-side validation (empty name detection, inline error display)

## Decisions Made

- **Stepper min=1 not 0:** "Anzahl der Personen" means total people attending; 1 = just the guest themselves. RSVP-03 says "including zero" plus-ones — this is a minor spec ambiguity (plus-ones vs total people) documented as tech debt.
- **Form action='#' method='get':** Phase 3 replaces with real endpoint. A TODO comment was left in the HTML (later noted as WARNING-01 in the audit — functionally inert, event.preventDefault() is unconditional).
- **Contact method not required:** Select defaults to first option (WhatsApp) — guests always have a value.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

None.

## User Setup Required

None — pure frontend, no external services.

## Next Phase Readiness

- Frontend UI complete and committed to main
- Phase 3 (RSVP Backend) can begin: Wire `public/script.js` to a Worker endpoint at `/api/rsvp`
- No blockers

---
*Phase: 02-save-the-date-page-rsvp-form*
*Completed: 2026-05-10*
