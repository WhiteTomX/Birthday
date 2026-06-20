# Phase 6: Not Coming RSVP Selection - Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 3
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `public/rsvp/index.html` | component (form) | request-response | `public/rsvp/index.html` (self — extend) | self |
| `public/script.js` | utility (form controller) | event-driven + request-response | `public/script.js` (self — extend) | self |
| `functions/api/not-coming.js` | controller (Pages Function) | request-response | `functions/api/rsvp.js` | exact |

---

## Pattern Assignments

### `public/rsvp/index.html` (form component — MODIFY)

**Analog:** self (`public/rsvp/index.html`)

**Insertion point for radio group** — insert immediately after `<h2>Anmeldung</h2>` (line 27), before the first `<div class="field">`:

```html
<!-- Attendance selection (Phase 6) -->
<div class="field">
  <label><input type="radio" name="attendance" value="coming" checked /> Ich komme</label>
  <label><input type="radio" name="attendance" value="not-coming" /> Ich komme leider nicht</label>
</div>
```

**Fields that must be hidden when "not-coming" is selected** (existing HTML, lines 46–69):
- Contact method field: `<div class="field">` wrapping `<select id="contact">` (lines 46–58)
- Attendee stepper field: `<div class="field">` wrapping `<div class="stepper">` (lines 60–69)

Hiding strategy: add `id` attributes to those two wrapper `<div class="field">` elements so `script.js` can target them:
- `id="contact-field"` on the contact method wrapper div (line 46)
- `id="stepper-field"` on the attendee stepper wrapper div (line 61)

**Submit button** (line 71) — no HTML change needed; label is driven dynamically by `script.js`.

---

### `public/script.js` (form controller — MODIFY)

**Analog:** self (`public/script.js`)

**New element references to add** at the top of the IIFE, alongside existing refs (lines 9–15):

```js
const submitBtn      = form.querySelector('.btn-submit');
const contactField   = document.getElementById('contact-field');
const stepperField   = document.getElementById('stepper-field');
const radios         = form.elements['attendance'];  // RadioNodeList
```

Note: `submitBtn` is currently declared as a `var` inside the submit handler (line 84). Move it to the top-level refs block so radio handlers can also reference it.

**Radio change handler pattern** — new block, insert after `updateStepper()` call (after line 42):

```js
function applyAttendanceMode() {
  var notComing = form.elements['attendance'].value === 'not-coming';
  contactField.hidden = notComing;
  stepperField.hidden = notComing;
  submitBtn.textContent = notComing ? 'Abmelden' : 'Anmelden';
}

// Wire radio buttons
Array.prototype.forEach.call(radios, function (radio) {
  radio.addEventListener('change', applyAttendanceMode);
});

// Apply initial state (default: "Ich komme" pre-selected, no visible change)
applyAttendanceMode();
```

**Endpoint routing in submit handler** — replace the hard-coded `'/api/rsvp'` fetch URL (line 97) with conditional routing:

```js
var notComing = form.elements['attendance'].value === 'not-coming';
var endpoint  = notComing ? '/api/not-coming' : '/api/rsvp';
var payload   = notComing
  ? { name: nameInput.value.trim() }
  : {
      name:      nameInput.value.trim(),
      contact:   form.elements['contact'].value || null,
      attendees: parseInt(countHidden.value, 10)
    };

fetch(endpoint, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(payload)
})
```

**Success DOM-replacement pattern** (lines 106–111) — reuse exactly; only the confirmation text changes for "not coming":

```js
// Existing pattern (attending):
var section = document.querySelector('.rsvp-section');
var p = document.createElement('p');
p.className = 'success-msg';
p.textContent = 'Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.';
section.innerHTML = '';
section.appendChild(p);

// Not-coming variant (same DOM pattern, different text):
p.textContent = 'Schade, ' + payload.name + '! Wir werden dich vermissen.';
```

Use a single success handler that picks the right message string based on `notComing`:

