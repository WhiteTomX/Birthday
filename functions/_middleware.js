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
  let credentials;
  try {
    credentials = atob(base64Credentials);
  } catch {
    return unauthorizedResponse();
  }
  // Use indexOf + slice (not split) to handle colons in the password safely.
  const colonIndex = credentials.indexOf(":");
  const password = credentials.slice(colonIndex + 1);

  // Dual-password check; matched index drives X-Host-Ref value (D-08).
  let hostRef;
  if (password === env.SITE_PASSWORD__0) {
    hostRef = 0;
  } else if (password === env.SITE_PASSWORD__1) {
    hostRef = 1;
  } else {
    return unauthorizedResponse();
  }

  // Inject host identity into the forwarded request via a header.
  // RSVP API reads X-Host-Ref; do not expose it to the browser (D-07).
  const modifiedRequest = new Request(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers),
      'X-Host-Ref': String(hostRef),
    }),
  });
  return next(modifiedRequest);
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
      Man bäckt einen Kuchen, zündet Kerzen an und singt für.<br>
      Dieses Jahr feiern wir ihn zu zweit.<br>
      Wer das Datum kennt —<br>
      kennt damit auch das Passwort.</p>
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
