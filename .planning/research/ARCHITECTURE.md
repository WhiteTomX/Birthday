# Architecture Patterns

**Domain:** Password-protected German birthday invitation and RSVP site  
**Project:** Birthday — v2.0 Actual Invitation  
**Researched:** 2026-11-14  
**Confidence:** HIGH for current-code integration points; MEDIUM for proposed RSVP schema until “drink choice” and default options are finalized.

## Recommended Architecture

Keep the existing Cloudflare Pages Functions + D1 + static HTML/CSS/JS design. v2.0 is a vertical extension of the current invitation flow, not a reason to introduce a framework, a second database, or a new Worker routing mode.

```text
Guest browser
  ├─ GET /                 public hint page → redirects to /rsvp/
  └─ /rsvp/* and /api/*
       │
       ▼
functions/_middleware.js
  ├─ Basic Auth: match SITE_PASSWORD__0 / SITE_PASSWORD__1
  └─ forward X-Host-Ref (0 or 1)
       │
       ├─ GET /rsvp/
       │    └─ functions/rsvp/index.js
       │         ├─ env.ASSETS.fetch("/rsvp/")
       │         ├─ personalize HTML from env.INVITE_NAME,
       │         │  VENUE_NAME, VENUE_MAP_URL,
       │         │  PARK_ENTRY_DIRECTIONS, BUFFET_LIST_URL
       │         └─ Cache-Control: no-store
       │
       └─ RSVP browser JS
            ├─ GET /api/drink-options → functions/api/drink-options.js
            ├─ POST /api/rsvp         → functions/api/rsvp.js
            └─ POST /api/not-coming  → functions/api/not-coming.js
                       │
                       ▼
                  env.DB (D1)
                  ├─ rsvps       existing historical rows; leave unchanged
                  ├─ rsvps_v2    new v2 responses
                  └─ drink_options  append-only selectable drink catalog
```

### Component Boundaries

| Component | Responsibility | v2.0 integration |
|-----------|---------------|------------------|
| `public/index.html` | Public hint page and redirect | Keep public and free of private venue/logistics content. |
| `functions/_middleware.js` | Gate private routes; derive host circle from the accepted password | Preserve its existing route behavior and `X-Host-Ref` contract. The `/rsvp/` page and API remain behind auth. |
| `functions/rsvp/index.js` | Fetch the static RSVP asset and personalize it on the server | Extend its existing environment-value interpolation for venue/map with arrival directions and buffet link. Keep escaping, HTTPS validation for links, and `Cache-Control: no-store`. |
| `public/rsvp/index.html` | Invitation content and RSVP form structure | Replace save-the-date copy with invitation details; keep schedule copy in HTML unless it is explicitly required to be environment-configurable. Add a group-level drink field and “Sonstiges” input. |
| `public/script.js` | Form interactions, validation, API calls, confirmation | Load drink choices, reveal/validate the custom value, submit it with the attending group, and retain the current safe DOM update behavior. |
| `functions/api/drink-options.js` (new) | Return available drink options to an authenticated page | Read only the option catalog; return labels/keys, never RSVP data. |
| `functions/api/rsvp.js` | Validate and persist an attending group | Keep the `/api/rsvp` URL; add server-side drink-option validation and write to `rsvps_v2`, not `rsvps`. |
| `functions/api/not-coming.js` | Persist a decline | Keep the current decline URL and validation; write the decline to `rsvps_v2` with zero attendees and no drink choice. |
| `migrations/0002_v2_invitation_rsvps.sql` (new) | Evolve D1 additively | Create the v2 response/catalog tables and seed the fixed drink choices. Do not update, copy, or delete rows in `rsvps`. |
| `schema.sql` | Human-readable baseline schema | Bring it into agreement with the effective schema after migrations, clearly identifying the legacy and v2 tables. The migration remains the deployed change. |

### Data Flow

1. A guest reaches `/`; the existing public hint redirects to `/rsvp/`. The middleware challenges for Basic Auth on `/rsvp/` and private API routes, and attaches the matched host index as `X-Host-Ref`.
2. The `/rsvp/` Pages Function gets the static asset via `env.ASSETS`, inserts environment-backed invitation details, escapes text before inserting it into HTML, validates external URLs as HTTPS, and returns a non-cacheable personalized page.
3. The browser requests `/api/drink-options`. The endpoint returns the pre-seeded fixed options plus custom options previously accepted from a valid RSVP. It must not expose names, attendance, or other RSVP data.
4. On attendance, the browser posts name, optional contact method, attendee count, selected option key, and—only for “Sonstiges”—the custom label to `/api/rsvp`. The Function validates all fields and host context; client validation is convenience, not the trust boundary.
5. For a new “Sonstiges” label, normalize a separate catalog key (trim, collapse whitespace, case-fold), cap the display label’s length, and insert the option if that normalized key is not already present. Write the response and option in one D1 `batch()` so a failed RSVP does not leave an orphan option. Store a reference to the catalog key; treat catalog rows as append-only so past responses remain interpretable.
6. A decline continues to use `/api/not-coming`, but its new response goes to `rsvps_v2`; it has zero attendees and no drink choice. All successful submissions remain new rows with unique IDs. Neither endpoint returns stored RSVP data to the browser.

