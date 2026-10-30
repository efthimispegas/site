import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryCoordinator, IntakeDelivery } from '../src/delivery.js';
import { sendResend, receipt } from '../src/resend.js';
import { memoryStorage, isolatedAdmission } from './delivery-fixture.mjs';
const start = 1800000000000,
  day = 86400000;
function fixture() {
  let clock = start;
  const storage = memoryStorage(),
    calls = [],
    files = new Map();
  const input = {
    submissionId: `${start}_123e4567-e89b-42d3-a456-426614174000`,
    language: 'en',
    audience: 'Careers',
    values: {
      name: 'Synthetic',
      email: 'applicant@example.test',
      role: 'Backend software engineer',
    },
    privacyVersion: 'synthetic-v1',
    cv: btoa('%PDF-1.7\nsynthetic'),
  };
  const env = {
    PEGASOFT_INTAKE_ENABLED: 'true',
    PEGASOFT_INTAKE_SENDER: 'sender@example.test',
    PEGASOFT_INTAKE_RECIPIENT: 'owner@example.test',
    PRIVATE_APPLICATIONS: {
      put: async (key, value, options) => files.set(key, { value, ...options }),
    },
  };
  let dispatch = async (message, key) => {
    calls.push({ message, key });
    return 'accepted-' + calls.length;
  };
  const options = {
    admission: isolatedAdmission,
    now: () => clock,
    send: (...args) => dispatch(...args),
  };
  return {
    storage,
    calls,
    files,
    input,
    env,
    options,
    coordinator: createDeliveryCoordinator(storage, options),
    time: (value) => {
      clock = value;
    },
    send: (value) => {
      dispatch = value;
    },
  };
}
test('concurrent requests and restart/replay send exactly one notification and one receipt', async () => {
  const f = fixture();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => f.coordinator.run(f.input, f.env)),
  );
  assert.ok(results.every((r) => r.status === 201));
  assert.equal(f.calls.length, 2);
  await createDeliveryCoordinator(f.storage, f.options).run(f.input, f.env);
  assert.equal(f.calls.length, 2);
  assert.equal(f.files.size, 2);
  assert.equal(f.calls[0].message.reply_to, 'applicant@example.test');
  assert.equal(f.calls[1].message.reply_to, 'owner@example.test');
  assert.notEqual(f.calls[0].key, f.calls[1].key);
  assert.ok(!f.calls[1].message.text.includes('Synthetic'));
  assert.equal(f.calls[1].message.attachments, undefined);
  const persisted = JSON.stringify([...f.storage.items.values()]);
  assert.ok(!persisted.includes('applicant@example.test'));
  assert.ok(!persisted.includes('%PDF'));
});
test('payload/configuration mismatch cannot send or overwrite the private CV', async () => {
  const f = fixture();
  await f.coordinator.run(f.input, f.env);
  for (const changed of [
    { ...f.input, cv: btoa('%PDF-different') },
    { ...f.input, language: 'el' },
    { ...f.input, values: { ...f.input.values, email: 'other@example.test' } },
  ])
    assert.equal((await f.coordinator.run(changed, f.env)).status, 409);
  assert.equal(
    (
      await f.coordinator.run(f.input, {
        ...f.env,
        PEGASOFT_INTAKE_SENDER: 'changed@example.test',
      })
    ).status,
    409,
  );
  assert.equal(f.calls.length, 2);
  assert.equal(f.files.size, 2);
});
test('uncertain acceptance retries the identical provider key within its safety window', async () => {
  const f = fixture();
  let first = true;
  f.send(async (message, key) => {
    f.calls.push({ message, key });
    if (first) {
      first = false;
      throw Error('timeout after acceptance');
    }
    return 'accepted';
  });
  assert.equal((await f.coordinator.run(f.input, f.env)).status, 503);
  assert.equal(f.files.size, 2);
  assert.equal(
    (await createDeliveryCoordinator(f.storage, f.options).run(f.input, f.env))
      .status,
    201,
  );
  assert.equal(f.calls[0].key, f.calls[1].key);
  assert.deepEqual(f.calls[0].message, f.calls[1].message);
});
test('an uncertain delivery older than the safety window requires review, never a blind resend', async () => {
  const f = fixture();
  f.send(async () => {
    f.calls.push({});
    throw Error('uncertain');
  });
  await f.coordinator.run(f.input, f.env);
  f.time(start + 24 * 60 * 60 * 1000);
  const r = await f.coordinator.run(f.input, f.env);
  assert.equal(r.code, 'delivery_review_required');
  assert.equal(f.calls.length, 1);
});
test('receipt failure preserves accepted internal status and CV; retry sends only the receipt', async () => {
  const f = fixture();
  let fail = true;
  f.send(async (message, key) => {
    f.calls.push({ message, key });
    if (key.endsWith('/receipt') && fail) {
      fail = false;
      throw Error('receipt timeout');
    }
    return 'accepted';
  });
  const first = await f.coordinator.run(f.input, f.env);
  assert.equal(first.status, 202);
  assert.equal(first.code, 'submitted_receipt_pending');
  assert.equal(f.storage.items.get('delivery').internal.status, 'sent');
  assert.equal(f.files.size, 2);
  assert.equal((await f.coordinator.run(f.input, f.env)).status, 201);
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[1].key, f.calls[2].key);
});
test('receipt uncertainty beyond provider window remains accepted but requires review', async () => {
  const f = fixture();
  f.send(async (message, key) => {
    f.calls.push({ message, key });
    if (key.endsWith('/receipt')) throw Error('timeout');
    return 'accepted';
  });
  await f.coordinator.run(f.input, f.env);
  f.time(start + 24 * 60 * 60 * 1000);
  const r = await f.coordinator.run(f.input, f.env);
  assert.equal(r.status, 202);
  assert.equal(r.code, 'submitted_receipt_review_required');
  assert.equal(f.calls.length, 2);
});
test('crash after provider acceptance but before recording success retains a safe replay identity', async () => {
  const f = fixture();
  const put = f.storage.put;
  let fail = true;
  f.storage.put = async (key, value) => {
    if (value.internal.status === 'sent' && fail) {
      fail = false;
      throw Error('storage failure');
    }
    return put(key, value);
  };
  await assert.rejects(f.coordinator.run(f.input, f.env));
  assert.equal(f.storage.items.get('delivery').internal.status, 'sending');
  await createDeliveryCoordinator(f.storage, f.options).run(f.input, f.env);
  assert.equal(f.calls[0].key, f.calls[1].key);
});
test('disabled gates cause no state, storage or sends; expiry still works while intake is off', async () => {
  const f = fixture();
  assert.equal(
    (
      await f.coordinator.run(f.input, {
        ...f.env,
        PEGASOFT_INTAKE_ENABLED: 'false',
      })
    ).status,
    503,
  );
  assert.equal(f.storage.items.size, 0);
  assert.equal(f.calls.length, 0);
  await f.coordinator.run(f.input, f.env);
  assert.equal(f.storage.alarmAt, start + 30 * day);
  await f.coordinator.expire();
  assert.equal(f.storage.items.size, 1);
  f.time(start + 30 * day);
  await f.coordinator.expire();
  assert.equal(f.storage.items.size, 0);
  assert.equal((await f.coordinator.run(f.input, f.env)).status, 410);
  assert.equal(f.calls.length, 2);
  const actor = new IntakeDelivery(
    { storage: f.storage },
    { PEGASOFT_INTAKE_ENABLED: 'false' },
  );
  assert.equal(
    (await actor.fetch(new Request('https://internal/'))).status,
    503,
  );
});
test('request identity timestamp prevents future requests and replay after the ledger is purged', async () => {
  const f = fixture();
  f.time(start - 1);
  assert.equal((await f.coordinator.run(f.input, f.env)).status, 410);
  f.time(start + 31 * day);
  assert.equal((await f.coordinator.run(f.input, f.env)).status, 410);
  assert.equal(f.calls.length, 0);
});
test('Resend adapter has one fixed API call, idempotency and a timeout, and never leaks errors', async () => {
  const env = {
    PEGASOFT_RESEND_API_URL: 'https://api.resend.com/emails',
    RESEND_API_KEY: 'synthetic',
  };
  const message = {
    from: 'sender@example.test',
    to: ['recipient@example.test'],
    text: 'Synthetic',
  };
  const id = await sendResend(
    message,
    'synthetic/key',
    env,
    async (url, request) => {
      assert.equal(url, env.PEGASOFT_RESEND_API_URL);
      assert.equal(request.headers['Idempotency-Key'], 'synthetic/key');
      assert.equal(request.headers.Authorization, 'Bearer synthetic');
      assert.equal(request.redirect, 'manual');
      assert.ok(request.signal);
      assert.deepEqual(JSON.parse(request.body), message);
      return Response.json({ id: 'synthetic-id' });
    },
  );
  assert.equal(id, 'synthetic-id');
  for (const result of [
    new Response('secret provider body', { status: 500 }),
    new Response(null, {
      status: 302,
      headers: { Location: 'https://untrusted.example.test' },
    }),
    Response.json({}),
  ])
    await assert.rejects(
      sendResend(message, 'key', env, async () => result),
      /provider_unconfirmed/,
    );
  assert.ok(receipt('el', true).text.includes('αίτησή'));
});

test('failed quota completion ack after durable internal acceptance returns202 without duplicating notification', async () => {
  const f = fixture();
  const coordinator = createDeliveryCoordinator(f.storage, {
    ...f.options,
    admission: async (path) => {
      if (path === '/complete') throw Error('quota ack lost');
      return { allowed: true, lease: 'synthetic' };
    },
  });
  assert.equal((await coordinator.run(f.input, f.env)).status, 202);
  assert.equal(f.storage.items.get('delivery').internal.status, 'sent');
  assert.equal(f.calls.length, 1);
  assert.equal((await coordinator.run(f.input, f.env)).status, 201);
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls[1].key.endsWith('/receipt'));
});
