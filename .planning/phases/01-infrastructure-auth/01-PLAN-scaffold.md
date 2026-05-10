---
phase: 01-infrastructure-auth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - functions/_middleware.js
  - public/index.html
  - .gitignore
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02

must_haves:
  truths:
    - "Auth middleware returns 401 + WWW-Authenticate header for requests with no Authorization header"
    - "Auth middleware returns 401 for requests with an incorrect password"
    - "Auth middleware calls next() and serves content when the correct password is supplied"
    - "Password is read from env.SITE_PASSWORD — never hardcoded in source"
    - "Authenticated users receive a minimal German-language placeholder page"
    - ".gitignore prevents .dev.vars and Wrangler artefacts from being committed"
  artifacts:
    - path: "functions/_middleware.js"
      provides: "Basic Auth enforcement on every request (static and dynamic)"
      exports: ["onRequest"]
    - path: "public/index.html"
      provides: "German placeholder page served to authenticated users"
      contains: 'lang="de"'
    - path: ".gitignore"
      provides: "Exclusion of local secrets and build artefacts"
      contains: ".dev.vars"
  key_links:
    - from: "functions/_middleware.js"
      to: "env.SITE_PASSWORD"
      via: "context.env binding injected by Cloudflare Pages Functions runtime"
      pattern: "env\\.SITE_PASSWORD"
    - from: "functions/_middleware.js"
      to: "WWW-Authenticate response header"
      via: "unauthorizedResponse() helper"
      pattern: "WWW-Authenticate"
    - from: "functions/_middleware.js"
      to: "static asset serving"
      via: "context.next() call on successful auth"
      pattern: "next\\(\\)"
---

<objective>
Create the three source files that implement Phase 1 auth: the Cloudflare Pages Functions
middleware that enforces HTTP Basic Auth on every request, the minimal German placeholder page
served to authenticated users, and a .gitignore that keeps secrets out of the repository.

Purpose: Establish the auth layer that protects the entire site (AUTH-01, AUTH-02). Phase 2
builds content on top of this foundation — the middleware must be correct before any content
is added.

Output:
- functions/_middleware.js — Worker middleware (ES Modules, onRequest)
- public/index.html       — German "coming soon" placeholder
- .gitignore              — Excludes .dev.vars, .wrangler/, node_modules/
</objective>

<execution_context>
@.github/get-shit-done/workflows/execute-plan.md
@.github/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auth middleware (functions/_middleware.js)</name>
  <files>functions/_middleware.js</files>

  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md
      (Section 2: canonical onRequest implementation; Section 7: ES Modules requirement,
       atob() usage, colon-safe password extraction)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md
      (D-05: plain-text comparison; D-08: all routes protected including static assets)
  </read_first>

  <action>
Create the directory `functions/` and the file `functions/_middleware.js` with EXACTLY the
following content. Do not deviate — every detail is load-bearing:

