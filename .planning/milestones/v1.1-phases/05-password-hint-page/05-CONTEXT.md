# Phase 5: password-hint-page - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the plain-text "Unauthorized" response in `functions/_middleware.js` with a warm, festive HTML page returned as the 401 body. The page shows a German birthday riddle with a heading, and matches the main site's visual palette. The middleware auth logic itself is unchanged — only the `unauthorizedResponse()` function is updated. Both auth failure cases (no credentials, wrong credentials) receive the same HTML response.

</domain>

<decisions>
## Implementation Decisions

### The Riddle
- **D-01:** The riddle hints that **the password is the user's birthday** — not the specific date. Invited guests who know whose birthday is being celebrated will figure it out.
- **D-02:** Riddle format: warm & explanatory. Approved riddle text (German):
  > *Ich komme einmal im Jahr.*
  > *Man bäckt mir einen Kuchen, zündet Kerzen an und singt für mich.*
  > *Wer eingeladen ist, kennt mein Datum —*
  > *und kennt damit auch das Passwort.*
- **D-03:** The riddle does NOT hint at the specific date format (day+month). It only hints at the concept (birthday). Guests who know the birthday date will know what to enter.

### Page Content
- **D-04:** Page has two elements: a **heading** above the riddle, and the **riddle text** itself. No additional content (no contact hint, no decorative elements).
- **D-05:** Heading text (German): **"Psst — ein kleines Rätsel für dich"**

### Visual Style
- **D-06:** Minimal style. Same background (`#FDF4E8`) and font stack as the main site, but very clean: heading and riddle in dark text (`#2D1510`), no extra decoration, no emojis, no accent colors, no festive touches.
- **D-07:** CSS is fully inlined in the HTML string returned by the Worker — `public/style.css` is auth-gated and cannot be loaded as a sub-resource (per AUTH-05 constraint).

### HTTP Response
- **D-08:** The 401 response includes `Cache-Control: no-store` (per AUTH-07) and `Content-Type: text/html; charset=utf-8`.

### Architecture (revised — 2026-05-10)
- **D-09:** The hint page is served at `/` as a **200 response** (no auth challenge). Returning a 401 at the root causes browsers to show the native auth dialog *before* the page body, defeating the purpose.
- **D-10:** `/rsvp/` is the new home for the RSVP page (current `public/index.html` moves to `public/rsvp/index.html` with absolute resource paths `/style.css` and `/script.js`).
- **D-11:** `functions/_middleware.js` skips auth for `pathname === '/'` (and `'/index.html'`). All other unauthenticated routes still return 401 + `WWW-Authenticate: Basic` + hint page HTML as body (covers AUTH-04: wrong creds at `/rsvp/` → cancel → user sees hint page).
- **D-12:** The hint page includes a call-to-action button linking to `/rsvp/` with text **"Zur Einladung →"**. Clicking it triggers the browser's Basic Auth dialog for `/rsvp/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Technical approach (plain HTML/CSS/JS, no framework, no build step), constraints, established auth pattern
- `.planning/REQUIREMENTS.md` — Phase 5 requirements: AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07 (all requirements for this phase)
- `.planning/ROADMAP.md` — Phase 5 success criteria and phase goal

### Auth Middleware
- `functions/_middleware.js` — The file to modify. Contains `unauthorizedResponse()` which returns plain text today; this function must return a full HTML response after this phase. Auth logic above it (`onRequest`) is unchanged.

### Design Reference
- `public/style.css` — CSS variables and typography to replicate inline (`:root` tokens: `--bg: #FDF4E8`, `--text: #2D1510`, `--font: system font stack`). Read this before writing the inline styles.

### Prior Phase Context
- `.planning/phases/03-rsvp-backend/03-CONTEXT.md` — Established patterns: German throughout, plain HTML/CSS/JS, no framework
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Auth middleware structure and decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `functions/_middleware.js` `unauthorizedResponse()` — the exact function to update. Currently 7 lines returning `new Response("Unauthorized", ...)`. Replace the body with an HTML response.
- `public/style.css` `:root` block — CSS variable values to copy inline into the hint page's `<style>` tag.

### Established Patterns
- **No external CSS load:** `style.css` is protected by the same auth middleware — never load it as a `<link>` in the hint page. Inline all styles.
- **Plain HTML string in Worker:** No templating engine, no imports — return a template literal string as the response body.
- **German throughout:** All visible text must be in German.
- **`Content-Type: text/html`:** Required so browsers render the HTML rather than displaying it as text.

### Integration Points
- `functions/_middleware.js` — Only file to modify. `unauthorizedResponse()` is called in two places: when no `Authorization` header is present, and when the password doesn't match. Both cases get the same HTML page.

</code_context>

<specifics>
## Specific Ideas

- Heading copy (exact): `"Psst — ein kleines Rätsel für dich"`
- Riddle copy (exact, four lines):
  ```
  Ich komme einmal im Jahr.
  Man bäckt mir einen Kuchen, zündet Kerzen an und singt für mich.
  Wer eingeladen ist, kennt mein Datum —
  und kennt damit auch das Passwort.
  ```
- Layout: centered single column, max-width ~600px, comfortable padding — mirrors the main site's `.container` approach.
- Background: `#FDF4E8` (same as main site `--bg` token)
- Text: `#2D1510` (same as main site `--text` token)
- Font: same system font stack as main site

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-password-hint-page*
*Context gathered: 2026-05-10*
