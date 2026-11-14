import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const invitation = await readFile(
  new URL('../public/rsvp/index.html', import.meta.url),
  'utf8',
);
const styles = await readFile(
  new URL('../public/style.css', import.meta.url),
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
