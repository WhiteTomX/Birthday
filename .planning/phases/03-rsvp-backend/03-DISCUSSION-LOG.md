# Phase 3: RSVP Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 3-RSVP Backend
**Areas discussed:** Submission mechanism, Confirmation display, Error handling, D1 schema

---

## Submission Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| fetch/AJAX | JavaScript sends JSON or FormData, page never refreshes, confirmation appears inline | ✓ |
| Native form POST | Browser submits form to /api/rsvp, page navigates away or reloads for the response | |

**User's choice:** fetch/AJAX

---

### Request body format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON body | `{"name": "...", "contact": "...", "attendees": 2}` | ✓ |
| FormData | multipart/form-data, as if the browser submitted naturally | |

**User's choice:** JSON body

---

### Loading state

| Option | Description | Selected |
|--------|-------------|----------|
| Disable submit + spinner | Prevents double-submit, gives visual feedback while in-flight | ✓ |
| No loading state | Button stays clickable, just wait for the response | |

**User's choice:** Disable submit button + spinner

---

## Confirmation Display

| Option | Description | Selected |
|--------|-------------|----------|
| Replace the form | Form is removed from DOM, success message takes its place — no accidental re-submit | ✓ |
| Banner above form | Form stays visible, success banner shown above it | |
| Inline below submit | Minimal disruption, message appears below submit button, form stays | |

**User's choice:** Replace the form with a success message

---

### Confirmation copy style

| Option | Description | Selected |
|--------|-------------|----------|
| Short & warm | "Danke! Deine Anmeldung wurde gespeichert." | |
| Personalised | Include guest's name: "Danke, [Name]! Deine Anmeldung wurde gespeichert." | ✓ |
| Agent decides | Agent picks appropriate German copy | |

**User's choice:** Personalised — include the guest's name

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline German error, form re-enables | "Etwas ist schiefgelaufen. Bitte versuche es noch einmal." — form re-activates for retry | ✓ |
| Inline German error only | Same message but without explicitly noting form re-activation | |
| Silent fail | Show confirmation anyway — hides problems | |

**User's choice:** Show error message and re-enable the form

---

## D1 Schema

### Table columns

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | id (UUID), name, contact_method, attendees, submitted_at | ✓ |
| With raw_payload | Add JSON column alongside structured columns — useful for debugging | |
| Agent decides | Agent picks the schema | |

**User's choice:** Minimal schema

---

### Unique ID generation

| Option | Description | Selected |
|--------|-------------|----------|
| crypto.randomUUID() | Built into Cloudflare Workers runtime, no dependencies | ✓ |
| ULID or nanoid | Sortable/shorter, but requires a library | |

**User's choice:** crypto.randomUUID()

---

## Agent's Discretion

- Exact CSS/animation style for the loading spinner
- Error message placement (inline near submit button vs top of form)
- HTTP response shape (convention: `{ "ok": true }` on success, non-2xx + `{ "ok": false }` on failure — noted in CONTEXT.md specifics but agent may adjust)

## Deferred Ideas

- **Failed auth attempt logging to D1** — was deferred from Phase 1; D1 now exists but logging failed auth attempts is out of Phase 3 scope.
- **Admin read endpoint** — querying RSVPs via an API endpoint rather than the D1 dashboard was not discussed; remains out of scope per PROJECT.md.
