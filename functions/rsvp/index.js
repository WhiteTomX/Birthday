// functions/rsvp/index.js
// Pages Function — intercepts GET /rsvp/ and personalises the invitation text.
//
// Reads the static public/rsvp/index.html via the ASSETS binding, replaces the
// first occurrence of ">Wir werden 30." with ">{name} werden 30." using the
// single INVITE_NAME env var. Falls back to "Wir" if the var is absent.

export async function onRequestGet(context) {
  const { request, env } = context;

  // Fetch the static asset — uses the Pages ASSETS binding so no extra hop.
  const assetResponse = await env.ASSETS.fetch(request);

  // Resolve the name, falling back to "Wir" if absent/empty.
  const name = (env.INVITE_NAME || '').trim() || 'Wir';

  // Read the HTML body.
  const html = await assetResponse.text();

  // Replace ONLY the first occurrence of ">Wir werden 30." — the angle-bracket
  // prefix anchors the match to the start of the paragraph text node so we
  // never touch the lowercase "wir" elsewhere in the document.
  const modified = html.replace('>Wir werden 30.', `>${name} werden 30.`);

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
