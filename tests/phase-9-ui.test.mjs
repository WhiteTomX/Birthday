import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const invitation = await readFile(
  new URL('../public/rsvp/index.html', import.meta.url),
  'utf8',
);
const styles = await readFile(
  new URL('../public/style.css', import.meta.url),
  'utf8',
);
const script = await readFile(
  new URL('../public/script.js', import.meta.url),
  'utf8',
);

test('keeps help suggestions below the help options and outside nested forms', () => {
  const rsvpForm = invitation.match(/<form\b[^>]*id="rsvp-form"[\s\S]*?<\/form>/)?.[0];
  const suggestionForm = invitation.match(
    /<form\b[^>]*id="drink-suggestion-form"[\s\S]*?<\/form>/,
  )?.[0];
  const jobSuggestionForm = invitation.match(
    /<div\b[^>]*id="job-suggestion-form"[\s\S]*?<\/div>\s*<\/fieldset>/,
  )?.[0];

  assert.ok(rsvpForm);
  assert.ok(suggestionForm);
  assert.ok(jobSuggestionForm);
  assert.equal((invitation.match(/<form\b/g) ?? []).length, 2);
  assert.match(rsvpForm, /<label[^>]*for="name"/);
  assert.match(rsvpForm, /<fieldset[^>]*class="attendance-choice"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="coming"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="not_coming"/);
  assert.match(rsvpForm, /type="number"[^>]*id="attendees"[^>]*min="1"[^>]*max="10"/);
  assert.match(rsvpForm, /<fieldset[^>]*id="job-field"/);
  assert.match(rsvpForm, /id="job-options-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(rsvpForm, /<fieldset[^>]*id="drink-field"/);
  assert.match(rsvpForm, /<div[^>]*id="coming-fields"[^>]*hidden/);
  assert.match(rsvpForm, /role="alert"/);
  assert.match(rsvpForm, /id="drink-options-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(suggestionForm, /<label[^>]*for="drink-suggestion">Anderes Getränk<\/label>/);
  assert.match(suggestionForm, /<button[^>]*id="btn-drink-suggestion"[^>]*>Hinzufügen<\/button>/);
  assert.match(suggestionForm, /role="status"[^>]*aria-live="polite"/);
  assert.match(jobSuggestionForm, /<label[^>]*for="job-suggestion">Ich möchte anders helfen<\/label>/);
  assert.match(jobSuggestionForm, /<button[^>]*id="btn-job-suggestion"[^>]*>Hilfe vorschlagen<\/button>/);
  assert.match(jobSuggestionForm, /role="status"[^>]*aria-live="polite"/);
  assert.match(rsvpForm, /aria-label="Hilfeangebote"/);
  assert.match(invitation, /id="coming-suggestion-fields"[^>]*hidden/);
  assert.doesNotMatch(invitation, /id="contact"|Keine Präferenz/);

  const selectorEnd = invitation.indexOf('</fieldset>', invitation.indexOf('id="drink-field"'));
  const rsvpEnd = invitation.indexOf('</form>', invitation.indexOf('id="rsvp-form"'));
  const suggestionBlockStart = invitation.lastIndexOf(
    '<div',
    invitation.indexOf('id="coming-suggestion-fields"'),
  );
  const suggestionStart = invitation.indexOf('id="drink-suggestion-form"');
  const jobSuggestionStart = invitation.indexOf('id="job-suggestion-form"');
  const jobOptionsEnd = invitation.indexOf('</div>', invitation.indexOf('id="job-options"'));
  const jobSuggestionEnd = invitation.indexOf('</fieldset>', jobSuggestionStart);
  assert.ok(suggestionStart > selectorEnd);
  assert.ok(suggestionStart > rsvpEnd);
  assert.ok(suggestionBlockStart > rsvpEnd);
  assert.ok(jobSuggestionStart > jobOptionsEnd);
  assert.ok(jobSuggestionStart < invitation.indexOf('id="drink-field"'));
  assert.ok(jobSuggestionEnd < invitation.indexOf('id="drink-field"'));
  assert.equal((invitation.match(/<button[^>]*type="submit"/g) ?? []).length, 2);
  assert.equal(invitation.slice(rsvpEnd + '</form>'.length, suggestionBlockStart).trim(), '');
});

test('associates the RSVP submit control with the RSVP form outside the suggestion form', () => {
  const submitButton = invitation.match(
    /<button\b(?=[^>]*type="submit")(?=[^>]*form="rsvp-form")[^>]*>/,
  )?.[0];
  const submitIndex = submitButton ? invitation.indexOf(submitButton) : -1;
  const suggestionEnd = invitation.indexOf('</form>', invitation.indexOf('id="drink-suggestion-form"'));

  assert.ok(submitButton);
  assert.ok(submitIndex > suggestionEnd);
  assert.equal((invitation.match(/type="submit"/g) ?? []).length, 2);
});

test('provides visible keyboard focus and responsive form layout styles', () => {
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\s*\(max-width:\s*599px\)/);
  assert.match(styles, /\.attendance-option/);
  assert.match(styles, /\.drink-option/);
});

class FakeElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.value = '';
    this.type = '';
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classes = new Set();
    this._textContent = '';
    this.classList = {
      add: (...tokens) => tokens.forEach((token) => this.classes.add(token)),
      remove: (...tokens) => tokens.forEach((token) => this.classes.delete(token)),
      contains: (token) => this.classes.has(token),
      toggle: (token, force = !this.classes.has(token)) => {
        if (force) this.classes.add(token);
        else this.classes.delete(token);
        return force;
      },
    };
    Object.defineProperty(this, 'innerHTML', {
      get: () => '',
      set: (value) => {
        if (value !== '') throw new Error('Unsafe HTML insertion is not allowed in this test DOM');
        this.replaceChildren();
      },
    });
  }

  get textContent() {
    return this.children.length
      ? this.children.map((child) => child.textContent).join('')
      : this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
    this._textContent = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async dispatch(type, properties = {}) {
    const event = {
      ...properties,
      target: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
    };
    for (const listener of this.listeners.get(type) ?? []) {
      await listener(event);
    }
    return event;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  querySelectorAll(selector) {
    const descendants = this.children.flatMap((child) => [
      child,
      ...child.querySelectorAll('*'),
    ]);
    if (selector === '*') return descendants;
    if (selector === 'input[type="checkbox"]') {
      return descendants.filter((element) => element.tagName === 'INPUT' && element.type === 'checkbox');
    }
    if (selector === 'input[data-job-id]') {
      return descendants.filter((element) => element.tagName === 'INPUT' && element.dataset.jobId);
    }
    if (selector === 'input[data-job-suggestion]') {
      return descendants.filter((element) => element.tagName === 'INPUT' && element.dataset.jobSuggestion);
    }
    return [];
  }
}

function jsonResponse(payload, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

async function createRsvpHarness({
  options = [],
  jobs = [],
  postRequest = async () => jsonResponse({ ok: true }),
} = {}) {
  const ids = [
    'rsvp-form',
    'name',
    'name-error',
    'btn-less',
    'btn-more',
    'attendee-count',
    'attendee-value',
    'btn-not-coming',
    'btn-coming',
    'attendance-error',
    'coming-fields',
    'attendees',
    'attendees-error',
    'drink-options',
    'drink-options-status',
    'job-options',
    'job-options-status',
    'coming-suggestion-fields',
    'drink-suggestion-form',
    'drink-suggestion',
    'drink-suggestion-error',
    'drink-suggestion-status',
    'btn-drink-suggestion',
    'job-suggestion-form',
    'job-suggestion',
    'job-suggestion-error',
    'job-suggestion-status',
    'btn-job-suggestion',
    'btn-submit-coming',
    'submit-error',
  ];
  const elements = Object.fromEntries(ids.map((id) => [
    id,
    new FakeElement(id.endsWith('form') ? 'form' : 'div', id),
  ]));
  elements.name.tagName = 'INPUT';
  elements.name.type = 'text';
  elements.attendees.tagName = 'INPUT';
  elements.attendees.type = 'number';
  elements.attendees.value = '1';
  elements['drink-suggestion'].tagName = 'INPUT';
  elements['drink-suggestion'].type = 'text';
  elements['job-suggestion'].tagName = 'INPUT';
  elements['job-suggestion'].type = 'text';
  elements['btn-drink-suggestion'].tagName = 'BUTTON';
  elements['btn-job-suggestion'].tagName = 'BUTTON';
  elements['btn-submit-coming'].tagName = 'BUTTON';
  elements['btn-submit-coming'].textContent = 'Anmeldung senden';
  elements['btn-drink-suggestion'].textContent = 'Hinzufügen';
  elements['btn-job-suggestion'].textContent = 'Hilfe vorschlagen';
  elements['coming-fields'].hidden = true;
  elements['coming-suggestion-fields'].hidden = true;
  elements['attendee-value'].value = '1';
  elements['attendee-count'].textContent = '1';

  const radios = [
    new FakeElement('input', 'attendance-coming'),
    new FakeElement('input', 'attendance-not-coming'),
  ];
  radios[0].type = 'radio';
  radios[0].value = 'coming';
  radios[1].type = 'radio';
  radios[1].value = 'not_coming';
  const section = new FakeElement('section', 'rsvp-section');
  const invitationCopy = new FakeElement('div', 'invitation-copy');
  invitationCopy.textContent = '5. Dezember um 17:00 Uhr';
  const elementsById = new Map([
    ...Object.entries(elements),
    ...radios.map((radio) => [radio.id, radio]),
  ]);
  const document = {
    activeElement: null,
    getElementById(id) { return elementsById.get(id) ?? null; },
    querySelector(selector) { return selector === '.rsvp-section' ? section : null; },
    createElement(tagName) {
      const element = new FakeElement(tagName);
      element.ownerDocument = document;
      return element;
    },
  };
  for (const element of [...elementsById.values(), section, invitationCopy]) {
    element.ownerDocument = document;
  }

  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (!init.method) {
      return jsonResponse({ ok: true, options: url === '/api/job-options' ? jobs : options });
    }
    return postRequest(url, init, JSON.parse(init.body));
  };
  vm.runInNewContext(script, { document, fetch });
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { calls, elements, invitationCopy, radios, section };
}

test('renders drink options as text and submits multiple selected drinks with an auto-selected suggestion', async () => {
  const maliciousLabel = '<img src=x onerror=alert(1)>';
  const { calls, elements, invitationCopy, radios, section } = await createRsvpHarness({
    options: [
      { id: 'fixed-1', label: 'Bier', is_fixed: true },
      { id: 'untrusted', label: maliciousLabel, is_fixed: false },
    ],
    postRequest: async (url) => url === '/api/drink-suggestions'
      ? jsonResponse({ ok: true, label: 'Apfelsaft' })
      : jsonResponse({ ok: true, attendance: 'coming' }),
  });

  const initialCheckboxes = elements['drink-options'].querySelectorAll('input[type="checkbox"]');
  assert.equal(initialCheckboxes.length, 2);
  assert.equal(elements['drink-options'].children[1].children[1].textContent, maliciousLabel);

  elements.name.value = '<b>Ada</b>';
  elements.attendees.value = '2';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  initialCheckboxes[0].checked = true;

  elements['drink-suggestion'].value = 'Apfelsaft';
  await elements['drink-suggestion-form'].dispatch('submit');

  const checkboxes = elements['drink-options'].querySelectorAll('input[type="checkbox"]');
  assert.equal(checkboxes.length, 3);
  assert.equal(checkboxes[2].checked, true);
  assert.match(elements['drink-suggestion-status'].textContent, /ausgewählt/);

  await elements['rsvp-form'].dispatch('submit');
  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: '<b>Ada</b>',
    attendance: 'coming',
    attendees: 2,
    drinks: ['Bier'],
    drink_suggestions: ['Apfelsaft'],
  });
  assert.match(section.children[0].textContent, /2 Personen/);
  assert.match(section.children[0].textContent, /Bier, Apfelsaft/);
  assert.match(section.children[0].textContent, /keine Garantie/);
  assert.equal(section.children[0].textContent.includes('<b>Ada</b>'), true);
  assert.equal(invitationCopy.textContent, '5. Dezember um 17:00 Uhr');
});

