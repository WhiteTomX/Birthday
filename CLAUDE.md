# Birthday Project — Claude Instructions

## Local Dev Server

Start the local dev server with:

```
wrangler pages dev --port 8788
```

The server serves on `http://localhost:8788`. Auth is Basic Auth — credentials come from `.dev.vars` (`SITE_PASSWORD__0=geburtstag1`, `SITE_PASSWORD__1=geburtstag2` — either password grants access). Use `Authorization: Basic <base64(user:password)>` or navigate via browser (it will prompt).

The RSVP form is at `http://localhost:8788/rsvp/`.

## UAT Testing — Use Chrome DevTools MCP

When running `/gsd-verify-work`, use the `chrome-devtools` MCP tools to drive tests autonomously rather than asking the user to do it manually:

- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page` — load pages
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot` — capture visual state
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__click` / `fill` / `evaluate_script` — interact with the UI
- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests` — verify API calls and payloads

Only ask the user to verify manually for things that require physical access or external systems (e.g. checking D1 database rows in the Cloudflare dashboard).

**Important:** The chrome-devtools MCP server itself is a node process. When debugging server issues, target specific PIDs rather than killing all node processes — `Stop-Process -Id <pid>` — to avoid disconnecting the MCP server.

## Auth for Local Testing

The site uses Basic Auth enforced by `functions/_middleware.js`. Passwords (from `.dev.vars`): `SITE_PASSWORD__0=geburtstag1` or `SITE_PASSWORD__1=geburtstag2`. Either password grants access. Username can be anything.

**CRITICAL — Chrome DevTools MCP auth pattern:**

Do NOT navigate directly to authenticated pages with credentials embedded in the URL (e.g. `http://x:geburtstag1@localhost:8788/rsvp/`). Chrome blocks all `fetch()` calls from pages loaded that way — relative URLs resolve to include the credentials, and Chrome throws `"Request cannot be constructed from a URL that includes credentials"`.

Correct two-step pattern:

```
1. navigate_page(url: 'http://x:geburtstag1@localhost:8788/rsvp/')  // authenticate — stores credentials in Chrome
2. navigate_page(url: 'http://localhost:8788/rsvp/')                    // load page cleanly — Chrome sends stored credentials, fetch works
```

This pattern works because Chrome stores the Basic Auth credentials for `localhost:8788` after step 1, then uses them automatically for the page load in step 2 — and fetch calls from a clean URL page are unrestricted.

Note: `geburtstag2` works equally as the password in step 1.

## D1 Migrations

The `migrations/` directory contains versioned SQL migrations managed by Wrangler (`migrations_dir` is set in `wrangler.jsonc`).

**Apply migrations locally** (against the local D1 replica used by `wrangler pages dev`):

```
wrangler d1 migrations apply birthday-rsvps --local
```

**Apply migrations to production** (Cloudflare D1 — requires `wrangler login`):

```
wrangler d1 migrations apply birthday-rsvps
```

Run the local migration command whenever you create a new migration file or set up a fresh local environment. Run the production command as part of every production deployment that includes schema changes.

## Stack

- Cloudflare Pages + Pages Functions (`functions/`)
- D1 SQLite database (binding: `DB`)
- Plain HTML/CSS/JS in `public/` — no build step
- `wrangler.jsonc` for config
