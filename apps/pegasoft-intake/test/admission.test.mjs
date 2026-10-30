import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdmissionCoordinator,
  IntakeAdmission,
  LIMITS,
  admissionInput,
} from '../src/admission.js';
import { memoryStorage } from './delivery-fixture.mjs';
import { sendResend } from '../src/resend.js';
const day = 86400000,
  start = 1800000000000;
const hash = (i) => i.toString(16).padStart(64, '0');
const uid = (i) =>
  `${i.toString(16).padStart(8, '0')}-e89b-42d3-a456-426614174000`;
function fixture() {
  let clock = start,
    count = 90000;
  const storage = memoryStorage(),
    inventory = new Map();
  const env = {
    PEGASOFT_INTAKE_ENABLED: 'true',
    PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'true',
    PRIVATE_APPLICATIONS: {
      list: async () => ({
        objects: [...inventory].map(([key, size]) => ({ key, size })),
        truncated: false,
      }),
    },
  };
  const options = { now: () => clock, uuid: () => uid(count++) };
  const coordinator = createAdmissionCoordinator(storage, options);
  const ready = coordinator.run('/reconcile', {}, env);
  return {
    storage,
    env,
    inventory,
    options,
    coordinator,
    setTime: (value) => (clock = value),
    input: (i, extra = {}) => ({
      submissionId: `${clock}_${uid(i)}`,
      createdAt: clock,
      cv: false,
      bytes: 0,
      fingerprint: hash(i + 10000),
      recipient: hash(i + 20000),
      ip: hash(i + 30000),
      ...extra,
    }),
    async run(path, body = {}) {
      await ready;
      return coordinator.run(path, body, env);
    },
  };
}
const identity = (input, reservation) => ({
  submissionId: input.submissionId,
  token: reservation.token,
  reference: reservation.reference,
});
async function dispatch(f, body, kind = 'internal', outcome = 'accepted') {
  const grant = await f.run('/dispatch', { ...body, kind });
  assert.equal(grant.allowed, true);
  await f.run('/complete', { ...body, lease: grant.lease, outcome });
}
test('distributed distinct-ID concurrency atomically admits at most20 and opens one shared circuit', async () => {
  const f = fixture();
  const results = await Promise.all(
    Array.from({ length: 80 }, (_, i) => f.run('/reserve', f.input(i + 1))),
  );
  assert.equal(results.filter((r) => r.allowed).length, 20);
  const status = await f.run('/status');
  assert.equal(status.usage.day, 20);
  assert.equal(status.usage.emailDay, 40);
  assert.equal(status.circuit.reason, 'admission_budget');
  assert.equal(f.storage.items.size, 21);
});
test('same-ID reservations reuse immutable token and consume no extra slots; changed payload fails', async () => {
  const f = fixture(),
    input = f.input(1);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => f.run('/reserve', input)),
  );
  assert.ok(results.every((r) => r.allowed && r.token === results[0].token));
  assert.equal((await f.run('/status')).usage.day, 1);
  assert.equal(
    (await f.run('/reserve', { ...input, fingerprint: hash(42) })).allowed,
    false,
  );
  const text = JSON.stringify([...f.storage.items]);
  assert.ok(!text.includes('@'));
  assert.ok(!text.includes('name:'));
});
test('two per normalized recipient, ten perIP and duplicate-payload cooldown reject without adding ledger state', async () => {
  for (const type of ['recipient', 'ip', 'fingerprint']) {
    const f = fixture(),
      limit = type === 'recipient' ? 2 : type === 'ip' ? 10 : 1;
    for (let i = 0; i < limit; i++)
      assert.equal(
        (await f.run('/reserve', f.input(i + 1, { [type]: hash(99) }))).allowed,
        true,
      );
    const before = f.storage.items.size;
    assert.equal(
      (await f.run('/reserve', f.input(30, { [type]: hash(99) }))).allowed,
      false,
    );
    assert.equal(f.storage.items.size, before);
    assert.equal((await f.run('/status')).circuit, null);
  }
});
test('CV daily and byte budgets include both reserved files and metadata overhead', async () => {
  const f = fixture();
  for (let i = 1; i <= 5; i++)
    assert.equal(
      (await f.run('/reserve', f.input(i, { cv: true, bytes: 5004096 })))
        .allowed,
      true,
    );
  assert.equal((await f.run('/status')).usage.bytes, 25020480);
  assert.equal(
    (await f.run('/reserve', f.input(6, { cv: true, bytes: 5004096 }))).allowed,
    false,
  );
  assert.equal((await f.run('/status')).usage.cvDay, 5);
});
test('existing inventory/orphans are counted before admission and unknown account headroom fails closed', async () => {
  const f = fixture();
  f.env.PEGASOFT_INTAKE_CAPACITY_VERIFIED = 'false';
  assert.equal((await f.run('/reserve', f.input(1))).allowed, false);
  f.env.PEGASOFT_INTAKE_CAPACITY_VERIFIED = 'true';
  f.inventory.set('unexpected/private.pdf', LIMITS.bytes - 2048);
  await f.run('/reconcile');
  const state = await f.run('/status');
  assert.equal(state.usage.bytes, LIMITS.bytes);
  assert.equal(state.orphanObjects, 1);
  assert.equal((await f.run('/reserve', f.input(2))).allowed, false);
});
test('missing inventory and disabled intake never reserve capacity', async () => {
  const f = fixture();
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  assert.equal((await f.run('/reserve', f.input(1))).allowed, false);
  const fresh = createAdmissionCoordinator(memoryStorage(), f.options);
  f.env.PEGASOFT_INTAKE_ENABLED = 'true';
  assert.equal(
    (await fresh.run('/reserve', f.input(2), f.env)).code,
    'capacity_unverified',
  );
});
test('quota persistence failure fails closed and restart has no committed admission', async () => {
  const f = fixture();
  await f.run('/status');
  const put = f.storage.put;
  f.storage.put = async () => {
    throw Error('quota unavailable');
  };
  await assert.rejects(f.run('/reserve', f.input(1)), /quota_store/);
  f.storage.put = put;
  const restored = createAdmissionCoordinator(f.storage, f.options);
  assert.equal((await restored.run('/status', {}, f.env)).usage.day, 0);
});
test('uncertain/partial writes retain byte reservations after30days and empty inventory', async () => {
  for (const state of ['writing', 'uncertain']) {
    const f = fixture(),
      input = f.input(1, { cv: true, bytes: 5000 }),
      res = await f.run('/reserve', input),
      body = identity(input, res);
    await f.run('/storage-start', body);
    if (state === 'uncertain') await f.run('/storage-uncertain', body);
    f.setTime(start + 31 * day);
    await f.run('/reconcile');
    await f.coordinator.expire();
    assert.equal((await f.run('/status')).usage.bytes, 5000);
    assert.equal((await f.run('/status')).usage.rows, 1);
  }
});
test('acknowledged writes release bytes only after expiry plus confirmed inventory absence; delayed deletion stays charged', async () => {
  const f = fixture(),
    input = f.input(1, { cv: true, bytes: 5000 }),
    res = await f.run('/reserve', input),
    body = identity(input, res);
  await f.run('/storage-start', body);
  await f.run('/storage-complete', body);
  f.inventory.set(`applications/${res.reference}/cv.pdf`, 300);
  f.inventory.set(`applications/${res.reference}/application.json`, 200);
  f.setTime(start + 31 * day);
  await f.run('/reconcile');
  assert.equal((await f.run('/status')).usage.bytes, 5000);
  f.inventory.clear();
  await f.run('/reconcile');
  assert.equal((await f.run('/status')).usage.bytes, 0);
  assert.equal((await f.run('/status')).usage.rows, 0);
});
test('failed inventory cannot refund orphan bytes or stored reservations', async () => {
  const f = fixture();
  f.inventory.set('applications/orphan', 1000);
  await f.run('/reconcile');
  f.env.PRIVATE_APPLICATIONS.list = async () => {
    throw Error('storage failure');
  };
  assert.equal((await f.run('/reconcile')).allowed, false);
  const status = await f.run('/status');
  assert.equal(status.usage.bytes, 3048);
  assert.equal(status.circuit.reason, 'inventory_unconfirmed');
});
test('80percent aggregate signal is bounded and cannot be raised again inside24h', async () => {
  const f = fixture();
  for (let i = 1; i <= 16; i++) await f.run('/reserve', f.input(i));
  const first = (await f.run('/status')).alert;
  assert.deepEqual(first, { raisedAt: start, threshold: 80 });
  await f.run('/reserve', f.input(17));
  assert.deepEqual((await f.run('/status')).alert, first);
  f.setTime(start + day + 1);
  await f.run('/reconcile');
  for (let i = 100; i < 116; i++) await f.run('/reserve', f.input(i));
  assert.equal((await f.run('/status')).alert.raisedAt, start + day + 1);
});
test('provider429 pauses both old reservations and new IDs without refunding slots', async () => {
  const f = fixture(),
    input = f.input(1),
    res = await f.run('/reserve', input),
    body = identity(input, res);
  const grant = await f.run('/dispatch', { ...body, kind: 'internal' });
  const error = await sendResend(
    {},
    'synthetic/key',
    {
      PEGASOFT_RESEND_API_URL: 'https://api.resend.com/emails',
      RESEND_API_KEY: 'synthetic',
    },
    async () => new Response(null, { status: 429 }),
  ).catch((e) => e);
  assert.equal(error.code, 'provider_rate_limit');
  await f.run('/complete', { ...body, lease: grant.lease, outcome: 'limited' });
  assert.equal(
    (await f.run('/dispatch', { ...body, kind: 'internal' })).allowed,
    false,
  );
  assert.equal((await f.run('/reserve', input)).allowed, false);
  assert.equal((await f.run('/reserve', f.input(2))).allowed, false);
  const status = await f.run('/status');
  assert.equal(status.usage.emailDay, 2);
  assert.equal(status.usage.dispatchDay, 1);
  assert.equal(status.circuit.reason, 'provider_rate_limit');
});
test('same-key uncertain retry reuses first-attempt dispatch slot; only one dispatch lease at a time', async () => {
  const f = fixture(),
    input = f.input(1),
    res = await f.run('/reserve', input),
    body = identity(input, res);
  const grant = await f.run('/dispatch', { ...body, kind: 'internal' });
  assert.equal(
    (await f.run('/dispatch', { ...body, kind: 'receipt' })).allowed,
    false,
  );
  await f.run('/complete', {
    ...body,
    lease: grant.lease,
    outcome: 'uncertain',
  });
  await dispatch(f, body);
  assert.equal((await f.run('/status')).usage.dispatchDay, 1);
});
test('delayed older intents cannot exceed40 new dispatches today; rolling reservations and dispatch counters are distinct', async () => {
  const f = fixture(),
    old = f.input(1),
    res = await f.run('/reserve', old);
  f.setTime(start + day + 1);
  await f.run('/reconcile');
  for (let i = 10; i < 30; i++) {
    const input = f.input(i),
      r = await f.run('/reserve', input),
      body = identity(input, r);
    assert.equal(r.allowed, true);
    await dispatch(f, body);
    await dispatch(f, body, 'receipt');
  }
  assert.equal((await f.run('/status')).usage.dispatchDay, 40);
  assert.equal(
    (await f.run('/dispatch', { ...identity(old, res), kind: 'internal' }))
      .allowed,
    false,
  );
  assert.equal((await f.run('/status')).circuit.reason, 'dispatch_budget');
});
test('owner-reviewed stale lease recovery holds the affected submission and retains uncertainty counters', async () => {
  const f = fixture(),
    input = f.input(1),
    res = await f.run('/reserve', input),
    body = identity(input, res);
  await f.run('/dispatch', { ...body, kind: 'internal' });
  f.setTime(start + 61000);
  await f.run('/dispatch', { ...body, kind: 'receipt' });
  const incident = (await f.run('/status')).circuit.id;
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  const reviewId = uid(777);
  assert.equal(
    (await f.run('/recover', { incident, reviewId, resolveStaleLease: 'hold' }))
      .allowed,
    false,
  );
  f.env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID = reviewId;
  assert.equal(
    (await f.run('/recover', { incident, reviewId, resolveStaleLease: 'hold' }))
      .allowed,
    true,
  );
  f.env.PEGASOFT_INTAKE_ENABLED = 'true';
  assert.equal((await f.run('/reserve', input)).allowed, false);
  assert.equal(
    (await f.run('/dispatch', { ...body, kind: 'internal' })).allowed,
    false,
  );
  assert.equal((await f.run('/status')).usage.dispatchDay, 1);
  assert.equal((await f.run('/reserve', f.input(2))).allowed, true);
});
test('keyed fingerprints normalize recipient and include CV bytes, exact metadata, and overhead without raw identifiers', async () => {
  const input = {
    submissionId: `${start}_${uid(1)}`,
    audience: 'Careers',
    language: 'en',
    privacyVersion: 'synthetic',
    values: { name: 'Synthetic', email: 'A@Example.test' },
    cv: btoa('%PDF-A'),
  };
  const a = await admissionInput(input, 'synthetic-key', '192.0.2.1');
  const b = await admissionInput(
    {
      ...input,
      values: { ...input.values, email: 'a@example.test' },
      cv: btoa('%PDF-B'),
    },
    'synthetic-key',
    '192.0.2.2',
  );
  assert.equal(a.recipient, b.recipient);
  assert.notEqual(a.fingerprint, b.fingerprint);
  assert.notEqual(a.ip, b.ip);
  assert.ok(a.bytes > 4096 + 6);
  assert.ok(!JSON.stringify(a).includes('example'));
});
test('private class rejects unknown operations and storage failures generically', async () => {
  const object = new IntakeAdmission(
    {
      storage: {
        get: async () => {
          throw Error('private details');
        },
      },
    },
    {},
  );
  const response = await object.fetch(
    new Request('https://admission.internal/reserve', {
      method: 'POST',
      body: '{}',
    }),
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('details'));
});

