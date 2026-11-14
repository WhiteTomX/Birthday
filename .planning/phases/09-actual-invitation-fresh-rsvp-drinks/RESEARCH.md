# Phase 9 Research: Actual Invitation, Fresh RSVP & Drinks

## Current architecture and constraints

- Authentication and host attribution are already enforced by `functions/_middleware.js` via HTTP Basic Auth and the `X-Host-Ref` header.
- Public/private route separation is already established: `/` is the public hint page, while `/rsvp/` is the authenticated invitation flow.
- Server-side patterns are consistent in `functions/api/rsvp.js` and `functions/api/not-coming.js`: parse JSON, validate required fields, reject malformed payloads with 400, and insert new rows with `crypto.randomUUID()` and `Date.toISOString()`.
- The authenticated page personalization is implemented with `functions/rsvp/index.js`, which fetches the static asset, injects environment-backed values, and escapes inserted HTML to avoid unsafe string rendering.
- The existing frontend pattern in `public/script.js` uses progressive form reveal, server fetch calls, and inline success text rendered with `textContent` instead of `innerHTML`.
- D1 configuration is already in `wrangler.jsonc` with a `migrations/` directory; the current project already performs additive migrations.

## Phase 9 objective

Deliver the formal German invitation and a fresh RSVP round for the joint birthday, while preserving the earlier RSVP history and keeping the current Cloudflare Pages + Pages Functions + D1 + plain HTML/CSS/JS model intact.

## Design decisions to preserve

- Use the existing warm, personal German voice and festive styling.
- Keep the event date/time as “5 December at 17:00” without inventing a year or street address.
- Keep all private logistics behind the authenticated `/rsvp/` route.
- Allow a separate D1 table for the fresh RSVP round so earlier records remain unchanged.
- Use a group-level multi-select drink selector with a suggestion form rather than per-attendee track.
- Treat drink requests as preferences, not guarantees.

## Key implementation findings

1. The authenticated page currently injects only the venue name and map link. Phase 9 will extend this personalization to include park-entry directions and the optional buffet URL while preserving the current escape/validation patterns.
2. The existing RSVP form/workflow only covers one attendance choice and a single attendee count. Phase 9 needs a combined “name + attendance + group headcount + drinks” form with a single submit action and separate success state.
3. The project already supports host-scoped records via `host_ref`; the fresh RSVP round should re-use that pattern for both coming and not-coming rows.
4. The drink list can be implemented as a fixed catalog plus a dynamic suggestions table. New suggestions should be made available immediately to the current form and then persisted for later respondents.
5. Production must set `PARK_ENTRY_DIRECTIONS`; if missing, the app should not invent the value. `BUFFET_LIST_URL` is optional and should be hidden when unset.

## Recommended implementation approach

- Add a new additive D1 migration for the fresh RSVP table and the separate drink suggestions/options catalog.
- Extend the authenticated backend with a reusable RSVP submission endpoint supporting `{ name, attendance, groupSize, drinks[] }` and a decline branch with no drink payload.
- Re-use the existing `X-Host-Ref` middleware header for host attribution.
- Update the authenticated `/rsvp/` page to render the full invitation, the venue/map block, and the park-entry directions paragraph.
- Extend the frontend script to reveal the coming form, enforce the 1–10 cap, render a combined fixed + suggested drink list, and submit the new payload as one action.
- Replace the final success state with a warm confirmation message that keeps the invitation visible while showing the user’s group summary.

## Risks and blockers

- Production config for `PARK_ENTRY_DIRECTIONS` is required; without it, the invitation cannot show the required directions.
- `BUFFET_LIST_URL` is optional; the page must omit the callout when unset.
- The existing project avoids unsafe DOM injection; all dynamic values should remain `textContent`-based or safely escaped.
- The migration must be additive; the old RSVP history must remain untouched.

## Conclusion

The codebase already contains the right extension points: `functions/rsvp/index.js` for injecting authenticated invitation values, `functions/api/rsvp.js` and `functions/api/not-coming.js` for server validation, and `public/script.js` for the interactive client flow. Phase 9 fits cleanly into the current architecture with one additive migration, one guest-facing frontend refresh, and a small set of API/backend changes.
