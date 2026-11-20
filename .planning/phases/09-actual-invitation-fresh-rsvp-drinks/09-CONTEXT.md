# Phase 9: Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the authenticated German invitation, fresh coming/not-coming RSVP and group drink preferences, plus next-day buffet brunch and job sign-up in the existing Cloudflare Pages, Pages Functions, D1, and plain HTML/CSS/JavaScript stack. Keep `/` public and free of private logistics; keep the invitation and signup behind existing authentication; preserve historical RSVP rows.

The next-day signup is one shared flow. The brunch/cleanup choice is a single job option named “Abbau & Brunch am nächsten Tag”; there is no separate Brunch option, form, or special headcount. Guests who want to attend the brunch select this combined option, which includes buffet brunch and the cleanup task. Other job choices include Aufbau, Teilzeit Barkeeper nach Lust und Laune and Dinge. Job options may have optional capacity limits; Aufbau is capped at 15. Guests may suggest further drinks and jobs.

</domain>

<decisions>
## Implementation Decisions

### Invitation presentation
- **D-01:** Use a warm, personal German voice, consistent with the existing page.
- **D-02:** Present the invitation as one integrated flow, with the date/time prominent and venue/map details within the invitation rather than in a separate event-details card.
- **D-03:** Put configured park-entry directions in a clearly labelled paragraph, preserving the configured wording.
- **D-04:** When `BUFFET_LIST_URL` is configured, show it in a distinct callout; omit it entirely when unset.

### Fresh RSVP details
- **D-05:** A coming response requires the guest's name and group headcount. Do not collect a contact method.
- **D-06:** A not-coming response requires only the guest's name and has no drink selection.
- **D-07:** Present attendance, headcount, coming-only drink choices, and the next-day signup as one coherent flow. Only guests coming to the birthday can sign up for next-day Brunch or jobs.
- **D-08:** Cap group headcount at 10.

### Drink selector and suggestions
- **D-09:** Use checkboxes for multi-select choices.
- **D-10:** Show fixed drinks and saved guest suggestions in one combined list.
- **D-11:** Place the drink-suggestion control directly below the selector.
- **D-12:** Stage a drink suggestion for the current form and select it there, but do not publish it to the shared catalog until the RSVP is submitted with that drink selected. An unselected suggestion or one from an abandoned form is not published.
- **D-13:** Preserve fixed drink choices, omit “Keine Präferenz,” and explain that drink requests are not guarantees.

### Submission confirmation
- **D-14:** Replace the RSVP section with an inline confirmation while leaving the invitation visible.
- **D-15:** For a coming response, summarize group headcount and selected drink requests, and repeat that drink preferences are not guaranteed.
- **D-16:** Use warm, personal copy for a decline confirmation.

### Next-day brunch and jobs
- **D-17:** Make “Abbau & Brunch am nächsten Tag” one combined job option. There is no separate Brunch option, form, or special brunch headcount.
- **D-18:** Guests wanting to attend the next-day buffet brunch select the combined “Abbau & Brunch am nächsten Tag” option; that option includes both cleanup and buffet brunch.
- **D-19:** Offer Aufbau (maximum 15 people), Teilzeit Barkeeper nach Lust und Laune, Dinge, “Abbau & Brunch am nächsten Tag”, and “Getränkeeinkauf mit Auto (Freitag oder Samstag)”.
- **D-20:** One RSVP contact allocates party attendees by number across multiple selected jobs. Job assignments are optional, and the total assigned count may exceed the party size because one person may take multiple jobs.
- **D-21:** Capacity is optional per job. A capped job closes when full; if only some requested places remain, accept those places and leave the rest unassigned.
- **D-22:** A suggested job is staged for the current signup, selected there, and published for everyone only when the RSVP is submitted with it selected. Unselected or abandoned suggestions are not published. New suggestions are uncapped by default, and duplicate labels reuse the existing option.
- **D-23:** Guests who decline the birthday cannot sign up for next-day jobs or the combined Abbau/brunch option.
- **D-24:** Every job option has a longer German description explaining what the task means. Draft descriptions for the initial jobs for the user's review; do not treat the ambiguous label “Dinge” as permission to invent specific duties.
- **D-25:** Add “Getränkeeinkauf mit Auto (Freitag oder Samstag)” for helping purchase drinks on either day; the helper provides a car. No capacity was requested, so leave this job uncapped.
- **D-26:** Keep jobs in a separate D1 catalog from drinks, with job-specific descriptions, capacities, and allocation associations. Do not generalize the existing drink catalog into a shared catalog.

### the agent's Discretion
Technical implementation details may follow existing project patterns, while preserving the decisions above. In particular, keep the production authorization and merged-schema gates intact; do not make remote changes without the required explicit authorization.