test('stages job suggestions locally and submits only an allocated suggestion', async () => {
  const { calls, elements, radios, section } = await createRsvpHarness({
    postRequest: async (url) => url === '/api/job-options'
      ? jsonResponse({ ok: true, label: 'Neue Aufgabe' })
      : jsonResponse({
        ok: true,
        jobs: [{ id: 'suggested', label: 'Neue Aufgabe', requested_count: 2, accepted_count: 1 }],
      }),
  });
  elements.name.value = 'Mia';
  elements.attendees.value = '2';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  elements['job-suggestion'].value = '  Neue Aufgabe  ';
  await elements['btn-job-suggestion'].dispatch('click');

  const stagingRequest = calls.find((call) => (
    call.url === '/api/job-options' && call.init.method === 'POST'
  ));
  assert.ok(stagingRequest);
  assert.deepEqual(JSON.parse(stagingRequest.init.body), { label: '  Neue Aufgabe  ' });
  elements['job-suggestion'].value = 'Neue Aufgabe';
  await elements['btn-job-suggestion'].dispatch('click');
  assert.equal(elements['job-options'].children.length, 1);
  const [count] = elements['job-options'].querySelectorAll('input[data-job-suggestion]');
  assert.equal(count.dataset.jobSuggestion, 'Neue Aufgabe');

  count.value = '2';
  await elements['rsvp-form'].dispatch('submit');
  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Mia',
    attendance: 'coming',
    attendees: 2,
    drinks: [],
    job_suggestions: [{ label: 'Neue Aufgabe', count: 2 }],
  });
  assert.match(section.children[0].textContent, /Neue Aufgabe: 1 von 2 bestätigt/);
  assert.match(section.children[0].textContent, /1 nicht bestätigt/);
});

