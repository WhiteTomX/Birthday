import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = 8789;
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const wranglerDirectory = join(projectRoot, '.wrangler');

function wranglerEntrypoint() {
  const globalNpmRoot = process.platform === 'win32'
    ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'npm', 'node_modules')
    : execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  const entrypoint = join(globalNpmRoot, 'wrangler', 'bin', 'wrangler.js');
  if (!existsSync(entrypoint)) {
    throw new Error('Wrangler JavaScript entrypoint was not found in the global npm installation.');
  }
  return entrypoint;
}

function parseDevVars(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    let value = match[2];
    if (value.length >= 2 && (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    )) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

function quoteSql(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function runWrangler(entrypoint, args, timeout = 120_000) {
  if (args.includes('--remote')) {
    throw new Error('Remote Wrangler commands are forbidden in this local integration test.');
  }
  if (args[0] === 'd1' && (!args.includes('--local') || !args.includes('--persist-to'))) {
    throw new Error('Every D1 command must use isolated local persistence.');
  }
  try {
    return execFileSync(process.execPath, [entrypoint, ...args], {
      cwd: projectRoot,
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    const failure = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown';
    throw new Error(`Local Wrangler command failed (${failure}): ${args.slice(0, 3).join(' ')}`);
  }
}

function parseD1Rows(output) {
  let result;
  try {
    result = JSON.parse(output);
  } catch {
    throw new Error('Local D1 command did not return valid JSON.');
  }
  const resultSets = Array.isArray(result) ? result : [result];
  return resultSets.flatMap((set) => Array.isArray(set.results) ? set.results : []);
}

function portIsAvailable() {
  return new Promise((resolveAvailability) => {
    const probe = createServer();
    probe.once('error', () => resolveAvailability(false));
    probe.listen(port, host, () => {
      probe.close(() => resolveAvailability(true));
    });
  });
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForPages(server) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error('Local Pages process exited before becoming ready.');
    }
    try {
      const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Wrangler can refuse connections while it initializes.
    }
    await delay(250);
  }
  throw new Error('Local Pages server did not become ready in time.');
}

async function startPages(entrypoint, persistencePath) {
  const environment = { ...process.env, CI: '1' };
  delete environment.SITE_PASSWORD__0;
  delete environment.SITE_PASSWORD__1;
  const args = [
    entrypoint,
    'pages',
    'dev',
    '--ip',
    host,
    '--port',
    String(port),
    '--persist-to',
    persistencePath,
    '--log-level',
    'info',
    '--show-interactive-dev-session=false',
  ];
  if (args.includes('--remote') || !args.includes('--persist-to')) {
    throw new Error('Pages must run locally against the test-owned persistence directory.');
  }
  const server = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const output = [];
  for (const stream of [server.stdout, server.stderr]) {
    stream.on('data', (chunk) => output.push(chunk));
  }
  server.diagnosticOutput = () => Buffer.concat(output).toString('utf8');
  try {
    await waitForPages(server);
    return server;
  } catch (error) {
    await stopPages(server);
    throw error;
  }
}

function keepPagesAlive() {
  const timer = setInterval(() => {
    void fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(2_000) })
      .then((response) => response.body?.cancel())
      .catch(() => {});
  }, 10_000);
  timer.unref();
  return () => clearInterval(timer);
}

