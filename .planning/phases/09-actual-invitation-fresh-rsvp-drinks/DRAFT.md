# Phase 9 Planning Draft (non-executable)

**Status:** Ready to execute
**Phase:** 9
**Goal:** Turn the authenticated `/rsvp/` page into the formal German birthday invitation, collect a fresh attendance confirmation and group drink preferences, and preserve all historical RSVP rows on the current Cloudflare Pages / Pages Functions / D1 stack.

## Scope and constraints

- Keep `/` public and free of private logistics.
- Preserve earlier RSVP history; add new data in a fresh D1 table instead of rewriting or mutating historical rows.
- Authenticated invitation and RSVP flow only; no street address or invented year.
- Use `PARK_ENTRY_DIRECTIONS` from environment in production; do not invent or hardcode it.
- `BUFFET_LIST_URL` is optional; omit the callout when unset.
- Group headcount is capped at 10.
- Drink requests are preferences, not guarantees.
- Use the existing plain HTML/CSS/JS, Cloudflare Pages, D1, and Pages Functions architecture.

## Dependency order

1. 09-01 Add additive migration for fresh RSVP data and drink catalog.
2. 09-02 Add authenticated backend API logic for coming/decline submissions and suggestion storage.
3. 09-03 Personalize authenticated invitation page with venue, directions, and optional buffet link.
4. 09-04 Update the frontend invitation + RSVP form + multi-select drinks + suggestion flow.
5. 09-05 Validate the end-to-end behavior and apply the migration to the intended production database.

---

## 09-01: Additive D1 migration for the fresh RSVP round and drink catalog

**Objective:** Create a separate storage schema for fresh confirmations and reusable drink suggestions without touching the historical `rsvps` table.

**Tasks**
- Review the existing D1 migration pattern and add a new versioned migration under `migrations/`.
- Create a fresh table for `fresh_rsvps` (or equivalent) with a unique ID, submitted_at, host_ref, name, attendance state, headcount, and a JSON/text storage for selected drinks.
- Create a separate table for drink suggestions/options with a unique ID, normalized label, optional source metadata, and created_at.
- Seed the fixed drink catalog values required by the project: Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, alkoholfreies Bier.
- Ensure the new schema is additive and leaves the prior RSVP history untouched.

**Acceptance criteria**
- A migration exists in `migrations/` and is applied through Wrangler/D1 in the project pattern.
- Historical RSVP data remains unchanged.
- The new tables support both guest confirmations and drink suggestions.
- Fixed drink options are present without a “Keine Präferenz” option.

**Verification**
- `wrangler d1 migrations apply birthday-rsvps --local`
- `sqlite3` or D1 inspection: verify the new tables exist and contain seeded fixed drinks.
- Confirm no writes target the pre-existing RSVP table for this new round.

---

## 09-02: Add authenticated API/backend logic for fresh RSVP and drink suggestions

**Objective:** Create the server-side endpoint behavior to validate and store coming/declining RSVP submissions and saved drink suggestions with host attribution.

**Tasks**
- Extend the authenticated backend APIs to accept the new fresh RSVP payload.
- Validate required fields for both attendance states.
- Enforce `name` as required; `groupSize` 1–10 for coming responses.
- Enforce no drink selection for declines.
- Save the new suggestion via a dedicated endpoint or same-API helper with unique label validation and de-duplication.
- Keep all request validation server-side and reject malformed or invalid JSON with clean 400 responses.
- Preserve host attribution using the `X-Host-Ref` header from middleware.

**Acceptance criteria**
- A valid “coming” submission stores a fresh record with the group’s headcount and selected drinks.
- A valid “not coming” submission stores a decline record without drinks.
- Submission payloads are validated server-side.
- Duplicate drink suggestions are handled safely; unique suggestions are stored once and reused.
- Errors do not leak internal D1 or runtime details to clients.

**Verification**
- `curl -i -X POST http://localhost:8788/api/...` with valid and invalid payloads.
- Check the D1 table rows after successful submissions.
- Validate responses for malformed input, invalid headcount, and missing host context.

---

## 09-03: Personalize the authenticated invitation page with venue details, directions, and optional buffet link

