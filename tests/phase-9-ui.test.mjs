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

test('presents the event details in warm German invitation copy without inventing logistics', () => {
  assert.match(invitation, /5\. Dezember/);
  assert.match(invitation, /17:00 Uhr/);
  assert.doesNotMatch(invitation, /\b20\d{2}\b|Musterstraße|Hauptstraße/);
  assert.match(invitation, /<!-- VENUE_DETAILS -->/);
  assert.match(invitation, /<!-- PARK_ENTRY_DIRECTIONS -->/);
  assert.match(invitation, /<!-- BUFFET_LINK -->/);
  assert.match(invitation, /Getränkewünsche[^<]*Wünsche, keine Garantie/);
});

test('uses one accessible RSVP form and a separate suggestion form', () => {
  const rsvpForm = invitation.match(/<form\b[^>]*id="rsvp-form"[\s\S]*?<\/form>/)?.[0];
  const suggestionForm = invitation.match(
    /<form\b[^>]*id="drink-suggestion-form"[\s\S]*?<\/form>/,
  )?.[0];

  assert.ok(rsvpForm);
  assert.ok(suggestionForm);
  assert.equal((invitation.match(/<form\b/g) ?? []).length, 2);
  assert.match(rsvpForm, /<label[^>]*for="name"/);
  assert.match(rsvpForm, /<fieldset[^>]*class="attendance-choice"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="coming"/);
  assert.match(rsvpForm, /type="radio"[^>]*name="attendance"[^>]*value="not_coming"/);
  assert.match(rsvpForm, /type="number"[^>]*id="attendees"[^>]*min="1"[^>]*max="10"/);
  assert.match(rsvpForm, /<fieldset[^>]*id="drink-field"/);
  assert.match(rsvpForm, /<div[^>]*id="coming-fields"[^>]*hidden/);
  assert.match(rsvpForm, /role="alert"/);
  assert.match(rsvpForm, /id="drink-options-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(suggestionForm, /<label[^>]*for="drink-suggestion"/);
  assert.match(suggestionForm, /role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(invitation, /id="contact"|Keine Präferenz/);

  const selectorEnd = invitation.indexOf('</fieldset>', invitation.indexOf('id="drink-field"'));
  const rsvpEnd = invitation.indexOf('</form>', invitation.indexOf('id="rsvp-form"'));
  const suggestionStart = invitation.indexOf('<form id="drink-suggestion-form"');
  assert.ok(suggestionStart > selectorEnd);
  assert.equal(invitation.slice(rsvpEnd + '</form>'.length, suggestionStart).trim(), '');
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

  async dispatch(type) {
    const event = {
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
    return [];
  }
}

function jsonResponse(payload, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

async function createRsvpHarness({ options = [], postRequest = async () => jsonResponse({ ok: true }) } = {}) {
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
    'drink-suggestion-form',
    'drink-suggestion',
    'drink-suggestion-error',
    'drink-suggestion-status',
    'btn-drink-suggestion',
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
  elements['btn-drink-suggestion'].tagName = 'BUTTON';
  elements['btn-submit-coming'].tagName = 'BUTTON';
  elements['btn-submit-coming'].textContent = 'Anmeldung senden';
  elements['btn-drink-suggestion'].textContent = 'Vorschlagen';
  elements['coming-fields'].hidden = true;
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
    if (!init.method) return jsonResponse({ ok: true, options });
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
      ? jsonResponse({ ok: true, option: { id: 'new-1', label: 'Apfelsaft' } })
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
    drinks: ['Bier', 'Apfelsaft'],
  });
  assert.match(section.children[0].textContent, /2 Personen/);
  assert.match(section.children[0].textContent, /Bier, Apfelsaft/);
  assert.match(section.children[0].textContent, /keine Garantie/);
  assert.equal(section.children[0].textContent.includes('<b>Ada</b>'), true);
  assert.equal(invitationCopy.textContent, '5. Dezember um 17:00 Uhr');
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
  assert.equal(elements['btn-drink-suggestion'].textContent, 'Vorschlagen');
  assert.equal(elements['drink-suggestion-error'].hidden, false);
});
