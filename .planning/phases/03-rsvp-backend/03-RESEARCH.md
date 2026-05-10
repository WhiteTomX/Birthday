# Phase 3: RSVP Backend — Research

**Researched:** 2026-05-10
**Phase:** 3 — RSVP Backend
**Requirements:** RSVP-05, RSVP-06, RSVP-07

---

## 1. Cloudflare Pages Functions — API Route Setup

### File-based routing
`functions/api/rsvp.js` automatically routes to `/api/rsvp` — no configuration needed.

### Method-specific handler
Export `onRequestPost` to restrict the endpoint to POST only. Other methods (GET, etc.) will receive a 405 by default:

```js
// functions/api/rsvp.js
export async function onRequestPost(context) {
  const { request, env } = context;
  // ...
}
```

### Parsing JSON body
```js
const body = await request.json();
const { name, contact, attendees } = body;
```

### Returning JSON responses
```js
return Response.json({ ok: true }, { status: 200 });
return Response.json({ ok: false, error: "..." }, { status: 500 });
```

### Middleware interaction
`functions/_middleware.js` (auth) intercepts ALL requests automatically, including `/api/rsvp`. The RSVP Worker inherits Basic Auth protection with **zero changes** to the middleware.

---

## 2. D1 Database — Creation & Configuration

### Create the database (run once)
```bash
npx wrangler d1 create birthday-rsvps
```
Output includes `database_id` — copy this for wrangler.jsonc.

### wrangler.jsonc D1 binding (exact syntax for Pages)
```jsonc
{
  "name": "birthday",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "public",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "birthday-rsvps",
      "database_id": "<database-id-from-create-command>"
    }
  ]
}
```
The binding name `"DB"` means the Function accesses it as `context.env.DB`.

---

## 3. D1 Schema

### schema.sql (create once)
```sql
CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_method TEXT,
  attendees INTEGER NOT NULL,
  submitted_at TEXT NOT NULL
);
```

### Apply schema locally
```bash
npx wrangler d1 execute birthday-rsvps --local --file=./schema.sql
```

### Apply schema to production (remote)
```bash
npx wrangler d1 execute birthday-rsvps --remote --file=./schema.sql
```

### Verify (local)
```bash
npx wrangler d1 execute birthday-rsvps --local --command="SELECT * FROM rsvps"
```

---

## 4. D1 Query Patterns from Pages Functions

### Insert (the core operation)
```js
const id = crypto.randomUUID(); // native in Workers runtime — no import needed
const now = new Date().toISOString();

await env.DB.prepare(
  "INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at) VALUES (?, ?, ?, ?, ?)"
).bind(id, name, contact || null, attendees, now).run();
```

### `.run()` vs `.first()` vs `.all()`
- `.run()` — for INSERT/UPDATE/DELETE (returns `{ success, meta }`)
- `.first()` — for SELECT returning one row
- `.all()` — for SELECT returning multiple rows

### `crypto.randomUUID()`
Available globally in the Cloudflare Workers runtime — no import or npm package needed.

---

## 5. Local Development Workflow

### `.dev.vars` file (gitignored — for local secrets)
Create `.dev.vars` in project root:
```
SITE_PASSWORD=yourpassword
```
`wrangler pages dev` reads this automatically. Do NOT commit this file.

### Run local dev server
With wrangler.jsonc containing the D1 binding:
```bash
npx wrangler pages dev
```
This reads `wrangler.jsonc` automatically (uses `pages_build_output_dir: "public"`) and sets up local D1.

### Test the endpoint locally
```bash
curl -X POST http://localhost:8788/api/rsvp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n ':yourpassword' | base64)" \
  -d '{"name":"Test","contact":"whatsapp","attendees":2}'
```

---

## 6. Frontend Fetch Pattern

