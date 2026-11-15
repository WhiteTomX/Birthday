import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost as submitFreshRsvp } from '../functions/api/fresh-rsvp.js';
import {
  onRequestGet as getDrinkSuggestions,
  onRequestPost as suggestDrink,
} from '../functions/api/drink-suggestions.js';
import { onRequestGet as getJobOptions } from '../functions/api/job-options.js';

const drinkCatalog = [
  { id: 'bier', label: 'Bier', is_fixed: 1 },
  { id: 'wein', label: 'Wein', is_fixed: 1 },
];

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async all() {
    if (this.database.failRead) {
      throw new Error('private database details');
    }

    this.database.reads.push(this.sql);
    if (this.sql.includes('FROM fresh_rsvp_job_allocations')) {
      return { results: this.database.allocationResults };
    }
    if (this.sql.includes('FROM job_options')) {
      const requestedIds = this.values.map(String);
      return {
        results: this.database.jobOptions.filter((option) => requestedIds.includes(option.id)),
      };
    }
    if (this.sql.includes('FROM drink_options')) {
      const requestedLabels = this.values.map((label) => label.toLowerCase());
      const options = this.database.options;
      if (!this.sql.includes('WHERE lower(label) IN')) {
        return {
          results: [...options].sort((first, second) => (
            second.is_fixed - first.is_fixed || first.label.localeCompare(second.label)
          )),
        };
      }
      return {
        results: options.filter((option) => requestedLabels.includes(option.label.toLowerCase())),
      };
    }
    return { results: [] };
  }

  async first() {
    if (this.database.failRead) {
      throw new Error('private database details');
    }

    this.database.reads.push(this.sql);
    const label = this.values[0].toLowerCase();
    return this.database.options.find((option) => option.label.toLowerCase() === label) ?? null;
  }

  async run() {
    if (this.database.failWrite) {
      throw new Error('private database details');
    }

    this.database.runs.push({ sql: this.sql, values: this.values });
    if (this.sql.includes('INSERT INTO drink_options')) {
      if (this.database.conflictOnInsert) {
        this.database.conflictOnInsert = false;
        this.database.options.push({
          id: 'concurrent-option',
          label: this.values[1],
          is_fixed: 0,
        });
        throw new Error('UNIQUE constraint failed: drink_options.label');
      }
      this.database.options.push({
        id: this.values[0],
        label: this.values[1],
        is_fixed: this.values[2],
      });
    }
    return { success: true };
  }
}

class FakeDatabase {
  constructor({
    failRead = false,
    failWrite = false,
    conflictOnInsert = false,
    allocationResults = [],
  } = {}) {
    this.failRead = failRead;
    this.failWrite = failWrite;
    this.conflictOnInsert = conflictOnInsert;
    this.reads = [];
    this.runs = [];
    this.batches = [];
    this.allocationResults = allocationResults;
    this.options = drinkCatalog.map((option) => ({ ...option }));
    this.jobOptions = [
      { id: 'aufbau', label: 'Aufbau' },
      { id: 'teilzeit-barkeeper', label: 'Teilzeit Barkeeper nach Lust und Laune' },
      { id: 'dinge', label: 'Dinge' },
    ];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async batch(statements) {
    if (this.failWrite) {
      throw new Error('private database details');
    }

    this.batches.push(statements.map(({ sql, values }) => ({ sql, values })));
    return statements.map(() => ({ success: true }));
  }
}

function makeContext(body, { hostRef = '0', rawBody, DB = new FakeDatabase() } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (hostRef !== null) {
    headers['X-Host-Ref'] = hostRef;
  }
  const request = new Request('https://birthday.test/api/fresh-rsvp', {
    method: 'POST',
    headers,
    body: rawBody ?? JSON.stringify(body),
  });
  return { context: { request, env: { DB } }, DB };
}

function makeSuggestionContext(body, { method = 'POST', rawBody, DB = new FakeDatabase() } = {}) {
  const request = new Request('https://birthday.test/api/drink-suggestions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body: rawBody ?? JSON.stringify(body) }),
  });
  return { context: { request, env: { DB } }, DB };
}

function makeJobOptionsContext(options, { failRead = false } = {}) {
  let query;
  const DB = {
    prepare(sql) {
      query = sql;
      return {
        async all() {
          if (failRead) throw new Error('private database details');
          return { results: options };
        },
      };
    },
  };
  return { context: { env: { DB } }, query: () => query };
}

