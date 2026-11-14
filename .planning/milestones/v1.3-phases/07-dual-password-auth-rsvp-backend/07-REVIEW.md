---
phase: 07-dual-password-auth-rsvp-backend
reviewed: 2026-06-21T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - functions/_middleware.js
  - functions/api/rsvp.js
  - migrations/0001_add_host_ref.sql
  - wrangler.jsonc
findings:
  critical: 4
  warning: 3
  info: 1
  total: 8
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-21
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This phase adds dual-password authentication to the middleware and a `host_ref` column to the RSVP table to attribute guest submissions to one of two hosts. The overall approach is sound. However, there are four critical defects: the `next()` call signature is wrong for the Cloudflare Pages Functions API (meaning `X-Host-Ref` injection almost certainly does not reach downstream functions), `atob()` is unguarded against malformed base64 input (crashing middleware with a 500), `not-coming.js` was not updated to include `host_ref` in its INSERT (leaving all decline records with `NULL` host attribution), and the migration does not add a `NOT NULL DEFAULT` constraint to enforce the invariant at the database level. Three additional warnings cover missing server-side bounds on `attendees`, missing length validation on `contact`, and use of non-timing-safe password comparison.

---

## Critical Issues

### CR-01: `next()` called with wrong argument shape — X-Host-Ref injection silently broken

**File:** `functions/_middleware.js:52`

**Issue:** The Cloudflare Pages Functions `context.next()` signature accepts an optional `Request` object as its first argument — `next(modifiedRequest)`. Line 52 passes a plain object literal `{ request: modifiedRequest }`, which is neither a `Request` instance nor a string. The runtime will not treat this as a request override; it is likely ignored or triggers an internal error. As a result, the downstream `rsvp.js` function receives the *original* request with no `X-Host-Ref` header, causing every RSVP submission to hit the defensive `hostRefHeader === null` guard and return `400 Missing host context`.

**Fix:**
```js
// Wrong — passing a plain object is not a valid next() argument
return next({ request: modifiedRequest });

// Correct — pass the Request object directly
return next(modifiedRequest);
```

---

### CR-02: `atob()` not guarded — malformed Authorization header crashes middleware with 500

**File:** `functions/_middleware.js:29`

**Issue:** `atob(base64Credentials)` throws a `DOMException` if `base64Credentials` is not valid base64 (e.g., `Authorization: Basic !!!`). This exception is unhandled and will propagate as an unhandled 500 from the middleware, bypassing the `unauthorizedResponse()` path. Any client or scanner that sends a malformed `Authorization` header can trigger this.

**Fix:**
```js
let credentials;
try {
  credentials = atob(base64Credentials);
} catch {
  return unauthorizedResponse();
}
const colonIndex = credentials.indexOf(':');
const password = credentials.slice(colonIndex + 1);
```

---

### CR-03: `not-coming.js` INSERT omits `host_ref` — all decline records stored with NULL host attribution

**File:** `functions/api/not-coming.js:39`

**Issue:** The phase adds a `host_ref` column to record which host's guest submitted. `rsvp.js` correctly reads `X-Host-Ref` and inserts it. However `not-coming.js` was not updated — its `INSERT` statement does not include the `host_ref` column. Every "not coming" submission will have `host_ref = NULL`, making it impossible to attribute declines to either host. Since the middleware always sets `X-Host-Ref` for authenticated requests, the value is available; the function just never reads it.

**Fix:**
```js
// In not-coming.js — read host_ref from middleware header (same pattern as rsvp.js)
const hostRefHeader = request.headers.get('X-Host-Ref');
const hostRef = parseInt(hostRefHeader, 10);
if (hostRefHeader === null || (hostRef !== 0 && hostRef !== 1)) {
  return Response.json({ ok: false, error: 'Missing host context' }, { status: 400 });
}

// Update INSERT to include host_ref
await env.DB.prepare(
  'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
).bind(id, name.trim(), null, 0, now, hostRef).run();
```