test('submits a help suggestion when Enter is pressed in its input', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    postRequest: async () => jsonResponse({ ok: true, label: 'Dekorieren' }),
  });
  radios[0].checked = true;
  await radios[0].dispatch('change');
  elements['job-suggestion'].value = 'Dekorieren';

  await elements['job-suggestion'].dispatch('keydown', { key: 'Enter' });

  assert.ok(calls.some((call) => (
    call.url === '/api/job-options' && call.init.method === 'POST'
  )));
});

test('does not publish an unallocated staged job suggestion', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    postRequest: async (url) => url === '/api/job-options'
      ? jsonResponse({ ok: true, label: 'Unzugewiesene Aufgabe' })
      : jsonResponse({ ok: true }),
  });
  elements.name.value = 'Nina';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  elements['job-suggestion'].value = 'Unzugewiesene Aufgabe';
  await elements['btn-job-suggestion'].dispatch('click');
  assert.ok(calls.some((call) => (
    call.url === '/api/job-options' && call.init.method === 'POST'
  )));
  await elements['rsvp-form'].dispatch('submit');

  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Nina',
    attendance: 'coming',
    attendees: 1,
    drinks: [],
  });
});

test('renders a staged job label as inert text', async () => {
  const maliciousLabel = '<img src=x onerror=alert(1)>';
  const { elements, radios } = await createRsvpHarness({
    postRequest: async () => jsonResponse({ ok: true, label: maliciousLabel }),
  });
  radios[0].checked = true;
  await radios[0].dispatch('change');
  elements['job-suggestion'].value = maliciousLabel;
  await elements['btn-job-suggestion'].dispatch('click');

  const stagedItem = elements['job-options'].children[0];
  assert.equal(stagedItem.children[0].children[0].textContent, maliciousLabel);
  assert.deepEqual(stagedItem.children[0].children[0].children, []);
});

