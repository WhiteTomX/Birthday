function jsonResponse(status, payload) {
  return Response.json(payload, { status });
}

function hasExactFields(body, fields) {
  const actualFields = Object.keys(body).sort();
  const expectedFields = [...fields].sort();
  return actualFields.length === expectedFields.length
    && actualFields.every((field, index) => field === expectedFields[index]);
}

async function resolveDrinkIds(env, drinks) {
  const normalizedDrinks = [...new Set(drinks.map((drink) => drink.trim().toLowerCase()))];
  if (normalizedDrinks.length === 0) {
    return [];
  }

  const placeholders = normalizedDrinks.map(() => '?').join(', ');
  const rows = await env.DB.prepare(
    `SELECT id, label FROM drink_options WHERE lower(label) IN (${placeholders})`
  ).bind(...normalizedDrinks).all();

  return rows.results;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
  }

  const { name, attendance, attendees, drinks } = body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName || trimmedName.length > 200) {
    return jsonResponse(400, { ok: false, error: 'Invalid name' });
  }

  const hostRefHeader = request.headers.get('X-Host-Ref');
  if (hostRefHeader !== '0' && hostRefHeader !== '1') {
    return jsonResponse(400, { ok: false, error: 'Missing host context' });
  }
  const hostRef = Number(hostRefHeader);

  if (attendance === 'not_coming') {
    if (!hasExactFields(body, ['name', 'attendance'])) {
      return jsonResponse(400, { ok: false, error: 'Invalid decline fields' });
    }

    const decline = env.DB.prepare(
      'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), trimmedName, attendance, 0, new Date().toISOString(), hostRef);

    try {
      await env.DB.batch([decline]);
    } catch {
      return jsonResponse(500, { ok: false, error: 'Database error' });
    }

    return jsonResponse(200, { ok: true, attendance });
  }

  if (attendance !== 'coming') {
    return jsonResponse(400, { ok: false, error: 'Invalid attendance' });
  }

  if (!hasExactFields(body, ['name', 'attendance', 'attendees', 'drinks'])) {
    return jsonResponse(400, { ok: false, error: 'Invalid RSVP fields' });
  }
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
    return jsonResponse(400, { ok: false, error: 'Invalid attendees' });
  }
  if (!Array.isArray(drinks) || !drinks.every((drink) => (
    typeof drink === 'string' && drink.trim().length > 0
  ))) {
    return jsonResponse(400, { ok: false, error: 'Invalid drink selections' });
  }

  const uniqueDrinks = [...new Set(drinks.map((drink) => drink.trim().toLowerCase()))];
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const drinkRows = await resolveDrinkIds(env, uniqueDrinks);
    if (drinkRows.length !== uniqueDrinks.length) {
      return jsonResponse(400, { ok: false, error: 'Invalid drink selections' });
    }

    const statements = [
      env.DB.prepare(
        'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, trimmedName, attendance, attendees, now, hostRef),
      ...drinkRows.map((row) => env.DB.prepare(
        'INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id) VALUES (?, ?)'
      ).bind(id, row.id)),
    ];

    await env.DB.batch(statements);
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }

  return jsonResponse(200, { ok: true, attendance });
}
