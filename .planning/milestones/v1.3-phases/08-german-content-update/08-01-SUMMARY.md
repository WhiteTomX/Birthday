---
phase: 08-german-content-update
plan: "01"
subsystem: content
tags: [german-copy, joint-birthday, riddle, save-the-date]
dependency_graph:
  requires: []
  provides: [CONT-01]
  affects: [public/index.html, public/rsvp/index.html, functions/_middleware.js]
tech_stack:
  added: []
  patterns: [inline-html-string-sync, canonical-riddle-copy]
key_files:
  created: []
  modified:
    - public/index.html
    - public/rsvp/index.html
    - functions/_middleware.js
decisions:
  - "5-line joint-birthday riddle placed with 'Dieses Jahr feiern wir ihn zu zweit.' at line 3 (after singing line) — builds naturally before password clue"
  - "Save-the-date body replaced entirely with Wir/uns voice; 'Wir werden 30' anchor is first substantive sentence"
  - "Soft RSVP ask 'Je frueher ihr euch anmeldet' replaces hard 'Bitte bis Ende Mai anmelden' deadline"
metrics:
  duration: "2m 5s"
  completed: "2026-06-21"
  tasks_completed: 2
  files_modified: 3
---

# Phase 08 Plan 01: German Content Update Summary

**One-liner:** Updated all three German-copy surfaces (hint page, 401 riddle, save-the-date) from single-host first-person to joint "Wir werden 30" framing with identical 5-line riddle synced across both riddle locations.

## What Was Built

Two tasks executed in sequence. Both completed without deviations.

**Task 1 — Update hint page riddle and 401 inline riddle (D-01, D-02, D-03)**

The existing 4-line riddle was updated to a 5-line joint-birthday poem in both `public/index.html` and `functions/_middleware.js`. The new "Dieses Jahr feiern wir ihn zu zweit." line was placed at position 3 (after the singing line, before the password clue) — this reads most naturally as a build-up before the closing password hint.

Changes per file:
- `public/index.html`: riddle `<p>` block updated from 4 to 5 lines
- `functions/_middleware.js`: inline riddle in `unauthorizedResponse()` updated identically; all locked strings (`Falsches Passwort`, `Seite neu laden...`) unchanged

**Task 2 — Replace save-the-date body paragraphs with joint Wir voice (D-04, D-05, D-06, D-07)**

All five `<p>` elements between `<h1>5. Dezember</h1>` and `<div class="divider">` in `public/rsvp/index.html` were replaced with the canonical 5-element joint-voice block from UI-SPEC.md. The old single-host `Ich werde 30` framing, volunteer-ask paragraph, and hard `Bitte bis Ende Mai anmelden` deadline are all removed. The new copy uses "Wir werden 30" as the anchor, states venue TBD, describes the buffet + party plan, includes the share-the-link sentiment, and closes with the soft "Je frueher" RSVP ask. All form markup, structural elements, and `public/script.js` are untouched.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Update hint page and 401 riddle | 42a33bf | `public/index.html`, `functions/_middleware.js` |
| Task 2: Replace RSVP body paragraphs | d85a2b0 | `public/rsvp/index.html` |

## Verification Results

All 9 plan verification checks passed:

1. `public/index.html` contains `Dieses Jahr feiern wir ihn zu zweit.` — 1 match
2. `functions/_middleware.js` contains `Dieses Jahr feiern wir ihn zu zweit.` — 1 match
3. `public/rsvp/index.html` contains `Wir werden 30.` — 1 match
4. `public/rsvp/index.html` contains `Je früher ihr euch anmeldet` — 1 match
5. `singt für mich` absent from `public/index.html` — 0 matches
6. `Ich werde 30` absent from `public/rsvp/index.html` — 0 matches
7. `Bitte bis Ende Mai` absent from `public/rsvp/index.html` — 0 matches
8. Exactly 3 files modified: `public/index.html`, `public/rsvp/index.html`, `functions/_middleware.js`
9. `public/script.js` and `public/style.css` not in modified list

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All copy is final and self-contained. No data sources required; no placeholders remain.

## Threat Flags

None. All threat items in the plan's threat register were accepted (T-08-01, T-08-02, T-08-03, T-08-SC). No new security-relevant surfaces were introduced — pure static content edits with no new endpoints, auth paths, or file access patterns.

## Self-Check: PASSED

Files exist:
- `public/index.html` — FOUND (contains `Dieses Jahr feiern wir ihn zu zweit.`)
- `public/rsvp/index.html` — FOUND (contains `Wir werden 30.`)
- `functions/_middleware.js` — FOUND (contains `Dieses Jahr feiern wir ihn zu zweit.`)

Commits exist:
- 42a33bf — FOUND (feat(08-01): update hint page and 401 inline riddle)
- d85a2b0 — FOUND (feat(08-01): replace save-the-date body paragraphs)
