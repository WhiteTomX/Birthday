# Phase 6: Not Coming RSVP Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 6-not-coming-rsvp-selection
**Areas discussed:** Selection UX, Not-coming fields, Backend / storage

---

## Selection UX

### How does a guest signal they're not coming?

| Option | Description | Selected |
|--------|-------------|----------|
| Choose first, then form | Two big buttons upfront: "Ich komme" / "Ich komme leider nicht". Clicking one reveals the relevant fields. | |
| Form stays, link below | Existing form unchanged. A "Ich kann leider nicht kommen" link below the form reveals a short decline section. | |
| Single form with radio | Radio buttons at the top of the existing form. Selecting "not coming" hides irrelevant fields. | ✓ |

**User's choice:** Single form with radio buttons

---

### When "Ich komme leider nicht" is selected, which fields hide?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide stepper only | Attendee count stepper hides; name and contact method stay visible. | |
| Hide stepper + contact method | Stepper and contact method both hide; name remains. | |
| Hide all except name | For declines: only the name field remains. Maximum simplicity. | ✓ |

**User's choice:** Hide all except name

---

### Submit button label when "not coming" is selected

| Option | Description | Selected |
|--------|-------------|----------|
| Abmelden | Symmetrical pair with "Anmelden" — intentional mirroring. | ✓ |
| Senden | Neutral. Loses the parallel with "Anmelden". | |
| You decide | Claude picks based on project language patterns. | |

**User's choice:** Abmelden

---

## Not-coming fields

### Is name required for a "not coming" submission?

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Same as the coming path — host knows who declined. | ✓ |
| Optional | Guest can decline anonymously. Count only, no names. | |
| You decide | Claude picks based on existing validation approach. | |

**User's choice:** Required

---

### What does the guest see after a successful decline?

| Option | Description | Selected |
|--------|-------------|----------|
| Warm personal message | E.g. "Schade, [Name]! Wir werden dich vermissen." — uses guest's name. | ✓ |
| Neutral acknowledgment | E.g. "Danke für deine Rückmeldung, [Name]." — friendly but lower-key. | |
| You decide | Claude writes German copy matching the festive tone. | |

**User's choice:** Warm personal message

---

## Backend / storage

### Where do "not coming" RSVPs live?

| Option | Description | Selected |
|--------|-------------|----------|
| Same table + attending flag | Add `attending` boolean column; one place to query. Requires ALTER TABLE. | |
| Separate `not_coming` table | New table: id, name, submitted_at. No schema change to existing table. | |
| You decide | Claude picks based on query simplicity. | |
| Set attendees to 0 (Other) | Existing rsvps table, attendees=0 convention for declines. No schema change. | ✓ |

**User's choice:** Use existing `rsvps` table with `attendees = 0` for decline records (freeform answer)

---

### API endpoint approach

| Option | Description | Selected |
|--------|-------------|----------|
| attendees ≥ 0 validation change | Relax existing /api/rsvp validation to allow 0. | |
| Separate API endpoint | New /api/not-coming endpoint; /api/rsvp untouched. | ✓ |

**User's choice:** Separate `/api/not-coming` endpoint — keeps `/api/rsvp` unchanged.

---

## Claude's Discretion

None — all decisions were made by the user.

## Deferred Ideas

None — discussion stayed within phase scope.