test('reuses an existing catalog job when a guest suggests its label', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    jobs: [{
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf beim Aufbau.',
      is_fixed: true,
      max_capacity: 15,
      assigned_count: 0,
      remaining: 15,
    }],
    postRequest: async (url) => url === '/api/job-options'
      ? jsonResponse({ ok: true, label: 'Aufbau' })
      : jsonResponse({ ok: true }),
  });
  elements.name.value = 'Lea';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  elements['job-suggestion'].value = 'Aufbau';
  await elements['btn-job-suggestion'].dispatch('click');
  assert.ok(calls.some((call) => (
    call.url === '/api/job-options' && call.init.method === 'POST'
  )));

  assert.equal(elements['job-options'].children.length, 1);
  const [count] = elements['job-options'].querySelectorAll('input[data-job-id]');
  assert.equal(count.dataset.jobId, 'aufbau');
  assert.equal(elements['job-options'].querySelectorAll('input[data-job-suggestion]').length, 0);

  count.value = '1';
  await elements['rsvp-form'].dispatch('submit');
  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Lea',
    attendance: 'coming',
    attendees: 1,
    drinks: [],
    jobs: [{ id: 'aufbau', count: 1 }],
  });
});

test('validates job suggestion length by Unicode code points', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    postRequest: async (url, init, body) => url === '/api/job-options'
      ? jsonResponse({ ok: true, label: body.label.normalize('NFC').trim() })
      : jsonResponse({ ok: true }),
  });
  elements.name.value = 'Ada';
  radios[0].checked = true;
  await radios[0].dispatch('change');

  for (const value of ['', '😀'.repeat(81)]) {
    elements['job-suggestion'].value = value;
    await elements['btn-job-suggestion'].dispatch('click');
    assert.equal(calls.some((call) => call.url === '/api/job-options' && call.init.method === 'POST'), false);
    assert.equal(elements['job-suggestion-error'].hidden, false);
  }

  elements['job-suggestion'].value = '😀'.repeat(80);
  await elements['btn-job-suggestion'].dispatch('click');
  assert.equal(calls.filter((call) => call.url === '/api/job-options' && call.init.method === 'POST').length, 1);
  assert.equal(elements['job-suggestion-error'].hidden, true);
});

