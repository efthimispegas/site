import test from 'node:test';
import { setTimeout as pause } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { createIntakeClient } from '../../pegasoft-concept/src/intake-client.js';
import { createDeliveryCoordinator } from '../src/delivery.js';
import { memoryStorage, isolatedAdmission } from './delivery-fixture.mjs';
const id = '123e4567-e89b-42d3-a456-426614174000';
const payload = (language = 'en') => ({
  audience: 'General',
  language,
  privacyAccepted: true,
  privacyVersion: 'synthetic-v1',
  values: {
    name: 'Synthetic',
    email: 'applicant@example.test',
    company: '',
    message: 'Hello',
  },
});
function fixture() {
  const calls = [],
    tokens = [];
  let count = 0,
    dispatch = async () =>
      Response.json({ code: 'submitted', reference: id }, { status: 201 });
  const client = createIntakeClient({
    enabled: true,
    now: () => 1800000000000,
    uuid: () =>
      `${String(++count).padStart(8, '0')}-e89b-42d3-a456-426614174000`,
    challenge: async () => {
      const token = `synthetic-${tokens.length}`;
      tokens.push(token);
      return token;
    },
    send: async (body) => {
      calls.push(body);
      return dispatch(body);
    },
  });
  return { client, calls, tokens, setSend: (fn) => (dispatch = fn) };
}
test('client stays disabled by default and retains no default network transport', async () => {
  let calls = 0;
  const client = createIntakeClient({
    challenge: () => calls++,
    send: () => calls++,
  });
  assert.equal((await client.submit(payload())).state, 'unavailable');
  assert.equal(calls, 0);
});
test('transport failure retry keeps identity and requires a fresh challenge', async () => {
  const f = fixture();
  f.setSend(async () => {
    throw Error('private response');
  });
  assert.equal((await f.client.submit(payload())).state, 'uncertain');
  f.setSend(async () => Response.json({ code: 'submitted' }, { status: 201 }));
  assert.equal((await f.client.submit(payload())).accepted, true);
  assert.equal(f.calls[0].get('submissionId'), f.calls[1].get('submissionId'));
  assert.notEqual(
    f.calls[0].get('turnstileToken'),
    f.calls[1].get('turnstileToken'),
  );
  assert.equal(f.calls[0].get('privacyAccepted'), 'true');
});
test('only changed payload or explicit new submission resets identity; whitespace normalization does not', async () => {
  const f = fixture();
  f.setSend(async () => {
    throw Error('offline');
  });
  const p = payload();
  await f.client.submit(p);
  p.values.message = ' Hello ';
  await f.client.submit(p);
  assert.equal(f.calls[0].get('submissionId'), f.calls[1].get('submissionId'));
  p.values.message = 'New message';
  await f.client.submit(p);
  assert.notEqual(
    f.calls[1].get('submissionId'),
    f.calls[2].get('submissionId'),
  );
  assert.equal(f.client.startNewSubmission(), true);
  await f.client.submit(p);
  assert.notEqual(
    f.calls[2].get('submissionId'),
    f.calls[3].get('submissionId'),
  );
});
test('202 receipt pending is accepted and subsequent transport failure retains that knowledge', async () => {
  const f = fixture();
  f.setSend(async () =>
    Response.json(
      { code: 'submitted_receipt_pending', reference: id },
      { status: 202 },
    ),
  );
  const accepted = await f.client.submit(payload());
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.retryable, true);
  f.setSend(async () => {
    throw Error('offline');
  });
  const retry = await f.client.submit(payload());
  assert.equal(retry.state, 'receipt_pending');
  assert.equal(retry.accepted, true);
  assert.equal(retry.reference, id);
  assert.equal(f.calls[0].get('submissionId'), f.calls[1].get('submissionId'));
});
test('terminal success and receipt-review response prevent duplicate local submits', async () => {
  for (const [status, code, state] of [
    [201, 'submitted', 'submitted'],
    [202, 'submitted_receipt_review_required', 'receipt_review'],
  ]) {
    const f = fixture();
    f.setSend(async () => Response.json({ code, reference: id }, { status }));
    const first = await f.client.submit(payload());
    assert.equal(first.state, state);
    assert.equal(first.accepted, true);
    assert.deepEqual(await f.client.submit(payload()), first);
    assert.equal(f.calls.length, 1);
    assert.equal(f.tokens.length, 1);
  }
});
test('503 uncertainty is not acceptance; old uncertainty and conflicts require review without blind retry', async () => {
  for (const [status, code, state, retryable] of [
    [503, 'delivery_uncertain', 'uncertain', true],
    [503, 'delivery_review_required', 'review', false],
    [409, 'submission_mismatch', 'conflict', false],
    [410, 'submission_expired', 'conflict', false],
  ]) {
    const f = fixture();
    f.setSend(async () => Response.json({ code }, { status }));
    const result = await f.client.submit(payload());
    assert.equal(result.state, state);
    assert.equal(result.accepted, false);
    assert.equal(result.retryable, retryable);
    if (!retryable) {
      await f.client.submit(payload());
      assert.equal(f.calls.length, 1);
    }
  }
});
test('busy guard prevents double clicks and reset during an in-flight request', async () => {
  const f = fixture();
  let finish;
  f.setSend(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = f.client.submit(payload());
  while (!finish) await pause(0);
  assert.equal((await f.client.submit(payload())).state, 'busy');
  assert.equal(f.client.startNewSubmission(), false);
  finish(Response.json({ code: 'submitted' }, { status: 201 }));
  await pending;
  assert.equal(f.calls.length, 1);
});
test('missing or reused challenge never transmits a retry and challenge errors reveal no details', async () => {
  let token = 'same-token',
    sends = 0;
  const client = createIntakeClient({
    enabled: true,
    challenge: async () => token,
    send: async () => {
      sends++;
      throw Error('offline');
    },
  });
  assert.equal((await client.submit(payload())).state, 'uncertain');
  assert.equal((await client.submit(payload())).state, 'challenge');
  assert.equal(sends, 1);
  token = '';
  assert.equal((await client.submit(payload())).state, 'challenge');
  assert.equal(sends, 1);
  const broken = createIntakeClient({
    enabled: true,
    challenge: async () => {
      throw Error('sensitive details');
    },
    send: () => sends++,
  });
  assert.ok(!(await broken.submit(payload())).message.includes('sensitive'));
  assert.equal(sends, 1);
});
test('privacy and PDF safeguards reject before challenge, with CV bytes only in the injected transport', async () => {
  const f = fixture();
  const p = payload();
  p.privacyAccepted = false;
  assert.equal((await f.client.submit(p)).state, 'invalid');
  const careers = {
    ...payload(),
    audience: 'Careers',
    values: {
      name: 'Synthetic',
      email: 'applicant@example.test',
      role: 'Backend software engineer',
    },
    cv: new File(['bad'], 'cv.pdf', { type: 'application/pdf' }),
  };
  assert.equal((await f.client.submit(careers)).state, 'invalid');
  assert.equal(f.tokens.length, 0);
  careers.cv = new File(['%PDF-1.7\nsynthetic'], 'cv.pdf', {
    type: 'application/pdf',
  });
  await f.client.submit(careers);
  assert.equal(f.calls[0].get('cv').name, 'cv.pdf');
  assert.equal(f.calls[0].get('role'), 'Backend software engineer');
});
test('EN/EL outcomes are local text; malformed and reflected provider bodies are never exposed', async () => {
  for (const language of ['en', 'el']) {
    const f = fixture();
    f.setSend(async () => new Response('<private>', { status: 500 }));
    const result = await f.client.submit(payload(language));
    assert.equal(result.state, 'uncertain');
    assert.ok(!result.message.includes('private'));
    assert.equal(f.calls[0].get('language'), language);
    assert.equal(/[\u0370-\u03ff]/.test(result.message), language === 'el');
  }
});
test('client retries the same backend identity: partial receipt failure cannot resend internal notification', async () => {
  const f = fixture(),
    objects = new Map(),
    sends = [];
  let failReceipt = true;
  f.setSend(async (form) => {
    const submissionId = form.get('submissionId');
    if (!objects.has(submissionId))
      objects.set(
        submissionId,
        createDeliveryCoordinator(memoryStorage(), {
          admission: isolatedAdmission,
          now: () => 1800000000000,
          send: async (message, key) => {
            sends.push(key);
            if (key.endsWith('/receipt') && failReceipt)
              throw Error('synthetic timeout');
            return 'synthetic-id';
          },
        }),
      );
    const result = await objects.get(submissionId).run(
      {
        submissionId,
        audience: 'General',
        language: form.get('language'),
        privacyVersion: form.get('privacyVersion'),
        values: Object.fromEntries(
          ['name', 'email', 'company', 'message'].map((key) => [
            key,
            form.get(key),
          ]),
        ),
        cv: null,
      },
      {
        PEGASOFT_INTAKE_ENABLED: 'true',
        PEGASOFT_INTAKE_SENDER: 'sender@example.test',
        PEGASOFT_INTAKE_RECIPIENT: 'owner@example.test',
      },
    );
    return Response.json(result, { status: result.status });
  });
  assert.equal((await f.client.submit(payload())).state, 'receipt_pending');
  failReceipt = false;
  assert.equal((await f.client.submit(payload())).state, 'submitted');
  assert.equal(sends.filter((key) => key.endsWith('/internal')).length, 1);
  assert.equal(sends.filter((key) => key.endsWith('/receipt')).length, 2);
  assert.equal(sends[1], sends[2]);
});

test('same CV metadata with changed bytes creates a new identity; invalid size never reaches challenge', async () => {
  const f = fixture();
  f.setSend(async () => {
    throw Error('offline');
  });
  const p = {
    ...payload(),
    audience: 'Careers',
    values: {
      name: 'Synthetic',
      email: 'applicant@example.test',
      role: 'Backend software engineer',
    },
    cv: new File(['%PDF-A'], 'cv.pdf', { type: 'application/pdf' }),
  };
  await f.client.submit(p);
  p.cv = new File(['%PDF-B'], 'cv.pdf', { type: 'application/pdf' });
  await f.client.submit(p);
  assert.notEqual(
    f.calls[0].get('submissionId'),
    f.calls[1].get('submissionId'),
  );
  p.cv = new File(['%PDF-' + 'x'.repeat(5000000)], 'cv.pdf', {
    type: 'application/pdf',
  });
  assert.equal((await f.client.submit(p)).state, 'invalid');
  assert.equal(f.tokens.length, 2);
});
test('accepted202 survives failed challenge and later503 without becoming unsent', async () => {
  let token = 'fresh-one',
    status = 202,
    code = 'submitted_receipt_pending',
    calls = 0;
  const client = createIntakeClient({
    enabled: true,
    challenge: async () => token,
    send: async () => {
      calls++;
      return Response.json({ code, reference: id }, { status });
    },
  });
  assert.equal((await client.submit(payload('el'))).accepted, true);
  token = '';
  const challenge = await client.submit(payload('el'));
  assert.equal(challenge.state, 'receipt_pending');
  assert.equal(challenge.accepted, true);
  assert.equal(calls, 1);
  token = 'fresh-two';
  status = 503;
  code = 'intake_unavailable';
  const retry = await client.submit(payload('el'));
  assert.equal(retry.accepted, true);
  assert.equal(retry.state, 'receipt_pending');
  assert.equal(calls, 2);
});
test('switching UI language during an uncertain retry preserves the same enquiry ID and original receipt language', async () => {
  const f = fixture();
  f.setSend(async () => {
    throw Error('offline');
  });
  await f.client.submit(payload('en'));
  const result = await f.client.submit(payload('el'));
  assert.equal(f.calls[0].get('submissionId'), f.calls[1].get('submissionId'));
  assert.equal(f.calls[1].get('language'), 'en');
  assert.ok(/[\u0370-\u03ff]/.test(result.message));
});
