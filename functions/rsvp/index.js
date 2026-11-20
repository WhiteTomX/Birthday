// functions/rsvp/index.js
// Pages Function — personalises GET /rsvp/ with private environment variables.
//
// Venue details are injected only after the auth middleware accepts the request.

export async function onRequestGet(context) {
  const { request, env } = context;

  const assetResponse = await env.ASSETS.fetch(request);
  const html = await assetResponse.text();

  const venueName = (env.VENUE_NAME || '').trim();
  const venueOSMUrl = (env.VENUE_OSM_URL || env.VENUE_MAP_URL || '').trim();
  const venueGeoUrl = (env.VENUE_GEO_URL || '').trim();
  const parkDirections = (env.PARK_ENTRY_DIRECTIONS || '').trim();
  const parkVideosUrl = (env.PARK_ENTRY_VIDEOS_URL || '').trim();
  const buffetUrl = (env.BUFFET_LIST_URL || '').trim();
  const name = (env.INVITE_NAME || '').trim() || 'Wir';
  const parsedOSMUrl = parseHttpsUrl(venueOSMUrl);
  const parsedBuffetUrl = parseHttpsUrl(buffetUrl);

  const directionsMarkup = parkDirections
    ? `<p><strong>Wegbeschreibung & Parkhinweise:</strong> ${escapeHtml(parkDirections)}</p>`
    : '';
  const videosMarkup = parkVideosUrl
    ? `<p>Für die visuellen unter euch, haben wir <a href="${escapeHtml(parkVideosUrl)}" target="_blank" rel="noopener noreferrer">Videos</a> vorbereitet.</p>`
    : '';

  const birthdayNoticeMarkup = getHost0BirthdayNotice(request, env);

  const modified = html
    .replace('<!-- VENUE_NAME -->', escapeHtml(venueName))
    .replace('<!-- VENUE_MAP_URL -->', parsedOSMUrl
      ? `<a href="${escapeHtml(parsedOSMUrl.href)}" target="_blank" rel="noopener noreferrer">Auf OpenStreetMap ansehen</a>`
      : '')
    .replace('<!-- VENUE_GEO_URL -->',`<a href="${escapeHtml(venueGeoUrl)}" target="_blank" rel="noopener noreferrer">Koordinaten öffnen</a>`)
    .replace('<!-- PARK_ENTRY_DIRECTIONS -->', directionsMarkup)
    .replace('<!-- PARK_ENTRY_VIDEOS -->', videosMarkup)
    .replace('<!-- BUFFET_LIST -->', parsedBuffetUrl
      ? `<a href="${escapeHtml(parsedBuffetUrl.href)}" target="_blank" rel="noopener noreferrer">Mitbringliste</a>`
      : '')
    .replace('<!-- HOST_0_BIRTHDAY_NOTICE -->', birthdayNoticeMarkup)
    .replace('<!-- Name -->', name);

  const contentType =
    assetResponse.headers.get('Content-Type') || 'text/html; charset=utf-8';

  return new Response(modified, {
    status: assetResponse.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });
}

function getHost0BirthdayNotice(request, env) {
  if (request.headers.get('X-Host-Ref') !== '0') {
    return '';
  }

  const birthdayDate = parseDateOnly(env.HOST_0_BIRTHDAY_DATE);
  if (!birthdayDate || birthdayDate < new Date().toISOString().slice(0, 10)) {
    return '';
  }

  const formattedDate = new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${birthdayDate}T00:00:00.000Z`));
  const locationUrl = parseHttpsUrl((env.HOST_0_LIVE_LOCATION_URL || '').trim());
  const locationText = locationUrl
    ? `<a href="${escapeHtml(locationUrl.href)}" target="_blank" rel="noopener noreferrer">Live-Standort</a>`
    : 'Live-Standort';

  return `<p class="host-0-birthday-notice">An meinem Geburtstag (${formattedDate}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem ${locationText}.</p>`;
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }
  return value;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

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