test('hides and disables suggestion controls for declines', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    jobs: [{
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf beim Aufbau.',
      is_fixed: true,
      max_capacity: 15,
      assigned_count: 0,
      remaining: 15,
    }],
    postRequest: async () => jsonResponse({ ok: true, label: 'Neue Aufgabe' }),
  });
  radios[0].checked = true;
  await radios[0].dispatch('change');
  assert.equal(elements['coming-suggestion-fields'].hidden, false);
  assert.equal(elements['job-suggestion'].disabled, false);

  radios[0].checked = false;
  radios[1].checked = true;
  await radios[1].dispatch('change');
  assert.equal(elements['coming-suggestion-fields'].hidden, true);
  assert.equal(elements['job-suggestion'].disabled, true);
  assert.equal(elements['btn-job-suggestion'].disabled, true);

  elements['job-suggestion'].value = 'Neue Aufgabe';
  await elements['job-suggestion-form'].dispatch('submit');
  assert.equal(calls.some((call) => call.url === '/api/job-options' && call.init.method === 'POST'), false);
});

test('submits a decline without headcount or drink fields and shows a personal confirmation', async () => {
  const { calls, elements, section, radios } = await createRsvpHarness();
  elements.name.value = 'Lea';
  radios[1].checked = true;
  await radios[1].dispatch('change');

  assert.equal(elements['coming-fields'].hidden, true);
  await elements['rsvp-form'].dispatch('submit');

  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Lea',
    attendance: 'not_coming',
  });
  assert.match(section.children[0].textContent, /Schade, Lea/);
  assert.equal(section.children[0].getAttribute('role'), 'status');
});

test('rejects a headcount outside the 1–10 range before submitting', async () => {
  const { calls, elements, radios } = await createRsvpHarness();
  elements.name.value = 'Mia';
  elements.attendees.value = '11';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  assert.equal(calls.some((call) => call.url === '/api/fresh-rsvp'), false);
  assert.equal(elements['attendees-error'].hidden, false);
  assert.equal(elements.attendees.getAttribute('aria-invalid'), 'true');
});