```js
.then(function (res) {
  if (!res.ok) { throw new Error('Server error'); }
  var section = document.querySelector('.rsvp-section');
  var p = document.createElement('p');
  p.className = 'success-msg';
  p.textContent = notComing
    ? 'Schade, ' + payload.name + '! Wir werden dich vermissen.'
    : 'Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.';
  section.innerHTML = '';
  section.appendChild(p);
})
```

**Error handler re-enable pattern** (lines 113–125) — reuse exactly; button label must restore to the correct label (not always 'Anmelden'):

```js
.catch(function () {
  submitBtn.disabled = false;
  submitBtn.textContent = notComing ? 'Abmelden' : 'Anmelden';
  var errEl = document.getElementById('submit-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'submit-error';
    errEl.className = 'error-msg visible';
    form.appendChild(errEl);
  }
  errEl.textContent = 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
});
```

**Stepper validation guard** — the existing defensive stepper check (lines 78–80) runs unconditionally. When "not coming" is selected, stepper is hidden and its value is irrelevant. Wrap the stepper validation in a `!notComing` guard:

```js
if (!notComing && (count < MIN || count > MAX)) {
  valid = false;
}
```

---

### `functions/api/not-coming.js` (Pages Function — CREATE NEW)

**Analog:** `functions/api/rsvp.js` (exact role + data flow match)

**File header pattern** (analog lines 1–4):

```js
// functions/api/not-coming.js
// Cloudflare Pages Function — auto-routes to /api/not-coming
// Auth is enforced upstream by functions/_middleware.js — do not add auth logic here.
```

**Export signature** (analog line 5):

```js
export async function onRequestPost(context) {
  const { request, env } = context;
```

**JSON parse pattern** (analog lines 9–13):

```js
let body;
try {
  body = await request.json();
} catch {
  return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
}
```

**Destructure and validate** — `not-coming` only needs `name` (no `contact`, no `attendees`):

```js
const { name } = body;

if (!name || typeof name !== 'string' || name.trim().length === 0) {
  return Response.json({ ok: false, error: 'Name required' }, { status: 400 });
}
```

**ID and timestamp pattern** (analog lines 31–33):

```js
const id  = crypto.randomUUID();
const now = new Date().toISOString();
```

**D1 insert pattern** (analog lines 36–43) — same table, `attendees = 0`, `contact_method = null`:

```js
try {
  await env.DB.prepare(
    'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name.trim(), null, 0, now).run();
} catch (err) {
  return Response.json({ ok: false, error: 'Database error' }, { status: 500 });
}
```

**Success response pattern** (analog line 45):

```js
return Response.json({ ok: true }, { status: 200 });
```

---

## Shared Patterns

### Auth — automatic, no action needed
**Source:** `functions/_middleware.js` lines 9–39
All routes other than `/`, `/index.html`, `/style.css` require Basic Auth. `/api/not-coming` is covered automatically — no auth code in `not-coming.js`.

### XSS prevention — `textContent` only
**Source:** `public/script.js` lines 106–111 comment + CONTEXT.md `<code_context>`
User-supplied `name` must only ever be written to the DOM via `textContent`. Never use `innerHTML` with user input. This applies to both the attending and not-coming confirmation messages.

### Error response shape
**Source:** `functions/api/rsvp.js` lines 13, 21, 26, 42, 45
All API responses use `Response.json({ ok: bool, error?: string }, { status: N })`. New endpoint must follow the same shape.

### Loading state during fetch
**Source:** `public/script.js` lines 84–86
Disable submit button and set `textContent = '…'` before `fetch()`. Restore correct label string on error (not always a hard-coded literal — derive from current radio state).

### German-only UI strings
**Source:** CONTEXT.md `<specifics>` + existing HTML/JS throughout
All user-visible strings are in German. No English copy appears in the UI. Error messages, labels, button text, and confirmations all follow this convention.

---

## No Analog Found

None — all three files have direct analogs in the codebase.

---

## Metadata

**Analog search scope:** `public/`, `functions/`
**Files scanned:** `public/rsvp/index.html`, `public/script.js`, `functions/api/rsvp.js`, `functions/_middleware.js`, `schema.sql`
**Pattern extraction date:** 2026-06-14
