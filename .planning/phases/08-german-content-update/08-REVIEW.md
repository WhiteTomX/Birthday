---
phase: 08-german-content-update
reviewed: 2026-06-21T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - public/index.html
  - public/rsvp/index.html
  - functions/_middleware.js
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-06-21
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 8 delivers a pure content change: the hint-page riddle, save-the-date body text, and the 401 inline riddle are updated from single-host to joint-birthday framing. All three files were reviewed against the canonical copy in `08-UI-SPEC.md`.

The structural changes are correct — the riddle appears in both required locations, the save-the-date body has been fully replaced, and no JS or CSS was altered. However, a grammatically broken German sentence was introduced into the riddle (and faithfully propagated to both locations), which will confuse native German speakers. One content logic issue and one minor naming concern round out the findings.

## Critical Issues

### CR-01: Dangling preposition "singt für." renders riddle line grammatically broken

**File:** `public/index.html:14` (same text at `functions/_middleware.js:75`)

**Issue:** The riddle line reads:

```
Man bäckt einen Kuchen, zündet Kerzen an und singt für.
```

In German, "singt für" (sings for) requires an object — "singt für mich" (sings for me), "singt für jemanden", etc. "singt für." with a full stop and no object is grammatically incomplete and will read as a typo or printing error to any German native speaker. The original Phase 5 riddle correctly used "singt für mich". The UI-SPEC (`08-UI-SPEC.md` line 115) reproduces this same broken line, meaning the executor faithfully reproduced a spec error into both locations.

This defect is present in the public-facing hint page and in the 401 inline riddle, so every guest who visits the site will encounter it.

**Fix:** Restore the object. Both files must be updated together (D-03).

In `public/index.html` line 14 and `functions/_middleware.js` line 75, change:

```html
Man bäckt einen Kuchen, zündet Kerzen an und singt für.<br>
Dieses Jahr feiern wir ihn zu zweit.<br>
```

to:

```html
Man bäckt einen Kuchen, zündet Kerzen an und singt.<br>
Dieses Jahr feiern wir ihn zu zweit.<br>
```

(Drop "für" entirely — "singt" alone is idiomatic for "sings [the birthday song]", which is the original intent and avoids the dangling preposition.)

Alternatively, if "für" is intended as "for us", use: `und singt für uns.<br>` — but this changes the riddle's singular-birthday framing before the "zu zweit" line resolves it. The cleanest fix is simply `singt.` or restoring `singt für mich.` if keeping the original first-person singular feel.

---

## Warnings

### WR-01: Hint page redirects before the user can read the riddle

**File:** `public/index.html:20`

**Issue:** The page contains:

```html
<script>window.location.replace('/rsvp/');</script>
```

This executes immediately on page load and sends the user to `/rsvp/` — an auth-protected route. The hint page riddle (the content introduced in this phase) is never seen by unauthenticated guests; they bounce directly to a Basic Auth challenge. A guest who has not yet entered a password will never see the Phase 8 riddle content in `public/index.html` — they will only encounter it in the 401 inline HTML if they guess wrong.

The redirect was present before this phase, but it directly undermines the purpose of the riddle on `public/index.html`. If the intent is that guests should read the riddle _before_ being asked for a password, the redirect defeats that.

**Fix:** Remove or conditional the redirect. Two options:

Option A — Remove the redirect entirely, letting `/` serve as the hint page:
```html
<!-- remove: <script>window.location.replace('/rsvp/');</script> -->
```

Option B — Redirect only when the user navigates directly to `/` _after_ already having credentials stored (harder to detect client-side; not straightforward). Option A is the cleaner fix.

This is a pre-existing issue surfaced by the new content, not introduced by phase 8. Confirm intended user journey before fixing.

---

### WR-02: Page `<title>` uses mixed English/German

**File:** `public/rsvp/index.html:7`

**Issue:**

```html
<title>Save the Date - 5. Dezember</title>
```

The page declares `lang="de"` and all visible copy is German. The `<title>` element uses the English phrase "Save the Date" while the rest of the page is fully German. This creates an inconsistency that browser tab text and bookmark names will surface in English.

The eyebrow badge (`<p class="eyebrow">Save the Date</p>`) intentionally uses the English phrase as a design token (it's a recognised anglicism in German event culture), but for the `<title>` a German equivalent is more consistent.

**Fix:**

```html
<title>Save the Date — 5. Dezember</title>
```

or, if preferring full German:

```html
<title>Einladung — 5. Dezember</title>
```

---

## Info

### IN-01: Riddle fifth line uses em dash without non-breaking space

**File:** `public/index.html:16` (same at `functions/_middleware.js:77`)

**Issue:** The riddle line is:

```
Wer das Datum kennt —<br>
```

In German typography, an em dash (—) used as a pause is conventionally surrounded by spaces, which is correctly done here. However there is no `&nbsp;` before `<br>` to prevent a line break between "kennt" and "—" on narrow viewports (the `<br>` forces a break after the dash, not before it, so this is fine). This is a very minor typographic note: the current rendering is acceptable.

No fix required — documenting for awareness only.

---

_Reviewed: 2026-06-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