test('keeps the form usable and reports a useful status after request failures', async () => {
  const { elements, radios } = await createRsvpHarness({
    postRequest: async () => { throw new Error('<img src=x> network failure'); },
  });
  elements.name.value = 'Mia';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  assert.equal(elements['btn-submit-coming'].disabled, false);
  assert.equal(elements['btn-submit-coming'].textContent, 'Anmeldung senden');
  assert.equal(elements['submit-error'].hidden, false);
  assert.match(elements['submit-error'].textContent, /erneut/);
  assert.doesNotMatch(elements['submit-error'].textContent, /<img/);

  elements['drink-suggestion'].value = 'Kakao';
  await elements['drink-suggestion-form'].dispatch('submit');
  assert.equal(elements['btn-drink-suggestion'].disabled, false);
  assert.equal(elements['btn-drink-suggestion'].textContent, 'Hinzufügen');
  assert.equal(elements['drink-suggestion-error'].hidden, false);
});

test('renders job descriptions safely and communicates full, partial, and uncapped availability', async () => {
  const maliciousDescription = '<img src=x onerror=alert(1)>';
  const { elements, radios } = await createRsvpHarness({
    jobs: [
      {
        id: 'full',
        label: 'Full capped job',
        description: 'A capped job that is already full.',
        is_fixed: true,
        max_capacity: 15,
        assigned_count: 15,
        remaining: 0,
      },
      {
        id: 'partial',
        label: 'Partially available job',
        description: maliciousDescription,
        is_fixed: true,
        max_capacity: 15,
        assigned_count: 13,
        remaining: 2,
      },
      {
        id: 'uncapped',
        label: 'Uncapped job',
        description: 'An uncapped job has no maximum number of signups.',
        is_fixed: true,
        max_capacity: null,
        assigned_count: 0,
        remaining: null,
      },
    ],
  });
  radios[0].checked = true;
  await radios[0].dispatch('change');

  const jobItems = elements['job-options'].children;
  const counts = elements['job-options'].querySelectorAll('input[data-job-id]');
  assert.equal(jobItems.length, 3);
  assert.equal(counts.length, 3);
  assert.equal(counts[0].disabled, true);
  assert.match(jobItems[0].textContent, /Keine Plätze mehr frei/);
  assert.equal(counts[1].disabled, false);
  assert.match(jobItems[1].textContent, /Noch 2 Plätze frei/);
  assert.equal(jobItems[1].children[0].children[1].textContent, maliciousDescription);
  assert.deepEqual(jobItems[1].children[0].children[1].children, []);
  assert.equal(counts[2].disabled, false);
  assert.doesNotMatch(jobItems[2].textContent, /Keine feste Begrenzung/);
  assert.doesNotMatch(jobItems[2].textContent, /Keine Plätze mehr frei/);
  assert.equal(counts[2].getAttribute('aria-label'), 'Anzahl für Uncapped job');
  assert.deepEqual(
    counts[2].getAttribute('aria-describedby').split(' '),
    [jobItems[2].children[0].children[1].id, jobItems[2].children[1].id],
  );
  assert.equal(jobItems[2].children[1].getAttribute('role'), 'status');
  assert.match(styles, /\.job-options/);
  assert.match(styles, /\.job-option\s*\{[^}]*position:\s*relative/);
  assert.match(styles, /\.job-option-details\s*\{[^}]*padding-right:\s*112px/);
  assert.match(styles, /\.job-option-capacity\s*\{[^}]*margin-top:\s*4px/);
  assert.match(styles, /\.job-count-label\s*\{[^}]*position:\s*absolute[^}]*top:\s*14px[^}]*right:\s*14px[^}]*width:\s*96px/);
  const mobileJobStyles = styles.match(/@media \(max-width: 599px\) \{([\s\S]*)$/)?.[1] ?? '';
  assert.match(mobileJobStyles, /\.job-option-details\s*\{[^}]*padding-right:\s*96px/);
  assert.match(mobileJobStyles, /\.job-option-capacity\s*\{[^}]*margin-top:\s*2px/);
  assert.match(mobileJobStyles, /\.job-count-label\s*\{[^}]*width:\s*84px/);
});

