// functions/api/rsvp.js
// Cloudflare Pages Function — auto-routes to /api/rsvp
// Auth is enforced upstream by functions/_middleware.js — do not add auth logic here.

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

  const { name, contact, attendees } = body;

  // Server-side validation (frontend validates too, but Worker is the last gate)
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ ok: false, error: 'Name required' }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return Response.json({ ok: false, error: 'Name too long' }, { status: 400 });
  }

  const attendeesInt = parseInt(attendees, 10);
  if (isNaN(attendeesInt) || attendeesInt < 1) {
    return Response.json({ ok: false, error: 'Invalid attendees' }, { status: 400 });
  }

  // Coerce empty contact string to null — contact_method column is nullable (D-10)
  const contactMethod = (contact && contact.length > 0) ? contact : null;

  // Generate unique id — crypto.randomUUID() is native in Workers runtime, no import needed (D-09)
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert new row — every submission is a new record, no upsert (D-11)
  try {
    await env.DB.prepare(
      'INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name.trim(), contactMethod, attendeesInt, now).run();
  } catch (err) {
    // Do not expose internal error details to the client
    return Response.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
