// functions/_middleware.js
// HTTP Basic Auth middleware for Cloudflare Pages Functions.
//
// Public (no auth): /, /index.html, /style.css
// All other routes require Basic Auth. Unauthenticated requests receive a 401
// with the hint page HTML inline (self-contained — browser won't sub-resource-load
// style.css on a 401 cancel from /rsvp/).

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Public routes — serve without auth challenge.
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/style.css'
  ) {
    return next();
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const credentials = atob(base64Credentials);
  // Use indexOf + slice (not split) to handle colons in the password safely.
  const colonIndex = credentials.indexOf(":");
  const password = credentials.slice(colonIndex + 1);

  if (password !== env.SITE_PASSWORD) {
    return unauthorizedResponse();
  }

  return next();
}

function unauthorizedResponse() {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Psst</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #2D1510;
      background-color: #FDF4E8;
      padding: 80px 16px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; line-height: 1.25; color: #2D1510; margin-bottom: 24px; }
    p { font-size: 16px; color: #2D1510; }
    @media (min-width: 600px) { body { padding: 80px 32px; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Psst — ein kleines Rätsel für dich</h1>
    <p>Ich komme einmal im Jahr.<br>
    Man bäckt mir einen Kuchen, zündet Kerzen an und singt für mich.<br>
    Wer eingeladen ist, kennt mein Datum —<br>
    und kennt damit auch das Passwort.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Birthday Site"',
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
