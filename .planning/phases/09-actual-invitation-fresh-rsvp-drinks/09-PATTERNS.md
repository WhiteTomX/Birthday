# Phase 09: Actual Invitation, Fresh RSVP & Drinks - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `functions/_middleware.js` | middleware | request-response | `functions/_middleware.js` | exact |
| `functions/rsvp/index.js` | controller | request-response | `functions/rsvp/index.js` | exact |
| `functions/api/fresh-rsvp.js` | controller | request-response + CRUD | `functions/api/fresh-rsvp.js` | exact |
| `functions/api/drink-suggestions.js` | service | CRUD | `functions/api/drink-suggestions.js` | exact |
| `public/rsvp/index.html` | component | request-response | `public/rsvp/index.html` | exact |
| `public/script.js` | component | request-response | `public/script.js` | exact |
| `migrations/0002_fresh_rsvp_round.sql` | migration | CRUD | `migrations/0002_fresh_rsvp_round.sql` | exact |
| `tests/phase-9-api.test.mjs` | test | request-response | `tests/phase-9-api.test.mjs` | exact |
| `tests/phase-9-ui.test.mjs` | test | request-response | `tests/phase-9-ui.test.mjs` | exact |
| `tests/phase-9-e2e.test.mjs` | test | request-response | `tests/phase-9-e2e.test.mjs` | exact |

## Pattern Assignments

### `functions/_middleware.js` (middleware, request-response)

**Analog:** `functions/_middleware.js`

**Auth pattern** (`functions/_middleware.js:9-57`):
```javascript
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/style.css'
  ) {
    return next();
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  let credentials;
  try {
    credentials = atob(base64Credentials);
  } catch {
    return unauthorizedResponse();
  }

  const colonIndex = credentials.indexOf(":");
  const password = credentials.slice(colonIndex + 1);
  let hostRef;
  if (password === env.SITE_PASSWORD__0) {
    hostRef = 0;
  } else if (password === env.SITE_PASSWORD__1) {
    hostRef = 1;
  } else {
    return unauthorizedResponse();
  }

  const modifiedRequest = new Request(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers),
      'X-Host-Ref': String(hostRef),
    }),
  });
  return next(modifiedRequest);
}
```

**Error handling pattern** (`functions/_middleware.js:57-86`):
```javascript
function unauthorizedResponse() {
  return new Response(html, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Birthday Site"',
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
```

---

### `functions/rsvp/index.js` (controller, request-response)

**Analog:** `functions/rsvp/index.js`

**Page personalization pattern** (`functions/rsvp/index.js:6-47`):
```javascript
export async function onRequestGet(context) {
  const { request, env } = context;

  const assetResponse = await env.ASSETS.fetch(request);
  const html = await assetResponse.text();

  const venueName = (env.VENUE_NAME || '').trim();
  const venueMapUrl = (env.VENUE_MAP_URL || '').trim();
  const parkDirections = (env.PARK_ENTRY_DIRECTIONS || '').trim();
  const buffetUrl = (env.BUFFET_LIST_URL || '').trim();

  let venueDetails = '';
  const parsedMapUrl = parseHttpsUrl(venueMapUrl);
  if (venueName) {
    venueDetails = `<p><strong>${escapeHtml(venueName)}</strong></p>`;
    if (parsedMapUrl) {
      venueDetails += `
        <a href="${escapeHtml(parsedMapUrl.href)}" target="_blank" rel="noopener noreferrer">Auf OpenStreetMap ansehen</a>`;
    }
  }
```

**Secure injected values + optional link gating** (`functions/rsvp/index.js:24-43`, `:54-79`):
```javascript
const directionsMarkup = parkDirections
  ? `<p class="event-directions"><strong>Anreise:</strong> ${escapeHtml(parkDirections)}</p>`
  : '';

const parsedBuffetUrl = parseHttpsUrl(buffetUrl);
const buffetMarkup = parsedBuffetUrl
  ? `<p class="event-callout"><strong>Buffetbeitrag</strong><br><a href="${escapeHtml(parsedBuffetUrl.href)}" target="_blank" rel="noopener noreferrer">Zum Buffetbeitrag</a></p>`
  : '';

const modified = html
  .replace('<!-- VENUE_DETAILS -->', venueDetails)
  .replace('<!-- PARK_ENTRY_DIRECTIONS -->', directionsMarkup)
  .replace('<!-- BUFFET_LINK -->', buffetMarkup)
  .replace(/>Wir werden 30\./, '>Wir feiern zusammen.');
```

