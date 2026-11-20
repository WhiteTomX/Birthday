# Project Research Summary

**Project:** Birthday — v2.0 Actual Invitation  
**Domain:** Password-protected German birthday invitation and group RSVP  
**Researched:** 2026-11-14  
**Confidence:** MEDIUM

## Key Findings

Research supports keeping the existing Cloudflare Pages Functions, D1, and plain HTML/CSS/JavaScript stack. Build the actual invitation into the authenticated `/rsvp/` experience; keep `/` public and free of private logistics. Preserve `INVITE_NAME`, `VENUE_NAME`, and `VENUE_MAP_URL`; add `PARK_ENTRY_DIRECTIONS` and `BUFFET_LIST_URL` as runtime values. Show **5 December at 17:00**, without inventing a year or street address, and provide park-entry directions. German invitation content and the RSVP remain primary.

### Stack and architecture

- **Pages Functions + plain HTML/JS:** extend existing personalization, RSVP APIs, and form; no framework or new service.
- **D1 + additive Wrangler migration:** write this RSVP round to a separate table; leave historical `rsvps` rows and applied migrations untouched.
- **Environment-backed logistics:** escape text, validate external links, keep personalized/private responses `no-store`, and gate new APIs with the existing authentication.
- **Drink choice:** one choice per RSVP group: Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, alkoholfreies Bier, or Sonstiges. A valid Sonstiges submission should become selectable for later respondents. Validate and bound custom text server-side, normalize/deduplicate it, and render it as text.

### Product priorities

**Must have:** formal German invitation; prominent date/time and park logistics without a postal address; accessible, clear RSVP with attendance count and feedback; one group-level drink preference; automatic reuse of accepted Sonstiges entries; fresh responses stored separately; optional buffet-list link with honest wording that drink preferences are not guarantees.

**Defer:** per-person drink choices, live map embeds, payment/booking, response editing, and event-day features.

### Main risks and conflicts to resolve

1. **Legacy data and migration:** use a forward-only migration and verify old rows remain unchanged on populated and clean D1 databases; explicitly apply the migration in production.
2. **Automatic custom choices:** reports differ on storage: derive custom options from successful fresh RSVP rows (simpler) or maintain a normalized, unique `drink_options` catalog with fixed choices seeded there (clearer server-side validation). Choose one coherent model before schema work; do not combine duplicate sources casually.
3. **Declines:** reports disagree on whether declines belong in the fresh table or retain the existing path. Prefer recording both attendance and decline in the fresh round for a coherent history, with no drink choice for declines, but confirm before implementation.
4. **Private content and injection:** keep logistics behind auth; escape all configured text (including `INVITE_NAME`), validate URLs, and use safe DOM APIs for guest-supplied options. Test new routes and caching behavior.
5. **Scope drift:** STATE.md and older requirement text still mention pending venue confirmation or an address. The confirmed milestone scope here supersedes those stale notes: use the confirmed date/time, park map destination, and entry directions, not an invented address.

## Implications for Roadmap

Keep this as **one v2.0 / Phase 09 delivery**, split into dependency-ordered plans rather than unrelated feature phases:

1. **Lock content and data semantics.** Confirm final German copy, required/optional behavior when configuration is absent, whether declines enter the new table, and the custom-option storage/normalization policy. This prevents schema and copy rework.
2. **Add the fresh-round data model.** Create an additive migration and align `schema.sql` as a reference. Preserve `rsvps` history and host attribution. Decide the catalog-versus-derived-options approach before implementing the migration.
3. **Implement and verify RSVP behavior.** Update attendance/decline writes and custom-choice lookup/insertion; keep server validation authoritative, use prepared statements and atomic writes where multiple records are involved, and retain one drink per group.
4. **Complete invitation UI and personalization.** Add the confirmed German invitation, fixed drink choices, Sonstiges behavior, park-entry directions, and optional buffet link while preserving the existing protected flow.
5. **Validate and deploy.** Test both host passwords, unauthenticated access, yes/no submissions, duplicate and malformed custom choices, optional/malformed configuration, and unchanged legacy rows. Apply the migration explicitly to the intended production D1 database.

**Research flags:** Phase 09 planning should resolve the response/catalog schema, decline handling, and configuration fallback/copy behavior. The established Pages Functions, D1 migration, HTML escaping, and form accessibility patterns need no broad additional research; verify Cloudflare operational details against the project's installed Wrangler and deployment procedure.

## Sources

- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, and `PITFALLS.md` (primary synthesis inputs).
- `.planning/STATE.md` and `.planning/PROJECT.md` (active v2.0 scope and existing decisions).
- Repository evidence cited by the reports: existing Pages Functions, RSVP assets/APIs, `migrations/0001_add_host_ref.sql`, `schema.sql`, and `wrangler.jsonc`. `.dev.vars` and secret values were not accessed.
- Cloudflare Pages Functions and D1 documentation cited in the reports; official documentation was classified LOW confidence by the research provider, so deployment/version details should be verified during planning.
- W3C WAI form-label and notification guidance cited in `FEATURES.md`; provider confidence LOW.

---
*Research completed: 2026-11-14*  
*Ready for roadmap: yes*
