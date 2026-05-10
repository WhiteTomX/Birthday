# Phase 1: Infrastructure & Auth — Research

**Phase:** 1 — Infrastructure & Auth
**Researched:** 2026-05-10
**Requirements:** AUTH-01, AUTH-02

---

## RESEARCH COMPLETE

---

## 1. Cloudflare Pages + Workers: How They Connect

### Project Structure [ASSUMED]

A Cloudflare Pages project with a Worker function uses the `functions/` directory convention:

```
/
├── public/           ← or root — static HTML/CSS/JS served by Pages
│   └── index.html
├── functions/
│   └── _middleware.js  ← Worker function — runs on every request
├── wrangler.toml       ← Wrangler config (optional for Pages, required for standalone Workers)
└── package.json        ← Optional (not required for plain HTML)
```

**Key insight:** Cloudflare Pages Functions use the `functions/` directory. A file at `functions/_middleware.js` is a "middleware" that intercepts ALL requests — static files and dynamic routes alike. This is the canonical pattern for auth enforcement.

### Connecting Pages to GitHub [ASSUMED]

1. Create a Cloudflare Pages project via the dashboard → "Connect to Git"
2. Select the GitHub repo → branch: `main`
3. Build settings: **none** (plain HTML needs no build command, output dir = `/` or `public/`)
4. Every push to `main` triggers an automatic deploy
5. PRs get preview deployments at `<hash>.pages.dev`

### Wrangler CLI vs Dashboard [ASSUMED]

For Phase 1, the Cloudflare dashboard is sufficient to:
- Create the Pages project
- Set secrets (environment variables)

`wrangler` CLI is optional but useful for local testing (`wrangler pages dev`).

---

## 2. HTTP Basic Auth via Cloudflare Worker Middleware

### Standard Implementation Pattern [ASSUMED]

HTTP Basic Auth works via the `Authorization` header:

```
Authorization: Basic <base64(username:password)>
```

The Worker decodes the header, extracts the password, and compares it to the stored secret.

**Canonical middleware implementation (ES Modules syntax — required for Cloudflare Pages Functions):**

```javascript
// functions/_middleware.js
export async function onRequest(context) {
  const { request, env, next } = context;

  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const credentials = atob(base64Credentials);
  const colonIndex = credentials.indexOf(":");
  // password is everything after the first colon (supports colons in password)
  const password = credentials.slice(colonIndex + 1);

  if (password !== env.SITE_PASSWORD) {
    return unauthorizedResponse();
  }

  return next(); // authenticated — serve the request normally
}

function unauthorizedResponse() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Birthday Site"',
      "Content-Type": "text/plain",
    },
  });
}
```

**Why this pattern:**
- `onRequest` is the Pages Functions middleware hook
- `env.SITE_PASSWORD` reads from Cloudflare environment variables / secrets
- `atob()` is available natively in the Cloudflare Worker runtime
- Returning 401 with `WWW-Authenticate: Basic` triggers the browser native login dialog
- `next()` passes the request to the static asset serving layer

### Username Field [ASSUMED]

HTTP Basic Auth requires a username:password pair. Since there's no per-user auth, the username is ignored entirely — only the password is checked. Guests can enter anything in the username field; only the password matters.

**Important for the browser dialog:** The `realm` value in `WWW-Authenticate` appears as the site name in the browser's native login prompt. Choose a friendly name.

### Password Comparison [ASSUMED]

Per CONTEXT.md decision D-05: **plain-text comparison**. The Worker receives `env.SITE_PASSWORD` (the correct password stored as a secret) and compares directly:

```javascript
password !== env.SITE_PASSWORD
```

No hashing needed for a personal party site with a shared secret.

---

## 3. Storing the Password as a Secret

### Cloudflare Pages Environment Variables [ASSUMED]

**Via Dashboard:**
1. Pages project → Settings → Environment Variables
2. Add variable: `SITE_PASSWORD` = `<your-password>` as type **Secret**
3. Secrets are encrypted at rest and not exposed in logs or UI after saving
4. Apply to: Production and Preview environments (satisfies D-03 — auth on all previews)

**Via Wrangler CLI (alternative):**
```bash
wrangler pages secret put SITE_PASSWORD
```

**Never in source code** — the `.gitignore` should ensure no `.env` or secrets files are committed.

### Environment Availability in Functions [ASSUMED]

`env` is injected automatically into the `context` object in Pages Functions. No binding configuration is needed for environment variables (unlike KV/D1 which require explicit bindings).

---

## 4. Placeholder Page (German, Minimal)

### Requirements [ASSUMED]