test('stores a coming RSVP and every selected drink in one atomic batch', async () => {
  const { context, DB } = makeContext({
    name: '  Alice Example  ',
    attendance: 'coming',
    attendees: 2,
    drinks: ['Bier', 'Wein'],
  }, { hostRef: '1' });

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 200);
  assert.equal(DB.runs.length, 0);
  assert.equal(DB.batches.length, 1);
  assert.equal(DB.batches[0].length, 3);

  const [rsvp, ...selections] = DB.batches[0];
  assert.match(rsvp.sql, /INSERT INTO fresh_rsvps/);
  assert.equal(rsvp.values[1], 'Alice Example');
  assert.equal(rsvp.values[2], 'coming');
  assert.equal(rsvp.values[3], 2);
  assert.equal(rsvp.values[5], 1);
  assert.deepEqual(selections.map(({ values }) => values[1]).sort(), ['bier', 'wein']);
  assert.ok(DB.batches.flat().every(({ sql }) => !/INSERT INTO rsvps\b/.test(sql)));
});

test('stores a name-only decline without drink associations', async () => {
  const { context, DB } = makeContext({
    name: '  Bob Example  ',
    attendance: 'not_coming',
  });

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 200);
  assert.equal(DB.runs.length, 0);
  assert.equal(DB.batches.length, 1);
  assert.equal(DB.batches[0].length, 1);
  assert.match(DB.batches[0][0].sql, /INSERT INTO fresh_rsvps/);
  assert.deepEqual(DB.batches[0][0].values.slice(1, 4), ['Bob Example', 'not_coming', 0]);
});