test('renders all six fixed jobs in catalog order with one combined cleanup and brunch choice', async () => {
  const jobs = [
    {
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf beim Aufbau des Veranstaltungsbereichs und stimme benötigte Handgriffe vor Ort ab.',
      is_fixed: true,
      max_capacity: 15,
      assigned_count: 0,
      remaining: 15,
    },
    {
      id: 'teilzeit-barkeeper',
      label: 'Teilzeit Barkeeper nach Lust und Laune',
      description: 'Unterstütze beim Getränke-Ausschank so lange und so oft, wie es für dich passt.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'musikbox',
      label: 'Jemand der mit der Musikbox verbunden ist',
      description: 'Hilf dabei, die Musikbox mit einem passenden Gerät zu verbinden.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'dinge',
      label: 'Dinge',
      description: 'Hilf bei verschiedenen Dingen; was genau anfällt, klären wir gemeinsam.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'abbau-brunch',
      label: 'Abbau & Brunch am nächsten Tag',
      description: 'Hilf beim Aufräumen nach dem Geburtstag und sei beim Buffet-Brunch dabei.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'getraenkeeinkauf-auto',
      label: 'Getränkeeinkauf mit Auto (Freitag oder Samstag)',
      description: 'Hilf am Freitag oder Samstag mit deinem Auto beim Getränkeeinkauf.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
  ];
  const { elements } = await createRsvpHarness({ jobs });
  const rendered = elements['job-options'].children;
  const labels = rendered.map((item) => item.children[0].children[0].textContent);
  const descriptions = rendered.map((item) => item.children[0].children[1].textContent);

  assert.deepEqual(labels, jobs.map((job) => job.label));
  assert.deepEqual(descriptions, jobs.map((job) => job.description));
  assert.equal(labels.filter((label) => label.includes('Brunch')).length, 1);
});

test('submits job attendee counts and confirms the server-accepted partial count', async () => {
  const { calls, elements, radios, section } = await createRsvpHarness({
    jobs: [{
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf beim Aufbau des Veranstaltungsbereichs.',
      is_fixed: true,
      max_capacity: 15,
      assigned_count: 14,
      remaining: 1,
    }],
    postRequest: async () => jsonResponse({
      ok: true,
      jobs: [{ id: 'aufbau', label: 'Aufbau', requested_count: 2, accepted_count: 1 }],
    }),
  });
  const [count] = elements['job-options'].querySelectorAll('input[data-job-id]');
  elements.name.value = 'Mia';
  elements.attendees.value = '2';
  await elements.attendees.dispatch('input');
  assert.equal(count.max, '2');
  count.value = '2';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Mia',
    attendance: 'coming',
    attendees: 2,
    drinks: [],
    jobs: [{ id: 'aufbau', count: 2 }],
  });
  assert.match(section.children[0].textContent, /Aufbau: 1 von 2 bestätigt/);
  assert.match(section.children[0].textContent, /1 nicht bestätigt/);
});

test('reports accepted and unassigned counts for full and uncapped job allocations', async () => {
  const { elements, radios, section } = await createRsvpHarness({
    jobs: [
      {
        id: 'aufbau',
        label: 'Aufbau',
        description: 'Hilf beim Aufbau.',
        is_fixed: true,
        max_capacity: 15,
        assigned_count: 14,
        remaining: 1,
      },
      {
        id: 'barkeeper',
        label: 'Barkeeper',
        description: 'Hilf beim Getränke-Ausschank.',
        is_fixed: true,
        max_capacity: null,
        assigned_count: 0,
        remaining: null,
      },
    ],
    postRequest: async () => jsonResponse({
      ok: true,
      jobs: [
        { id: 'aufbau', label: 'Aufbau', requested_count: 2, accepted_count: 0 },
        { id: 'barkeeper', label: 'Barkeeper', requested_count: 2, accepted_count: 2 },
      ],
    }),
  });
  const counts = elements['job-options'].querySelectorAll('input[data-job-id]');
  elements.name.value = 'Mia';
  elements.attendees.value = '2';
  counts[0].value = '2';
  counts[1].value = '2';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  assert.match(section.children[0].textContent, /Aufbau: 0 von 2 bestätigt/);
  assert.match(section.children[0].textContent, /2 nicht bestätigt/);
  assert.match(section.children[0].textContent, /Barkeeper: 2 von 2 bestätigt/);
});

