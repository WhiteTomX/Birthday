---
plan: 05-01
phase: 05-password-hint-page
status: complete
completed_at: "2026-05-10"
commit: 81f59cf
---

# Summary: Replace `unauthorizedResponse()` with festive HTML riddle page

## What Was Built

Three file changes restructure the site so guests immediately see a warm, festive hint page at `/` with no auth dialog, then navigate to `/rsvp/` where Basic Auth protects the RSVP form.

### Files Changed

| File | Change |
|------|--------|
| `public/rsvp/index.html` | **Created** — RSVP content moved here with absolute paths (`/style.css`, `/script.js`) |
| `public/index.html` | **Replaced** — now the festive hint page (200, no auth, loads `/style.css`) |
| `functions/_middleware.js` | **Updated** — public exclusions for `/`, `/index.html`, `/style.css`; 401 returns self-contained hint HTML |

## Verification Results

### Automated (32/32 checks passed)

- **Task 1** (7/7): `public/rsvp/index.html` — absolute paths, RSVP form intact, German content preserved
- **Task 2** (11/11): `public/index.html` — hint page with exact heading, all 4 riddle lines, CTA to `/rsvp/`, no RSVP form
- **Task 3** (14/14): `_middleware.js` — pathname exclusions, 401 HTML with inline CSS, Cache-Control: no-store, WWW-Authenticate

### Browser (via Chrome DevTools)

| Check | Result |
|-------|--------|
| `GET /` → 200, hint page, no auth dialog | ✅ |
| Warm cream background (`#FDF4E8`), accent pink CTA | ✅ |
| All 4 riddle lines visible | ✅ |
| "Zur Einladung →" button present | ✅ |
| `GET /rsvp/` unauthenticated → 401 | ✅ |
| 401 carries `Cache-Control: no-store` | ✅ |
| 401 carries `WWW-Authenticate: Basic realm="Birthday Site"` | ✅ |
| 401 body contains hint page HTML (`Psst`, riddle, `#FDF4E8`) | ✅ |
| `GET /style.css` unauthenticated → 200 | ✅ |
| Wrong credentials → 401 | ✅ |

## Requirements Closed

AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