test('rejects malformed JSON and non-object payloads without writing', async (t) => {
  for (const [label, rawBody] of [
    ['malformed JSON', '{'],
    ['null JSON', 'null'],
    ['array JSON', '[]'],
  ]) {
    await t.test(label, async () => {
      const { context, DB } = makeContext(null, { rawBody });
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('rejects invalid names, attendance, and extra fields', async (t) => {
  for (const payload of [
    { attendance: 'coming', attendees: 1, drinks: [] },
    { name: '   ', attendance: 'coming', attendees: 1, drinks: [] },
    { name: 'A'.repeat(201), attendance: 'coming', attendees: 1, drinks: [] },
    { name: 'Alice', attendance: 'coming ', attendees: 1, drinks: [] },
    { name: 'Alice', attendance: 'maybe' },
    { name: 'Alice', attendance: 'coming', attendees: 1, drinks: [], contact: 'email' },
  ]) {
    await t.test(JSON.stringify(payload), async () => {
      const { context, DB } = makeContext(payload);
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('rejects malformed, fractional, and out-of-range coming headcounts', async (t) => {
  for (const attendees of ['2people', '2', 1.5, 0, 11, null]) {
    await t.test(String(attendees), async () => {
      const { context, DB } = makeContext({
        name: 'Alice',
        attendance: 'coming',
        attendees,
        drinks: [],
      });
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('rejects declines with drink fields and coming submissions with invalid options', async (t) => {
  const invalidCases = [
    { name: 'Bob', attendance: 'not_coming', drinks: ['Bier'] },
    { name: 'Bob', attendance: 'not_coming', attendees: 0 },
    { name: 'Alice', attendance: 'coming', attendees: 2, drinks: ['Unknown'] },
    { name: 'Alice', attendance: 'coming', attendees: 2, drinks: ['Bier', 7] },
  ];

  for (const payload of invalidCases) {
    await t.test(JSON.stringify(payload), async () => {
      const { context, DB } = makeContext(payload);
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('rejects missing and malformed host context', async (t) => {
  for (const hostRef of [null, '1trailing', '2', '']) {
    await t.test(String(hostRef), async () => {
      const { context, DB } = makeContext({
        name: 'Alice',
        attendance: 'not_coming',
      }, { hostRef });
      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('returns a generic error when D1 persistence fails', async () => {
  const { context, DB } = makeContext({
    name: 'Alice',
    attendance: 'coming',
    attendees: 1,
    drinks: [],
  });
  DB.failWrite = true;

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: 'Database error' });
});

test('returns fixed and suggested drink options in deterministic order', async () => {
  const DB = new FakeDatabase();
  DB.options.push({ id: 'apple-juice', label: 'Apfelsaft', is_fixed: 0 });
  const { context } = makeSuggestionContext(null, { method: 'GET', DB });

  const response = await getDrinkSuggestions(context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(
    payload.options.map(({ label }) => label),
    ['Bier', 'Wein', 'Apfelsaft'],
  );
  assert.equal(payload.options[2].is_fixed, false);
  assert.equal('rsvps' in payload, false);
});

test('normalizes and stores a new drink suggestion', async () => {
  const { context, DB } = makeSuggestionContext({ label: '  Apfelsaft    natur  ' });

  const response = await suggestDrink(context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.created, true);
  assert.equal(payload.option.label, 'Apfelsaft natur');
  assert.equal(payload.option.is_fixed, false);
  assert.equal(DB.runs.length, 1);
});

test('returns the canonical option for a case-insensitive duplicate suggestion', async () => {
  const { context, DB } = makeSuggestionContext({ label: '  bIeR  ' });

  const response = await suggestDrink(context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.created, false);
  assert.deepEqual(payload.option, { id: 'bier', label: 'Bier', is_fixed: true });
  assert.equal(DB.runs.length, 0);
});

test('returns the canonical option after a concurrent suggestion conflict', async () => {
  const DB = new FakeDatabase({ conflictOnInsert: true });
  const { context } = makeSuggestionContext({ label: '  Apfelsaft   natur ' }, { DB });

  const response = await suggestDrink(context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.created, false);
  assert.deepEqual(payload.option, {
    id: 'concurrent-option',
    label: 'Apfelsaft natur',
    is_fixed: false,
  });
});

test('rejects malformed, empty, and overlong drink suggestions', async (t) => {
  for (const [label, rawBody, body] of [
    ['malformed JSON', '{', null],
    ['empty suggestion', null, { label: '   ' }],
    ['overlong suggestion', null, { label: 'A'.repeat(81) }],
  ]) {
    await t.test(label, async () => {
      const { context, DB } = makeSuggestionContext(body, { rawBody });
      const response = await suggestDrink(context);
      assert.equal(response.status, 400);
      assert.equal(DB.runs.length, 0);
    });
  }
});

test('returns a generic error when saving a drink suggestion fails', async () => {
  const DB = new FakeDatabase({ failWrite: true });
  const { context } = makeSuggestionContext({ label: 'Apfelsaft' }, { DB });

  const response = await suggestDrink(context);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: 'Database error' });
});

test('returns fixed jobs before stable suggestions with draft descriptions and current capacity', async () => {
  const options = [
    {
      id: 'aufbau',
      label: 'Aufbau',
      description: 'Hilf dabei, den Veranstaltungsbereich vorzubereiten und beim Aufbau mit anzupacken. Welche Handgriffe gerade gebraucht werden, stimmen wir gemeinsam ab.',
      is_fixed: 1,
      max_capacity: 15,
      assigned_count: 13,
      remaining: 2,
    },
    {
      id: 'teilzeit-barkeeper',
      label: 'Teilzeit Barkeeper nach Lust und Laune',
      description: 'Unterstütze beim Getränke-Ausschank so lange und so oft, wie es für dich passt. Eine feste Schicht oder bestimmte Dauer ist nicht vorgegeben.',
      is_fixed: 1,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'musikbox',
      label: 'Jemand der mit der Musikbox verbunden ist',
      description: 'Hilf dabei, die Musikbox mit dem passenden Gerät zu verbinden, damit während der Feier Musik abgespielt werden kann.',
      is_fixed: 1,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'dinge',
      label: 'Dinge',
      description: 'Für verschiedene Dinge, bei denen eine helfende Hand gebraucht wird. Was genau anfällt, klären wir gemeinsam.',
      is_fixed: 1,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'abbau-brunch',
      label: 'Abbau & Brunch am nächsten Tag',
      description: 'Hilf beim Aufräumen nach dem Geburtstag und sei am nächsten Tag beim Buffet-Brunch dabei. Diese Auswahl umfasst Abbau und Brunch gemeinsam.',
      is_fixed: 1,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'getraenkeeinkauf-auto',
      label: 'Getränkeeinkauf mit Auto (Freitag oder Samstag)',
      description: 'Hilf am Freitag oder Samstag mit deinem Auto beim Getränkeeinkauf. Die genaue Zeit und die weiteren Absprachen stimmen wir gemeinsam ab.',
      is_fixed: 1,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'suggestion-a',
      label: 'Alternative',
      description: 'Eine vorgeschlagene Aufgabe mit einer ausreichend langen Beschreibung.',
      is_fixed: 0,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
    {
      id: 'suggestion-z',
      label: 'Zebra',
      description: 'Eine weitere vorgeschlagene Aufgabe mit einer ausreichend langen Beschreibung.',
      is_fixed: 0,
      max_capacity: null,
      assigned_count: 0,
      remaining: null,
    },
  ];
  const { context, query } = makeJobOptionsContext(options);

  const response = await getJobOptions(context);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.options.map(({ label }) => label), [
    'Aufbau',
    'Teilzeit Barkeeper nach Lust und Laune',
    'Jemand der mit der Musikbox verbunden ist',
    'Dinge',
    'Abbau & Brunch am nächsten Tag',
    'Getränkeeinkauf mit Auto (Freitag oder Samstag)',
    'Alternative',
    'Zebra',
  ]);
  assert.ok(payload.options.slice(0, 6).every(({ description }) => Array.from(description).length >= 40));
  assert.equal(payload.options[0].is_fixed, true);
  assert.equal(payload.options[0].max_capacity, 15);
  assert.equal(payload.options[0].assigned_count, 13);
  assert.equal(payload.options[0].remaining, 2);
  assert.ok(payload.options.slice(1, 6).every(({ max_capacity, remaining }) => (
    max_capacity === null && remaining === null
  )));
  assert.ok(payload.options.slice(6).every(({ is_fixed, max_capacity, remaining }) => (
    is_fixed === false && max_capacity === null && remaining === null
  )));
  assert.equal('rsvps' in payload, false);
  assert.match(query(), /ORDER BY\s+job_options\.is_fixed DESC,\s+CASE WHEN job_options\.is_fixed = 1 THEN job_options\.display_order END,\s+job_options\.normalized_label,\s+job_options\.id/);
});

test('rejects declines with job allocations', async () => {
  const { context, DB } = makeContext({
    name: 'Bob',
    attendance: 'not_coming',
    jobs: [{ id: 'aufbau', count: 1 }],
  });

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 400);
  assert.equal(DB.batches.length + DB.runs.length, 0);
});

test('rejects malformed, duplicate, unknown, and out-of-range job allocations', async (t) => {
  const invalidJobs = [
    [{ id: 'aufbau', count: 0 }],
    [{ id: 'aufbau', count: -1 }],
    [{ id: 'aufbau', count: 1.5 }],
    [{ id: 'aufbau', count: 3 }],
    [{ id: 'unknown', count: 1 }],
    [{ id: 'aufbau', count: 1 }, { id: 'aufbau', count: 1 }],
    [{ id: 'aufbau', count: 1, note: 'extra' }],
  ];

  for (const jobs of invalidJobs) {
    await t.test(JSON.stringify(jobs), async () => {
      const { context, DB } = makeContext({
        name: 'Alice',
        attendance: 'coming',
        attendees: 2,
        drinks: [],
        jobs,
      });

      const response = await submitFreshRsvp(context);
      assert.equal(response.status, 400);
      assert.equal(DB.batches.length + DB.runs.length, 0);
    });
  }
});

test('reserves job capacity in the RSVP batch and reports only returned accepted counts', async () => {
  const DB = new FakeDatabase({
    allocationResults: [
      { id: 'aufbau', assigned_count: 1 },
      { id: 'teilzeit-barkeeper', assigned_count: 2 },
    ],
  });
  const { context } = makeContext({
    name: 'Alice',
    attendance: 'coming',
    attendees: 2,
    drinks: ['Bier'],
    jobs: [
      { id: 'aufbau', count: 2 },
      { id: 'teilzeit-barkeeper', count: 2 },
      { id: 'dinge', count: 1 },
    ],
  }, { DB });

  const response = await submitFreshRsvp(context);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).jobs, [
    {
      id: 'aufbau',
      label: 'Aufbau',
      requested_count: 2,
      accepted_count: 1,
    },
    {
      id: 'teilzeit-barkeeper',
      label: 'Teilzeit Barkeeper nach Lust und Laune',
      requested_count: 2,
      accepted_count: 2,
    },
    {
      id: 'dinge',
      label: 'Dinge',
      requested_count: 1,
      accepted_count: 0,
    },
  ]);
  assert.equal(DB.batches.length, 1);
  const statements = DB.batches[0];
  assert.equal(statements.length, 5);
  assert.match(statements[0].sql, /INSERT INTO fresh_rsvps/);
  assert.match(statements[1].sql, /INSERT INTO fresh_rsvp_drink_selections/);
  const allocations = statements.slice(2);
  assert.ok(allocations.every(({ sql }) => /INSERT INTO fresh_rsvp_job_allocations/.test(sql)));
  assert.ok(allocations.every(({ sql }) => /MIN\(\?,\s*MAX\(0,\s*job_options\.max_capacity\s*-\s*COALESCE\(/.test(sql)));
  assert.ok(allocations.every(({ sql }) => /job_options\.max_capacity IS NULL/.test(sql)));
  assert.ok(allocations.every(({ sql }) => /WHERE job_options\.id = \?/.test(sql)));
  assert.deepEqual(allocations.map(({ values }) => values.slice(1)), [
    [2, 2, 'aufbau'],
    [2, 2, 'teilzeit-barkeeper'],
    [1, 1, 'dinge'],
  ]);
  assert.ok(DB.reads.some((sql) => /SELECT job_option_id AS id, assigned_count/.test(sql)));
});

test('returns a generic error when loading job options fails', async () => {
  const { context } = makeJobOptionsContext([], { failRead: true });

  const response = await getJobOptions(context);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: 'Database error' });
});
