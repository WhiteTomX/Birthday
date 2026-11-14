// functions/rsvp/index.js
// Pages Function — personalises GET /rsvp/ with private environment variables.
//
// Venue details are injected only after the auth middleware accepts the request.

export async function onRequestGet(context) {
  const { request, env } = context;

  // Fetch the static asset — uses the Pages ASSETS binding so no extra hop.
  const assetResponse = await env.ASSETS.fetch(request);

  // Resolve the name, falling back to "Wir" if absent/empty.
  const name = (env.INVITE_NAME || '').trim() || 'Wir';

  // Read the HTML body.
  const html = await assetResponse.text();

  const venueName = (env.VENUE_NAME || '').trim();
  const venueMapUrl = (env.VENUE_MAP_URL || '').trim();
  let venueDetails = '';

  if (venueName && venueMapUrl) {
    let parsedMapUrl;
    try {
      parsedMapUrl = new URL(venueMapUrl);
    } catch {
      console.error('VENUE_MAP_URL must be a valid HTTPS URL.');
    }

    if (parsedMapUrl?.protocol === 'https:') {
      venueDetails = `<p><strong>${escapeHtml(venueName)}</strong></p>
          <a href="${escapeHtml(parsedMapUrl.href)}" target="_blank" rel="noopener noreferrer">Auf OpenStreetMap ansehen</a>`;
    } else if (parsedMapUrl) {
      console.error('VENUE_MAP_URL must use HTTPS.');
    }
  } else {
    console.warn('Set both VENUE_NAME and VENUE_MAP_URL to display venue details.');
  }

  // The marker is absent from the source response unless both values are
  // configured and the map URL passes HTTPS validation.
  const modified = html
    .replace('<!-- VENUE_DETAILS -->', venueDetails)
    .replace('>Wir werden 30.', `>${name} werden 30.`);

  // Preserve Content-Type from the asset, force no-store to prevent CDN caching
  // personalised responses (T-u1z-02).
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
