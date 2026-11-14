# Domain Pitfalls

**Domain:** Invite-only German birthday invitation and RSVP site on Cloudflare Pages Functions + D1  
**Researched:** 2026-11-14  
**Overall confidence:** HIGH for repository-specific findings; MEDIUM for recommendations that depend on the still-evolving v2.0 data model. External documentation was classified LOW by the research provider seam and is cited as supporting context, not as the sole basis for a claim.

## Critical Pitfalls

### Pitfall 1: New invitation routes or assets accidentally bypass the invite gate
**What goes wrong:** Venue, park directions, buffet links, drink options, or an API route are exposed without authentication, or an unauthenticated response is cached and later served to an authenticated guest (or vice versa).
**Why it happens:** `functions/_middleware.js` is the current app-wide gate but has an explicit public allowlist (`/`, `/index.html`, `/style.css`). A new path, static asset, or alternate route may be added to that list—or handled outside the expected path—without realizing it exposes page content. The personalized `GET /rsvp/` already has `Cache-Control: no-store`; do not lose this when expanding the response.
**Consequences:** Private logistics can be discovered or shared beyond intended guests; cached responses can show stale or wrong content; RSVP APIs may become writable without the password.
**Prevention:**
- Keep the middleware allowlist minimal and deliberate. Treat `/api/*`, `/rsvp/`, new pages, drink-option endpoints, and any JS/JSON that contains private values as authenticated by default.
- Inject logistics only in the authenticated `functions/rsvp/index.js` response. Never put them in `public/index.html`, static bundles, query strings, or client-readable configuration.
- Send `Cache-Control: no-store` on every personalized response and private API response. Do not rely only on a deployment CDN default or on the 401 response's existing no-store header.
- Continue serving the public hint page and only the assets it actually needs; test that each new route both challenges without credentials and succeeds with either host password.
**Detection:** Request every new page, asset, and API route with no Authorization header and with each host password. Inspect response bodies and headers; verify no private URL or event detail appears in the public root, 401 body, static assets, or cached response.

### Pitfall 2: Invitation personalization creates an HTML or URL injection sink
**What goes wrong:** A configured venue name, park directions URL, buffet URL, drink option, or future “Sonstiges” submission is interpreted as markup or as an unsafe link.
**Why it happens:** `functions/rsvp/index.js` currently escapes `venueName` and the parsed map URL, but it interpolates the configured `INVITE_NAME` directly into an HTML string. That existing interpolation is a warning not to extend the same pattern to more fields. User-submitted options are persistent: a value rendered unsafely later can become stored XSS for every guest.
**Consequences:** Script execution in an authenticated guest's browser, page defacement, misleading navigation, or unintended access to data available in that browser session.
**Prevention:**
- Use a distinct, explicit template marker for each dynamic field; escape text for HTML text context and separately validate/escape attributes. Escape `INVITE_NAME` too, rather than copying the current raw interpolation pattern.
- Prefer DOM construction and `textContent` for browser-rendered option values. Do not put guest-provided values into `innerHTML`, inline scripts, CSS, or event-handler attributes.
- Validate configured URLs with `new URL(value)`; require `https:`, reject username/password credentials and unexpected ports, and allow only the approved hostnames for each link type. An HTTPS-only check permits arbitrary external hosts and does not ensure the label (“OpenStreetMap”, “Buffet”) matches the destination.
- For external links, retain `rel="noopener noreferrer"` with `target="_blank"`. Do not assume HTML escaping itself makes a `javascript:` or misleading HTTPS destination safe.
- Bound input lengths and reject empty/placeholder values on the server before persisting or promoting a “Sonstiges” answer.
**Detection:** Test text and URL values containing `<script>`, quotes, `&`, Unicode, `javascript:`, embedded credentials, unexpected hosts/ports, and malformed URLs. Confirm they render as text or are rejected, and that accepted links navigate to the intended host. Test a submitted “Sonstiges” value on a later page load, not only the submission response.

### Pitfall 3: “Automatic promotion” turns arbitrary guest text into a permanent shared choice
**What goes wrong:** Every one-off, misspelled, abusive, or malicious “Sonstiges” answer becomes an option shown to all future guests; concurrent submissions create duplicate choices with slightly different spelling or casing.
**Why it happens:** A read-before-insert check is not a uniqueness guarantee: two requests can both see no matching option and insert it. String equality also treats case, whitespace, and Unicode-normalization variants as distinct. The site uses shared Basic Auth passwords, so authentication establishes invite access but does not make all submitted content trusted.
**Consequences:** Polluted or confusing choice lists, persistent XSS risk if options are rendered unsafely, unbounded junk data, and inconsistent RSVP values.
**Prevention:**
- Define “promotion” precisely: what qualifies, whether options appear immediately or after a successful RSVP, and whether a host must approve them. If promotion must be automatic, make the acceptance rules narrow and explicit (trim/collapse whitespace, length bounds, reject control characters and empty/placeholder values).
- Keep a display label separate from a deterministic canonical key. Normalize consistently before writes (including a deliberate case/Unicode policy) and enforce a database `UNIQUE` constraint on the key.
- Use a conflict-safe insert (`INSERT … ON CONFLICT …`) and then resolve the canonical option row; do not rely on `SELECT`-then-`INSERT` or a front-end duplicate check. Bind all guest values with D1 prepared statements.
- Keep original RSVP answers intact even when they resolve to a shared option. Do not rewrite historical submissions when labels are merged or renamed.
- Consider moderation/administrative removal and a cap or abuse-control policy before making guest-supplied values globally visible.
**Detection:** Submit the same value simultaneously and submit variants differing by case, surrounding/repeated whitespace, and Unicode composition. Assert one canonical option exists, every RSVP resolves consistently, and malformed or oversized submissions do not create options.

