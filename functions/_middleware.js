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
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <section class="save-the-date">
      <h1>Falsches Passwort</h1>
      <p>Das war leider nicht richtig. Das Rätsel hilft dir auf die Sprünge:</p>
      <p>Ich komme einmal im Jahr.<br>
      Man bäckt mir einen Kuchen, zündet Kerzen an und singt für mich.<br>
      Wer eingeladen ist, kennt mein Datum —<br>
      und kennt damit auch das Passwort.</p>
      <p class="deadline">Seite neu laden, um es erneut zu versuchen.</p>
    </section>
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