async function stopPages(server) {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolveExit) => server.once('exit', resolveExit));
    if (process.platform === 'win32') {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Stop-Process -Id ${server.pid} -Force -ErrorAction SilentlyContinue`,
      ], { stdio: 'ignore', windowsHide: true });
    } else {
      server.kill('SIGTERM');
    }
    await Promise.race([exited, delay(10_000)]);
  }
  if (server.exitCode === null && server.signalCode === null) {
    throw new Error('The local Pages process did not stop.');
  }
  if (!(await portIsAvailable())) {
    throw new Error('The local Pages process did not release its test port.');
  }
}

function basicAuth(password) {
  return `Basic ${Buffer.from(`guest:${password}`).toString('base64')}`;
}

async function request(path, { password, method = 'GET', body } = {}) {
  const headers = {};
  if (password !== undefined) headers.Authorization = basicAuth(password);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(`${baseUrl}${path}`, {
      method,
      headers,
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.once('end', () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined) {
            responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
          }
        }
        const responseBody = Buffer.concat(chunks).toString('utf8');
        resolveRequest({
          status: response.statusCode ?? 0,
          headers: responseHeaders,
          text: async () => responseBody,
          json: async () => JSON.parse(responseBody),
        });
      });
    });
    request.setTimeout(10_000, () => request.destroy(new Error('Local Pages request timed out.')));
    request.once('error', rejectRequest);
    if (body !== undefined) request.write(JSON.stringify(body));
    request.end();
  });
}

test('traces a fixed job allocation through authenticated Pages and isolated local D1', { timeout: 600_000 }, async () => {
  const devVarsSource = await readFile(join(projectRoot, '.dev.vars'), 'utf8');
  const devVars = parseDevVars(devVarsSource);
  const password = devVars.get('SITE_PASSWORD__0');
  if (!password || !devVars.get('SITE_PASSWORD__1')) {
    throw new Error('Both local host password variables must be configured in .dev.vars.');
  }
  if (!(await portIsAvailable())) {
    throw new Error(`Port ${port} is already in use; the integration test will not stop an existing process.`);
  }

  const entrypoint = wranglerEntrypoint();
  await mkdir(wranglerDirectory, { recursive: true });
  const persistencePath = await mkdtemp(join(wranglerDirectory, 'phase-9-jobs-'));
  const suffix = randomBytes(5).toString('hex');
  const historicalId = `phase9-jobs-history-${suffix}`;
  const historicalName = `Historical jobs guest ${suffix}`;
  const comingName = `Coming jobs guest ${suffix}`;
  const declineName = `Declining jobs guest ${suffix}`;
  const hostPasswords = [password, devVars.get('SITE_PASSWORD__1')];
  let server;
  let stopKeepAlive;

  const executeSql = (sql) => runWrangler(entrypoint, [
    'd1',
    'execute',
    'birthday-rsvps',
    '--local',
    '--persist-to',
    persistencePath,
    '--command',
    sql,
    '--json',
  ]);
  const queryRows = (sql) => parseD1Rows(executeSql(sql));

  try {
    runWrangler(entrypoint, [
      'd1',
      'execute',
      'birthday-rsvps',
      '--local',
      '--persist-to',
      persistencePath,
      '--file',
      'schema.sql',
      '--json',
    ]);
    executeSql(
      `INSERT INTO rsvps (id, name, contact_method, attendees, submitted_at) VALUES (${quoteSql(historicalId)}, ${quoteSql(historicalName)}, 'email', 4, '2025-11-30T12:34:56.000Z');`,
    );
    const historicalCountBefore = queryRows('SELECT COUNT(*) AS count FROM rsvps;')[0]?.count;
    assert.equal(historicalCountBefore, 1, 'the historical sentinel should be established');

    runWrangler(entrypoint, [
      'd1',
      'migrations',
      'apply',
      'birthday-rsvps',
      '--local',
      '--persist-to',
      persistencePath,
    ]);
    server = await startPages(entrypoint, persistencePath);
    stopKeepAlive = keepPagesAlive();

    const publicResponse = await request('/');
    assert.equal(publicResponse.status, 200, 'the public hint page must remain accessible anonymously');
    const publicHtml = await publicResponse.text();
    for (const privateValue of [
      devVars.get('VENUE_NAME'),
      devVars.get('VENUE_MAP_URL'),
      devVars.get('PARK_ENTRY_DIRECTIONS'),
      devVars.get('BUFFET_LIST_URL'),
    ].filter(Boolean)) {
      assert.equal(publicHtml.includes(privateValue), false, 'private logistics must stay off the public route');
    }

    for (const [path, method, body] of [
      ['/rsvp/', 'GET', undefined],
      ['/api/drink-suggestions', 'GET', undefined],
      ['/api/job-options', 'GET', undefined],
      ['/api/fresh-rsvp', 'POST', { name: 'Anonymous guest', attendance: 'not_coming' }],
    ]) {
      const response = await request(path, { method, body });
      assert.equal(response.status, 401, `anonymous access to ${path} must be rejected`);
    }
    const rejectedPassword = await request('/rsvp/', { password: 'not-a-configured-password' });
    assert.equal(rejectedPassword.status, 401);

    const invitations = await Promise.all(hostPasswords.map(async (hostPassword) => {
      const response = await request('/rsvp/', { password: hostPassword });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      return response.text();
    }));
    assert.equal(invitations[0], invitations[1], 'both host credentials must receive the same invitation');
    const invitationHtml = invitations[0];
    for (const key of ['VENUE_NAME', 'VENUE_MAP_URL', 'PARK_ENTRY_DIRECTIONS']) {
      const value = devVars.get(key);
      if (value) assert.ok(invitationHtml.includes(escapeHtml(value)), `authenticated invitation must include configured ${key}`);
    }
    const buffetUrl = devVars.get('BUFFET_LIST_URL')?.trim() ?? '';
    let validBuffetUrl = false;
    try {
      const parsedBuffetUrl = new URL(buffetUrl);
      validBuffetUrl = parsedBuffetUrl.protocol === 'https:'
        && Boolean(parsedBuffetUrl.hostname)
        && !parsedBuffetUrl.username
        && !parsedBuffetUrl.password;
    } catch {
      // An absent or invalid optional URL must not create an active callout.
    }
    assert.equal(invitationHtml.includes('event-callout'), validBuffetUrl);
    if (validBuffetUrl) assert.ok(invitationHtml.includes(buffetUrl));

    const drinkResponse = await request('/api/drink-suggestions', { password });
    assert.equal(drinkResponse.status, 200);
    const drinks = await drinkResponse.json();
    assert.deepEqual(drinks.options.map(({ label }) => label), [
      'alkoholfreies Bier',
      'Bier',
      'Fruchtlimonaden',
      'Kola',
      'Sekt',
      'Spezi',
      'Wasser',
      'Wein',
    ]);

    const catalogResponse = await request('/api/job-options', { password });
    assert.match(catalogResponse.headers.get('content-type') ?? '', /application\/json/);
    assert.equal(catalogResponse.status, 200);
    const catalog = await catalogResponse.json();
    assert.equal(catalog.ok, true);
    assert.deepEqual(catalog.options.map(({ label }) => label), [
      'Aufbau',
      'Teilzeit Barkeeper nach Lust und Laune',
      'Jemand der mit der Musikbox verbunden ist',
      'Dinge',
      'Abbau & Brunch am nächsten Tag',
      'Getränkeeinkauf mit Auto (Freitag oder Samstag)',
    ]);
    assert.ok(catalog.options.every(({ is_fixed, description }) => (
      is_fixed === true
      && typeof description === 'string'
      && Array.from(description).length >= 40
    )), 'all six fixed jobs must have a longer German description');
    assert.deepEqual(catalog.options.map(({ max_capacity }) => max_capacity), [
      15, null, null, null, null, null,
    ]);
    const thingsDescription = catalog.options.find(({ label }) => label === 'Dinge').description;
    assert.match(thingsDescription, /gemeinsam|verschieden/i);
    assert.doesNotMatch(thingsDescription, /Einkauf|Getränke|Dekoration|Aufbau/);
    const shoppingDescription = catalog.options.find(({ label }) => (
      label === 'Getränkeeinkauf mit Auto (Freitag oder Samstag)'
    )).description;
    assert.match(shoppingDescription, /Auto/i);
    assert.match(shoppingDescription, /Freitag|Samstag/i);
    assert.doesNotMatch(shoppingDescription, /\b\d{1,2}:\d{2}\b|Treffpunkt|Adresse/i);
    assert.equal(catalog.options.filter(({ label }) => label === 'Abbau & Brunch am nächsten Tag').length, 1);

    const declineResponse = await request('/api/fresh-rsvp', {
      password,
      method: 'POST',
      body: {
        name: declineName,
        attendance: 'not_coming',
        jobs: [{ id: catalog.options[0].id, count: 1 }],
      },
    });
    assert.equal(declineResponse.status, 400, 'declines carrying jobs must be rejected');

    const invalidJsonResponse = await request('/api/fresh-rsvp', {
      password,
      method: 'POST',
      body: '{',
    });
    assert.equal(invalidJsonResponse.status, 400);
    const invalidHeadcountNames = [];
    for (const [label, attendees] of [
      ['empty', ''],
      ['null', null],
      ['fractional', 1.5],
      ['encoded-numeric', '2'],
      ['zero', 0],
      ['over-limit', 11],
    ]) {
      const invalidName = `Invalid headcount ${label} ${suffix}`;
      invalidHeadcountNames.push(invalidName);
      const invalidResponse = await request('/api/fresh-rsvp', {
        password,
        method: 'POST',
        body: {
          name: invalidName,
          attendance: 'coming',
          attendees,
          drinks: [],
        },
      });
      assert.equal(invalidResponse.status, 400, `${label} headcount must be rejected`);
    }

    for (const [invalidName, job] of [
      [`Unknown jobs guest ${suffix}`, { id: 'unknown-job', count: 1 }],
      [`Fractional jobs guest ${suffix}`, { id: catalog.options[0].id, count: 1.5 }],
      [`Oversized jobs guest ${suffix}`, { id: catalog.options[0].id, count: 2 }],
    ]) {
      const invalidResponse = await request('/api/fresh-rsvp', {
        password,
        method: 'POST',
        body: {
          name: invalidName,
          attendance: 'coming',
          attendees: 1,
          drinks: [],
          jobs: [job],
        },
      });
      assert.equal(invalidResponse.status, 400, `${invalidName} should be rejected`);
    }

    const submitResponse = await request('/api/fresh-rsvp', {
      password,
      method: 'POST',
      body: {
        name: comingName,
        attendance: 'coming',
        attendees: 1,
        drinks: [],
        jobs: [{ id: catalog.options[0].id, count: 1 }],
      },
    });
    assert.equal(submitResponse.status, 200);
    const submitted = await submitResponse.json();
    assert.equal(submitted.ok, true);
    assert.deepEqual(submitted.jobs, [{
      id: catalog.options[0].id,
      label: 'Aufbau',
      requested_count: 1,
      accepted_count: 1,
    }]);

    const persistedRsvp = queryRows(
      `SELECT id, attendance, group_size, host_ref FROM fresh_rsvps WHERE name = ${quoteSql(comingName)};`,
    );
    assert.equal(persistedRsvp.length, 1);
    assert.equal(persistedRsvp[0].attendance, 'coming');
    assert.equal(persistedRsvp[0].group_size, 1);
    assert.equal(persistedRsvp[0].host_ref, 0);
    assert.equal(
      queryRows(
        `SELECT COUNT(*) AS count FROM fresh_rsvps WHERE name IN (${quoteSql(declineName)}, ${quoteSql(`Unknown jobs guest ${suffix}`)}, ${quoteSql(`Fractional jobs guest ${suffix}`)}, ${quoteSql(`Oversized jobs guest ${suffix}`)});`,
      )[0]?.count,
      0,
    );

    const allocations = queryRows(
      `SELECT j.label, a.assigned_count FROM fresh_rsvp_job_allocations a JOIN job_options j ON j.id = a.job_option_id WHERE a.fresh_rsvp_id = ${quoteSql(persistedRsvp[0].id)};`,
    );
    assert.deepEqual(allocations, [{ label: 'Aufbau', assigned_count: 1 }]);
    assert.equal(
      queryRows(
        `SELECT COUNT(*) AS count FROM fresh_rsvps WHERE name IN (${invalidHeadcountNames.map(quoteSql).join(', ')});`,
      )[0]?.count,
      0,
      'invalid headcounts must not create RSVP rows',
    );

    const declineSaved = await request('/api/fresh-rsvp', {
      password: hostPasswords[1],
      method: 'POST',
      body: { name: declineName, attendance: 'not_coming' },
    });
    assert.equal(declineSaved.status, 200);
    const persistedDecline = queryRows(
      `SELECT attendance, group_size, host_ref FROM fresh_rsvps WHERE name = ${quoteSql(declineName)};`,
    );
    assert.deepEqual(persistedDecline, [{
      attendance: 'not_coming',
      group_size: 0,
      host_ref: 1,
    }]);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM fresh_rsvp_job_allocations WHERE fresh_rsvp_id IN (SELECT id FROM fresh_rsvps WHERE name = ${quoteSql(declineName)});`,
    )[0]?.count, 0);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM fresh_rsvp_drink_selections WHERE fresh_rsvp_id IN (SELECT id FROM fresh_rsvps WHERE name = ${quoteSql(declineName)});`,
    )[0]?.count, 0);

    const submitAllocation = async (name, attendees, jobs, hostPassword = password, extra = {}) => {
      const response = await request('/api/fresh-rsvp', {
        password: hostPassword,
        method: 'POST',
        body: { name, attendance: 'coming', attendees, drinks: [], jobs, ...extra },
      });
      return { response, payload: await response.json() };
    };

    const fullCapacityName = `Full-capacity guest ${suffix}`;
    const partialCapacityName = `Partial-capacity guest ${suffix}`;
    const fullCapacity = await submitAllocation(
      fullCapacityName,
      10,
      [{ id: catalog.options[0].id, count: 10 }],
    );
    assert.equal(fullCapacity.response.status, 200);
    assert.equal(fullCapacity.payload.jobs[0].accepted_count, 10);
    const partialCapacity = await submitAllocation(
      partialCapacityName,
      10,
      [{ id: catalog.options[0].id, count: 8 }],
    );
    assert.equal(partialCapacity.response.status, 200);
    assert.deepEqual(partialCapacity.payload.jobs[0], {
      id: catalog.options[0].id,
      label: 'Aufbau',
      requested_count: 8,
      accepted_count: 4,
    });
    const fullCapacityRequest = await submitAllocation(
      `Already-full guest ${suffix}`,
      1,
      [{ id: catalog.options[0].id, count: 1 }],
    );
    assert.equal(fullCapacityRequest.payload.jobs[0].accepted_count, 0);
    assert.equal(queryRows(
      `SELECT SUM(a.assigned_count) AS total FROM fresh_rsvp_job_allocations a WHERE a.job_option_id = ${quoteSql(catalog.options[0].id)};`,
    )[0]?.total, 15);

    // These records are test-owned and are removed only to start the independent concurrency probe
    // from an empty capacity state in this isolated local D1 database.
    executeSql(
      `DELETE FROM fresh_rsvps WHERE name IN (${quoteSql(comingName)}, ${quoteSql(fullCapacityName)}, ${quoteSql(partialCapacityName)}, ${quoteSql(`Already-full guest ${suffix}`)});`,
    );
    const concurrentNames = Array.from({ length: 10 }, (_, index) => (
      `Concurrent Aufbau guest ${index} ${suffix}`
    ));
    const concurrentResults = await Promise.all(concurrentNames.map((name) => submitAllocation(
      name,
      2,
      [{ id: catalog.options[0].id, count: 2 }],
    )));
    assert.ok(concurrentResults.every(({ response }) => response.status === 200));
    const concurrentAccepted = concurrentResults.reduce(
      (total, { payload }) => total + payload.jobs[0].accepted_count,
      0,
    );
    assert.equal(concurrentAccepted, 15);
    assert.equal(queryRows(
      `SELECT SUM(a.assigned_count) AS total FROM fresh_rsvp_job_allocations a WHERE a.job_option_id = ${quoteSql(catalog.options[0].id)};`,
    )[0]?.total, 15);
    const afterConcurrent = await submitAllocation(
      `After-capacity guest ${suffix}`,
      1,
      [{ id: catalog.options[0].id, count: 1 }],
    );
    assert.equal(afterConcurrent.payload.jobs[0].accepted_count, 0);

    const independentName = `Independent jobs guest ${suffix}`;
    const independentJobs = catalog.options.slice(1).map(({ id }) => ({ id, count: 2 }));
    const independent = await submitAllocation(independentName, 2, independentJobs);
    assert.equal(independent.response.status, 200);
    assert.ok(independent.payload.jobs.every(({ accepted_count }) => accepted_count === 2));
    assert.ok(
      independent.payload.jobs.reduce((total, { accepted_count }) => total + accepted_count, 0) > 2,
      'independent job counts may exceed the party headcount',
    );

    const initialJobCount = queryRows('SELECT COUNT(*) AS count FROM job_options;')[0]?.count;
    const initialDrinkCount = queryRows('SELECT COUNT(*) AS count FROM drink_options;')[0]?.count;
    const stagedJobLabel = `Suggested job ${suffix}`;
    const stagedDrinkLabel = `Suggested drink ${suffix}`;
    const abandonedJobLabel = `Abandoned job ${suffix}`;
    const abandonedDrinkLabel = `Abandoned drink ${suffix}`;
    const stageJob = await request('/api/job-options', {
      password,
      method: 'POST',
      body: { label: `  ${stagedJobLabel}  ` },
    });
    assert.equal(stageJob.status, 200);
    assert.equal((await stageJob.json()).label, stagedJobLabel);
    const stageDrink = await request('/api/drink-suggestions', {
      password,
      method: 'POST',
      body: { label: `  ${stagedDrinkLabel}  ` },
    });
    assert.equal(stageDrink.status, 200);
    assert.equal((await stageDrink.json()).label, stagedDrinkLabel);
    const abandonJob = await request('/api/job-options', {
      password,
      method: 'POST',
      body: { label: abandonedJobLabel },
    });
    assert.equal(abandonJob.status, 200);
    const abandonDrink = await request('/api/drink-suggestions', {
      password,
      method: 'POST',
      body: { label: abandonedDrinkLabel },
    });
    assert.equal(abandonDrink.status, 200);
    assert.equal(queryRows('SELECT COUNT(*) AS count FROM job_options;')[0]?.count, initialJobCount);
    assert.equal(queryRows('SELECT COUNT(*) AS count FROM drink_options;')[0]?.count, initialDrinkCount);

    const selectedName = `Selected suggestions guest ${suffix}`;
    const selectedResponse = await request('/api/fresh-rsvp', {
      password,
      method: 'POST',
      body: {
        name: selectedName,
        attendance: 'coming',
        attendees: 2,
        drinks: ['Bier'],
        drink_suggestions: [stagedDrinkLabel],
        job_suggestions: [{ label: stagedJobLabel, count: 1 }],
      },
    });
    assert.equal(selectedResponse.status, 200);
    const selectedPayload = await selectedResponse.json();
    const selectedJobId = selectedPayload.jobs[0].id;
    const selectedRows = queryRows(
      `SELECT j.id, j.label, a.assigned_count FROM fresh_rsvp_job_allocations a JOIN job_options j ON j.id = a.job_option_id JOIN fresh_rsvps f ON f.id = a.fresh_rsvp_id WHERE f.name = ${quoteSql(selectedName)};`,
    );
    assert.deepEqual(selectedRows, [{
      id: selectedJobId,
      label: stagedJobLabel,
      assigned_count: 1,
    }]);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM fresh_rsvp_drink_selections s JOIN fresh_rsvps f ON f.id = s.fresh_rsvp_id JOIN drink_options d ON d.id = s.drink_option_id WHERE f.name = ${quoteSql(selectedName)} AND d.label = ${quoteSql(stagedDrinkLabel)};`,
    )[0]?.count, 1);
    assert.deepEqual(queryRows(
      `SELECT d.label FROM fresh_rsvp_drink_selections s JOIN fresh_rsvps f ON f.id = s.fresh_rsvp_id JOIN drink_options d ON d.id = s.drink_option_id WHERE f.name = ${quoteSql(selectedName)} ORDER BY d.label;`,
    ).map(({ label }) => label).sort(), ['Bier', stagedDrinkLabel].sort());
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM job_options WHERE label = ${quoteSql(abandonedJobLabel)};`,
    )[0]?.count, 0);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM drink_options WHERE label = ${quoteSql(abandonedDrinkLabel)};`,
    )[0]?.count, 0);

    const duplicateResponse = await request('/api/fresh-rsvp', {
      password: hostPasswords[1],
      method: 'POST',
      body: {
        name: `Duplicate suggestions guest ${suffix}`,
        attendance: 'coming',
        attendees: 1,
        drinks: [],
        drink_suggestions: [stagedDrinkLabel.toLocaleUpperCase('de-DE')],
        job_suggestions: [{ label: stagedJobLabel.toLocaleUpperCase('de-DE'), count: 1 }],
      },
    });
    assert.equal(duplicateResponse.status, 200);
    const duplicatePayload = await duplicateResponse.json();
    assert.equal(duplicatePayload.jobs[0].id, selectedJobId);
    assert.equal(duplicatePayload.jobs[0].label, stagedJobLabel);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM job_options WHERE normalized_label = ${quoteSql(stagedJobLabel.toLocaleLowerCase('de-DE'))};`,
    )[0]?.count, 1);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM drink_options WHERE lower(label) = lower(${quoteSql(stagedDrinkLabel)});`,
    )[0]?.count, 1);

    const failedName = `Failed batch guest ${suffix}`;
    const failedJobLabel = `Rolled-back job ${suffix}`;
    const failedDrinkLabel = `Rolled-back drink ${suffix}`;
    executeSql(
      `CREATE TRIGGER phase9_force_later_batch_failure BEFORE INSERT ON fresh_rsvp_job_allocations WHEN NEW.fresh_rsvp_id IN (SELECT id FROM fresh_rsvps WHERE name = ${quoteSql(failedName)}) BEGIN SELECT RAISE(ABORT, 'forced local test failure'); END;`,
    );
    let failedBatchResponse;
    try {
      failedBatchResponse = await request('/api/fresh-rsvp', {
        password,
        method: 'POST',
        body: {
          name: failedName,
          attendance: 'coming',
          attendees: 1,
          drinks: [],
          drink_suggestions: [failedDrinkLabel],
          job_suggestions: [{ label: failedJobLabel, count: 1 }],
        },
      });
    } finally {
      executeSql('DROP TRIGGER phase9_force_later_batch_failure;');
    }
    assert.equal(failedBatchResponse.status, 500);
    stopKeepAlive();
    stopKeepAlive = undefined;
    await stopPages(server);
    const diagnostics = server.diagnosticOutput();
    for (const hostPassword of hostPasswords) {
      assert.equal(diagnostics.includes(hostPassword), false, 'local Pages diagnostics must not expose host passwords');
    }
    server = undefined;

    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM fresh_rsvps WHERE name = ${quoteSql(failedName)};`,
    )[0]?.count, 0);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM job_options WHERE label = ${quoteSql(failedJobLabel)};`,
    )[0]?.count, 0);
    assert.equal(queryRows(
      `SELECT COUNT(*) AS count FROM drink_options WHERE label = ${quoteSql(failedDrinkLabel)};`,
    )[0]?.count, 0);

    const historicalRows = queryRows(
      `SELECT id, name, contact_method, attendees, hex(submitted_at) AS submitted_at_hex, host_ref FROM rsvps WHERE id = ${quoteSql(historicalId)};`,
    );
    const expectedTimestampHex = Buffer.from('2025-11-30T12:34:56.000Z', 'utf8').toString('hex').toUpperCase();
    assert.deepEqual(historicalRows, [{
      id: historicalId,
      name: historicalName,
      contact_method: 'email',
      attendees: 4,
      submitted_at_hex: expectedTimestampHex,
      host_ref: 0,
    }]);
    assert.equal(queryRows('SELECT COUNT(*) AS count FROM rsvps;')[0]?.count, historicalCountBefore);

    const optionRows = queryRows(
      'SELECT label, max_capacity FROM job_options WHERE is_fixed = 1 ORDER BY display_order;',
    );
    assert.deepEqual(optionRows.map(({ label }) => label), catalog.options.map(({ label }) => label));
    assert.deepEqual(optionRows.map(({ max_capacity }) => max_capacity), [15, null, null, null, null, null]);
  } catch (error) {
    if (server) {
      let diagnostics = server.diagnosticOutput();
      for (const hostPassword of hostPasswords) {
        diagnostics = diagnostics.replaceAll(hostPassword, '[redacted]');
      }
      error.message = `${error.message}\nLocal Pages process: exit=${server.exitCode ?? 'running'}, signal=${server.signalCode ?? 'none'}`
        + (diagnostics.trim() ? `\nLocal Pages diagnostics: ${diagnostics.trim()}` : '');
    }
    throw error;
  } finally {
    try {
      if (stopKeepAlive) stopKeepAlive();
      if (server) await stopPages(server);
    } finally {
      await rm(persistencePath, { recursive: true, force: true });
    }
  }
});
