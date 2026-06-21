# Phase 7: Dual-Password Auth & RSVP Backend - Pattern Map

**Mapped:** 2026-06-21
**Files analyzed:** 5 (2 modify JS, 1 modify jsonc, 1 new folder, 1 new SQL)
**Analogs found:** 4 / 5 (migration SQL has no analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `functions/_middleware.js` | middleware | request-response | `functions/_middleware.js` (self) | exact — modify in place |
| `functions/api/rsvp.js` | controller | request-response | `functions/api/rsvp.js` (self) | exact — modify in place |
| `wrangler.jsonc` | config | — | `wrangler.jsonc` (self) | exact — modify in place |
| `migrations/<name>.sql` | migration | batch | `schema.sql` (historical) | partial — SQL dialect match |
| `migrations/` | config | — | — | no analog |

## Pattern Assignments

### `functions/_middleware.js` (middleware, request-response)

**Analog:** `functions/_middleware.js` (the file itself — this is a targeted rewrite of the auth block)

**Imports / export pattern** (lines 9-11):
```javascript
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
```

**Public route bypass — unchanged** (lines 14-20):
```javascript
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/style.css'
  ) {
    return next();
  }
```

**Auth header extraction — reuse as-is** (lines 22-32):
```javascript
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const credentials = atob(base64Credentials);
  // Use indexOf + slice (not split) to handle colons in the password safely.
  const colonIndex = credentials.indexOf(":");
  const password = credentials.slice(colonIndex + 1);
```

**Auth check — replace single-password block** (line 34-38, current):
```javascript
  // CURRENT — replace this block:
  if (password !== env.SITE_PASSWORD) {
    return unauthorizedResponse();
  }
  return next();
```

**Auth check — new dual-password pattern to write:**
```javascript
  // NEW — dual-password check; index drives X-Host-Ref value
  let hostRef;
  if (password === env.SITE_PASSWORD__0) {
    hostRef = 0;
  } else if (password === env.SITE_PASSWORD__1) {
    hostRef = 1;
  } else {
    return unauthorizedResponse();
  }

  // Inject host identity into the forwarded request via a header.
  // RSVP API reads X-Host-Ref; do not expose it to the browser.
  const modifiedRequest = new Request(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers),
      'X-Host-Ref': String(hostRef),
    }),
  });
  return next({ request: modifiedRequest });
```

**unauthorizedResponse() — unchanged** (lines 41-73):
```javascript
function unauthorizedResponse() {
  // ... full HTML body unchanged ...
  return new Response(html, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Birthday Site"',
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
```

Note: Cloudflare Pages Functions propagate a modified request to `next()` by passing it as a property on the context override object. The exact API to verify is `next({ request: modifiedRequest })` — confirm against Cloudflare Pages docs if the planner is uncertain; the alternative is `context.request = modifiedRequest; return next()` (mutation). Use whichever the Cloudflare Pages runtime supports.

---

### `functions/api/rsvp.js` (controller, request-response)

**Analog:** `functions/api/rsvp.js` (the file itself — targeted additions only)

**Context destructure — add `request` is already present** (line 6):
```javascript
  const { request, env } = context;
```

**X-Host-Ref read + validation — insert after body parsing block, before DB insert:**
```javascript
  // Read host identity set by middleware — middleware guarantees this is present
  // for authenticated requests, but validate defensively (D-06).
  const hostRefHeader = request.headers.get('X-Host-Ref');
  const hostRef = parseInt(hostRefHeader, 10);
  if (hostRefHeader === null || (hostRef !== 0 && hostRef !== 1)) {
    return Response.json({ ok: false, error: 'Missing host context' }, { status: 400 });
  }
```

**DB prepare — extend INSERT to include host_ref** (lines 45-47, current):
```javascript
  // CURRENT:
  await env.DB.prepare(
    'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name.trim(), contactMethod, attendeesInt, now).run();
```

```javascript
  // NEW — add host_ref as 6th column:
  await env.DB.prepare(
    'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name.trim(), contactMethod, attendeesInt, now, hostRef).run();
```

**Error handling pattern — unchanged** (lines 48-51):
```javascript
  } catch (err) {
    // Do not expose internal error details to the client
    return Response.json({ ok: false, error: 'Database error' }, { status: 500 });
  }
```

---

### `wrangler.jsonc` (config)

**Analog:** `wrangler.jsonc` (the file itself)

**Current d1_databases block** (lines 5-10):
```jsonc
"d1_databases": [
    {
        "binding": "DB",
        "database_name": "birthday-rsvps",
        "database_id": "4e2e93ff-ea5b-4cc3-8c2f-d469c79c88f4"
    }
]
```

**New d1_databases block — add migrations_dir:**
```jsonc
"d1_databases": [
    {
        "binding": "DB",
        "database_name": "birthday-rsvps",
        "database_id": "4e2e93ff-ea5b-4cc3-8c2f-d469c79c88f4",
        "migrations_dir": "migrations"
    }
]
```

---

### `migrations/<timestamp>_add_host_ref.sql` (migration, batch)

**Analog:** `schema.sql` (partial — SQL dialect only; no prior migration file exists)

**Migration SQL to write** (new file, no line refs):
```sql
-- Migration: add host_ref column to rsvps
-- Backfill existing rows to 0 (legacy records treated as host 0's circle — D-05)

ALTER TABLE rsvps ADD COLUMN host_ref INTEGER;
UPDATE rsvps SET host_ref = 0 WHERE host_ref IS NULL;
```

Note on naming: Wrangler D1 migration files are typically named with a sequential prefix (e.g. `0001_add_host_ref.sql`) or a timestamp prefix. Use whatever convention `wrangler d1 migrations create` generates; if creating manually, `0001_add_host_ref.sql` is conventional.

---

## Shared Patterns

### Response.json() for API errors
**Source:** `functions/api/rsvp.js` lines 13, 25-34
**Apply to:** All validation guards in `rsvp.js`
```javascript
return Response.json({ ok: false, error: '<message>' }, { status: 400 });
```

### unauthorizedResponse()
**Source:** `functions/_middleware.js` lines 41-73
**Apply to:** All 401 paths in `_middleware.js` — function is unchanged, both failure branches call it
```javascript
return unauthorizedResponse();
```

### D1 bind-and-run query
**Source:** `functions/api/rsvp.js` lines 45-47
**Apply to:** The modified INSERT in `rsvp.js`
```javascript
await env.DB.prepare('INSERT INTO ... VALUES (?, ...)').bind(...args).run();
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `migrations/` directory | config | — | No `migrations/` folder exists yet; create empty directory |

---

## Metadata

**Analog search scope:** `functions/`, `wrangler.jsonc`, `schema.sql`
**Files scanned:** 4
**Pattern extraction date:** 2026-06-21