### Reviewed Todos
- **“Support two passwords for joint 30th birthday party”** (`.planning/todos/pending/2026-06-20-support-two-passwords-for-joint-30th-birthday-party.md`) — not folded into Phase 9. Its dual-password/auth work was completed in Phase 7, and its content work was handled in Phase 8.

</decisions>

<canonical_refs>
## Canonical References

### Scope and requirements
- `.planning/ROADMAP.md` — Phase 9 goal, requirements, dependencies, success criteria, and existing production gate.
- `.planning/REQUIREMENTS.md` — AUTH-09, INV-01–04, RSVP-09–10, DRINK-01–04, and the Phase 9 brunch/job requirements.
- `.planning/PROJECT.md` — project constraints and prior decisions; group-level drinks remain distinct from per-job attendee counts.
- `.planning/STATE.md` — current state and production blocker: production configuration and migration remain unauthorized.

### Guest-facing and authentication behavior
- `public/rsvp/index.html` — authenticated invitation and current RSVP/drink form.
- `public/script.js` — RSVP, safe dynamic option rendering, and current drink suggestion behavior.
- `public/style.css` — warm color tokens, accessible focus treatment, and responsive form styling.
- `public/index.html` — public hint page; keep private logistics out of this route.
- `functions/_middleware.js` — Basic Auth boundary and host-circle propagation.
- `functions/rsvp/index.js` — authenticated invitation personalization and environment-backed values.

### RSVP storage, API, and migration patterns
- `functions/api/fresh-rsvp.js` — fresh RSVP validation, host attribution, D1 writes, and drink association.
- `functions/api/drink-suggestions.js` — current drink catalog and suggestion behavior; suggestion publication must become conditional on the final RSVP selection.
- `migrations/0002_fresh_rsvp_round.sql` — additive fresh RSVP/drink schema; historical rows must remain unchanged.
- `wrangler.jsonc` — D1 binding and migration configuration.
- `tests/phase-9-api.test.mjs` — focused API tests for RSVP and drink suggestions.
- `tests/phase-9-ui.test.mjs` — UI behavior and safe dynamic option rendering tests.
- `tests/phase-9-e2e.test.mjs` — local Pages/D1 integration checks and the no-remote-action boundary.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `functions/api/drink-suggestions.js`: D1 catalog lookup, normalized labels, duplicate handling, and safe option responses can guide job catalog behavior.
- `functions/api/fresh-rsvp.js`: strict payload validation and batched D1 writes can be extended for conditional publication and job allocations.
- `public/script.js`: creates option labels with `textContent` and handles the existing suggestion/RSVP flow without interpolating user text into HTML.

### Established Patterns
- Keep private invitation and RSVP details behind Basic Auth; retain host attribution from `X-Host-Ref`.
- Keep new data additive and preserve historical RSVP responses.
- Use exact request-field validation, bounded text inputs, case-insensitive duplicate reuse, and explicit error responses.
- Use `textContent` for guest-provided labels.

### Integration Points
- `public/rsvp/index.html` and `public/script.js` host the combined RSVP, drink, brunch, and job signup experience.
- `functions/api/fresh-rsvp.js` will need to persist only selected staged suggestions together with the RSVP and associate job allocation counts.
- The D1 schema and authenticated API catalog endpoints need to support job options, optional capacities, and selections without modifying historical data.
- Existing local API, UI, and end-to-end tests provide patterns for focused verification; production gates in Plan 09-05 remain unchanged.

</code_context>

<specifics>
## Specific Ideas

- Event day is followed by a buffet brunch the next day.
- The only brunch choice is one combined option, “Abbau & Brunch am nächsten Tag”; guests select it for the brunch and it includes cleanup.
- Initial job options are Aufbau (maximum 15), Teilzeit Barkeeper nach Lust und Laune, Dinge, and “Abbau & Brunch am nächsten Tag”.
- Add “Getränkeeinkauf mit Auto (Freitag oder Samstag)”: help buy drinks on Friday or Saturday and provide a car; exact timing and logistics can be coordinated separately. Leave it uncapped.
- Each job option should include a longer German explanation of the expected task. Draft descriptions for review, and keep the description for “Dinge” general rather than inventing a specific task.
- Guests can propose additional drink and job options. A proposed option becomes shared only if included in a successfully submitted RSVP; it is selected in the current form and is not published if left unselected or abandoned.
- Party job allocations use attendee counts per job, can span multiple jobs, and may assign one person to several jobs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within the expanded Phase 9 scope.

</deferred>

---

*Phase: 9-Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch*
*Context gathered: 2026-11-14*
