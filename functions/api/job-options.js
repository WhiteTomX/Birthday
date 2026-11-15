function jsonResponse(status, payload) {
  return Response.json(payload, { status });
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT
        job_options.id,
        job_options.label,
        job_options.description,
        job_options.is_fixed,
        job_options.max_capacity,
        COALESCE(SUM(fresh_rsvp_job_allocations.assigned_count), 0) AS assigned_count,
        CASE
          WHEN job_options.max_capacity IS NULL THEN NULL
          ELSE MAX(job_options.max_capacity - COALESCE(SUM(fresh_rsvp_job_allocations.assigned_count), 0), 0)
        END AS remaining
      FROM job_options
      LEFT JOIN fresh_rsvp_job_allocations
        ON fresh_rsvp_job_allocations.job_option_id = job_options.id
      GROUP BY job_options.id
      ORDER BY
        job_options.is_fixed DESC,
        CASE WHEN job_options.is_fixed = 1 THEN job_options.display_order END,
        job_options.normalized_label,
        job_options.id`,
    ).all();

    return jsonResponse(200, {
      ok: true,
      options: results.map((option) => ({
        ...option,
        is_fixed: Boolean(option.is_fixed),
      })),
    });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Database error' });
  }
}
