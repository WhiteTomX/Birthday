// functions/rsvp/index.js
// Pages Function — personalises GET /rsvp/ with private environment variables.
//
// Venue details are injected only after the auth middleware accepts the request.

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
