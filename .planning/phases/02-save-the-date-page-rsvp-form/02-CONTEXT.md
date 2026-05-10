# Phase 2: Save-the-Date Page & RSVP Form - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the placeholder `public/index.html` with a German save-the-date page. The page shows the event date (5. Dezember) and a personal message from the host, followed by an RSVP form with three fields: guest name (required), contact method preference (optional dropdown), and total attendee count (required stepper, pre-filled at 1, max 10). Client-side validation shows inline German error messages. No backend wiring in this phase — form submission behaviour (action/method) is left for Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Visual Style & Aesthetic
- **D-01:** Minimal & modern vibe — clean whitespace, neutral palette, understated style.
- **D-02:** Agent-chosen color palette optimised for minimal/modern (no specific color requested — see Agent's Discretion).
- **D-03:** System fonts only (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) — no CDN font requests.
- **D-04:** Single-page layout: save-the-date info block at the top, RSVP form below, one continuous scroll.

### Save-the-Date Content
- **D-05:** Show the date (5. Dezember) only — no time, no location. Full venue details come in v2.0.
- **D-06:** A personal host message appears alongside the date. Exact copy (verbatim):
  > „Moin, Ich werde 30. Aus irgendwelchen Gründen ist das etwas Großes. Also reicht meine Wohnung vermutlich nicht. Daher möchte ich sammeln mit wie vielen ich rechnen muss, um eine Location zu finden. Meine aktuelle Idee ist ein gutes Buffet und anschließend feiern. Ich update die Seite, wenn ich mehr weiß und versuche euch zu informieren. Aber ich verspreche nichts :)."
- **D-07:** An RSVP deadline prompt is shown on the page: "Bitte bis Ende Mai anmelden."

### Contact Method Picker
- **D-08:** Contact method is presented as a `<select>` dropdown with the 7 options: WhatsApp, Telegram, Signal, Discord, Matrix, SMS, Threema.
- **D-09:** Contact handle/username is NOT collected in this phase — only the method preference.
- **D-10:** Contact method selection is **optional** — guests can submit without choosing one.

### Attendee Count (Stepper)
- **D-11:** A stepper (+ / − buttons) controls the **total** number of attendees (not a plus-one delta). Minimum: 1 (the guest themselves). Maximum: 10.
- **D-12:** Field is pre-filled at 1 and is **required** — cannot be cleared to blank.

### Agent's Discretion
- **Color palette:** Agent chooses a neutral, minimal palette (e.g. white or off-white background, charcoal text, a single subtle accent). Should feel clean and contemporary without being stark.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Technical approach (plain HTML/CSS/JS, no framework, no build step), constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: PAGE-01, PAGE-02, PAGE-03, RSVP-01, RSVP-02, RSVP-03, RSVP-04
- `.planning/ROADMAP.md` — Phase 2 success criteria and phase goal

### Existing Code
- `public/index.html` — Current placeholder page (to be replaced entirely in this phase)
- `functions/_middleware.js` — Auth middleware from Phase 1 (read-only — do not modify)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/index.html` — To be replaced. Only structural reference: the page uses `lang="de"`, UTF-8 charset, and a viewport meta tag — all should be preserved.

### Established Patterns
- Plain HTML with inline `<style>` — Phase 1 placeholder uses inline CSS. Phase 2 should use a `<link>` to a separate CSS file for maintainability, or inline styles if the planner judges the page simple enough.
- German throughout — all user-visible text in German (established in Phase 1).

### Integration Points
- Auth Worker (`functions/_middleware.js`) intercepts all requests — the new `index.html` is served only to authenticated users. No changes needed to the Worker.
- Phase 3 will wire the RSVP form to a Worker endpoint — the form's `action` and `method` attributes should be left as stubs or noted as Phase 3 hooks.

</code_context>

<specifics>
## Specific Ideas

- Host message copy is fixed (verbatim text in D-06) — do not paraphrase or translate.
- Stepper: total attendees, not a plus-one offset. Start at 1, max 10.
- RSVP deadline: "Bitte bis Ende Mai anmelden." — show visibly near the form header.
- Dropdown order for contact methods: WhatsApp, Telegram, Signal, Discord, Matrix, SMS, Threema (as listed in REQUIREMENTS.md).

</specifics>

<deferred>
## Deferred Ideas

- **Contact handle collection** — collecting the actual phone number or username was considered but deferred. Could be added in a future phase if the host needs to follow up with guests.
- **Venue / time details on the page** — user chose "date only" for now; full details come in v2.0.

</deferred>

---

*Phase: 2-Save-the-Date Page & RSVP Form*
*Context gathered: 2026-05-10*