```javascript
function parseHttpsUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
```

`Getränkeeinkauf mit Auto (Freitag oder Samstag)` is a seeded job-catalog entry, not invitation content injected by `functions/rsvp/index.js` and not a guest-staged suggestion. Its longer German description should say that the helper brings a car and helps buy drinks on Friday or Saturday.

---

### `public/rsvp/index.html` + `public/script.js` (component, request-response)

**Analog:** `public/rsvp/index.html` and `public/script.js`

**UI structure pattern** (`public/rsvp/index.html:32-91`):
```html
<form id="rsvp-form" novalidate>
  <div class="field">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" placeholder="Dein Name" required />
  </div>

  <fieldset class="attendance-choice" aria-describedby="attendance-error">
    <legend>Kannst du dabei sein?</legend>
    <label class="attendance-option" for="attendance-coming">
      <input type="radio" id="attendance-coming" name="attendance" value="coming" required />
      <span>Ich komme</span>
    </label>
    <label class="attendance-option" for="attendance-not-coming">
      <input type="radio" id="attendance-not-coming" name="attendance" value="not_coming" />
      <span>Ich kann leider nicht</span>
    </label>
  </fieldset>

  <div id="coming-fields" hidden>
    <fieldset class="field drink-field" id="drink-field">
      <div id="drink-options" class="drink-options" role="group" aria-label="Getränkewünsche" aria-live="polite"></div>
    </fieldset>
  </div>
</form>

<form id="drink-suggestion-form" novalidate>
  <div class="field" id="drink-suggestion-field">
    <label for="drink-suggestion">Anderes Getränk</label>
    <div class="suggestion-row">
      <input type="text" id="drink-suggestion" name="drink-suggestion" placeholder="z. B. Apfelsaft" />
      <button type="submit" id="btn-drink-suggestion" class="btn-secondary">Hinzufügen</button>
    </div>
  </div>
</form>

<button type="submit" id="btn-submit-coming" class="btn-submit" form="rsvp-form">Anmeldung senden</button>
```

**Safe DOM rendering + staged suggestion flow** (`public/script.js:7-28`, `:38-55`, `:173-227`):
```javascript
const section = document.querySelector('.rsvp-section');
const suggestionForm = document.getElementById('drink-suggestion-form');
const drinkSuggestion = document.getElementById('drink-suggestion');
const btnDrinkSuggestion = document.getElementById('btn-drink-suggestion');

function createDrinkOption(option, checked = false) {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = option.label;
  checkbox.checked = checked;

  const text = document.createElement('span');
  text.textContent = option.label;

  label.appendChild(checkbox);
  label.appendChild(text);
  return { label, checkbox };
}
```

```javascript
const data = await postJson('/api/drink-suggestions', { label });
const existing = selectedDrinks().find(
  (drink) => drink.toLowerCase() === data.option.label.toLowerCase(),
);
if (existing) {
  const checkbox = Array.from(
    drinkOptionsWrap.querySelectorAll('input[type="checkbox"]'),
  ).find((option) => option.value === existing);
  checkbox.checked = true;
} else {
  const { label: optionLabel, checkbox } = createDrinkOption(data.option, true);
  drinkOptionsWrap.appendChild(optionLabel);
  checkbox.checked = true;
}
```

The drinks-shopping option is seeded with the initial job catalog and rendered through this job-options UI. Guest-suggestion staging applies only to guest-added jobs; the seeded option is available directly and has no capacity limit.

