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

function makeContext(values = {}, hostRef) {
  const headers = hostRef === undefined ? undefined : { 'X-Host-Ref': hostRef };
  const request = new Request('https://birthday.test/rsvp/', { headers });
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

async function getInvitation(values, hostRef) {
  const response = await onRequestGet(makeContext(values, hostRef));
  return { response, html: await response.text() };
}

async function getHost0Invitation(values, hostRef) {
  return getInvitation({
    VENUE_MAP_URL: 'https://maps.example/park',
    BUFFET_LIST_URL: 'https://buffet.example/liste',
    ...values,
  }, hostRef);
}

function formatGermanDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function utcDateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function host0Notice(html) {
  return html.match(/<p class="host-0-birthday-notice">([\s\S]*?)<\/p>/)?.[1];
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
  assert.match(html, /Das Buffet gibt es schon bei der Feier/);
  assert.match(html, /Was davon übrig bleibt, essen wir am nächsten Tag beim Brunch weiter/);
  assert.match(html, /Wenn du etwas zum Buffet beitragen möchtest/);
  assert.match(html, /href="https:\/\/buffet\.example\/liste\?group=party&amp;view=1"/);
  assert.match(html, /Zur Mitbringliste/);
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
        /event-callout|Buffet-Brunch am nächsten Tag|Zur Mitbringliste|<!-- BUFFET_LINK -->/.test(html),
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
    /event-callout|Buffet-Brunch am nächsten Tag|Zur Mitbringliste|href="[^"]*guest/.test(html),
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

  const buffetIndex = invitationSection.indexOf('<!-- BUFFET_LINK -->');
  const venueIndex = invitationSection.indexOf('<!-- VENUE_DETAILS -->');
  const directionsIndex = invitationSection.indexOf('<!-- PARK_ENTRY_DIRECTIONS -->');
  assert.ok(buffetIndex >= 0);
  assert.ok(venueIndex > buffetIndex);
  assert.ok(venueIndex >= 0);
  assert.ok(directionsIndex > venueIndex);
});

test('keeps private logistics out of the public root and the date free of an invented year', () => {
  assert.doesNotMatch(
    publicTemplate,
    /Ort & Anfahrt|Anreise:|OpenStreetMap ansehen|BUFFET_LIST_URL|PARK_ENTRY_DIRECTIONS|<div class="event-callout"/,
  );
  assert.match(invitationTemplate, /5\. Dezember um 17:00 Uhr/);
  assert.doesNotMatch(invitationTemplate, /\b20\d{2}\b|Musterstraße|Hauptstraße/);
});

test('renders the complete host 0 birthday notice with today’s UTC date in German', async () => {
  const birthdayDate = utcDateOffset(0);
  const { response, html } = await getHost0Invitation({
    HOST_0_BIRTHDAY_DATE: birthdayDate,
  }, '0');
  const date = formatGermanDate(birthdayDate);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(
    host0Notice(html),
    `An meinem Geburtstag (${date}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem Live-Standort.`,
  );
  assert.doesNotMatch(html, /<!-- HOST_0_BIRTHDAY_NOTICE -->/);
});

test('renders a future host 0 birthday date in German', async () => {
  const birthdayDate = utcDateOffset(40);
  const { html } = await getHost0Invitation({
    HOST_0_BIRTHDAY_DATE: birthdayDate,
  }, '0');

  assert.equal(
    host0Notice(html),
    `An meinem Geburtstag (${formatGermanDate(birthdayDate)}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem Live-Standort.`,
  );
});

test('omits the host 0 birthday notice for missing, invalid, or past dates', async (t) => {
  for (const [label, birthdayDate] of [
    ['missing date', undefined],
    ['malformed date', '2026-2-03'],
    ['impossible calendar date', '2026-02-30'],
    ['past date', utcDateOffset(-1)],
  ]) {
    await t.test(label, async () => {
      const { html } = await getHost0Invitation({
        HOST_0_BIRTHDAY_DATE: birthdayDate,
      }, '0');
      assert.equal(host0Notice(html), undefined);
      assert.doesNotMatch(html, /<!-- HOST_0_BIRTHDAY_NOTICE -->/);
    });
  }
});

test('does not show the host 0 birthday notice to host 1 or requests without host identity', async (t) => {
  for (const [label, hostRef] of [
    ['host 1', '1'],
    ['missing host identity', undefined],
  ]) {
    await t.test(label, async () => {
      const { html } = await getHost0Invitation({
        HOST_0_BIRTHDAY_DATE: utcDateOffset(1),
      }, hostRef);
      assert.equal(host0Notice(html), undefined);
      assert.doesNotMatch(html, /<!-- HOST_0_BIRTHDAY_NOTICE -->/);
    });
  }
});

test('links only Live-Standort for a valid HTTPS URL and escapes the href', async () => {
  const birthdayDate = utcDateOffset(1);
  const { html } = await getHost0Invitation({
    HOST_0_BIRTHDAY_DATE: birthdayDate,
    HOST_0_LIVE_LOCATION_URL: 'https://location.example/live?x=1&y=2',
  }, '0');
  const date = formatGermanDate(birthdayDate);

  assert.equal(
    host0Notice(html),
    `An meinem Geburtstag (${date}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem <a href="https://location.example/live?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">Live-Standort</a>.`,
  );
  assert.doesNotMatch(html, /<!-- HOST_0_BIRTHDAY_NOTICE -->/);
});

test('keeps Live-Standort unlinked when the optional URL is absent or unsafe', async (t) => {
  for (const [label, locationUrl] of [
    ['missing URL', undefined],
    ['malformed URL', 'https://'],
    ['non-HTTPS URL', 'http://location.example/live'],
    ['credential-bearing URL', 'https://guest:secret@location.example/live'],
  ]) {
    await t.test(label, async () => {
      const birthdayDate = utcDateOffset(1);
      const { html } = await getHost0Invitation({
        HOST_0_BIRTHDAY_DATE: birthdayDate,
        HOST_0_LIVE_LOCATION_URL: locationUrl,
      }, '0');
      const notice = host0Notice(html);

      assert.equal(
        notice,
        `An meinem Geburtstag (${formatGermanDate(birthdayDate)}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem Live-Standort.`,
      );
      assert.equal(notice.includes('<a '), false);
      assert.doesNotMatch(html, /<!-- HOST_0_BIRTHDAY_NOTICE -->/);
    });
  }
});