```javascript
// functions/_middleware.js
// HTTP Basic Auth middleware for Cloudflare Pages Functions.
// Intercepts every request (static assets and dynamic routes) before serving.
// Per D-08: nothing is served until the user authenticates.
// Per D-05: plain-text comparison against env.SITE_PASSWORD (set as a Cloudflare secret).

export async function onRequest(context) {
  const { request, env, next } = context;

  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const credentials = atob(base64Credentials);
  // Use indexOf + slice (not split) to handle colons in the password safely.
  const colonIndex = credentials.indexOf(":");
  const password = credentials.slice(colonIndex + 1);

  if (password !== env.SITE_PASSWORD) {
    return unauthorizedResponse();
  }

  return next();
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

Implementation notes:
- `export async function onRequest` — ES Modules syntax required by Pages Functions.
  Do NOT use the Service Worker `addEventListener('fetch', ...)` syntax.
- `atob()` — available natively in the Cloudflare Workers runtime; no import needed.
- `context.next()` — passes the authenticated request to the static asset layer.
- `env.SITE_PASSWORD` — injected automatically by the Pages Functions runtime from
  Cloudflare Environment Variables. No wrangler.toml binding needed for plain env vars.
- The `realm` value ("Birthday Site") appears as the site name in the browser login dialog.
  </action>

  <verify>
    <automated>
      # File exists
      Test-Path "functions/_middleware.js"

      # Contains the Pages Functions export
      grep -c "export async function onRequest" functions/_middleware.js

      # Reads password from env (never hardcoded)
      grep -c "env\.SITE_PASSWORD" functions/_middleware.js

      # Returns the WWW-Authenticate header (triggers browser native login prompt)
      grep -c "WWW-Authenticate" functions/_middleware.js

      # Uses atob for Base64 decoding
      grep -c "atob(" functions/_middleware.js

      # Calls next() to pass authenticated requests through
      grep -c "return next()" functions/_middleware.js
    </automated>
  </verify>

  <acceptance_criteria>
    - `functions/_middleware.js` file exists
    - `grep -c "export async function onRequest" functions/_middleware.js` returns 1
    - `grep -c "env\.SITE_PASSWORD" functions/_middleware.js` returns at least 1
    - `grep -c "WWW-Authenticate" functions/_middleware.js` returns at least 1
    - `grep -c "atob(" functions/_middleware.js` returns at least 1
    - `grep -c "return next()" functions/_middleware.js` returns at least 1
    - File uses ES Modules syntax — no `addEventListener` present:
      `grep -c "addEventListener" functions/_middleware.js` returns 0
  </acceptance_criteria>

  <done>functions/_middleware.js exists with working Basic Auth logic: unauthenticated requests
  are rejected with 401 + WWW-Authenticate, correct password calls next(), password is always
  read from env.SITE_PASSWORD.</done>
</task>

<task type="auto">
  <name>Task 2: German placeholder page + .gitignore</name>
  <files>public/index.html, .gitignore</files>

  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md
      (Section 4: placeholder HTML example; Section 5: .gitignore entries; Section 5:
       recommended layout showing public/ directory)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md
      (D-09: purpose is only to confirm auth works, not a presentable design;
       D-10: all text in German)
  </read_first>

  <action>
**Step 1 — Create `public/index.html`:**

Create the directory `public/` and the file `public/index.html` with EXACTLY this content:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kommt bald</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
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

This page is intentionally minimal — its only job is to confirm that auth works (D-09).
Phase 2 replaces it with the real save-the-date content.

**Step 2 — Create `.gitignore`:**

Create `.gitignore` at the repository root with EXACTLY this content:

```
# Local Wrangler dev secrets — NEVER commit this file
.dev.vars

# Wrangler build/cache artefacts
.wrangler/

