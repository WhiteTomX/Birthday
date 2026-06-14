---
status: testing
phase: 06-not-coming-rsvp-selection
source: [06-VERIFICATION.md]
started: 2026-06-14T00:00:00Z
updated: 2026-06-14T00:00:00Z
---

## Current Test

number: 1
name: Radio Group Renders Correctly
expected: |
  Load /rsvp/ and confirm two German radio buttons appear above the name field.
  "Ich komme" is pre-checked. "Ich komme leider nicht" is unchecked.
awaiting: user response

## Tests

### 1. Radio Group Renders Correctly
expected: Load `/rsvp/` and confirm two German radio buttons appear above the name field, with "Ich komme" pre-checked and all existing form fields visible.
result: [pending]

### 2. Field Visibility Toggle — Not Coming
expected: Select "Ich komme leider nicht" — contact method field and attendee stepper hide, leaving only the name field. Submit button reads "Abmelden".
result: [pending]

### 3. Toggle Back — Coming
expected: Re-select "Ich komme" — contact and stepper fields reappear, button reverts to "Anmelden".
result: [pending]

### 4. Decline Submission End-to-End
expected: Submit a decline (name only, "Ich komme leider nicht" selected). Form section replaced with "Schade, [Name]! Wir werden dich vermissen." `/api/not-coming` received only `{ name }`.
result: [pending]

### 5. Attending Flow Regression
expected: Submit a normal attendance RSVP (default "Ich komme" selected). Confirm it still POSTs to `/api/rsvp` with full payload and shows the existing success message.
result: [pending]

### 6. D1 Decline Row Inspection
expected: After a decline submission, `SELECT * FROM rsvps WHERE attendees = 0` returns the new row with `contact_method = NULL` and the correct name.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
