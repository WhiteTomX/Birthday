<!-- GSD Configuration — managed by gsd-core installer -->
# Instructions for GSD

- Use the gsd-core skill when the user asks for GSD or uses a `gsd-*` command.
- Treat `/gsd-...` or `gsd-...` as command invocations and load the matching file from `.github/skills/gsd-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply GSD workflows unless the user explicitly asks for them.
- After completing any `gsd-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
<!-- /GSD Configuration -->

# Birthday Project — Claude Instructions

## Local Dev Server

Start the local dev server with:

```
wrangler pages dev --port 8788
```

The server serves on `http://localhost:8788`. Auth is Basic Auth — credentials come from `.dev.vars`. Use `Authorization: Basic <base64(user:password)>` or navigate via browser (it will prompt).

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

The site uses Basic Auth enforced by `functions/_middleware.js`. Passwords (from `.dev.vars`). Either password grants access. Username can be anything.

**CRITICAL — Chrome DevTools MCP auth pattern:**

Do NOT navigate directly to authenticated pages with credentials embedded in the URL (e.g. `http://x:Password@localhost:8788/rsvp/`). Chrome blocks all `fetch()` calls from pages loaded that way — relative URLs resolve to include the credentials, and Chrome throws `"Request cannot be constructed from a URL that includes credentials"`.

Correct two-step pattern:

```
1. navigate_page(url: 'http://x:Password@localhost:8788/rsvp/')  // authenticate — stores credentials in Chrome
2. navigate_page(url: 'http://localhost:8788/rsvp/')                    // load page cleanly — Chrome sends stored credentials, fetch works
```

This pattern works because Chrome stores the Basic Auth credentials for `localhost:8788` after step 1, then uses them automatically for the page load in step 2 — and fetch calls from a clean URL page are unrestricted.

## D1 Migrations

The `migrations/` directory contains versioned SQL migrations managed by Wrangler (`migrations_dir` is set in `wrangler.jsonc`).

**Apply migrations locally** (against the local D1 replica used by `wrangler pages dev`):

```
wrangler d1 migrations apply birthday-rsvps --local
```

**Update the preview D1 database** when a PR adds or changes migrations needed by the Pages preview. Before preview UAT, inspect the pending migrations and apply them to the `preview` environment's `DB` binding (`birthday-rsvps-preview`):

```
wrangler d1 migrations list DB --env preview --remote
wrangler d1 migrations apply DB --env preview --remote
```

Run the local command whenever you create a migration or set up a fresh local environment. For a migration-bearing PR, apply only the expected pending migrations to preview and include the target and migration results in the PR description. Cloudflare Pages does not apply D1 migrations automatically.

**Apply migrations to production** only after the schema PR is merged, all required local checks pass, the production `DB` target is confirmed, and the owner explicitly authorizes the production change. Inspect the complete migration list first; stop if any earlier or unrelated migration is pending, or the result is unclear:

```
wrangler d1 migrations list DB --remote
wrangler d1 migrations apply DB --remote
```

Never use the production command to prepare or test a PR preview. Production migration and configuration changes remain subject to the gates in `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-05-PLAN.md`.

## Stack

- Cloudflare Pages + Pages Functions (`functions/`)
- D1 SQLite database (binding: `DB`)
- Plain HTML/CSS/JS in `public/` — no build step
- `wrangler.jsonc` for config

## Workflow

1. Create branch for changes
2. Work
3. Create PR
4. Check automatically deployed preview page using the passwords in `.dev.vars`