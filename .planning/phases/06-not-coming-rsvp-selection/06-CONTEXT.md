# Phase 6: Not Coming RSVP Selection - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add "not coming" capability to the existing RSVP form at `/rsvp/`. Two radio buttons appear at the top of the form — "Ich komme" and "Ich komme leider nicht". Selecting "not coming" hides all fields except name and changes the submit button to "Abmelden". A new `/api/not-coming` endpoint handles decline submissions, storing them in the existing `rsvps` table with `attendees = 0`. On success, the form section is replaced with a warm personal German confirmation message. The existing `/api/rsvp` endpoint and schema are not modified.

</domain>

<decisions>
## Implementation Decisions

### Selection UX
- **D-01:** Two radio buttons at the top of the existing RSVP form — "Ich komme" and "Ich komme leider nicht". Default (pre-selected): "Ich komme" — no UX change for guests who are coming.
- **D-02:** When "Ich komme leider nicht" is selected: hide ALL fields except the name field (attendee stepper and contact method dropdown both hidden).
- **D-03:** The submit button label changes dynamically — "Anmelden" when "Ich komme" is selected, "Abmelden" when "Ich komme leider nicht" is selected.

### Not-Coming Path
- **D-04:** Name is required for "not coming" submissions — same as the attending path. The host needs to know who declined, not just that someone did.
- **D-05:** After a successful decline, the form section is replaced with a warm personal message using the guest's name (e.g., "Schade, [Name]! Wir werden dich vermissen."). Same DOM-replacement pattern as the attending confirmation — `section.innerHTML = ''` + `section.appendChild(p)`. `textContent` only — never `innerHTML` for user-supplied name.

### Backend / Storage
- **D-06:** No schema migration. "Not coming" records go into the existing `rsvps` table with `attendees = 0`. Query in D1 dashboard: `SELECT * FROM rsvps WHERE attendees = 0` (not coming) vs `SELECT * FROM rsvps WHERE attendees > 0` (attending).
- **D-07:** New Cloudflare Pages Function: `functions/api/not-coming.js` → auto-routes to `/api/not-coming`. The existing `/api/rsvp` endpoint is NOT modified (its `attendees >= 1` validation stays intact).
- **D-08:** The `/api/not-coming` endpoint accepts `{ name }` (just name — no contact method, no attendees). Stores: `id = crypto.randomUUID()`, `name = name.trim()`, `contact_method = null`, `attendees = 0`, `submitted_at = new Date().toISOString()`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Technical approach (plain HTML/CSS/JS, no framework, no build step), all-German UI, Cloudflare stack, key decisions
- `.planning/ROADMAP.md` — Phase 6 goal and milestone context

### Existing Code to Modify
- `public/rsvp/index.html` — RSVP form to extend: add radio buttons, wire field visibility logic (form action stays at `#`, fetch handles submission)
- `public/script.js` — JS to extend: radio change handlers, dynamic field show/hide, dynamic button label, route submission to `/api/rsvp` vs `/api/not-coming` based on selection

### Existing Code — Read-Only Reference
- `functions/api/rsvp.js` — Existing RSVP Worker; read for implementation pattern (request parsing, validation, D1 insert, response format). DO NOT modify.
- `functions/_middleware.js` — Auth middleware; new endpoint at `/api/not-coming` inherits auth automatically. DO NOT modify.
- `schema.sql` — Current schema; no migration needed (`attendees = 0` convention requires no ALTER TABLE)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `script.js` fetch + error handling pattern (lines 97–125): directly reusable for the "not coming" submission — same disable-button, fetch, handle-response structure
- `script.js` success DOM-replacement pattern: `section.innerHTML = ''` + `createElement('p')` + `textContent` — apply identically for decline confirmation
- `functions/api/rsvp.js` Worker structure: `onRequestPost`, `request.json()`, D1 `prepare().bind().run()`, `Response.json()` — blueprint for `not-coming.js`

### Established Patterns
- All user-facing strings in German
- `textContent` (never `innerHTML`) for user-supplied name in DOM — XSS prevention established in Phase 3
- Fetch-based form submission with no page navigation; form section replaced with confirmation on success
- `crypto.randomUUID()` for IDs (native Workers global, no import)
- ISO 8601 string for timestamps (`new Date().toISOString()`)

### Integration Points
- `functions/api/not-coming.js` auto-routes to `/api/not-coming` via Cloudflare Pages Functions routing (same mechanism as `functions/api/rsvp.js` → `/api/rsvp`)
- Auth middleware covers all routes including `/api/not-coming` — no auth changes needed
- Frontend `script.js` routes fetch to either `/api/rsvp` or `/api/not-coming` based on the radio selection

</code_context>

<specifics>
## Specific Ideas

- **Radio labels (exact):** "Ich komme" / "Ich komme leider nicht"
- **Submit button labels:** "Anmelden" (coming, unchanged) / "Abmelden" (not coming — symmetrical pair)
- **Decline confirmation tone:** Warm and personal, using guest's name. Exact copy TBD by planner, but the pattern is "Schade, [Name]! Wir werden dich vermissen." — fits the festive, personal tone of the existing site.
- **Default radio state:** "Ich komme" pre-selected on page load — guests who are attending see zero UX change.
- **D1 query pattern for host:** `SELECT * FROM rsvps WHERE attendees = 0` → declines; `SELECT * FROM rsvps WHERE attendees > 0` → attendees.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-not-coming-rsvp-selection*
*Context gathered: 2026-06-14*
