# Technology Stack Implications

**Project:** Birthday — v2.0 Actual Invitation  
**Researched:** 2026-11-14  
**Scope:** New venue/logistics environment values and fresh RSVP drink selections only  
**Overall confidence:** MEDIUM — repository architecture is directly confirmed; external documentation claims are LOW-confidence per the research-provider classifier and are cited for follow-up.

## Recommendation

Keep the existing Cloudflare Pages Functions + D1 + plain HTML/CSS/JavaScript stack. This milestone needs an additive D1 migration and small changes to the existing RSVP GET/POST flow, not a framework, ORM, external service, or new Cloudflare product.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Pages Functions | Existing deployment | Authenticated invitation rendering and RSVP API | `functions/rsvp/index.js` already renders the RSVP page using `context.env`; `functions/api/rsvp.js` already validates and persists submissions. Extend these paths rather than creating another application tier. |
| Plain HTML/CSS/JavaScript | No package version | Invitation form and interactions | The existing site has no build step or runtime framework. Native browser APIs can populate drink choices and submit JSON. Use `textContent`/`new Option()` for user-provided drink labels; do not interpolate them into executable markup. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare D1 (SQLite) | Existing database and `DB` binding | Persist fresh RSVP confirmations and drink selections | The existing `birthday-rsvps` database is already bound to Pages Functions. A second database or storage service adds no value for this small append-only dataset. |
| Wrangler D1 migrations | Existing `migrations_dir`; Wrangler version not pinned in the repository | Add the fresh-confirmation schema | Add one numbered, additive SQL migration in `migrations/` (after `0001_add_host_ref.sql`). Do not update/delete/backfill historical `rsvps` rows. The repository documents manual local and production migration application; preserve that deployment step. |

### Infrastructure and Configuration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing `wrangler.jsonc` | JSONC config support is documented for Wrangler 3.91.0+ | Pages output and existing D1 binding/migration directory | Keep the current `DB` binding and `migrations_dir`; no new binding is needed. The repo does not pin Wrangler, so use the project's installed Wrangler rather than adding a second toolchain. |
| Pages environment variables | Cloudflare Pages runtime configuration | Invitation venue/logistics content | Continue reading `VENUE_NAME` and `VENUE_MAP_URL`; also read `PARK_ENTRY_DIRECTIONS` and `BUFFET_LIST_URL` from `context.env`. Configure the two new values in the relevant Pages environments and local development configuration. Do not put deployment-specific values into source or commit local environment files. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | No runtime or development dependency is needed for these capabilities. Existing Workers-native `URL`, `Response`, `crypto.randomUUID()`, prepared D1 statements, and HTML escaping are sufficient. |

## Data and Integration Recommendations

1. **Keep the legacy and current RSVP datasets separate.** Add a new table for fresh confirmations and write new affirmative RSVP submissions there. Do not rewrite, migrate, or delete existing `rsvps` records. A fresh confirmation row should represent one RSVP group and contain one drink selection, plus the fields needed to preserve current RSVP behavior (for example: ID, name, optional contact method, attendee count, `host_ref`, submission time, selected drink, and whether it was custom).
2. **Do not add a separate drink-catalog table initially.** Keep built-in drink choices in the static form. Store a `drink_is_custom` flag with the submitted drink label; on the authenticated RSVP page, query distinct previously submitted custom labels and expose those as options for subsequent respondents. Trim and length-limit free text on the server, deduplicate case-insensitively for display, and continue treating values as untrusted text. If the optional custom-choice query fails, render the normal form with built-in choices rather than failing the entire page. This satisfies “Sonstiges becomes selectable” while preserving the original custom label and avoiding synchronization state across two tables.
3. **Keep the submission atomic and append-only.** Use the existing prepared-statement/`.bind()` pattern and a new unique ID for each group confirmation. If implementation deliberately writes the same new submission to multiple tables, use D1 `batch()` so the writes succeed or roll back together; otherwise avoid duplicate writes to the historical table.
4. **Inject only validated, escaped configuration.** Render park directions as escaped text. Parse `BUFFET_LIST_URL` and `VENUE_MAP_URL` with `URL`, allow HTTPS only, and escape any rendered URL/label. Missing or invalid optional values should omit their section/link rather than break the RSVP page. The current GET response already sets `Cache-Control: no-store`; preserve that behavior for environment-personalized or database-enriched HTML.
5. **Keep dynamic drink choices private to the gated page.** The middleware protects `/rsvp/` and API routes. Do not add a public endpoint exposing custom selections or RSVP data. The existing RSVP GET handler can provide the choices from D1; avoid a new service solely to serve this small list.
6. **Keep the migration operationally explicit.** Test the additive migration against the local D1 database, then apply it to production using the documented manual Wrangler migration workflow. If `schema.sql` remains a bootstrap/reference schema, keep its representation aligned with the resulting schema without using it to replace production data.