### Exact pattern for script.js (replaces the Phase 3 comment block)
```js
if (valid) {
  const submitBtn = form.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '...'; // loading state

  const payload = {
    name: nameInput.value.trim(),
    contact: form.elements['contact'].value || null,
    attendees: parseInt(countHidden.value, 10)
  };

  fetch('/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function (res) {
    if (!res.ok) throw new Error('Server error');
    // Success: replace form with confirmation
    const section = document.querySelector('.rsvp-section');
    section.innerHTML = '<p class="success-msg">Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.</p>';
  })
  .catch(function () {
    // Error: show inline message, re-enable form
    submitBtn.disabled = false;
    submitBtn.textContent = 'Anmelden';
    let errEl = document.getElementById('submit-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'submit-error';
      errEl.className = 'error-msg visible';
      form.appendChild(errEl);
    }
    errEl.textContent = 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
  });
}
```

**Note:** No CORS headers needed — same-origin fetch from Pages to Pages Function.

---

## 7. Error Handling Strategy

| Scenario | HTTP Status | Frontend behavior |
|----------|-------------|-------------------|
| Success | 200 `{ ok: true }` | Replace form with confirmation |
| Missing required fields (server-side guard) | 400 `{ ok: false }` | Show inline error, re-enable form |
| D1 write failure | 500 `{ ok: false }` | Show inline error, re-enable form |
| Network failure | N/A (fetch rejects) | `.catch()` → show inline error |

---

## 8. Input Validation in the Worker

The Worker should validate inputs as a server-side guard (even though frontend validates too):

```js
if (!name || typeof name !== 'string' || name.trim().length === 0) {
  return Response.json({ ok: false, error: 'Name required' }, { status: 400 });
}
const attendeesInt = parseInt(attendees, 10);
if (isNaN(attendeesInt) || attendeesInt < 1) {
  return Response.json({ ok: false, error: 'Invalid attendees' }, { status: 400 });
}
```

---

## 9. Deployment Checklist

For production deployment (Cloudflare dashboard + `wrangler pages deploy`):
1. Create D1 database: `npx wrangler d1 create birthday-rsvps` (once)
2. Add D1 binding to `wrangler.jsonc`
3. Apply schema to remote: `npx wrangler d1 execute birthday-rsvps --remote --file=./schema.sql`
4. Deploy: push to GitHub (Pages auto-deploys) OR `npx wrangler pages deploy public`
5. Verify: submit form → check D1 dashboard for row

---

## 10. Gotchas & Pitfalls

| # | Gotcha | Mitigation |
|---|--------|-----------|
| 1 | `database_id` placeholder in wrangler.jsonc must be replaced with real UUID from `d1 create` | Document as a manual step; cannot be automated until user runs `d1 create` |
| 2 | `.dev.vars` must NOT be committed — contains SITE_PASSWORD | Already in .gitignore (Phase 1 set this up); verify |
| 3 | `wrangler d1 execute --local` creates a local SQLite file in `.wrangler/` — reset with `--reset` if schema changes | Use `--remote` for production schema pushes |
| 4 | `onRequestPost` only handles POST — sending GET to `/api/rsvp` returns 405 automatically | Fine for this use case |
| 5 | `contact_method` is nullable — the frontend sends `""` (empty string) when no option selected; Worker should store `null` for clean data | Coerce: `contact || null` |
| 6 | `attendees` from frontend is a string (hidden input value) — must `parseInt()` before storing | Always parse: `parseInt(attendees, 10)` |
| 7 | Auth middleware runs before the RSVP Function — guests must be authenticated before they can reach `/api/rsvp` | By design; no change needed |

---

## RESEARCH COMPLETE

**Key findings for planning:**
- `functions/api/rsvp.js` → `/api/rsvp` (auto-routing, no config needed)
- Export `onRequestPost` — POST-only, other methods 405 by default
- `context.env.DB.prepare(sql).bind(...).run()` for D1 inserts
- `crypto.randomUUID()` — no import needed in Workers runtime
- wrangler.jsonc gets `d1_databases` array with `binding: "DB"`, `database_name`, `database_id`
- `schema.sql` file + `wrangler d1 execute` for schema init (local + remote)
- `.dev.vars` for local secret (`SITE_PASSWORD`)
- `npx wrangler pages dev` for local dev (reads wrangler.jsonc automatically)
- Auth middleware protects `/api/rsvp` automatically — no changes to middleware
- Same-origin fetch → no CORS headers needed
- `contact` field coerced to `null` when empty; `attendees` parsed as int
