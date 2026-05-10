// functions/_middleware.js
// HTTP Basic Auth middleware for Cloudflare Pages Functions.
// Intercepts every request (static assets and dynamic routes) before serving.
// Per D-08: nothing is served until the user authenticates.
// Per D-05: plain-text comparison against env.SITE_PASSWORD (set as a Cloudflare secret).

export async function onRequest(context) {
  const { request, env, next } = context;

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
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Birthday Site"',
      "Content-Type": "text/plain",
    },
  });
}