## Configuration and Installation

No packages or services to install.

| Variable | Use | Configuration recommendation |
|----------|-----|-------------------------------|
| `VENUE_NAME` | Existing venue name | Continue using the current Pages environment value. |
| `VENUE_MAP_URL` | Existing venue map link | Continue using the current value; retain HTTPS validation. |
| `PARK_ENTRY_DIRECTIONS` | Park/arrival directions | Add as a Pages runtime variable in preview/production and a local development value; render as escaped text. |
| `BUFFET_LIST_URL` | Buffet-list link | Add as a Pages runtime variable in preview/production and a local development value; validate HTTPS before rendering. |

Values were not inspected. Keep local environment files out of source control and configure variables consistently in preview and production.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database | Existing D1 database with a new table | New database, KV, or external database | The existing D1 binding and migration workflow already serve this data shape; another store increases configuration and operational burden. |
| Drink choices | Distinct custom labels from fresh confirmation rows | Separate catalog table or KV namespace | A second catalog requires synchronization and extra writes. Add it only if choices need independent moderation, editing, or lifecycle management. |
| Application framework | Existing Pages Functions and static files | Add a frontend framework or ORM | No build step or richer data model is required; new dependencies increase deployment and maintenance complexity. |
| Invitation values | Pages runtime variables | Hard-code values in HTML/Wrangler or fetch from another service | Runtime variables fit the existing `env` pattern and let venue/logistics copy change without changing the app architecture. |

## Version and Compatibility Notes

- `wrangler.jsonc` already defines `pages_build_output_dir`, the `DB` binding, and `migrations_dir`; leave these intact.
- Cloudflare's Pages configuration documentation says Wrangler 3.91.0+ supports JSON/JSONC configuration files. This is a tooling compatibility note, not a reason to pin or upgrade Wrangler unless the local/CI version cannot read the existing config.
- No compatibility-date change is indicated: the code uses APIs already present in this project. Avoid changing `compatibility_date` as part of this feature without a separate compatibility need.
- Pages environment variables and bindings are supplied through the Pages runtime environment. Confirm both preview and production values are set and redeploy after changing deployment configuration.

## Sources

Repository evidence inspected: `.planning/PROJECT.md`, `.planning/STATE.md`, `functions/rsvp/index.js`, `functions/api/rsvp.js`, `functions/api/not-coming.js`, `functions/_middleware.js`, `migrations/0001_add_host_ref.sql`, `schema.sql`, `wrangler.jsonc`, `public/rsvp/index.html`, and `public/script.js`. `.dev.vars` was not read.

External documentation was fetched from Cloudflare's official documentation. Provider classification returned LOW confidence, so these references support verification and are not treated as conclusive on their own:

- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/) — updated 2026-11-12.
- [Pages Functions Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) — updated 2026-06-25; includes JSONC/Wrangler version guidance.
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) — updated 2026-06-08.
- [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/) — updated 2026-11-10.
- [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/d1-database/) — updated 2026-06-22; documents prepared statements and transactional batches.
- [Wrangler D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/) — updated 2026-04-23.
- [Workers web standards](https://developers.cloudflare.com/workers/runtime-apis/web-standards/) — updated 2026-04-23.

## Open Implementation Decisions

- Confirm whether new declines also belong in the fresh-confirmation table or remain on the existing decline path.
- Confirm if custom drink options should be shared between both host circles; current recommendation assumes a shared event-wide option list.
- Decide a reasonable maximum length for custom drink text and whether hosts need a way to remove an inappropriate or obsolete custom option.
