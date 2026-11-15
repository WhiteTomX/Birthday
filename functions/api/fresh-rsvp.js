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

async function resolveJobOptions(env, jobs) {
  if (jobs.length === 0) return [];

  const placeholders = jobs.map(() => '?').join(', ');
  const rows = await env.DB.prepare(
    `SELECT id, label FROM job_options WHERE id IN (${placeholders})`
  ).bind(...jobs.map((job) => job.id)).all();

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

  if (
    !hasExactFields(body, ['name', 'attendance', 'attendees', 'drinks'])
    && !hasExactFields(body, ['name', 'attendance', 'attendees', 'drinks', 'jobs'])
  ) {
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

  const jobs = body.jobs ?? [];
  if (
    !Array.isArray(jobs)
    || !jobs.every((job) => (
      job
      && typeof job === 'object'
      && !Array.isArray(job)
      && hasExactFields(job, ['id', 'count'])
      && typeof job.id === 'string'
      && job.id.trim().length > 0
      && Number.isInteger(job.count)
      && job.count >= 1
      && job.count <= attendees
    ))
    || new Set(jobs.map((job) => job.id)).size !== jobs.length
  ) {
    return jsonResponse(400, { ok: false, error: 'Invalid job selections' });
  }

  const uniqueDrinks = [...new Set(drinks.map((drink) => drink.trim().toLowerCase()))];
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const [drinkRows, jobRows] = await Promise.all([
      resolveDrinkIds(env, uniqueDrinks),
      resolveJobOptions(env, jobs),
    ]);
    if (drinkRows.length !== uniqueDrinks.length) {
      return jsonResponse(400, { ok: false, error: 'Invalid drink selections' });
    }
    if (jobRows.length !== jobs.length) {
      return jsonResponse(400, { ok: false, error: 'Invalid job selections' });
    }

    const statements = [
      env.DB.prepare(
        'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, trimmedName, attendance, attendees, now, hostRef),
      ...drinkRows.map((row) => env.DB.prepare(
        'INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id) VALUES (?, ?)'
      ).bind(id, row.id)),
      ...jobs.map((job) => env.DB.prepare(
        `INSERT INTO fresh_rsvp_job_allocations (fresh_rsvp_id, job_option_id, assigned_count)
         SELECT ?, job_options.id,
           CASE
             WHEN job_options.max_capacity IS NULL THEN ?
             ELSE MIN(?, MAX(0, job_options.max_capacity - COALESCE((
               SELECT SUM(existing.assigned_count)
               FROM fresh_rsvp_job_allocations existing
               WHERE existing.job_option_id = job_options.id
             ), 0)))
           END
         FROM job_options
         WHERE job_options.id = ?
           AND (
             job_options.max_capacity IS NULL
             OR COALESCE((
               SELECT SUM(existing.assigned_count)
               FROM fresh_rsvp_job_allocations existing
               WHERE existing.job_option_id = job_options.id
             ), 0) < job_options.max_capacity
           )`
      ).bind(id, job.count, job.count, job.id)),
    ];

    await env.DB.batch(statements);
    if (jobs.length > 0) {
      const { results } = await env.DB.prepare(
        `SELECT job_option_id AS id, assigned_count
         FROM fresh_rsvp_job_allocations
         WHERE fresh_rsvp_id = ?`
      ).bind(id).all();
      const acceptedCounts = new Map(results.map((row) => [row.id, row.assigned_count]));
      return jsonResponse(200, {
        ok: true,
        attendance,
        jobs: jobs.map((job) => ({
          id: job.id,
          label: jobRows.find((option) => option.id === job.id).label,
          requested_count: job.count,
          accepted_count: acceptedCounts.get(job.id) ?? 0,
        })),
      });
    }
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }

  return jsonResponse(200, { ok: true, attendance });
}