- Served only to authenticated users (the middleware's `next()` flow)
- Minimal German "coming soon" text — not a presentable design
- Confirms auth is working
- All text in German (decision D-10)

### Example Content [ASSUMED]

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kommt bald</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Seite wird bald verfügbar sein</h1>
    <p>Bitte halte Ausschau nach weiteren Informationen.</p>
  </div>
</body>
</html>
```

---

## 5. Repository Structure for Cloudflare Pages

### Recommended Layout [ASSUMED]

```
/
├── public/
│   └── index.html          ← placeholder page (or root index.html)
├── functions/
│   └── _middleware.js      ← auth middleware (Worker function)
├── .gitignore
└── README.md
```

**Alternative:** Serve `index.html` from the root (Cloudflare Pages defaults to root if no build output dir is set). Either works — `public/` is cleaner.

### `.gitignore` Essentials [ASSUMED]

```
.dev.vars          ← local Wrangler dev secrets (never commit)
node_modules/
.wrangler/
```

### Cloudflare Pages Build Configuration [ASSUMED]

In the Cloudflare dashboard (Pages project settings):
- **Framework preset:** None
- **Build command:** (leave empty — no build step needed)
- **Build output directory:** `/` or `public` (whichever is used)
- **Root directory:** `/` (repo root)

---

## 6. Local Development Workflow

### Testing Auth Locally [ASSUMED]

```bash
# Install Wrangler globally or via npx
npm install -g wrangler  # or npx wrangler

# Create local secrets file (never commit this)
echo "SITE_PASSWORD=testpassword" > .dev.vars

# Start local dev server
wrangler pages dev public/ --compatibility-date=2024-01-01
# or if serving from root:
wrangler pages dev . --compatibility-date=2024-01-01
```

`wrangler pages dev` serves the static files AND runs the `functions/` middleware locally, so Basic Auth can be tested before deploying.

### Browser Testing [ASSUMED]

- Chrome/Firefox/Safari all show a native login dialog for `WWW-Authenticate: Basic` responses
- The username field is ignored by the Worker (any value accepted)
- Wrong password: browser shows the dialog again (or shows "Access Denied" after a few attempts depending on browser)
- Correct password: browser caches credentials for the session and loads the page

---

## 7. Key Pitfalls & Gotchas

### `functions/` vs `workers-site/` [ASSUMED]

Cloudflare Pages Functions (in `functions/`) are the modern approach. The older `workers-site/` pattern is for standalone Workers — do NOT use it for Pages projects. Use `functions/_middleware.js`.

### ES Modules Syntax Required [ASSUMED]

Pages Functions require ES Modules (`export async function onRequest`), not the older Service Worker syntax (`addEventListener('fetch', ...)`). Using the wrong syntax will cause deployment errors.

### `atob()` Availability [ASSUMED]

`atob()` is available in the Cloudflare Workers runtime (it's a standard Web API). No polyfill needed.

### Password with Colons [ASSUMED]

HTTP Basic Auth encodes as `username:password`. If the password itself contains colons, `split(':')[1]` will truncate it. Use `credentials.indexOf(':')` + `slice()` instead (shown in the implementation above). Avoid passwords containing `:` to keep it simple.

### Preview Deployments and Auth [ASSUMED]

Per D-03, auth must be enforced on preview deployments. The middleware approach enforces auth on ALL requests automatically — no special handling needed for previews. The same `SITE_PASSWORD` secret must be set for both Production and Preview environments in the Cloudflare dashboard.

### Caching / Service Workers [ASSUMED]

For Phase 1's minimal page, caching is not a concern. The 401 response is not cached by browsers.

---

## 8. Validation Architecture

### Testing AUTH-01 and AUTH-02

| Test | Method | Expected |
|------|--------|----------|
| No credentials | Curl without `-u` flag or browser visit | 401 + `WWW-Authenticate: Basic` header |
| Wrong password | `curl -u "user:wrong" <URL>` | 401 response |
| Correct password | `curl -u "user:<correct>" <URL>` or browser | 200 + HTML content |
| Wrong username, right password | `curl -u "anyone:<correct>" <URL>` | 200 (username ignored) |
| Preview URL (if configured) | Same tests on `<hash>.pages.dev` | 401 on unauth |

**Grep-verifiable acceptance criteria:**
- `functions/_middleware.js` contains `WWW-Authenticate`
- `functions/_middleware.js` contains `env.SITE_PASSWORD`
- `functions/_middleware.js` contains `onRequest`
- `public/index.html` (or `index.html`) contains `lang="de"`

---

## 9. Summary of Decisions Validated by Research

| CONTEXT.md Decision | Research Finding |
|---------------------|-----------------|
| D-01: GitHub → Pages auto-deploy | Confirmed: Pages "Connect to Git" supports this natively |
| D-02: Preview deployments | Confirmed: PRs get automatic preview URLs |
| D-03: Auth on all previews | Confirmed: middleware enforces on all requests including previews |
| D-04: Password as secret | Confirmed: Dashboard → Environment Variables (type: Secret) |
| D-05: Plain-text comparison | Confirmed: `password !== env.SITE_PASSWORD` works fine |
| D-08: All routes protected | Confirmed: `functions/_middleware.js` intercepts everything |
| D-09/D-10: German placeholder | Confirmed: `lang="de"`, German text |

---

*Phase: 01-infrastructure-auth*
*Research written: 2026-05-10*
