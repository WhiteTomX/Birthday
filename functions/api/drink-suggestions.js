function jsonResponse(status, payload) {
  return Response.json(payload, { status });
}

function normalizeLabel(value) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function optionPayload(option) {
  return {
    id: option.id,
    label: option.label,
    is_fixed: Boolean(option.is_fixed),
  };
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const rows = await env.DB.prepare(
      'SELECT id, label, is_fixed FROM drink_options ORDER BY is_fixed DESC, label ASC'
    ).all();

    return jsonResponse(200, {
      ok: true,
      options: rows.results.map(optionPayload),
    });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }
}

export async function onRequestPost(context) {
  const { request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON' });
  }

  if (Object.keys(body).length !== 1 || !Object.hasOwn(body, 'label')) {
    return jsonResponse(400, { ok: false, error: 'Invalid suggestion fields' });
  }

  const label = typeof body.label === 'string' ? normalizeLabel(body.label) : '';
  if (!label || Array.from(label).length > 80) {
    return jsonResponse(400, { ok: false, error: 'Drink required' });
  }

  return jsonResponse(200, { ok: true, label });
}
