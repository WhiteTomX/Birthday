# Phase 9: Actual Invitation, Fresh RSVP & Drinks - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the authenticated `/rsvp/` page into the formal German invitation for the joint birthday, and let guests submit a fresh coming/not-coming response with group headcount and drink preferences. Keep `/` public and free of private logistics; preserve existing RSVP history and use the existing Cloudflare Pages, Pages Functions, D1, and plain HTML/CSS/JavaScript stack.

The invitation states 5 December at 17:00 without inventing a year or street address. Authenticated venue/map details use the existing environment values; park-entry directions come from `PARK_ENTRY_DIRECTIONS`; the buffet contribution link comes from optional `BUFFET_LIST_URL` and is absent when unset. Fresh responses use separate storage. Coming groups can choose multiple fixed or suggested drinks; declines have no drink selection.

</domain>

<decisions>
## Implementation Decisions

### Invitation presentation
- **D-01:** Use a warm, personal German voice, consistent with the existing page.
- **D-02:** Present the invitation as one integrated flow, with the date/time prominent and venue/map details within the invitation rather than in a separate event-details card.
- **D-03:** Put the configured park-entry directions in a clearly labelled section as a paragraph, preserving the configured wording.
- **D-04:** When `BUFFET_LIST_URL` is configured, show it in a distinct callout; omit it entirely when unset.

### Fresh RSVP details
- **D-05:** A coming response requires the guest's name and group headcount. Do not collect a contact method.
- **D-06:** A not-coming response requires only the guest's name and has no drink choices.
- **D-07:** Present attendance, headcount, and the coming-only drink choices in one form with one submit action.
- **D-08:** Cap group headcount at 10. This intentionally revises the earlier no-RSVP-cap decision in `.planning/PROJECT.md`; Phase 9 requirements and plans should use the 10-person maximum.

### Drink selector and suggestions
- **D-09:** Use checkboxes for the multi-select.
- **D-10:** Show fixed drinks and saved guest suggestions in one combined list.
- **D-11:** Place the separate drink-suggestion form directly below the selector.
- **D-12:** Once a suggestion is saved, make it available in the current selector and automatically select it for the current RSVP.
- **D-13:** Preserve the fixed drink choices, omit “Keine Präferenz,” and explain that drink requests are not guarantees.

### Submission confirmation
- **D-14:** Replace the RSVP section with an inline confirmation while leaving the invitation visible.
- **D-15:** For a coming response, summarize the group headcount and selected drink requests, and repeat that drink preferences are not guaranteed.
- **D-16:** Use warm, personal copy for a decline confirmation.

### the agent's Discretion
No product choices were explicitly delegated. Technical implementation details may follow existing project patterns, while preserving the decisions above.

### Reviewed Todos
- **“Support two passwords for joint 30th birthday party”** (`.planning/todos/pending/2026-06-20-support-two-passwords-for-joint-30th-birthday-party.md`) — not folded into Phase 9. Its dual-password/auth work was completed in Phase 7, and its content work was handled in Phase 8.

</decisions>

<canonical_refs>
## Canonical References

### Scope and requirements
- `.planning/ROADMAP.md` — Phase 9 goal, requirements, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` — AUTH-09, INV-01–04, RSVP-09–10, and DRINK-01–04.
- `.planning/PROJECT.md` — project constraints and prior decisions; note D-08 above intentionally overrides its earlier no-cap rule for this phase.
- `.planning/STATE.md` — current state and deployment concern: production must set `PARK_ENTRY_DIRECTIONS`; `BUFFET_LIST_URL` is optional.

### Existing guest-facing and authentication behavior
- `public/rsvp/index.html` — current invitation and RSVP markup, including name, attendance, and group headcount fields.
- `public/script.js` — current RSVP interactions, inline success handling, and safe use of text content for user-supplied values.
- `public/style.css` — existing warm color tokens, venue callout, form styles, focus treatment, and responsive layout.
- `public/index.html` — public hint page; keep private logistics out of this route.
- `functions/_middleware.js` — Basic Auth boundary and host-circle propagation.
- `functions/rsvp/index.js` — authenticated invitation personalization using environment-backed invitation and venue values.

### Existing RSVP storage and database configuration
- `functions/api/rsvp.js` — current coming-response validation, host attribution, and D1 insert pattern.
- `functions/api/not-coming.js` — current name-only decline behavior and D1 insert pattern.
- `migrations/0001_add_host_ref.sql` — existing migration history; new fresh-round storage must be additive.
- `wrangler.jsonc` — D1 binding and migrations directory configuration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `functions/rsvp/index.js` fetches the authenticated static page, injects environment-backed values, validates the HTTPS map URL, and escapes inserted HTML.
- `functions/_middleware.js` enforces Basic Auth and sets `X-Host-Ref` for downstream functions.
- `public/script.js` handles the current attendance flow and renders inline confirmations without interpolating user input into HTML.
- `public/style.css` provides the warm festive palette, accessible focus styling, venue callout, and responsive layout to extend.
- `functions/api/rsvp.js` and `functions/api/not-coming.js` provide server-side validation and D1 insert patterns; `wrangler.jsonc` already configures `migrations/`.

### Established Patterns
- All invitation content is German; keep `/` public and put event logistics behind the existing auth-protected `/rsvp/` route.
- Use environment values for private event details; never hardcode secret values.
- Keep new RSVP records separate and additive so historical `rsvps` rows are untouched.
- Attribute submissions to the authenticated host using the existing middleware header.
- Treat user-supplied text as untrusted; follow the existing escaping/text-content patterns.

### Integration Points
- `functions/rsvp/index.js` personalizes the authenticated `/rsvp/` page.
- New authenticated RSVP/drink endpoints will be called by the plain-JavaScript form in `public/rsvp/index.html`.
- New schema changes belong in `migrations/` and are applied through the existing D1 binding.

</code_context>

<specifics>
## Specific Ideas

- Do not add a year to “5 December” or invent a street address for the park.
- Keep the configured park-entry directions as a labelled paragraph.
- When present, make the optional buffet link a distinct callout.
- The new drink suggestion should be selected automatically after it becomes available to the current respondent.
- No external specifications or ADRs were referenced during discussion.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 9 scope.

</deferred>

---

*Phase: 9-Actual Invitation, Fresh RSVP & Drinks*
*Context gathered: 2026-11-14*