### Pitfall 4: The new “fresh RSVP” schema either loses legacy data or changes its meaning
**What goes wrong:** A table is dropped/recreated, legacy rows are copied twice, existing `host_ref` attribution is lost, or old `schema.sql` setup is mistaken for the migration source of truth.
**Why it happens:** The existing D1 table is `rsvps`; migration `0001_add_host_ref.sql` added `host_ref` and backfilled old rows to `0`. Existing project security notes establish `migrations/` as canonical and migrations as additive. A v2 table should be introduced without silently replacing or misclassifying the old records.
**Consequences:** RSVP history disappears, counts change, attribution becomes incorrect, or a fresh local database works while an already-populated production D1 fails.
**Prevention:**
- Add a new numbered Wrangler migration that creates the new table(s); do not edit an already-applied migration or use destructive `DROP`/recreate to obtain a “fresh” schema.
- Decide explicitly whether “fresh RSVP table” means a separate v2 table or an additive extension. If separate, preserve `rsvps` and its rows; do not duplicate legacy records into the new table unless a documented, one-time backfill is required.
- Preserve `host_ref` as the server-derived 0/1 group identity for new submissions. Keep legacy rows' established backfill meaning; do not infer a different group from user-entered names or drink choices.
- Test migration upgrade on a populated local D1 and on a clean D1. Compare pre/post legacy row counts and representative IDs/host attribution; verify Wrangler's migration history and manually apply the production migration after deployment, per project workflow.
- Treat `schema.sql` as a reference/bootstrap artifact only where the existing migration/security notes say so; do not use it to overwrite a live database.
**Detection:** Seed legacy rows including `host_ref=0` and `host_ref=1`, apply the new migration, and assert IDs, values, and row counts are unchanged. Apply the migration through Wrangler on both clean and populated local databases; verify production deployment instructions name the manual migration step.

### Pitfall 5: New drink fields bypass server validation or do not match the RSVP group size
**What goes wrong:** A guest can submit a forged drink value, invalid option ID, arbitrary host group, or a list whose number of selections does not match the people in the RSVP.
**Why it happens:** Front-end controls are only a usability layer. Existing RSVP APIs validate name and attendee count server-side, use prepared statements, and require the middleware-derived `X-Host-Ref`; new fields can easily be added only to the client or accidentally trust a client-supplied group selector.
**Consequences:** Inconsistent event counts and drink planning, cross-circle misattribution, unexpected data, or SQL injection if values are interpolated.
**Prevention:**
- Validate drink option IDs/values, count, lengths, and allowed choice rules on the server. Resolve IDs against the options table rather than trusting submitted labels.
- Keep deriving `host_ref` from authenticated middleware; overwrite any incoming `X-Host-Ref` and reject missing/invalid host context in every new write endpoint. Never take the “RSVP group” from a form field.
- Decide before schema design whether a single RSVP has one drink choice for the whole party or one choice per attendee. If per-person, represent it as a bounded child collection and validate its cardinality against the attendee count; do not squeeze multiple choices into an ambiguous comma-separated string.
- Store RSVP and dependent drink selections consistently; avoid a successful RSVP with missing/partial dependent rows. Use prepared statements for every submitted value.
**Detection:** Send requests that alter host headers, use unknown option IDs, omit required selections, submit more/fewer drink choices than attendees, and tamper with counts. Verify no partial or misattributed database rows are written.

### Pitfall 6: Basic Auth and page navigation no longer behave consistently
**What goes wrong:** Guests see a credential challenge for an expected asset/API, an invitation route is reachable without auth, or RSVP submission fails after new interactive fields are added.
**Why it happens:** Middleware authenticates all but an explicit public allowlist and derives the circle from which password matched. New paths, redirects, form actions, scripts, or fetches can cross route boundaries. The root page currently redirects to `/rsvp/`; the RSVP page and API are protected.
**Consequences:** Guests cannot complete the invitation flow on mobile or after a refresh, or private content is unintentionally accessible.
**Prevention:**
- Test the entire flow starting from `/`, following the redirect, loading `/rsvp/`, fetching options, submitting attendance and decline, and refreshing—both host passwords and unauthenticated.
- Keep the user experience on same-origin relative URLs; do not embed Basic Auth credentials in links or URLs. Ensure all new navigation and API paths are compatible with the existing challenge flow.
- Keep the selected RSVP circle implicit in authenticated server context. Do not add a visible selector that can disagree with the password-derived identity.
- Verify public assets contain no secret-backed data and private assets/endpoints challenge consistently.
**Detection:** Exercise the complete flow in a browser with each password, on a fresh session and a refresh. Inspect route status codes, network requests, and server-side `host_ref` values; confirm there is no broken fetch from a credential-bearing URL.

