---
status: complete
phase: 06-not-coming-rsvp-selection
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-06-20T00:00:00Z
updated: 2026-06-20T09:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Initial Page State
expected: Load /rsvp/. The form shows: name input at top, then two side-by-side buttons — "Ich komme leider nicht" (secondary/outline style) on the left and "Ich komme" (primary/filled style) on the right. Contact method select, attendee stepper, and Anmelden submit button are NOT visible.
result: pass

### 2. Name Validation — Decline Without Name
expected: With name field blank, click "Ich komme leider nicht". An error message "Bitte gib deinen Namen ein." appears below the name field. No network request is sent; both attendance buttons remain unchanged.
result: pass

### 3. Decline Submission — Happy Path
expected: Type a name, click "Ich komme leider nicht". The button shows "…" briefly, then the entire RSVP section is replaced with the warm German message: "Schade, [Name]! Wir werden dich vermissen." (using the name you entered).
result: pass

### 4. "Ich komme" Reveals Extra Fields
expected: Click "Ich komme". Contact method select, attendee stepper (showing 1), and "Anmelden" submit button appear below. The "Ich komme" button becomes disabled. Page scrolls smoothly to the revealed fields.
result: pass

### 5. Attending Submission — Happy Path
expected: With extra fields revealed, enter a name and click "Anmelden". Button shows "…" briefly, then RSVP section is replaced with: "Danke, [Name]! Deine Anmeldung wurde gespeichert."
result: pass

### 6. D1 Decline Row Inspection
expected: After the successful decline in Test 3, check the D1 database — the row for that guest has attendees = 0 and contact_method = NULL (or empty).
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