test('leaves optional job counts blank and validates each assignment independently', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    jobs: [
      {
        id: 'aufbau',
        label: 'Aufbau',
        description: 'Hilf beim Aufbau des Veranstaltungsbereichs.',
        is_fixed: true,
        max_capacity: 15,
        assigned_count: 0,
        remaining: 15,
      },
      {
        id: 'musikbox',
        label: 'Jemand der mit der Musikbox verbunden ist',
        description: 'Hilf beim Verbinden der Musikbox mit einem Gerät.',
        is_fixed: true,
        max_capacity: null,
        assigned_count: 0,
        remaining: null,
      },
    ],
  });
  const counts = elements['job-options'].querySelectorAll('input[data-job-id]');

  assert.equal(counts[0].value, '');
  assert.equal(counts[0].min, '1');
  assert.equal(counts[1].value, '');
  assert.equal(counts[1].min, '1');

  elements.name.value = 'Mia';
  elements.attendees.value = '1';
  counts[0].value = '1';
  counts[1].value = '1';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Mia',
    attendance: 'coming',
    attendees: 1,
    drinks: [],
    jobs: [
      { id: 'aufbau', count: 1 },
      { id: 'musikbox', count: 1 },
    ],
  });
});

test('submits no job allocation when all optional counts remain blank', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    jobs: [{
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf beim Aufbau.',
      is_fixed: true,
      max_capacity: 15,
      assigned_count: 0,
      remaining: 15,
    }],
  });
  elements.name.value = 'Nina';
  radios[0].checked = true;
  await radios[0].dispatch('change');
  await elements['rsvp-form'].dispatch('submit');

  const rsvpRequest = calls.find((call) => call.url === '/api/fresh-rsvp');
  assert.deepEqual(JSON.parse(rsvpRequest.init.body), {
    name: 'Nina',
    attendance: 'coming',
    attendees: 1,
    drinks: [],
  });
});

test('disables job controls for declines and restores only valid coming controls', async () => {
  const { elements, radios } = await createRsvpHarness({
    jobs: [
      {
        id: 'full',
        label: 'Full capped job',
        description: 'This capped job is full.',
        is_fixed: true,
        max_capacity: 15,
        assigned_count: 15,
        remaining: 0,
      },
      {
        id: 'open',
        label: 'Open job',
        description: 'This job is open.',
        is_fixed: true,
        max_capacity: null,
        assigned_count: 0,
        remaining: null,
      },
    ],
  });
  const [fullCount, openCount] = elements['job-options'].querySelectorAll('input[data-job-id]');
  elements.attendees.value = '2';
  await elements.attendees.dispatch('input');
  radios[0].checked = true;
  await radios[0].dispatch('change');
  openCount.value = '2';
  elements.attendees.value = '1';
  await elements.attendees.dispatch('input');

  radios[0].checked = false;
  radios[1].checked = true;
  await radios[1].dispatch('change');
  assert.equal(elements['coming-fields'].hidden, true);
  assert.equal(fullCount.disabled, true);
  assert.equal(openCount.disabled, true);

  radios[1].checked = false;
  radios[0].checked = true;
  await radios[0].dispatch('change');
  assert.equal(elements['coming-fields'].hidden, false);
  assert.equal(fullCount.disabled, true);
  assert.equal(openCount.disabled, false);
  assert.equal(openCount.value, '');
});

test('rejects zero and fractional job counts before submitting', async () => {
  const { calls, elements, radios } = await createRsvpHarness({
    jobs: [{
      id: 'open',
      label: 'Open job',
      description: 'This job is open.',
      is_fixed: true,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    }],
  });
  const [count] = elements['job-options'].querySelectorAll('input[data-job-id]');
  elements.name.value = 'Lea';
  radios[0].checked = true;
  await radios[0].dispatch('change');

  for (const value of ['0', '1.5']) {
    count.value = value;
    await elements['rsvp-form'].dispatch('submit');
    assert.equal(calls.some((call) => call.url === '/api/fresh-rsvp'), false);
    assert.match(elements['job-options-status'].textContent, /zwischen 1 und der Gruppengröße/);
    assert.equal(count.ownerDocument.activeElement, count);
  }
});
