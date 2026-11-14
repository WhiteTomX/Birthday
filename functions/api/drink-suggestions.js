function jsonResponse(status, payload) {
  return Response.json(payload, { status });
}

function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function isLabelConflict(error) {
  return typeof error?.message === 'string'
    && /UNIQUE constraint failed:\s*drink_options\.label/i.test(error.message);
}

async function findOption(env, label) {
  return env.DB.prepare(
    'SELECT id, label, is_fixed FROM drink_options WHERE lower(label) = lower(?)'
  ).bind(label).first();
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

  if (Object.keys(body).length !== 1 || !Object.hasOwn(body, 'label')) {
    return jsonResponse(400, { ok: false, error: 'Invalid suggestion fields' });
  }

  const label = typeof body.label === 'string' ? normalizeLabel(body.label) : '';
  if (!label || label.length > 80) {
    return jsonResponse(400, { ok: false, error: 'Drink required' });
  }

  try {
    const existing = await findOption(env, label);
    if (existing) {
      return jsonResponse(200, { ok: true, created: false, option: optionPayload(existing) });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        'INSERT INTO drink_options (id, label, is_fixed, created_at) VALUES (?, ?, 0, ?)'
      ).bind(id, label, now).run();
    } catch (error) {
      if (!isLabelConflict(error)) {
        throw error;
      }

      const canonical = await findOption(env, label);
      if (!canonical) {
        throw error;
      }
      return jsonResponse(200, { ok: true, created: false, option: optionPayload(canonical) });
    }

    return jsonResponse(200, {
      ok: true,
      created: true,
      option: { id, label, is_fixed: false },
    });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }
}