---

### CR-04: Migration adds `host_ref` as nullable with no DEFAULT — invariant not enforced at schema level

**File:** `migrations/0001_add_host_ref.sql:4`

**Issue:** `ALTER TABLE rsvps ADD COLUMN host_ref INTEGER` adds a nullable column with no default. The migration then backfills existing rows via `UPDATE`. However, any future INSERT that omits `host_ref` (as `not-coming.js` currently does — see CR-03) will store `NULL` silently without any database-level rejection. The schema should enforce the invariant that all rows have a valid `host_ref`.

SQLite does not allow adding a `NOT NULL` column without a default, but a `DEFAULT` can be specified:

**Fix:**
```sql
ALTER TABLE rsvps ADD COLUMN host_ref INTEGER NOT NULL DEFAULT 0;
-- The UPDATE backfill line can be removed since DEFAULT 0 covers existing rows
-- (SQLite applies DEFAULT to existing rows when NOT NULL DEFAULT is used in ALTER TABLE)
```

Note: SQLite ALTER TABLE supports `NOT NULL DEFAULT <value>` since 3.37 (2021). Cloudflare D1 uses a recent SQLite version. If there is any doubt, keep the UPDATE backfill as a safety net but add the constraint in a follow-up migration or schema enforcement.

---

## Warnings

### WR-01: No server-side upper bound on `attendees`

**File:** `functions/api/rsvp.js:32-33`

**Issue:** The server validates `attendeesInt >= 1` but applies no maximum. The frontend stepper caps at 10, but a direct API call can submit `attendees: 999999`. This bypasses the business rule and inserts corrupt data into the database.

**Fix:**
```js
const MAX_ATTENDEES = 10;
if (isNaN(attendeesInt) || attendeesInt < 1 || attendeesInt > MAX_ATTENDEES) {
  return Response.json({ ok: false, error: 'Invalid attendees' }, { status: 400 });
}
```

---

### WR-02: No length limit on `contact` field

**File:** `functions/api/rsvp.js:37`

**Issue:** `name` is validated to `<= 200` characters, but `contact` has no length check. A client could submit an arbitrarily long string that passes validation and gets stored. This is inconsistent and could cause issues with storage or display.

**Fix:**
```js
if (contactMethod && contactMethod.length > 500) {
  return Response.json({ ok: false, error: 'Contact too long' }, { status: 400 });
}
```

---

### WR-03: Password comparison is not timing-safe

**File:** `functions/_middleware.js:36-39`

**Issue:** The two password comparisons use JavaScript `===` string equality, which may short-circuit on the first differing character. This theoretically enables a timing side-channel attack to enumerate valid password characters. For a birthday party site the practical risk is low, but if either password is ever reused for higher-value access this becomes a real vulnerability.

**Fix:** Use a constant-time comparison. The Web Crypto API provides `crypto.subtle`, which can be used for HMAC-based comparison, or a simple constant-time loop:
```js
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

if (safeEqual(password, env.SITE_PASSWORD__0)) { hostRef = 0; }
else if (safeEqual(password, env.SITE_PASSWORD__1)) { hostRef = 1; }
else { return unauthorizedResponse(); }
```

---

## Info

### IN-01: `contact` type not validated — non-string values silently coerced to null

**File:** `functions/api/rsvp.js:37`

**Issue:** The coercion `(contact && contact.length > 0) ? contact : null` works correctly for strings and `null`/`undefined`, but if a client sends `contact: 123` (a number), `contact.length` is `undefined` (falsy), so the value is silently treated as null rather than rejected. This is inconsistent with how `name` and `attendees` are validated.

**Fix:**
```js
const contactMethod = (contact && typeof contact === 'string' && contact.trim().length > 0)
  ? contact.trim()
  : null;
```

---

_Reviewed: 2026-06-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
