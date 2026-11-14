import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { onRequestGet } from '../functions/rsvp/index.js';

const invitationTemplate = await readFile(
  new URL('../public/rsvp/index.html', import.meta.url),
  'utf8',
);
const publicTemplate = await readFile(
  new URL('../public/index.html', import.meta.url),
  'utf8',
);

function makeContext(values = {}) {
  const request = new Request('https://birthday.test/rsvp/');
  const env = {
    ASSETS: {
      fetch: async () => new Response(invitationTemplate, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    },
    ...values,
  };
  return { request, env };
}

async function getInvitation(values) {
  const response = await onRequestGet(makeContext(values));
  return { response, html: await response.text() };
}

test('renders configured invitation logistics as escaped text and a safe HTTPS map link', async () => {
  const { response, html } = await getInvitation({
    VENUE_NAME: 'Park <script>alert("x")</script>',
    VENUE_MAP_URL: 'https://maps.example/park?view=1&mode=walk',
    PARK_ENTRY_DIRECTIONS: 'Am <Nordtor> links abbiegen & dem Weg folgen.',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(html, /Park &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /href="https:\/\/maps\.example\/park\?view=1&amp;mode=walk"/);
  assert.match(html, /Am &lt;Nordtor&gt; links abbiegen &amp; dem Weg folgen\./);
  assert.doesNotMatch(html, /<!-- (?:VENUE_DETAILS|PARK_ENTRY_DIRECTIONS) -->/);
});

test('renders only a valid absolute HTTPS buffet URL without credentials', async () => {
  const { html } = await getInvitation({
    BUFFET_LIST_URL: 'https://buffet.example/liste?group=party&view=1',
  });

  assert.match(html, /class="event-callout"/);
  assert.match(html, /href="https:\/\/buffet\.example\/liste\?group=party&amp;view=1"/);
  assert.match(html, /Zum Buffetbeitrag/);
});

test('omits absent, malformed, non-HTTPS, and credential-bearing buffet callouts', async (t) => {
  for (const [label, value] of [
    ['unset', undefined],
    ['blank', '   '],
    ['malformed', 'https://'],
    ['non-HTTPS', 'http://buffet.example/liste'],
    ['non-web protocol', 'javascript:alert(1)'],
  ]) {
    await t.test(label, async () => {
      const { html } = await getInvitation({ BUFFET_LIST_URL: value });
      assert.equal(
        /event-callout|Zum Buffetbeitrag|<!-- BUFFET_LINK -->/.test(html),
        false,
        'invalid buffet values must not produce an active callout',
      );
    });
  }
});

test('omits a credential-bearing buffet URL', async () => {
  const { html } = await getInvitation({
    BUFFET_LIST_URL: 'https://guest:secret@buffet.example/liste',
  });

  assert.equal(
    /event-callout|Zum Buffetbeitrag|href="[^"]*guest/.test(html),
    false,
    'credential-bearing buffet values must not produce an active callout',
  );
});

test('omits invalid map links and keeps configured directions independent', async (t) => {
  for (const mapUrl of [
    undefined,
    '',
    'not a URL',
    'http://maps.example/park',
    'https://',
    'https://guest:secret@maps.example/park',
  ]) {
    await t.test(String(mapUrl), async () => {
      const { html } = await getInvitation({
        VENUE_NAME: 'Stadtpark',
        VENUE_MAP_URL: mapUrl,
        PARK_ENTRY_DIRECTIONS: 'Durch den Nordeingang gehen.',
      });
      assert.equal(
        /href="[^"]*maps\.example|Auf OpenStreetMap ansehen/.test(html),
        false,
        'unsafe map values must not produce an active map link',
      );
      assert.match(html, /Durch den Nordeingang gehen\./);
    });
  }
});

test('does not invent logistics when environment values are absent', async () => {
  const { html } = await getInvitation({});

  assert.doesNotMatch(html, /event-directions|event-callout|OpenStreetMap ansehen/);
  assert.doesNotMatch(html, /Musterstraße|Berlin|2026/);
});

test('keeps venue and arrival details in the integrated invitation flow', () => {
  const invitationSection = invitationTemplate.match(
    /<section class="save-the-date invitation-layout">([\s\S]*?)<\/section>/,
  )?.[1];

  assert.ok(invitationSection);
  assert.ok(invitationSection.includes('<div class="invitation-copy">'));
  assert.equal(invitationSection.includes('<aside class="venue-note"'), false);

  const venueIndex = invitationSection.indexOf('<!-- VENUE_DETAILS -->');
  const directionsIndex = invitationSection.indexOf('<!-- PARK_ENTRY_DIRECTIONS -->');
  const buffetIndex = invitationSection.indexOf('<!-- BUFFET_LINK -->');
  assert.ok(venueIndex >= 0);
  assert.ok(directionsIndex > venueIndex);
  assert.ok(buffetIndex > directionsIndex);
});

test('keeps private logistics out of the public root and the date free of an invented year', () => {
  assert.doesNotMatch(
    publicTemplate,
    /Ort & Anfahrt|Anreise:|OpenStreetMap ansehen|BUFFET_LIST_URL|PARK_ENTRY_DIRECTIONS|<div class="event-callout"/,
  );
  assert.match(invitationTemplate, /5\. Dezember um 17:00 Uhr/);
  assert.doesNotMatch(invitationTemplate, /\b20\d{2}\b|Musterstraße|Hauptstraße/);
});