**Inline confirmation pattern** (`public/script.js:72-99`):
```javascript
function showConfirmation(payload, drinks) {
  const confirmation = document.createElement('p');
  confirmation.className = 'success-msg';
  confirmation.setAttribute('role', 'status');
  confirmation.setAttribute('aria-live', 'polite');

  if (payload.attendance === 'not_coming') {
    confirmation.textContent = `Schade, ${payload.name}! Wir werden dich vermissen.`;
  } else {
    const group = payload.attendees === 1 ? 'Person' : 'Personen';
    const drinkSummary = drinks.length ? drinks.join(', ') : 'keine angegeben';
    confirmation.textContent = `Danke, ${payload.name}! Wir freuen uns auf euch mit ${payload.attendees} ${group}. Getränkewünsche: ${drinkSummary}. Die Getränke sind Wünsche, keine Garantie.`;
  }

  section.replaceChildren(confirmation);
  confirmation.focus();
}
```

---

### `functions/api/fresh-rsvp.js` (controller, request-response + CRUD)

**Analog:** `functions/api/fresh-rsvp.js`

**Validation + exact-field guarding** (`functions/api/fresh-rsvp.js:5-24`, `:40-85`):
```javascript
function hasExactFields(body, fields) {
  const actualFields = Object.keys(body).sort();
  const expectedFields = [...fields].sort();
  return actualFields.length === expectedFields.length
    && actualFields.every((field, index) => field === expectedFields[index]);
}

const { name, attendance, attendees, drinks } = body;
const trimmedName = typeof name === 'string' ? name.trim() : '';
if (!trimmedName || trimmedName.length > 200) {
  return jsonResponse(400, { ok: false, error: 'Invalid name' });
}

if (attendance === 'not_coming') {
  if (!hasExactFields(body, ['name', 'attendance'])) {
    return jsonResponse(400, { ok: false, error: 'Invalid decline fields' });
  }
}

if (attendance !== 'coming') {
  return jsonResponse(400, { ok: false, error: 'Invalid attendance' });
}

if (!hasExactFields(body, ['name', 'attendance', 'attendees', 'drinks'])) {
  return jsonResponse(400, { ok: false, error: 'Invalid RSVP fields' });
}
if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
  return jsonResponse(400, { ok: false, error: 'Invalid attendees' });
}
```

**D1 batch write pattern** (`functions/api/fresh-rsvp.js:57-105`):
```javascript
const decline = env.DB.prepare(
  'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
).bind(crypto.randomUUID(), trimmedName, attendance, 0, new Date().toISOString(), hostRef);

await env.DB.batch([decline]);

const uniqueDrinks = [...new Set(drinks.map((drink) => drink.trim().toLowerCase()))];
const id = crypto.randomUUID();
const now = new Date().toISOString();

const drinkRows = await resolveDrinkIds(env, uniqueDrinks);
if (drinkRows.length !== uniqueDrinks.length) {
  return jsonResponse(400, { ok: false, error: 'Invalid drink selections' });
}

const statements = [
  env.DB.prepare(
    'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, trimmedName, attendance, attendees, now, hostRef),
  ...drinkRows.map((row) => env.DB.prepare(
    'INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id) VALUES (?, ?)'
  ).bind(id, row.id)),
];

await env.DB.batch(statements);
```

`Getränkeeinkauf mit Auto (Freitag oder Samstag)` is seeded as an initial job option with no capacity limit. Do not route it through guest-suggestion publication; the regular RSVP batch stores only the guest's selection/allocation.

**Error handling** (`functions/api/fresh-rsvp.js:26-29`, `:56-63`, `:89-106`):
```javascript
try {
  body = await request.json();
} catch {
  return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
}

try {
  await env.DB.batch([decline]);
} catch {
  return jsonResponse(500, { ok: false, error: 'Database error' });
}
```

---

### `functions/api/drink-suggestions.js` (service, CRUD)

**Analog:** `functions/api/drink-suggestions.js`

**Catalog lookup and label normalization** (`functions/api/drink-suggestions.js:5-17`, `:28-43`):
```javascript
function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function isLabelConflict(error) {
  return typeof error?.message === 'string'
    && /UNIQUE constraint failed:\s*drink_options\.label/i.test(error.message);
}

async function findOption(env, label) {
  return env.DB.prepare(
    'SELECT id, label, is_fixed FROM drink_options WHERE lower(label) = lower(?)'
  ).bind(label).first();
}
```

