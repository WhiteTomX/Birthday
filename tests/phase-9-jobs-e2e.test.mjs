import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = 8788;
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

function runWrangler(entrypoint, args, timeout = 120_000) {
  try {
    return execFileSync(process.execPath, [entrypoint, ...args], {
      cwd: projectRoot,
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
  } catch {
    throw new Error(`Local Wrangler command failed: ${args.slice(0, 3).join(' ')}`);
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
  const server = spawn(process.execPath, [
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
    'error',
    '--show-interactive-dev-session=false',
  ], {
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
  const headers = new Headers();
  if (password !== undefined) headers.set('Authorization', basicAuth(password));
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
}

test('traces a fixed job allocation through authenticated Pages and isolated local D1', { timeout: 240_000 }, async () => {
  const devVarsSource = await readFile(join(projectRoot, '.dev.vars'), 'utf8');
  const devVars = parseDevVars(devVarsSource);
  const password = devVars.get('SITE_PASSWORD__0');
  if (!password || !devVars.get('SITE_PASSWORD__1')) {
    throw new Error('Both local host password variables must be configured in .dev.vars.');
  }
  if (!(await portIsAvailable())) {
    throw new Error('Port 8788 is already in use; the integration test will not stop an existing process.');
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
      if (diagnostics.trim()) {
        error.message = `${error.message}\nLocal Pages diagnostics: ${diagnostics.trim()}`;
      }
    }
    throw error;
  } finally {
    try {
      if (server) await stopPages(server);
    } finally {
      await rm(persistencePath, { recursive: true, force: true });
    }
  }
});
