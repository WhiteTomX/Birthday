import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost as submitFreshRsvp } from '../functions/api/fresh-rsvp.js';

const drinkCatalog = [
  { id: 'bier', label: 'Bier' },
  { id: 'wein', label: 'Wein' },
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
    if (this.sql.includes('FROM drink_options')) {
      const requestedLabels = this.values.map((label) => label.toLowerCase());
      return {
        results: drinkCatalog.filter((option) => requestedLabels.includes(option.label.toLowerCase())),
      };
    }
    return { results: [] };
  }

  async run() {
    if (this.database.failWrite) {
      throw new Error('private database details');
    }

    this.database.runs.push({ sql: this.sql, values: this.values });
    return { success: true };
  }
}

class FakeDatabase {
  constructor({ failRead = false, failWrite = false } = {}) {
    this.failRead = failRead;
    this.failWrite = failWrite;
    this.reads = [];
    this.runs = [];
    this.batches = [];
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

function makeContext(body, { hostRef = '0', rawBody } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (hostRef !== null) {
    headers['X-Host-Ref'] = hostRef;
  }
  const request = new Request('https://birthday.test/api/fresh-rsvp', {
    method: 'POST',
    headers,
    body: rawBody ?? JSON.stringify(body),
  });
  const DB = new FakeDatabase();
  return { context: { request, env: { DB } }, DB };
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