**D1 upsert + conflict handling pattern** (`functions/api/drink-suggestions.js:45-89`):
```javascript
const existing = await findOption(env, label);
if (existing) {
  return jsonResponse(200, { ok: true, created: false, option: optionPayload(existing) });
}

const id = crypto.randomUUID();
const now = new Date().toISOString();
try {
  await env.DB.prepare(
    'INSERT INTO drink_options (id, label, is_fixed, created_at) VALUES (?, ?, 0, ?)'
  ).bind(id, label, now).run();
} catch (error) {
  if (!isLabelConflict(error)) {
    throw error;
  }

  const canonical = await findOption(env, label);
  if (!canonical) {
    throw error;
  }
  return jsonResponse(200, { ok: true, created: false, option: optionPayload(canonical) });
}
```

This pattern applies to guest-suggested jobs. The initial drinks-shopping job is seeded separately; it should not be staged or canonicalized as a guest suggestion.

---

### `migrations/0002_fresh_rsvp_round.sql` (migration, CRUD)

**Analog:** `migrations/0002_fresh_rsvp_round.sql`

**Additive schema / safe uniqueness pattern** (`migrations/0002_fresh_rsvp_round.sql:1-67`):
```sql
CREATE TABLE fresh_rsvps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK(attendance IN ('coming', 'not_coming')),
  group_size INTEGER NOT NULL CHECK(
    (attendance = 'coming' AND group_size BETWEEN 1 AND 10)
    OR (attendance = 'not_coming' AND group_size = 0)
  ),
  submitted_at TEXT NOT NULL,
  host_ref INTEGER NOT NULL CHECK(host_ref IN (0, 1))
);

CREATE TABLE drink_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL COLLATE NOCASE UNIQUE,
  is_fixed INTEGER NOT NULL DEFAULT 0 CHECK(is_fixed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fresh_rsvp_drink_selections (
  fresh_rsvp_id TEXT NOT NULL,
  drink_option_id TEXT NOT NULL,
  PRIMARY KEY (fresh_rsvp_id, drink_option_id),
  FOREIGN KEY (fresh_rsvp_id) REFERENCES fresh_rsvps(id) ON DELETE CASCADE,
  FOREIGN KEY (drink_option_id) REFERENCES drink_options(id) ON DELETE CASCADE
);
```

**Validation trigger pattern** (`migrations/0002_fresh_rsvp_round.sql:31-53`):
```sql
CREATE TRIGGER fresh_rsvp_drinks_require_coming
BEFORE INSERT ON fresh_rsvp_drink_selections
WHEN (SELECT attendance FROM fresh_rsvps WHERE id = NEW.fresh_rsvp_id) != 'coming'
BEGIN
  SELECT RAISE(ABORT, 'drink selections require a coming RSVP');
END;

CREATE TRIGGER fresh_rsvp_cannot_decline_with_drinks
BEFORE UPDATE OF attendance ON fresh_rsvps
WHEN NEW.attendance = 'not_coming'
  AND EXISTS (
    SELECT 1
    FROM fresh_rsvp_drink_selections
    WHERE fresh_rsvp_id = NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'declining RSVP cannot have drink selections');
END;
```

The new item `Getränkeeinkauf mit Auto (Freitag oder Samstag)` is a template of the same additive pattern: it belongs in a new job-catalog table with a nullable `max_capacity`, a descriptive label, and a `NULL` cap so it is not treated as a capped `Aufbau`-style option.

---

### `tests/phase-9-api.test.mjs` (test, request-response)

**Analog:** `tests/phase-9-api.test.mjs`

