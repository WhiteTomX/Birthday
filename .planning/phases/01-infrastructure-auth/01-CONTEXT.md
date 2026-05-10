# Phase 1: Infrastructure & Auth - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the Cloudflare Pages site with a Worker that enforces HTTP Basic Auth on all requests. Every visitor is shown a browser-native login prompt until they enter the correct shared password. A minimal German placeholder page is served to authenticated users. No RSVP functionality, no D1 database — auth and infrastructure only.

</domain>

<decisions>
## Implementation Decisions

### Deployment Workflow
- **D-01:** Cloudflare Pages connected directly to the GitHub repository — pushing to `main` triggers an automatic production deploy.
- **D-02:** Preview branches are also deployed automatically (PRs and feature branches get Cloudflare preview URLs).
- **D-03:** Basic Auth is enforced on **all** preview deployments, not just production — no unauthenticated access anywhere.

### Password Management
- **D-04:** The site password is stored as a Cloudflare secret / environment variable (set via Cloudflare dashboard or `wrangler secret put`). The password is **never** committed to source code.
- **D-05:** Password validation is plain-text comparison in the Worker (no hashing). Acceptable for a personal event site.
- **D-06:** Single shared password for all guests.
- **D-07:** Failed auth attempt logging is **deferred** — D1 is not set up in Phase 1. Logging will be evaluated when D1 is introduced in Phase 3.

### Protected Scope
- **D-08:** Basic Auth protects **all** requests — the Worker intercepts every route including static assets (CSS, images, JS). Nothing loads before the user authenticates.

### Phase 1 Placeholder Page
- **D-09:** A minimal German "coming soon" placeholder page is served to authenticated users. Purpose is only to confirm auth works — not a presentable design.
- **D-10:** All placeholder text is in German, consistent with the rest of the site.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Technical approach, constraints, key decisions (Basic Auth via Worker, plain HTML/CSS/JS, Cloudflare free tier, Cloudflare Pages hosting)
- `.planning/REQUIREMENTS.md` — AUTH-01 and AUTH-02 are the requirements for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria (browser native login prompt on unauth, correct password grants access, wrong password rejected)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None yet — this phase establishes the first patterns.

### Integration Points
- The Worker auth middleware must be in place before Phase 2 adds content — Phase 2 builds on top of Phase 1's infrastructure.

</code_context>

<specifics>
## Specific Ideas

- The browser-native Basic Auth dialog is the intended UX — no custom login page.
- Placeholder page language: German (e.g. "Seite wird bald verfügbar sein" or similar).

</specifics>

<deferred>
## Deferred Ideas

- **Failed auth attempt logging to D1** — user requested this during discussion, but D1 is deferred to Phase 3. Revisit when D1 is set up.

</deferred>

---

*Phase: 1-Infrastructure & Auth*
*Context gathered: 2026-05-10*
