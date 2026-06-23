// functions/api/not-coming.js
// Cloudflare Pages Function — auto-routes to /api/not-coming
// Auth is enforced upstream by functions/_middleware.js — no auth logic here.

export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse JSON body — return 400 on malformed input
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Guard against valid-but-non-object JSON (null, array, string, number)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { name } = body;

  // Server-side validation — name is required for decline submissions (D-04)
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ ok: false, error: 'Name required' }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return Response.json({ ok: false, error: 'Name too long' }, { status: 400 });
  }

  // Generate unique id — crypto.randomUUID() is native in Workers runtime, no import needed
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Read host identity set by middleware — same pattern as rsvp.js (D-06).
  const hostRefHeader = request.headers.get('X-Host-Ref');
  const hostRef = parseInt(hostRefHeader, 10);
  if (hostRefHeader === null || (hostRef !== 0 && hostRef !== 1)) {
    return Response.json({ ok: false, error: 'Missing host context' }, { status: 400 });
  }

  // Insert decline record — attendees hardcoded to 0, contact_method to null (D-06, D-08)
  // Every submission is a new record, no upsert
  try {
    await env.DB.prepare(
      'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, name.trim(), null, 0, now, hostRef).run();
  } catch (err) {
    // Do not expose internal error details to the client
    return Response.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
