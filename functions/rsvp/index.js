// functions/rsvp/index.js
// Pages Function — intercepts GET /rsvp/ and personalises the invitation text.
//
// Reads the static public/rsvp/index.html via the ASSETS binding, replaces the
// first occurrence of ">Wir werden 30." with ">{name} werden 30." based on
// the X-Host-Ref header injected by the auth middleware, then returns the
// modified HTML with Cache-Control: no-store.

export async function onRequestGet(context) {
  const { request, env } = context;

  // Fetch the static asset — uses the Pages ASSETS binding so no extra hop.
  const assetResponse = await env.ASSETS.fetch(request);

  // Determine which host this request belongs to (0 or 1).
  const hostRefHeader = request.headers.get('X-Host-Ref');
  const hostRef = hostRefHeader !== null ? parseInt(hostRefHeader, 10) : 0;

  // Resolve the personalised name, falling back to "Wir" if absent/empty.
  let name;
  if (hostRef === 1) {
    name = (env.INVITE_NAME__1 || '').trim();
  } else {
    name = (env.INVITE_NAME__0 || '').trim();
  }
  if (!name) {
    name = 'Wir';
  }

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