**Objective:** Update the authenticated `/rsvp/` page HTML to present the formal invitation with the correct event details and environment-backed private logistics.

**Tasks**
- Extend `functions/rsvp/index.js` to inject the event’s venue name and map link as in current pattern.
- Add `PARK_ENTRY_DIRECTIONS` injection in a clearly labelled paragraph while preserving the configured wording.
- Add the optional `BUFFET_LIST_URL` callout only when the env var is set and non-empty.
- Keep the public `/` page free of these private details.
- Use the existing escape and validation behavior for all injected values.

**Acceptance criteria**
- The authenticated page shows “5 December” at “17:00” in German invitation copy.
- The page shows the venue and map link without inventing a street address.
- The directions paragraph is present when `PARK_ENTRY_DIRECTIONS` is configured.
- The buffet link section is hidden when `BUFFET_LIST_URL` is unset.
- The public index page does not show the invitation details or private logistics.

**Verification**
- Local Pages Function check: request `/rsvp/` with auth enabled and inspect the rendered HTML.
- Verify both password contexts (`SITE_PASSWORD__0`, `SITE_PASSWORD__1`) render the same invitation and environment-backed values.
- Test with `BUFFET_LIST_URL` absent and present.

---

## 09-04: Complete the German invitation page, RSVP form, combined drink selector, and suggestion flow

**Objective:** Deliver the actual guest-facing flow for the invitation, form interaction, multi-select drinks, and inline confirmation.

**Tasks**
- Replace the generic save-the-date page copy and RSVP form with the formal invitation content.
- Add a single form that captures name, attendance choice, headcount (1–10), and coming-only drink preferences.
- Use checkboxes for multi-select drinks and display fixed options together with saved suggestion values.
- Add a separate suggestion form directly beneath the selector.
- After a valid suggestion is submitted, immediately show it as selected in the current RSVP selector and persist it for later respondents.
- Replace the form with a warm inline confirmation after successful submission; declines show a friendlier decline confirmation.
- Ensure drink preferences are clearly described as requests, not guarantees.

**Acceptance criteria**
- The invitation remains visible while the confirmation appears inline.
- Coming groups can choose multiple drinks from the fixed catalog and suggestions.
- Declines do not ask for drink choices.
- No “Keine Präferenz” option is rendered.
- The suggestion form is safe, unique, and immediately reusable.
- The group headcount UI respects a 10-person cap.

**Verification**
- Use browser-based UAT at `http://localhost:8788/rsvp/` with Basic Auth.
- Test success states for both coming and not-coming responses.
- Test drink selection, suggestion submission, and selector update.
- Confirm that a suggestion becomes immediately selectable and persists for later use.

---

## 09-05: End-to-end verification and production migration

**Objective:** Verify all Phase 9 requirements are met in both local and production-ready flows and apply the schema change to the intended production database.

**Tasks**
- Run a full end-to-end verification for both configured host passwords.
- Confirm public vs authenticated routing is correct.
- Validate D1 rows for both old history and new fresh-round records.
- Check all message copy, form behavior, and optional buffet link conditions.
- Run the migration in the production database only after local verification passes.

**Acceptance criteria**
- Both host credentials work and show the same authenticated invitation flow.
- Public route hides all private details.
- Fresh and historical RSVP data coexist without regressions.
- Suggestions are safe, unique, selectable, and reusable.
- Required production env values are configured before deployment.

**Verification**
- `wrangler pages dev --port 8788`
- `curl -I http://localhost:8788/` and `curl -I http://localhost:8788/rsvp/` with Basic Auth headers.
- `wrangler d1 migrations apply birthday-rsvps --local`
- Browser UAT of authenticated flow, hosted behind Basic Auth.
- Production follow-up: `wrangler d1 migrations apply birthday-rsvps` after the merged PR is ready.

---

## Deliverables summary

- New additive D1 migration for fresh RSVP + drink catalog.
- Updated authenticated invitation page and environment-backed values.
- Fresh RSVP backend validation for comes/declines and suggestion handling.
- New frontend flow with group headcount cap, multi-select drinks, and suggestions.
- Verified local behavior and production migration readiness.