The existing dynamic route already establishes the right personalization seam: static asset + server-side environment interpolation after auth. Keep the values out of the public root and avoid embedding user-entered drink labels into HTML markup; build option elements with DOM APIs and `textContent`.

## Minimal Schema Needs

Use the existing D1 binding (`DB`) and add a forward-only migration after `0001_add_host_ref.sql`. Suggested logical schema:

```text
rsvps_v2
  id                 TEXT PRIMARY KEY
  name               TEXT NOT NULL
  contact_method     TEXT NULL
  attendees          INTEGER NOT NULL CHECK (attendees >= 0)
  submitted_at       TEXT NOT NULL
  host_ref           INTEGER NOT NULL CHECK (host_ref IN (0, 1))
  drink_option_key   TEXT NULL REFERENCES drink_options(option_key)

drink_options
  option_key         TEXT PRIMARY KEY  -- normalized key
  label              TEXT NOT NULL     -- display form, immutable after insert
  created_at         TEXT NOT NULL
```

- Add a consistency check so declines (`attendees = 0`) have no drink choice and attending groups (`attendees > 0`) have one.
- Seed the fixed, agreed drink choices in the migration. “Sonstiges” is a UI sentinel, not a catalog option; only the submitted custom label becomes an option.
- Make custom option keys unique so case/spacing variants do not create duplicates. Preserve a clear display label and do not rename/delete catalog entries once referenced.
- Keep all old rows in `rsvps` exactly where they are. Do not backfill them into v2 because their historical schema has no drink choice and the project decision is to preserve each submission as recorded.
- If an index is added, keep it targeted to a real D1/dashboard query (likely `submitted_at` or `host_ref`); the initial feature does not need a public RSVP-list endpoint.
- `wrangler.jsonc` already binds the D1 database as `DB` and points migrations at `migrations/`; no new database binding is needed.

## Patterns to Follow

### Append-only migration and submissions
**What:** Add `rsvps_v2` and `drink_options` in a new numbered migration; insert a fresh response for every submission.  
**When:** Always for the v2 RSVP flow.  
**Why:** Preserves the existing audit/history guarantee while avoiding a risky in-place change to the original `rsvps` table. D1 migrations are already part of this repository’s workflow.

### Server-owned validation and host attribution
**What:** Revalidate the chosen option, custom text, attendee count, and name in the Function; obtain `host_ref` only from `X-Host-Ref` added by middleware.  
**When:** On both RSVP and decline writes.  
**Why:** The browser is editable, while the established middleware contract is already the trusted source for the host circle.

### Explicit dynamic-content slots
**What:** Keep markup in `public/rsvp/index.html`; inject only the environment-backed values in `functions/rsvp/index.js`, escaping text and validating URL fields. Render directions as text (with CSS whitespace handling if line breaks matter), not as untrusted HTML.  
**When:** Venue, map, parking/entry directions, and buffet list link.  
**Why:** Extends the current `VENUE_DETAILS` marker pattern without exposing private details on the public hint page or turning the site into a server-rendered framework.

### Preserve the form/API contract where practical
**What:** Keep `/api/rsvp` and `/api/not-coming` as the browser-facing routes, while changing their write target to the v2 table and adding a read-only `/api/drink-options`.  
**When:** Deploying the new invitation.  
**Why:** The existing browser already distinguishes attending and declining; keeping these routes limits churn. Ensure the current page is updated in the same deployment so clients cannot submit an attending record without its required drink selection.

## Anti-Patterns to Avoid

### Rewriting or backfilling the legacy RSVP table
**What:** Add a drink column to `rsvps`, rewrite the old migration, or synthesize old drink choices.  
**Why bad:** Alters the historical record and undermines the explicit “preserve historical rows” requirement.  
**Instead:** Add a separate v2 table and leave existing records/migrations intact.

### Trusting the browser’s custom value or option list
**What:** Accept arbitrary drink values without normalization/length bounds, or treat a hidden form control as proof that the value is valid.  
**Why bad:** Creates duplicates and lets malformed/unbounded input pollute the shared option list.  
**Instead:** Resolve fixed keys against D1; validate and bound custom labels on the server; insert the catalog option only along with a successful RSVP.

