---
phase: 06-not-coming-rsvp-selection
fixed_at: 2026-06-14T00:00:00Z
review_path: .planning/phases/06-not-coming-rsvp-selection/06-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-06-14
**Source review:** .planning/phases/06-not-coming-rsvp-selection/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (1 Critical, 3 Warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Null JSON body crashes with unhandled TypeError

**Files modified:** `functions/api/not-coming.js`, `functions/api/rsvp.js`
**Commit:** a8d59b3
**Applied fix:** Added a post-parse type guard (`if (!body || typeof body !== 'object' || Array.isArray(body))`) after the existing `try/catch` in both files. This returns 400 for valid-but-non-object JSON (null, array, primitives) before the destructuring line, eliminating the TypeError crash path.

---

### WR-01: No-JS form submission exposes name in URL via GET

**Files modified:** `public/rsvp/index.html`
**Commit:** 5f851af
**Applied fix:** Changed `<form id="rsvp-form" action="#" method="get" novalidate>` to `<form id="rsvp-form" action="/api/rsvp" method="post" novalidate>`. This prevents name PII from appearing in the URL query-string, browser history, server access logs, and referrer headers.

---

### WR-02: No server-side name length cap — unbounded string accepted into DB

**Files modified:** `functions/api/not-coming.js`, `functions/api/rsvp.js`
**Commit:** d063608
**Applied fix:** Added `if (name.trim().length > 200) { return Response.json({ ok: false, error: 'Name too long' }, { status: 400 }); }` immediately after the empty-string check in both files. This caps the stored name at 200 characters and rejects oversized payloads before the DB insert.

---

### WR-03: Fetch error handler discards HTTP status — client cannot distinguish 400 from 500

**Files modified:** `public/script.js`
**Commit:** 850dee0
**Applied fix:** Restructured the `.then` handler to first call `res.json()` and return that inner promise. Inside, if `!res.ok`, constructs an `Error` with `data.error` as the message and sets `err.status = res.status` before throwing. Updated `.catch` to accept `err` and show the server-provided message for 4xx errors (`err.status < 500 && err.message`) and the generic German retry message for 5xx or network failures.

---

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