test('monthly600 and total1200 retained-row bounds fail closed even when daily/byte limits allow', async () => {
  for (const [count, age, bytes] of [
    [600, 2, 0],
    [1200, 31, 1],
  ]) {
    const f = fixture();
    await f.run('/status');
    const state = await f.storage.get('state');
    state.ids = [];
    for (let i = 1; i <= count; i++) {
      const id = `${start - age * day}_${uid(i)}`;
      state.ids.push(id);
      await f.storage.put('row:' + id, {
        id,
        at: start - age * day,
        expiresAt: start + (30 - age) * day,
        fingerprint: hash(i),
        recipient: hash(i + 5000),
        ip: hash(i + 10000),
        cv: !!bytes,
        bytes,
        storageState: 'uncertain',
        reference: uid(i),
        token: uid(i),
      });
    }
    await f.storage.put('state', state);
    const restored = createAdmissionCoordinator(f.storage, f.options);
    assert.equal(
      (await restored.run('/reserve', f.input(99999), f.env)).allowed,
      false,
    );
    assert.equal((await restored.run('/status', {}, f.env)).usage.rows, count);
  }
});
test('retention prunes old zero-storage identities but preserves independent rolling dispatch history', async () => {
  const f = fixture(),
    input = f.input(1),
    r = await f.run('/reserve', input);
  f.setTime(start + 29 * day);
  await f.run('/reconcile');
  await dispatch(f, identity(input, r));
  f.setTime(start + 31 * day);
  await f.coordinator.expire();
  const status = await f.run('/status');
  assert.equal(status.usage.rows, 0);
  assert.equal(status.usage.dispatchMonth, 1);
  assert.equal(status.usage.month, 0);
});