### Pitfall 7: German invitation copy exposes placeholders or labels the wrong destination
**What goes wrong:** Guests see “TBD”/stale venue text, the old tentative venue disclaimer, missing park/buffet links, or German copy says a link goes to one service while it opens another.
**Why it happens:** Invitation content currently has a fixed “Voraussichtlicher Veranstaltungsort” heading, says the contract is pending, and conditionally renders details only when both `VENUE_NAME` and `VENUE_MAP_URL` exist. Adding several independent configuration values creates partial-configuration states.
**Consequences:** Guests rely on incomplete logistics, miss the event, or lose trust in the invitation.
**Prevention:**
- Define required vs optional logistics and the exact behavior when each binding is absent. Fail closed for invalid links; never emit an empty `href` or placeholder as if confirmed.
- Keep content factual and German, and only call a venue “confirmed” after the venue and timing decision is actually locked. Keep the public hint page free of private logistics.
- Render sections independently where appropriate, but do not claim details are confirmed if a required address, time, or arrival instruction is missing. Add a pre-deploy content checklist for all secret-backed values and labels.
**Detection:** Test all configuration combinations (all present, each optional item absent, required item absent, malformed URL). Verify the German invitation is complete and no stale tentative wording or empty link is visible.

## Moderate Pitfalls

### Pitfall 1: Duplicate RSVP submissions get confused with duplicate drink options
**What goes wrong:** A retry or double click creates two RSVP records, while option deduplication hides the duplicate choice but not the duplicate submission.
**Prevention:** Keep unique RSVP IDs and the established append-only history rule, but decide whether retry-safe idempotency is needed for the new form. If required, use a unique submission token enforced in D1; do not “solve” retries by upserting on a person's name. Keep option uniqueness and RSVP idempotency as separate constraints.

### Pitfall 2: Response-body personalization loses important response metadata
**What goes wrong:** A rewritten static asset response omits status, security headers, or content type as pages/functions evolve.
**Prevention:** In the invitation handler, check the asset response status before injecting content, preserve the expected status and safe headers, explicitly set the HTML content type and no-store policy, and never blindly copy cache headers from a public static response.

### Pitfall 3: Operational migration differs between local and production D1
**What goes wrong:** The app deploys but D1 lacks the new table or drink options, causing 500 responses only in production.
**Prevention:** Wrangler Pages deploys do not apply D1 migrations automatically in this repository. Include a release step to list/apply migrations against the intended database after deploy and verify the function's binding is the expected `DB`.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Secret-backed invitation details | Public/static leakage or CDN caching | Middleware route audit; authenticated-only injection; no-store tests |
| URL/configuration handling | XSS, phishing destination, partial configuration | Context-aware escaping, per-link HTTPS + host allowlist, configuration matrix |
| Fresh RSVP table | Legacy rows lost, duplicated, or re-attributed | Additive migration; populated-database migration test and row-count assertions |
| Drink choices and “Sonstiges” | Concurrent duplicates, option pollution, persistent XSS | Canonical key + DB unique constraint, conflict-safe insert, strict server validation |
| RSVP-group preservation | Client can tamper with group assignment | Middleware-derived `X-Host-Ref`; test both passwords and forged headers |
| German invitation/access flow | Stale placeholder or inaccessible route | Copy checklist and end-to-end browser tests from public root through API submission |

## Sources

- Repository: `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`
- Repository implementation: `functions/_middleware.js`, `functions/rsvp/index.js`, `functions/api/rsvp.js`, `functions/api/not-coming.js`, `public/rsvp/index.html`, `public/script.js`, `migrations/0001_add_host_ref.sql`, `schema.sql`, `wrangler.jsonc`
- Prior security decisions: `.planning/phases/07-dual-password-auth-rsvp-backend/07-SECURITY.md`, `.planning/phases/07-dual-password-auth-rsvp-backend/07-03-SUMMARY.md`
- Cloudflare Pages Functions middleware: https://developers.cloudflare.com/pages/functions/middleware/ — fetched 2026-11-14; provider confidence LOW
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/ — fetched 2026-11-14; provider confidence LOW
- Cloudflare D1 prepared statements: https://developers.cloudflare.com/d1/worker-api/prepared-statements/ — fetched 2026-11-14; provider confidence LOW
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/ — fetched 2026-11-14; provider confidence LOW