### Rendering environment or guest text as HTML
**What:** Concatenate directions or a custom drink label into markup without escaping, or use `innerHTML` for options.  
**Why bad:** Creates an injection/XSS path and departs from the existing safe `textContent` convention.  
**Instead:** Escape server-inserted text and create option elements with DOM APIs. Validate outgoing links as HTTPS and use `rel="noopener noreferrer"` for new tabs.

### Caching personalized output
**What:** Allow CDN/browser caching of `/rsvp/` after server-side personalization.  
**Why bad:** Can serve one guest’s host-specific page to another session and can delay invitation copy changes.  
**Instead:** Preserve the existing `Cache-Control: no-store` response behavior.

### Adding unnecessary architecture
**What:** Move to a SPA, ORM, separate API Worker, or second database for this milestone.  
**Why bad:** Adds deployment and operational surface to a small static invitation without solving a current need.  
**Instead:** Keep Pages file-based routing, prepared D1 statements, and the single D1 binding.

## Scalability Considerations

| Concern | Current event scale | If responses grow |
|---------|---------------------|-------------------|
| Personalized page | One static asset fetched and modified per authenticated page request | Keep page output `no-store`; if interpolation becomes expensive, cache only the unpersonalized asset, never the personalized response. |
| Option loading | Small catalog read on each RSVP page load | Add an ETag/cache policy only if measured; do not cache a user-specific response. |
| Option submissions | Low-volume inserts, deduplicated by normalized key | Keep the unique key constraint and use a D1 batch for catalog + RSVP writes to avoid partial state. |
| RSVP storage | Small append-only table inspected privately in D1 dashboard | Add targeted indexes only for actual admin query patterns; no public read API is in scope. |
| Host identity | Two host circles, conveyed by middleware header | Continue validating only `0`/`1` in each write endpoint; revisit the model only if circles become configurable. |

## Recommended Build Order

1. **Lock field semantics and content:** confirm fixed drink choices, whether declines remain recorded (recommended: yes), directions formatting, and final copy. Preserve the project’s no-RSVP-cap decision: the current browser stepper stops at 10 although the server only requires at least one attendee, so remove/adjust that UI limit rather than silently making it a server rule. Keep schedule static unless it must vary by environment.
2. **Add the D1 migration:** create the append-only v2 response/catalog tables, checks/FK, and initial options; update `schema.sql` as a current schema reference. Apply the migration before deploying code that writes to the new table.
3. **Implement APIs:** add authenticated `GET /api/drink-options`; update attending and decline handlers to write only new submissions into `rsvps_v2`. Validate all input and host attribution server-side. Batch custom-option insertion with the RSVP insert.
4. **Build the invitation page/form:** update `public/rsvp/index.html`, `public/style.css`, and `public/script.js`; add the drink selector and custom input, fetch options, and preserve the existing personalized success/error behavior and safe DOM updates.
5. **Extend personalization and configuration:** update `functions/rsvp/index.js` for `PARK_ENTRY_DIRECTIONS` and `BUFFET_LIST_URL`, retaining existing venue handling, escaping, HTTPS checks, and `no-store`. Configure the named values in the relevant Cloudflare Pages environments without placing private settings on `/`.
6. **Verify and deploy:** test authenticated/unauthenticated paths, both host refs, yes/no records, fixed/custom/repeated custom options, malformed and oversized inputs, link protocol rejection, and the invariant that old `rsvps` rows are unchanged. Apply migration, configure environment values, then deploy the matched Function and static assets.

## Sources

- Repository code reviewed: `functions/_middleware.js`, `functions/rsvp/index.js`, `functions/api/rsvp.js`, `functions/api/not-coming.js`, `public/index.html`, `public/rsvp/index.html`, `public/script.js`, `public/style.css`, `schema.sql`, `migrations/0001_add_host_ref.sql`, and `wrangler.jsonc`.
- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/ (official; updated 2026-11-12; confidence LOW from the configured source-classification seam, used only to corroborate the existing `context.env` pattern).
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/ (official; updated 2026-06-08; confidence LOW from the configured source-classification seam, corroborates numbered SQL migrations).
- Cloudflare D1 database API (`batch()`): https://developers.cloudflare.com/d1/worker-api/d1-database/#batch (official; updated 2026-06-22; supports sequencing RSVP and option writes as a transaction; see source confidence caveat above).
- Cloudflare Pages advanced mode: https://developers.cloudflare.com/pages/functions/advanced-mode/ (official; updated 2026-04-21; consulted to confirm that replacing file-based routing with `_worker.js` would be a larger architectural change and is not recommended here).