test('uncertain storage can only be released by a one-use owner review after paused/drained/expired and confirmed absence', async () => {
  const f = fixture(),
    input = f.input(1, { cv: true, bytes: 5000 }),
    res = await f.run('/reserve', input),
    body = identity(input, res);
  await f.run('/storage-start', body);
  await f.run('/storage-uncertain', body);
  f.setTime(start + 32 * day);
  const reviewId = uid(333),
    review = { reference: res.reference, reviewId, writersDrained: true };
  f.env.PRIVATE_APPLICATIONS.head = async () => null;
  assert.equal((await f.run('/resolve-storage', review)).allowed, false);
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  f.env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID = reviewId;
  f.env.PRIVATE_APPLICATIONS.head = async () => ({ size: 20 });
  assert.equal((await f.run('/resolve-storage', review)).allowed, false);
  assert.equal((await f.run('/status')).usage.bytes, 5000);
  f.env.PRIVATE_APPLICATIONS.head = async () => null;
  assert.equal((await f.run('/resolve-storage', review)).allowed, true);
  assert.equal((await f.run('/status')).usage.bytes, 0);
  assert.equal((await f.run('/resolve-storage', review)).allowed, false);
});
test('inventory scan bounds pause intake without inventing an empty bucket or unbounded state', async () => {
  const f = fixture();
  await f.run('/status');
  f.env.PRIVATE_APPLICATIONS.list = async () => ({
    objects: Array.from({ length: 4097 }, (_, i) => ({
      key: `unowned-${i}`,
      size: 1,
    })),
    truncated: false,
  });
  assert.equal((await f.run('/reconcile')).allowed, false);
  assert.equal((await f.run('/status')).circuit.reason, 'inventory_bound');
  assert.equal((await f.run('/status')).usage.rows, 0);
});
