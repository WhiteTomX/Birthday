---
phase: 06-not-coming-rsvp-selection
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - functions/api/not-coming.js
  - public/rsvp/index.html
  - public/script.js
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files implement the "not coming" RSVP flow: a new Cloudflare Pages Function (`not-coming.js`), the RSVP page HTML (`rsvp/index.html`), and the shared frontend script (`script.js`). The core logic is sound — parameterised SQL, correct `textContent` XSS guard, and clean attendance-mode switching. However, one BLOCKER exists in the JSON parsing path shared with `rsvp.js`, three warnings cover a no-JS data-exposure risk, an unbounded name field, and silent error discrimination loss on the client, and two stale-comment info items need cleanup.

---

## Critical Issues

### CR-01: Null JSON body crashes with unhandled TypeError in `not-coming.js` (and `rsvp.js`)

**File:** `functions/api/not-coming.js:16`

**Issue:** `request.json()` succeeds and returns `null` when a client sends the literal JSON body `null`. The `try/catch` around `request.json()` does not cover the subsequent destructuring. `const { name } = null` throws `TypeError: Cannot destructure property 'name' of null as it is null`, which escapes all error handling and produces an opaque 500 response (or Worker crash) rather than the intended `{ ok: false, error: '...' }` with a 400. The identical pattern on line 16 of `functions/api/rsvp.js` has the same defect.

**Fix:**

```js
// functions/api/not-coming.js  (and rsvp.js, same pattern)
let body;
try {
  body = await request.json();
} catch {
  return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
}

// Guard against valid-but-non-object JSON (null, array, string, number)
if (!body || typeof body !== 'object' || Array.isArray(body)) {
  return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
}

const { name } = body;
```

---

## Warnings

### WR-01: No-JS form submission exposes name in URL via GET

**File:** `public/rsvp/index.html:29`

**Issue:** `<form action="#" method="get" novalidate>` — when JavaScript is unavailable or blocked, submitting the form issues a GET request with all field values (including `name`) appended as query-string parameters (e.g., `/?name=Alice&attendance=coming&...`). This exposes PII in browser history, server access logs, and referrer headers. The `action="#"` also means no actual submission succeeds, so the form silently fails for no-JS users.

**Fix:** Set `method="post"` and point `action` at the appropriate endpoint. Because the endpoint depends on the selected radio button and that selection requires JS to read, the minimal safe fix is to at least prevent GET exposure:

```html
<form id="rsvp-form" action="/api/rsvp" method="post" novalidate>
```

Accept that full no-JS progressive enhancement is out of scope, but removing `method="get"` eliminates the PII-in-URL risk unconditionally.

---

### WR-02: No server-side name length cap — unbounded string accepted into DB

**File:** `functions/api/not-coming.js:19`

**Issue:** The server validates that `name` is a non-empty string but applies no upper-bound check. A client can submit a name of arbitrary length (megabytes of text), which will be stored in the `rsvps` table as-is. SQLite `TEXT` is unbounded. This creates unnecessary DB bloat and means the worker processes and stores attacker-controlled large payloads with no rejection path. The same gap exists in `functions/api/rsvp.js:19`.

**Fix:**

```js
// After the existing empty-string check, add:
if (name.trim().length > 200) {
  return Response.json({ ok: false, error: 'Name too long' }, { status: 400 });
}
```

A 200-character cap is generous for a real name and eliminates the unbounded-input risk.

---

### WR-03: Fetch error handler discards HTTP status — client cannot distinguish 400 from 500

**File:** `public/script.js:126-151`

**Issue:** On line 127, `if (!res.ok) { throw new Error('Server error'); }` discards the HTTP status code before throwing. The `.catch` handler at line 139 always shows the same generic error string regardless of whether the failure was a client-side validation rejection (400) or a transient server error (500). If the server-side validation rejects the submission (e.g., CR-01 body check returns 400), the user sees "Etwas ist schiefgelaufen. Bitte versuche es noch einmal." and retries endlessly with the same invalid input.

**Fix:** Carry the status (and ideally the server error message) through to the catch handler:

```js
.then(function (res) {
  return res.json().then(function (data) {
    if (!res.ok) {
      var err = new Error(data.error || 'Server error');
      err.status = res.status;
      throw err;
    }
    // ... success path
  });
})
.catch(function (err) {
  submitBtn.disabled = false;
  submitBtn.textContent = notComing ? 'Abmelden' : 'Anmelden';
  var errEl = document.getElementById('submit-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'submit-error';
    errEl.className = 'error-msg visible';
    form.appendChild(errEl);
  }
  // Show server-provided message for 4xx, generic message for 5xx / network errors
  errEl.textContent = (err.status && err.status < 500 && err.message)
    ? err.message
    : 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
});
```

---

## Info

### IN-01: Stale TODO comment — Phase 3 action/method directive never removed

**File:** `public/rsvp/index.html:28`

**Issue:** `<!-- Phase 3: set action="/api/rsvp" method="POST" -->` — Phase 3 is complete; the fetch-based submission is fully implemented in `script.js`. This comment is now misleading dead documentation. It suggests the form attributes need changing, which conflicts with WR-01 above and confuses future maintainers.

**Fix:** Remove the comment entirely.

---

### IN-02: Stale inline comment — "Phase 3 will handle actual submission"

**File:** `public/script.js:84`

**Issue:** `// Always prevent default — Phase 3 will handle actual submission` — Phase 3 is done; the fetch call is directly below. The comment is now inaccurate.

**Fix:** Replace with a factual comment:

```js
event.preventDefault(); // Submission handled via fetch below
```

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
