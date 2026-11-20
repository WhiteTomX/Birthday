function jsonResponse(status, payload) {
  return Response.json(payload, { status });
}

function hasExactFields(body, fields) {
  const actualFields = Object.keys(body).sort();
  const expectedFields = [...fields].sort();
  return actualFields.length === expectedFields.length
    && actualFields.every((field, index) => field === expectedFields[index]);
}

function normalizeLabel(value) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
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

async function resolveJobSuggestions(env, suggestions) {
  if (suggestions.length === 0) return [];

  const placeholders = suggestions.map(() => '?').join(', ');
  const normalizedLabels = suggestions.map((suggestion) => (
    suggestion.label.toLocaleLowerCase('de-DE')
  ));
  const rows = await env.DB.prepare(
    `SELECT id, label, normalized_label
     FROM job_options
     WHERE normalized_label IN (${placeholders})`
  ).bind(...normalizedLabels).all();

  return rows.results;
}

function jobAllocationStatement(env, rsvpId, count, column, value) {
  const lookup = column === 'id'
    ? 'job_options.id = ?'
    : 'job_options.normalized_label = ?';

  return env.DB.prepare(
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
     WHERE ${lookup}
       AND (
         job_options.max_capacity IS NULL
         OR COALESCE((
           SELECT SUM(existing.assigned_count)
           FROM fresh_rsvp_job_allocations existing
           WHERE existing.job_option_id = job_options.id
         ), 0) < job_options.max_capacity
       )`
  ).bind(rsvpId, count, count, value);
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

  const requiredFields = ['name', 'attendance', 'attendees', 'drinks'];
  const allowedFields = new Set([
    ...requiredFields,
    'jobs',
    'drink_suggestions',
    'job_suggestions',
  ]);
  if (
    !requiredFields.every((field) => Object.hasOwn(body, field))
    || Object.keys(body).some((field) => !allowedFields.has(field))
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

  const jobs = body.jobs === undefined ? [] : body.jobs;
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

  const drinkSuggestionsInput = body.drink_suggestions === undefined
    ? []
    : body.drink_suggestions;
  if (
    !Array.isArray(drinkSuggestionsInput)
    || !drinkSuggestionsInput.every((label) => (
      typeof label === 'string'
      && normalizeLabel(label).length > 0
      && Array.from(normalizeLabel(label)).length <= 80
    ))
  ) {
    return jsonResponse(400, { ok: false, error: 'Invalid drink suggestions' });
  }
  const drinkSuggestions = [
    ...new Map(drinkSuggestionsInput.map((label) => {
      const normalized = normalizeLabel(label);
      return [normalized.toLowerCase(), normalized];
    })).values(),
  ];

  const jobSuggestionsInput = body.job_suggestions === undefined
    ? []
    : body.job_suggestions;
  if (
    !Array.isArray(jobSuggestionsInput)
    || !jobSuggestionsInput.every((suggestion) => (
      suggestion
      && typeof suggestion === 'object'
      && !Array.isArray(suggestion)
      && hasExactFields(suggestion, ['label', 'count'])
      && typeof suggestion.label === 'string'
      && normalizeLabel(suggestion.label).length > 0
      && Array.from(normalizeLabel(suggestion.label)).length <= 80
      && Number.isInteger(suggestion.count)
      && suggestion.count >= 1
      && suggestion.count <= attendees
    ))
  ) {
    return jsonResponse(400, { ok: false, error: 'Invalid job suggestions' });
  }
  const jobSuggestions = jobSuggestionsInput.map((suggestion) => ({
    label: normalizeLabel(suggestion.label),
    count: suggestion.count,
  }));
  const jobSuggestionKeys = jobSuggestions.map((suggestion) => (
    suggestion.label.toLocaleLowerCase('de-DE')
  ));
  if (new Set(jobSuggestionKeys).size !== jobSuggestionKeys.length) {
    return jsonResponse(400, { ok: false, error: 'Duplicate job suggestions' });
  }

  const uniqueDrinks = [...new Set(drinks.map((drink) => drink.trim().toLowerCase()))];
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const [drinkRows, jobRows, suggestedJobRows] = await Promise.all([
      resolveDrinkIds(env, uniqueDrinks),
      resolveJobOptions(env, jobs),
      resolveJobSuggestions(env, jobSuggestions),
    ]);
    if (drinkRows.length !== uniqueDrinks.length) {
      return jsonResponse(400, { ok: false, error: 'Invalid drink selections' });
    }
    if (jobRows.length !== jobs.length) {
      return jsonResponse(400, { ok: false, error: 'Invalid job selections' });
    }
    if (suggestedJobRows.some((suggestion) => (
      jobs.some((job) => job.id === suggestion.id)
    ))) {
      return jsonResponse(400, { ok: false, error: 'Duplicate job selections' });
    }

    const suggestedDrinkKeys = new Set(drinkSuggestions.map((label) => label.toLowerCase()));
    const directDrinkRows = drinkRows.filter((drink) => (
      !suggestedDrinkKeys.has(drink.label.toLowerCase())
    ));

    const statements = [
      env.DB.prepare(
        'INSERT INTO fresh_rsvps (id, name, attendance, group_size, submitted_at, host_ref) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, trimmedName, attendance, attendees, now, hostRef),
      ...drinkSuggestions.map((label) => env.DB.prepare(
        `INSERT INTO drink_options (id, label, is_fixed, created_at)
         VALUES (?, ?, 0, ?)
         ON CONFLICT(label) DO NOTHING`
      ).bind(crypto.randomUUID(), label, now)),
      ...directDrinkRows.map((row) => env.DB.prepare(
        'INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id) VALUES (?, ?)'
      ).bind(id, row.id)),
      ...drinkSuggestions.map((label) => env.DB.prepare(
        `INSERT INTO fresh_rsvp_drink_selections (fresh_rsvp_id, drink_option_id)
         SELECT ?, id FROM drink_options WHERE lower(label) = lower(?)`
      ).bind(id, label)),
      ...jobs.map((job) => jobAllocationStatement(env, id, job.count, 'id', job.id)),
      ...jobSuggestions.flatMap((suggestion) => {
        const normalizedLabel = suggestion.label.toLocaleLowerCase('de-DE');
        return [
          env.DB.prepare(
            `INSERT INTO job_options (
               id, label, normalized_label, description, is_fixed, display_order, max_capacity, created_at
             )
             VALUES (?, ?, ?, ?, 0, NULL, NULL, ?)
             ON CONFLICT(normalized_label) DO NOTHING`
          ).bind(
            crypto.randomUUID(),
            suggestion.label,
            normalizedLabel,
            'Vorgeschlagene Aufgabe; die genauen Details werden gemeinsam abgestimmt.',
            now,
          ),
          jobAllocationStatement(env, id, suggestion.count, 'normalized_label', normalizedLabel),
        ];
      }),
    ];

    await env.DB.batch(statements);
    if (jobs.length > 0 || jobSuggestions.length > 0) {
      const allocationRows = await env.DB.prepare(
        `SELECT job_option_id AS id, assigned_count
         FROM fresh_rsvp_job_allocations
         WHERE fresh_rsvp_id = ?`
      ).bind(id).all();
      const acceptedCounts = new Map(
        allocationRows.results.map((row) => [row.id, row.assigned_count]),
      );
      const canonicalSuggestions = await resolveJobSuggestions(env, jobSuggestions);
      if (canonicalSuggestions.length !== jobSuggestions.length) {
        throw new Error('Stored job suggestion missing');
      }
      const suggestionsByKey = new Map(canonicalSuggestions.map((option) => (
        [option.normalized_label, option]
      )));
      return jsonResponse(200, {
        ok: true,
        attendance,
        jobs: [
          ...jobs.map((job) => {
            const option = jobRows.find((row) => row.id === job.id);
            if (!option) throw new Error('Stored job selection missing');
            return {
              id: job.id,
              label: option.label,
              requested_count: job.count,
              accepted_count: acceptedCounts.get(job.id) ?? 0,
            };
          }),
          ...jobSuggestions.map((suggestion) => {
            const normalizedLabel = suggestion.label.toLocaleLowerCase('de-DE');
            const option = suggestionsByKey.get(normalizedLabel);
            if (!option) throw new Error('Stored job suggestion missing');
            return {
              id: option.id,
              label: option.label,
              requested_count: suggestion.count,
              accepted_count: acceptedCounts.get(option.id) ?? 0,
            };
          }),
        ],
      });
    }
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }

  return jsonResponse(200, { ok: true, attendance });
}