# Node dependencies (if Wrangler or other tools are installed locally)
node_modules/
```

`.dev.vars` is the local secrets file used by `wrangler pages dev` to inject environment
variables during development. It must never be committed — it would expose SITE_PASSWORD.
  </action>

  <verify>
    <automated>
      # public/index.html exists with German lang attribute
      grep -c 'lang="de"' public/index.html

      # Contains German placeholder text
      grep -c "Seite wird bald" public/index.html

      # Valid HTML5 doctype
      grep -c "DOCTYPE html" public/index.html

      # .gitignore excludes the local secrets file
      grep -c "\.dev\.vars" .gitignore

      # .gitignore excludes Wrangler artefacts
      grep -c "\.wrangler/" .gitignore
    </automated>
  </verify>

  <acceptance_criteria>
    - `public/index.html` exists
    - `grep -c 'lang="de"' public/index.html` returns 1
    - `grep -c "Seite wird bald" public/index.html` returns 1
    - `grep -c "DOCTYPE html" public/index.html` returns 1
    - `.gitignore` exists at the repo root
    - `grep -c "\.dev\.vars" .gitignore` returns 1
    - `grep -c "\.wrangler/" .gitignore` returns 1
    - `grep -c "node_modules" .gitignore` returns 1
  </acceptance_criteria>

  <done>public/index.html is a minimal valid HTML5 page with lang="de" and German placeholder
  text. .gitignore prevents .dev.vars, .wrangler/, and node_modules/ from being committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Cloudflare Edge | HTTP request carrying `Authorization: Basic <base64>` header — crosses the public internet |
| Cloudflare Edge → env | Worker reads `env.SITE_PASSWORD` from Cloudflare's encrypted secrets store |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Spoofing | `functions/_middleware.js` password check | mitigate | Password read from `env.SITE_PASSWORD` (Cloudflare secret, encrypted at rest). Deploy plan instructs setting password as **Secret** type (not plain var). User advised to use a random, unguessable password (>12 chars). |
| T-01-02 | Information Disclosure | `.dev.vars` local secrets file | mitigate | `.gitignore` explicitly excludes `.dev.vars` (Task 2). `SITE_PASSWORD` is never written into any source file — the middleware reads it only from `env`. |
| T-01-03 | Tampering | `Authorization` header in transit | mitigate | Cloudflare Pages enforces HTTPS on all `*.pages.dev` domains — TLS terminates at the Cloudflare edge before the Worker sees the request. Credentials are never transmitted in plain HTTP. |
| T-01-04 | Elevation of Privilege | Static assets served before auth | mitigate | `functions/_middleware.js` uses the `_middleware` filename convention — Cloudflare Pages runs it on **every** request before serving any asset (D-08). No route is excluded. |
| T-01-05 | Repudiation | No failed-auth logging | accept | Per D-07, failed-auth logging is explicitly deferred to Phase 3 when D1 is introduced. This is a personal party site with a known guest list — no audit requirement in Phase 1. |
| T-01-06 | Denial of Service | Auth endpoint | accept | Cloudflare's global network absorbs DDoS at the edge. No application-level rate limiting implemented (free tier). For a personal event site this is an acceptable residual risk. |
</threat_model>

<verification>
After both tasks complete, run the following checks:

```bash
# Middleware present and correct
grep -c "export async function onRequest" functions/_middleware.js   # 1
grep -c "env\.SITE_PASSWORD" functions/_middleware.js               # ≥1
grep -c "WWW-Authenticate" functions/_middleware.js                 # ≥1
grep -c "addEventListener" functions/_middleware.js                 # 0 (wrong syntax)

# Placeholder page present and in German
grep -c 'lang="de"' public/index.html                              # 1
grep -c "Seite wird bald" public/index.html                        # 1

# Secrets excluded from git
grep -c "\.dev\.vars" .gitignore                                    # 1
git status --short | grep -c "\.dev\.vars"                         # 0 (not tracked)
```

Local auth test (optional, requires Wrangler installed):
```bash
echo "SITE_PASSWORD=testpassword" > .dev.vars
wrangler pages dev public/ --compatibility-date=2024-01-01
# In another terminal:
curl -s -o /dev/null -w "%{http_code}" http://localhost:8788         # 401
curl -s -o /dev/null -w "%{http_code}" -u "user:testpassword" http://localhost:8788  # 200
curl -s -o /dev/null -w "%{http_code}" -u "user:wrongpassword" http://localhost:8788 # 401
```
</verification>

<success_criteria>
- `functions/_middleware.js` exists with `onRequest` export, reads `env.SITE_PASSWORD`, returns 401 + `WWW-Authenticate` header for unauthenticated requests
- `public/index.html` exists with `lang="de"` and German placeholder text
- `.gitignore` excludes `.dev.vars`, `.wrangler/`, and `node_modules/`
- No secret or credential value appears in any committed file
- All three files are committed to the `main` branch and visible on GitHub
</success_criteria>

<output>
After completion, create `.planning/phases/01-infrastructure-auth/01-01-SUMMARY.md` using the
template at `.github/get-shit-done/templates/summary.md`.

Key facts to record:
- Files created: functions/_middleware.js, public/index.html, .gitignore
- Auth pattern: ES Modules onRequest, atob() decode, env.SITE_PASSWORD plain-text comparison
- Placeholder: minimal HTML5, lang="de", German text only
- Secret exclusion: .dev.vars in .gitignore
</output>
