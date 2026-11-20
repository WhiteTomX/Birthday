import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
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
      // The local server can refuse connections while Wrangler is initializing.
    }
    await delay(250);
  }
  throw new Error('Local Pages server did not become ready in time.');
}

async function startPages(entrypoint, persistencePath, buffetBinding) {
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
    'error',
    '--show-interactive-dev-session=false',
  ];
  if (buffetBinding !== undefined) {
    args.push('--binding', `BUFFET_LIST_URL=${buffetBinding}`);
  }
  const server = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: environment,
    stdio: 'ignore',
    windowsHide: true,
  });
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
        const status = response.statusCode ?? 0;
        resolveRequest({
          status,
          ok: status >= 200 && status < 300,
          headers: responseHeaders,
          text: async () => responseBody,
          json: async () => JSON.parse(responseBody),
        });
      });
    });
    request.setTimeout(10_000, () => request.destroy(new Error('Local Pages request timed out.')));
    request.once('error', rejectRequest);
    if (body !== undefined) {
      request.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    request.end();
  });
}

async function responseJson(response) {
  return response.json();
}

test('integrates authenticated invitation, RSVP, drink reuse, and isolated local D1', { timeout: 240_000 }, async () => {
  const devVarsSource = await readFile(join(projectRoot, '.dev.vars'), 'utf8');
  const devVars = parseDevVars(devVarsSource);
  const hostPasswords = [devVars.get('SITE_PASSWORD__0'), devVars.get('SITE_PASSWORD__1')];
  if (hostPasswords.some((password) => !password)) {
    throw new Error('Both local host password variables must be configured in .dev.vars.');
  }
  if (!(await portIsAvailable())) {
    throw new Error('Port 8788 is already in use; the integration test will not stop an existing process.');
  }

  const entrypoint = wranglerEntrypoint();
  await mkdir(wranglerDirectory, { recursive: true });
  const persistencePath = await mkdtemp(join(wranglerDirectory, 'phase-9-e2e-'));
  const suffix = randomBytes(5).toString('hex');
  const historicalId = `phase9-history-${suffix}`;
  const historicalName = `Historical guest ${suffix}`;
  const comingName = `Coming guest ${suffix}`;
  const maxGroupName = `Maximum guest ${suffix}`;
  const declineName = `Declining guest ${suffix}`;
  const drinkLabel = `Phase 9 drink ${suffix}`;
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
    if (historicalCountBefore !== 1) throw new Error('Could not establish the historical RSVP sentinel.');

    runWrangler(entrypoint, [
      'd1',
      'migrations',
      'apply',
      'birthday-rsvps',
      '--local',
      '--persist-to',
      persistencePath,
    ]);

    server = await startPages(entrypoint, persistencePath, '');

    const publicResponse = await request('/');
    const publicHtml = await publicResponse.text();
    if (!publicResponse.ok) throw new Error('The public root route was not accessible anonymously.');
    for (const privateValue of [
      devVars.get('VENUE_NAME'),
      devVars.get('VENUE_MAP_URL'),
      devVars.get('PARK_ENTRY_DIRECTIONS'),
      devVars.get('BUFFET_LIST_URL'),
    ].filter(Boolean)) {
      if (publicHtml.includes(privateValue)) {
        throw new Error('The public root route contains private event logistics.');
      }
    }

    for (const [path, method, body] of [
      ['/rsvp/', 'GET', undefined],
      ['/api/drink-suggestions', 'GET', undefined],
      ['/api/fresh-rsvp', 'POST', { name: comingName, attendance: 'not_coming' }],
    ]) {
      const response = await request(path, { method, body });
      if (response.status !== 401) {
        throw new Error(`Unauthenticated request to ${path} was not rejected.`);
      }
    }

    const invitationResponses = await Promise.all(hostPasswords.map(async (password) => {
      const response = await request('/rsvp/', { password });
      if (!response.ok) throw new Error('A configured host password could not access the invitation.');
      const html = await response.text();
      if (response.headers.get('Cache-Control') !== 'no-store') {
        throw new Error('The personalized invitation response is missing no-store caching.');
      }
      return html;
    }));
    const normalizeHostNotice = (html) => html.replace(
      /<p class="host-0-birthday-notice">.*?<\/p>/,
      '',
    );
    if (normalizeHostNotice(invitationResponses[0]) !== normalizeHostNotice(invitationResponses[1])) {
      throw new Error('Both host passwords did not receive the same personalized invitation.');
    }
    const invitationHtml = invitationResponses[0];
    if (devVars.get('VENUE_NAME') && !invitationHtml.includes(escapeHtml(devVars.get('VENUE_NAME')))) {
      throw new Error('The configured venue name is missing from the authenticated invitation.');
    }
    if (devVars.get('VENUE_MAP_URL') && !invitationHtml.includes(escapeHtml(devVars.get('VENUE_MAP_URL')))) {
      throw new Error('The configured map URL is missing from the authenticated invitation.');
    }
    if (devVars.get('PARK_ENTRY_DIRECTIONS') && !invitationHtml.includes(escapeHtml(devVars.get('PARK_ENTRY_DIRECTIONS')))) {
      throw new Error('The configured park-entry directions are missing from the authenticated invitation.');
    }
    const buffetUrl = devVars.get('BUFFET_LIST_URL')?.trim() ?? '';
    let validInitialBuffetUrl = false;
    try {
      const parsedBuffetUrl = new URL(buffetUrl);
      validInitialBuffetUrl = parsedBuffetUrl.protocol === 'https:'
        && Boolean(parsedBuffetUrl.hostname)
        && !parsedBuffetUrl.username
        && !parsedBuffetUrl.password;
    } catch {
      // Invalid or absent URLs must omit the callout.
    }
    if (invitationHtml.includes('Mitbringliste') !== validInitialBuffetUrl) {
      throw new Error('The optional buffet URL did not render according to its configuration.');
    }

    const catalogResponse = await request('/api/drink-suggestions', { password: hostPasswords[0] });
    if (!catalogResponse.ok) throw new Error('The authenticated drink catalog could not be loaded.');
    const initialCatalog = await responseJson(catalogResponse);
    const fixedDrinks = [
      'alkoholfreies Bier',
      'Bier',
      'Fruchtlimonaden',
      'Kola',
      'Sekt',
      'Spezi',
      'Wasser',
      'Wein',
    ];
    if (JSON.stringify(initialCatalog.options.map(({ label }) => label)) !== JSON.stringify(fixedDrinks)) {
      throw new Error('The local drink catalog does not contain the expected fixed options.');
    }

    const malformedResponse = await request('/api/fresh-rsvp', {
      password: hostPasswords[0],
      method: 'POST',
      body: '{',
    });
    if (malformedResponse.status !== 400) throw new Error('Malformed authenticated RSVP input was not rejected.');
    const overLimitResponse = await request('/api/fresh-rsvp', {
      password: hostPasswords[0],
      method: 'POST',
      body: { name: maxGroupName, attendance: 'coming', attendees: 11, drinks: [] },
    });
    if (overLimitResponse.status !== 400) throw new Error('An over-limit group size was not rejected.');

    const suggestionResponse = await request('/api/drink-suggestions', {
      password: hostPasswords[0],
      method: 'POST',
      body: { label: drinkLabel },
    });
    if (!suggestionResponse.ok) throw new Error('The local drink suggestion could not be saved.');
    const savedSuggestion = await responseJson(suggestionResponse);
    if (savedSuggestion.label !== drinkLabel) {
      throw new Error('The local drink suggestion response did not contain its staged label.');
    }
    const stagedCatalogCount = queryRows('SELECT COUNT(*) AS count FROM drink_options;')[0]?.count;
    if (stagedCatalogCount !== 8) {
      throw new Error('Staging a drink suggestion unexpectedly changed the shared catalog.');
    }

    for (const [name, password, attendees, drinks] of [
      [comingName, hostPasswords[0], 2, ['Bier', drinkLabel]],
      [maxGroupName, hostPasswords[1], 10, []],
    ]) {
      const response = await request('/api/fresh-rsvp', {
        password,
        method: 'POST',
        body: {
          name,
          attendance: 'coming',
          attendees,
          drinks: drinks.filter((label) => label !== drinkLabel),
          drink_suggestions: drinks.includes(drinkLabel) ? [drinkLabel] : [],
        },
      });
      if (!response.ok) throw new Error('A valid coming RSVP was not saved.');
    }
    const laterCatalogResponse = await request('/api/drink-suggestions', { password: hostPasswords[1] });
    const laterCatalog = await responseJson(laterCatalogResponse);
    if (!laterCatalog.options.some((option) => option.label === drinkLabel)) {
      throw new Error('A selected drink suggestion was not available to the other host.');
    }
    const declineResponse = await request('/api/fresh-rsvp', {
      password: hostPasswords[1],
      method: 'POST',
      body: { name: declineName, attendance: 'not_coming' },
    });
    if (!declineResponse.ok) throw new Error('A valid decline RSVP was not saved.');

    const persistedRsvps = queryRows(
      `SELECT name, attendance, group_size, host_ref FROM fresh_rsvps WHERE name IN (${quoteSql(comingName)}, ${quoteSql(maxGroupName)}, ${quoteSql(declineName)}) ORDER BY name;`,
    );
    if (persistedRsvps.length !== 3) throw new Error('Expected local coming and decline responses were not persisted.');
    const persistedByName = new Map(persistedRsvps.map((row) => [row.name, row]));
    if (
      persistedByName.get(comingName)?.attendance !== 'coming'
      || persistedByName.get(comingName)?.group_size !== 2
      || persistedByName.get(comingName)?.host_ref !== 0
      || persistedByName.get(maxGroupName)?.group_size !== 10
      || persistedByName.get(maxGroupName)?.host_ref !== 1
      || persistedByName.get(declineName)?.attendance !== 'not_coming'
      || persistedByName.get(declineName)?.group_size !== 0
      || persistedByName.get(declineName)?.host_ref !== 1
    ) {
      throw new Error('Local RSVP rows do not preserve attendance, headcount, or host attribution.');
    }

    const persistedDrinks = queryRows(
      `SELECT f.name, d.label FROM fresh_rsvp_drink_selections s JOIN fresh_rsvps f ON f.id = s.fresh_rsvp_id JOIN drink_options d ON d.id = s.drink_option_id WHERE f.name = ${quoteSql(comingName)} ORDER BY d.label;`,
    );
    if (persistedDrinks.length !== 2 || !persistedDrinks.some((row) => row.label === 'Bier')
      || !persistedDrinks.some((row) => row.label === drinkLabel)) {
      throw new Error('The coming RSVP did not retain both fixed and suggested drink selections.');
    }
    const declineDrinks = queryRows(
      `SELECT COUNT(*) AS count FROM fresh_rsvp_drink_selections s JOIN fresh_rsvps f ON f.id = s.fresh_rsvp_id WHERE f.name = ${quoteSql(declineName)};`,
    )[0]?.count;
    if (declineDrinks !== 0) throw new Error('The decline RSVP unexpectedly has drink selections.');

    const historicalRows = queryRows(
      `SELECT id, name, contact_method, attendees, hex(submitted_at) AS submitted_at_hex, host_ref FROM rsvps WHERE id = ${quoteSql(historicalId)};`,
    );
    const expectedTimestampHex = Buffer.from('2025-11-30T12:34:56.000Z', 'utf8').toString('hex').toUpperCase();
    const historyCountAfter = queryRows('SELECT COUNT(*) AS count FROM rsvps;')[0]?.count;
    if (
      historicalRows.length !== 1
      || historicalRows[0].name !== historicalName
      || historicalRows[0].contact_method !== 'email'
      || historicalRows[0].attendees !== 4
      || historicalRows[0].submitted_at_hex !== expectedTimestampHex
      || historicalRows[0].host_ref !== 0
      || historyCountAfter !== historicalCountBefore
    ) {
      throw new Error('Historical RSVP data changed during local Phase 9 integration checks.');
    }

    await stopPages(server);
    server = undefined;
    server = await startPages(entrypoint, persistencePath, 'https://example.test/contribution');
    const buffetResponse = await request('/rsvp/', { password: hostPasswords[0] });
    const buffetHtml = await buffetResponse.text();
    if (!buffetResponse.ok || !buffetHtml.includes('https://example.test/contribution')
      || !/Mitbringliste/.test(buffetHtml)) {
      throw new Error('A configured valid buffet URL did not render as the optional callout.');
    }
  } finally {
    try {
      if (server) await stopPages(server);
    } finally {
      await rm(persistencePath, { recursive: true, force: true });
    }
  }
});
