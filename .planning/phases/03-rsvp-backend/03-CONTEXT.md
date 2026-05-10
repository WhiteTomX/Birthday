# Phase 3: RSVP Backend - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the existing RSVP form to a new Cloudflare Pages Function (`functions/api/rsvp.js`) that receives JSON submissions, stores each one as a unique record in a Cloudflare D1 database, and returns a JSON response. On success, the frontend replaces the form with a personalised German confirmation. On failure, an error message appears inline and the form re-enables for retry. No page navigation occurs — the entire flow is handled client-side via `fetch()`.

</domain>

<decisions>
## Implementation Decisions

### Submission Mechanism
- **D-01:** Form submits via `fetch()` (AJAX) — not a native form POST. The page never navigates away or refreshes.
- **D-02:** Request body is JSON (`Content-Type: application/json`) — `{ "name": "...", "contact": "...", "attendees": 2 }`.
- **D-03:** While the request is in-flight, the submit button is disabled and a spinner/loading indicator is shown to prevent double-submission and give the guest feedback.

### Confirmation Display
- **D-04:** On success, the RSVP form section is **replaced** with a success message — the form is removed from the DOM so the guest cannot re-submit accidentally.
- **D-05:** The success message is personalised with the guest's name: `"Danke, [Name]! Deine Anmeldung wurde gespeichert."` The name is taken from the submitted form value.

### Error Handling
- **D-06:** On Worker error (network failure, 5xx, non-OK response), a German error message appears inline (e.g. `"Etwas ist schiefgelaufen. Bitte versuche es noch einmal."`).
- **D-07:** After an error, the submit button is re-enabled and the form remains fully interactive — the guest can correct and retry without reloading the page.

### D1 Schema
- **D-08:** Minimal schema — one table `rsvps` with columns: `id` (TEXT PRIMARY KEY), `name` (TEXT NOT NULL), `contact_method` (TEXT), `attendees` (INTEGER NOT NULL), `submitted_at` (TEXT NOT NULL — ISO 8601 timestamp).
- **D-09:** `id` is generated with `crypto.randomUUID()` — available natively in the Cloudflare Workers runtime, no external dependencies.
- **D-10:** `contact_method` is nullable — contact selection is optional (from Phase 2 D-10).
- **D-11:** Every submission creates a new row regardless of name — no upsert, no deduplication (from PROJECT.md: "No overwrites").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Technical approach (plain HTML/CSS/JS, no framework, no build step), constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: RSVP-05, RSVP-06, RSVP-07
- `.planning/ROADMAP.md` — Phase 3 success criteria and phase goal

### Prior Phase Context
- `.planning/phases/02-save-the-date-page-rsvp-form/02-CONTEXT.md` — Form field spec (D-08 to D-12), field names, validation rules; required reading before touching `script.js`
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Auth middleware decisions; the Worker must not interfere with auth

### Existing Code
- `public/index.html` — Form HTML; the `action="#"` stub has a comment for Phase 3: set `action="/api/rsvp"` `method="POST"` (though with fetch we may leave action as-is)
- `public/script.js` — Contains the fetch stub (`// Future: fetch('/api/rsvp', ...)`) at line 84; Phase 3 activates this
- `functions/_middleware.js` — Auth middleware (read-only — do not modify); Pages Functions at `functions/api/rsvp.js` will auto-route to `/api/rsvp` without touching the middleware
- `wrangler.jsonc` — Must be updated to add D1 binding for the RSVP Worker

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/script.js` submit handler (`form.addEventListener('submit', ...)`) — the Phase 3 block (`if (valid) { // Phase 3: ... }`) is the exact insertion point for the fetch call. The validation logic above it stays unchanged.
- `public/index.html` form fields: `name="name"`, `name="contact"`, `name="attendees"` (hidden input) — these are the field names the Worker should expect in the JSON body.

### Established Patterns
- Plain HTML/CSS/JS, no framework, no build step — the new Worker file and any frontend changes must follow this constraint.
- German throughout — all user-visible strings (confirmation, error messages) must be in German.
- Separate files for concerns — Phase 2 uses `public/style.css` and `public/script.js` as separate files rather than inline; follow the same pattern for any additions.

### Integration Points
- **Auth middleware** (`functions/_middleware.js`) — intercepts ALL requests including `/api/rsvp`. The RSVP Worker inherits Basic Auth enforcement automatically; no changes needed. Guests must be authenticated before submitting.
- **D1 binding** — `wrangler.jsonc` needs a `d1_databases` binding so the RSVP Worker can access `env.DB` (or chosen binding name). The D1 database must be created via the Cloudflare dashboard or `wrangler d1 create` before deploying.
- **Form fetch stub** (`script.js` line 84) — replace the comment block with actual `fetch('/api/rsvp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...}) })`.

</code_context>

<specifics>
## Specific Ideas

- Success message copy (exact): `"Danke, [Name]! Deine Anmeldung wurde gespeichert."` — substitute the actual guest name from the form value.
- Error message copy (exact or close to): `"Etwas ist schiefgelaufen. Bitte versuche es noch einmal."` — shown inline, form re-enables.
- Spinner/loading state: disable the submit button and show a visual indicator during the fetch. The guest should not be able to click submit twice.
- D1 table name: `rsvps` — simple, lowercase, consistent with Cloudflare D1 conventions.
- `submitted_at` stored as ISO 8601 string (e.g. `new Date().toISOString()`) — no special date type needed in D1/SQLite.
- The Worker should return HTTP 200 with `{ "ok": true }` on success, and a non-2xx status with `{ "ok": false, "error": "..." }` on failure so the frontend can branch on `response.ok`.

</specifics>

<deferred>
## Deferred Ideas

- **Failed auth attempt logging to D1** — was noted as a deferred idea in Phase 1 (01-CONTEXT.md). Now that D1 exists, this could be added as a future phase enhancement. Not in Phase 3 scope.
- **Admin view of RSVP data** — RSVP data is only accessible via D1 dashboard for now. A read endpoint or admin UI is out of scope (PROJECT.md: "Admin dashboard → Out of Scope").

</deferred>

---

*Phase: 3-RSVP Backend*
*Context gathered: 2026-05-10*