**Atomic batch assertions** (`tests/phase-9-api.test.mjs:133-170`):
```javascript
test('stores a coming RSVP and every selected drink in one atomic batch', async () => {
  const { context, DB } = makeContext({
    name: '  Alice Example  ',
    attendance: 'coming',
    attendees: 2,
    drinks: ['Bier', 'Wein'],
  }, { hostRef: '1' });

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 200);
  assert.equal(DB.runs.length, 0);
  assert.equal(DB.batches.length, 1);
  assert.equal(DB.batches[0].length, 3);

  const [rsvp, ...selections] = DB.batches[0];
  assert.match(rsvp.sql, /INSERT INTO fresh_rsvps/);
  assert.deepEqual(selections.map(({ values }) => values[1]).sort(), ['bier', 'wein']);
});
```

**Validation / no-write tests** (`tests/phase-9-api.test.mjs:172-249`):
```javascript
test('rejects invalid names, attendance, and extra fields', async (t) => {
  for (const payload of [
    { attendance: 'coming', attendees: 1, drinks: [] },
    { name: '   ', attendance: 'coming', attendees: 1, drinks: [] },
    { name: 'Alice', attendance: 'maybe' },
    { name: 'Alice', attendance: 'coming', attendees: 1, drinks: [], contact: 'email' },
  ]) {
    await t.test(JSON.stringify(payload), async () => {
      const { context, DB } = makeContext(payload);
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});
```

This is the correct test shape for the new job option: add a focused case where the selected job label is valid, uncapped, published only on final RSVP success, and rejected when a decline tries to submit job selections.

---

### `tests/phase-9-ui.test.mjs` (test, request-response)

**Analog:** `tests/phase-9-ui.test.mjs`

**UI DOM and accessibility assertions** (`tests/phase-9-ui.test.mjs:29-67`):
```javascript
test('uses one accessible RSVP form and a separate suggestion form', () => {
  const rsvpForm = invitation.match(/<form\b[^>]*id="rsvp-form"[\s\S]*?<\/form>/)?.[0];
  const suggestionForm = invitation.match(
    /<form\b[^>]*id="drink-suggestion-form"[\s\S]*?<\/form>/,
  )?.[0];

  assert.ok(rsvpForm);
  assert.ok(suggestionForm);
  assert.equal((invitation.match(/<form\b/g) ?? []).length, 2);
  assert.match(rsvpForm, /<label[^>]*for="name"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="coming"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="not_coming"/);
  assert.match(rsvpForm, /type="number"[^>]*id="attendees"[^>]*min="1"[^>]*max="10"/);
  assert.match(suggestionForm, /<label[^>]*for="drink-suggestion">Anderes Getränk<\/label>/);
  assert.doesNotMatch(invitation, /id="contact"|Keine Präferenz/);
});
```

**Safe text rendering test** (`tests/phase-9-ui.test.mjs:271-313`):
```javascript
test('renders drink options as text and submits multiple selected drinks with an auto-selected suggestion', async () => {
  const { elements, calls } = await createRsvpHarness({
    options: [{ label: 'Bier' }, { label: 'Apfelsaft' }],
    postRequest: async (url) => url === '/api/drink-suggestions'
      ? jsonResponse({ ok: true, option: { label: 'Apfelsaft' } })
      : jsonResponse({ ok: true }),
  });

  elements['drink-suggestion'].value = 'Apfelsaft';
  await elements['drink-suggestion-form'].dispatch('submit');

  assert.match(elements['drink-suggestion-status'].textContent, /ausgewählt/);
  assert.equal(elements['drink-options'].children[1].children[1].textContent, 'Apfelsaft');
});
```

Use this safe-rendering pattern for the seeded drinks-shopping job label and description. It is an initial catalog option, so it is available without the guest-suggestion flow.

---

### `tests/phase-9-e2e.test.mjs` (test, request-response)

**Analog:** `tests/phase-9-e2e.test.mjs`

**Local Pages + D1 integration boundary** (`tests/phase-9-e2e.test.mjs:243-396`):
```javascript
server = await startPages(entrypoint, persistencePath, '');

const catalogResponse = await request('/api/drink-suggestions', { password: hostPasswords[0] });
const suggestionResponse = await request('/api/drink-suggestions', {
  password: hostPasswords[0],
  method: 'POST',
  body: { label: drinkLabel },
});

const response = await request('/api/fresh-rsvp', {
  password: hostPasswords[0],
  method: 'POST',
  body: {
    name: comingName,
    attendance: 'coming',
    attendees: 3,
    drinks: ['Bier', drinkLabel],
  },
});
```

