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

  const directionsMarkup = parkDirections
    ? `<p><strong>Wegbeschreibung & Parkhinweise:</strong> ${escapeHtml(parkDirections)}</p>`
    : '';
  const videosMarkup = parkVideosUrl
    ? `<p>Für die visuellen unter euch, haben wir <a href="${escapeHtml(parkVideosUrl)}" target="_blank" rel="noopener noreferrer">Videos</a> vorbereitet.</p>`
    : '';

  const parsedBuffetUrl = parseHttpsUrl(buffetUrl);

  const modified = html
    .replace('<!-- VENUE_NAME -->', escapeHtml(venueName))
    .replace('<!-- VENUE_MAP_URL -->',`<a href="${escapeHtml(parsedOSMUrl.href)}" target="_blank" rel="noopener noreferrer">Auf OpenStreetMap ansehen</a>`)
    .replace('<!-- VENUE_GEO_URL -->',`<a href="${escapeHtml(venueGeoUrl)}" target="_blank" rel="noopener noreferrer">Koordinaten öffnen</a>`)
    .replace('<!-- PARK_ENTRY_DIRECTIONS -->', directionsMarkup)
    .replace('<!-- PARK_ENTRY_VIDEOS -->', videosMarkup)
    .replace('<!-- BUFFET_LIST -->', `<a href="${escapeHtml(parsedBuffetUrl.href)}" target="_blank" rel="noopener noreferrer">Mitbringliste</a>`)
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