The seeded drinks-shopping job should be selectable from the loaded job catalog. Its selected allocation is saved with the RSVP in the isolated local D1 transaction; it is not staged or published as a suggestion.

**No-remote-action boundary** (`tests/phase-9-e2e.test.mjs:1-87`, `:456-520`):
```javascript
if (!(await portIsAvailable())) {
  throw new Error('Port 8788 is already in use; the integration test will not stop an existing process.');
}

const environment = { ...process.env, CI: '1' };
delete environment.SITE_PASSWORD__0;
delete environment.SITE_PASSWORD__1;
```

## Shared Patterns

### Authentication + host attribution
**Source:** `functions/_middleware.js:9-57`
**Apply to:** any authenticated RSVP or catalog route
```javascript
const password = credentials.slice(colonIndex + 1);
let hostRef;
if (password === env.SITE_PASSWORD__0) {
  hostRef = 0;
} else if (password === env.SITE_PASSWORD__1) {
  hostRef = 1;
} else {
  return unauthorizedResponse();
}

const modifiedRequest = new Request(request, {
  headers: new Headers({
    ...Object.fromEntries(request.headers),
    'X-Host-Ref': String(hostRef),
  }),
});
```

### Exact validation + reject-on-mismatch
**Source:** `functions/api/fresh-rsvp.js:5-24`, `:40-85`
**Apply to:** all form payload validation for RSVP-style APIs
```javascript
if (!hasExactFields(body, ['name', 'attendance', 'attendees', 'drinks'])) {
  return jsonResponse(400, { ok: false, error: 'Invalid RSVP fields' });
}
if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
  return jsonResponse(400, { ok: false, error: 'Invalid attendees' });
}
```

### Safe text rendering without HTML injection
**Source:** `public/script.js:38-55`, `:72-99`
**Apply to:** any guest-provided label rendering
```javascript
const text = document.createElement('span');
text.textContent = option.label;

confirmation.textContent = `Danke, ${payload.name}! ...`;
```

### D1 atomic batch writes
**Source:** `functions/api/fresh-rsvp.js:57-105`, `migrations/0002_fresh_rsvp_round.sql:23-53`
**Apply to:** any multi-row submission that must succeed or roll back together
```javascript
const statements = [
  env.DB.prepare('INSERT INTO fresh_rsvps ...').bind(...),
  ...drinkRows.map((row) => env.DB.prepare(
    'INSERT INTO fresh_rsvp_drink_selections ...'
  ).bind(id, row.id)),
];
await env.DB.batch(statements);
```

For `Getränkeeinkauf mit Auto (Freitag oder Samstag)`, seed the option with the initial job catalog and leave its capacity `NULL`. The final RSVP batch records its selection/allocation; suggestion publication logic applies only to guest-added options.

### Case-insensitive duplicate resolution for user suggestions
**Source:** `functions/api/drink-suggestions.js:9-17`, `:69-89`
**Apply to:** staged suggestion publish/resolve logic for drinks/jobs
```javascript
function isLabelConflict(error) {
  return typeof error?.message === 'string'
    && /UNIQUE constraint failed:\s*drink_options\.label/i.test(error.message);
}

const canonical = await findOption(env, label);
if (!canonical) {
  throw error;
}
return jsonResponse(200, { ok: true, created: false, option: optionPayload(canonical) });
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| job catalog table / job allocation schema | migration/service | CRUD | No tracked job table or job-capacity schema exists yet; the nearest analog is the additive `drink_options` + `fresh_rsvp_drink_selections` pattern and the `DB.batch()` write pattern in `functions/api/fresh-rsvp.js`. |

## Metadata

**Analog search scope:** `functions/`, `public/`, `migrations/`, `tests/`
**Files scanned:** 10
**Pattern extraction date:** 2026-11-15

