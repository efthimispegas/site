import { deliveryBinding, admissionBinding } from './delivery-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntake, careerRoles } from '../src/intake.js';
import { CAREER_ROLES } from '../../pegasoft-concept/src/contact-form.js';

const origin = 'https://site.example';
const reference = '123e4567-e89b-42d3-a456-426614174000';
const now = 1_800_000_000_000;
function fixture() {
  let clock = now;
  const objects = new Map(),
    messages = [],
    rateKeys = [];
  const env = {
    PEGASOFT_INTAKE_ENABLED: 'true',
    PEGASOFT_CAREERS_ENABLED: 'true',
    PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'true',
    PEGASOFT_INTAKE_PATH: '/api/intake',
    PEGASOFT_INTAKE_ORIGINS: origin,
    PEGASOFT_INTAKE_RECIPIENT: 'receiver@example.test',
    PEGASOFT_INTAKE_SENDER: 'intake@example.test',
    PEGASOFT_CV_RETENTION_DAYS: '30',
    PEGASOFT_MAX_CV_BYTES: '1000',
    PEGASOFT_MAX_REQUEST_BYTES: '10000',
    PEGASOFT_PRIVACY_VERSION: 'test-policy-v1',
    PEGASOFT_TURNSTILE_SECRET: 'test-secret',
    PEGASOFT_TURNSTILE_VERIFY_URL:
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    PEGASOFT_RATE_LIMIT_SALT: 'synthetic-secret',
    PRIVATE_APPLICATIONS: {
      put: async (key, value, options) =>
        objects.set(key, { key, value, ...options }),
      delete: async (keys) => {
        for (const key of keys) objects.delete(key);
      },
      head: async (key) => objects.get(key) || null,
      list: async () => ({
        objects: [...objects.values()].map((o) => ({
          ...o,
          size:
            typeof o.value === 'string'
              ? new TextEncoder().encode(o.value).length
              : o.value?.length || 0,
        })),
        truncated: false,
      }),
    },
    RESEND_API_KEY: 'synthetic-key',
    PEGASOFT_RESEND_API_URL: 'https://api.resend.com/emails',
    LIMITER: {
      limit: async ({ key }) => {
        rateKeys.push(key);
        return { success: true };
      },
    },
  };
  env.testSend = async (message) => {
    messages.push(message);
    return 'provider-accepted';
  };
  env.ADMISSION = admissionBinding(env, {
    now: () => clock,
    uuid: () => reference,
  });
  env.DELIVERIES = deliveryBinding(env, {
    now: () => clock,
    uuid: () => reference,
    send: (...args) => env.testSend(...args),
  });
  const service = createIntake({
    now: () => clock,
    fetcher: async (_url, request) => {
      assert.equal(request.body.get('secret'), 'test-secret');
      return Response.json({
        success: true,
        hostname: 'site.example',
        action:
          request.body.get('response') === 'career-token'
            ? 'careers'
            : 'contact',
      });
    },
  });
  function request({
    career = false,
    change = () => {},
    headers = {},
    method = 'POST',
  } = {}) {
    const form = new FormData();
    const values = {
      submissionId: `${now}_${reference}`,
      language: 'en',
      audience: career ? 'Careers' : 'General',
      name: 'Synthetic Applicant',
      email: 'applicant@example.test',
      privacyAccepted: 'true',
      privacyVersion: 'test-policy-v1',
      turnstileToken: career ? 'career-token' : 'contact-token',
    };
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    if (career) {
      form.set('role', careerRoles[0]);
      form.set(
        'cv',
        new File(['%PDF-1.7\nsynthetic'], 'sample.pdf', {
          type: 'application/pdf',
        }),
      );
    } else form.set('message', 'A synthetic test message.');
    change(form);
    return new Request(origin + '/api/intake', {
      method,
      headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...headers },
      ...(method === 'POST' ? { body: form } : {}),
    });
  }
  return {
    env,
    service,
    objects,
    messages,
    rateKeys,
    request,
    setTime: (value) => (clock = value),
  };
}
test('server role contract matches approved Careers options', () =>
  assert.deepEqual(careerRoles, CAREER_ROLES));
test('contact success means provider acceptance; no CV storage or public attachment', async () => {
  const f = fixture(),
    r = await f.service.fetch(f.request(), f.env);
  assert.equal(r.status, 201);
  assert.equal((await r.json()).reference, reference);
  assert.equal(f.objects.size, 0);
  assert.equal(f.messages.length, 2);
  assert.deepEqual(f.messages[0].to, [f.env.PEGASOFT_INTAKE_RECIPIENT]);
  assert.equal(f.messages[0].reply_to, 'applicant@example.test');
  assert.equal(f.messages[0].attachments, undefined);
  assert.match(f.rateKeys[0], /^[0-9a-f]{64}$/);
  assert.ok(!f.rateKeys[0].includes('192.0.2.1'));
});
test('Career CV and metadata use opaque private keys and 30-day expiry', async () => {
  const f = fixture(),
    r = await f.service.fetch(f.request({ career: true }), f.env);
  assert.equal(r.status, 201);
  assert.equal(f.objects.size, 2);
  for (const object of f.objects.values()) {
    assert.ok(object.key.startsWith('applications/' + reference + '/'));
    assert.equal(
      object.customMetadata.expiresAt,
      String(now + 30 * 86_400_000),
    );
    assert.equal(object.customMetadata.status, 'quarantine');
    assert.ok(!object.key.includes('Applicant'));
    assert.ok(!object.key.includes('sample'));
  }
  assert.equal(f.messages[0].attachments, undefined);
  assert.ok(!f.messages[0].text.includes('https://'));
  const get = new Request(origin + '/api/intake/' + reference, {
    headers: { Origin: origin },
  });
  assert.equal((await f.service.fetch(get, f.env)).status, 404);
});
test('disabled/unconfigured service fails closed without processing', async () => {
  const f = fixture();
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 503);
  assert.equal(f.messages.length, 0);
  assert.equal(f.objects.size, 0);
});
test('foreign origin is rejected before any processing', async () => {
  const f = fixture(),
    r = await f.service.fetch(
      f.request({ headers: { Origin: 'https://attacker.example' } }),
      f.env,
    );
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(f.rateKeys.length, 0);
});
test('rate limit and challenge mismatch stop storage and mail', async () => {
  const f = fixture();
  f.env.LIMITER.limit = async () => ({ success: false });
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 429);
  const g = fixture();
  assert.equal(
    (
      await g.service.fetch(
        g.request({
          career: true,
          change: (form) => form.set('turnstileToken', 'contact-token'),
        }),
        g.env,
      )
    ).status,
    403,
  );
  assert.equal(g.objects.size, 0);
  assert.equal(g.messages.length, 0);
});
test('bounded body rejects oversize even without trusting Content-Length', async () => {
  const f = fixture();
  const r = await f.service.fetch(
    f.request({ change: (form) => form.set('message', 'x'.repeat(11000)) }),
    f.env,
  );
  assert.equal(r.status, 413);
  assert.equal(f.messages.length, 0);
});
test('spoofed/oversized CV, duplicate field, role and privacy mismatch are rejected', async () => {
  for (const change of [
    (form) =>
      form.set(
        'cv',
        new File(['not a PDF'], 'sample.pdf', { type: 'application/pdf' }),
      ),
    (form) =>
      form.set(
        'cv',
        new File(['%PDF-' + 'x'.repeat(1000)], 'sample.pdf', {
          type: 'application/pdf',
        }),
      ),
    (form) => form.append('email', 'second@example.test'),
    (form) => form.set('name', 'Control\u0001character'),
    (form) => form.set('role', 'Invented role'),
    (form) => form.set('privacyVersion', 'stale'),
  ]) {
    const f = fixture();
    assert.equal(
      (await f.service.fetch(f.request({ career: true, change }), f.env))
        .status,
      400,
    );
    assert.equal(f.objects.size, 0);
    assert.equal(f.messages.length, 0);
  }
});
test('mail uncertainty retains quarantined CV/metadata and never exposes provider error', async () => {
  const f = fixture();
  f.env.testSend = async () => {
    throw Error('private provider details');
  };
  const r = await f.service.fetch(f.request({ career: true }), f.env);
  assert.equal(r.status, 503);
  assert.equal(f.objects.size, 2);
  assert.ok(!(await r.text()).includes('private provider'));
});
test('malformed multipart is a client error without storage or mail', async () => {
  const f = fixture();
  const request = new Request(origin + '/api/intake', {
    method: 'POST',
    headers: {
      Origin: origin,
      'CF-Connecting-IP': '192.0.2.1',
      'Content-Type': 'multipart/form-data; boundary=missing',
    },
    body: 'not valid multipart',
  });
  assert.equal((await f.service.fetch(request, f.env)).status, 400);
  assert.equal(f.objects.size, 0);
  assert.equal(f.messages.length, 0);
});
test('partial storage failure retains expiring quarantine for safe retry', async () => {
  const f = fixture();
  const put = f.env.PRIVATE_APPLICATIONS.put;
  f.env.PRIVATE_APPLICATIONS.put = async (...args) => {
    if (args[0].endsWith('application.json')) throw Error('storage details');
    return put(...args);
  };
  const result = await f.service.fetch(f.request({ career: true }), f.env);
  assert.equal(result.status, 503);
  assert.equal(f.objects.size, 1);
  assert.equal(f.messages.length, 0);
});
test('expiry traverses all pages and never deletes fresh objects', async () => {
  const f = fixture();
  const ns = {
    jurisdiction: () => ns,
    idFromName: (x) => x,
    get: () => ({ fetch: async () => Response.json({ allowed: true }) }),
  };
  f.env.ADMISSION = ns;
  const cursors = [];
  f.objects.set('applications/123e4567-e89b-42d3-a456-426614174000/cv.pdf', {
    key: 'applications/123e4567-e89b-42d3-a456-426614174000/cv.pdf',
  });
  f.objects.set('applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf', {
    key: 'applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf',
  });
  f.env.PRIVATE_APPLICATIONS.list = async (options) => {
    cursors.push(options.cursor);
    return options.cursor
      ? {
          objects: [
            {
              key: 'applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf',
              customMetadata: { expiresAt: String(now + 1) },
            },
          ],
          truncated: false,
        }
      : {
          objects: [
            {
              key: 'applications/123e4567-e89b-42d3-a456-426614174000/cv.pdf',
              customMetadata: { expiresAt: String(now) },
            },
          ],
          truncated: true,
          cursor: 'next-page',
        };
  };
  await f.service.expire(f.env);
  assert.deepEqual(cursors, [undefined, 'next-page']);
  assert.deepEqual(
    [...f.objects.keys()],
    ['applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf'],
  );
});
test('cleanup removes expired objects only, including metadata', async () => {
  const f = fixture();
  const ns = {
    jurisdiction: () => ns,
    idFromName: (x) => x,
    get: () => ({ fetch: async () => Response.json({ allowed: true }) }),
  };
  f.env.ADMISSION = ns;
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  delete f.env.EMAIL;
  f.objects.set('applications/123e4567-e89b-42d3-a456-426614174000/cv.pdf', {
    key: 'applications/123e4567-e89b-42d3-a456-426614174000/cv.pdf',
    customMetadata: { expiresAt: String(now) },
  });
  f.objects.set('applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf', {
    key: 'applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf',
    customMetadata: { expiresAt: String(now + 1) },
  });
  await f.service.expire(f.env);
  assert.equal(f.objects.size, 1);
  assert.ok(
    f.objects.has('applications/123e4567-e89b-42d3-a456-426614174001/cv.pdf'),
  );
});

test('missing durable binding or Resend secret and wrong provider endpoint fail closed', async () => {
  for (const override of [
    { DELIVERIES: null },
    { RESEND_API_KEY: '' },
    { PEGASOFT_RESEND_API_URL: 'https://wrong.example/emails' },
  ]) {
    const f = fixture();
    Object.assign(f.env, override);
    assert.equal((await f.service.fetch(f.request(), f.env)).status, 503);
    assert.equal(f.objects.size, 0);
    assert.equal(f.messages.length, 0);
  }
});
test('invalid identity and locale cannot reach private storage or email', async () => {
  for (const change of [
    (form) => form.delete('submissionId'),
    (form) => form.set('submissionId', 'invented'),
    (form) => form.set('language', 'invented'),
  ]) {
    const f = fixture();
    assert.equal(
      (await f.service.fetch(f.request({ career: true, change }), f.env))
        .status,
      400,
    );
    assert.equal(f.objects.size, 0);
    assert.equal(f.messages.length, 0);
  }
});

test('aggregate quota rejection allocates no additional delivery objects or payload storage', async () => {
  const f = fixture();
  for (let i = 1; i <= 20; i++) {
    const response = await f.service.fetch(
      f.request({
        change: (form) => {
          form.set(
            'submissionId',
            `${now}_${String(i).padStart(8, '0')}-e89b-42d3-a456-426614174000`,
          );
          form.set('email', `synthetic-${i}@example.test`);
          form.set('message', `Synthetic ${i}`);
        },
        headers: { 'CF-Connecting-IP': `192.0.2.${i}` },
      }),
      f.env,
    );
    assert.equal(response.status, 201);
  }
  assert.equal(f.env.DELIVERIES.allocated(), 20);
  assert.equal(f.messages.length, 40);
  const response = await f.service.fetch(
    f.request({
      change: (form) => {
        form.set('submissionId', `${now}_99999999-e89b-42d3-a456-426614174000`);
        form.set('email', 'another@example.test');
      },
      headers: { 'CF-Connecting-IP': '192.0.2.250' },
    }),
    f.env,
  );
  assert.equal(response.status, 503);
  assert.equal(f.env.DELIVERIES.allocated(), 20);
  assert.equal(f.messages.length, 40);
  assert.equal(f.objects.size, 0);
});
test('quota outage and unverified capacity cause no submission objects, R2 writes or messages', async () => {
  for (const failure of ['outage', 'capacity']) {
    const f = fixture();
    if (failure === 'capacity')
      f.env.PEGASOFT_INTAKE_CAPACITY_VERIFIED = 'false';
    else
      f.env.ADMISSION = {
        jurisdiction() {
          throw Error('outage');
        },
      };
    assert.equal(
      (await f.service.fetch(f.request({ career: true }), f.env)).status,
      503,
    );
    assert.equal(f.env.DELIVERIES.allocated(), 0);
    assert.equal(f.objects.size, 0);
    assert.equal(f.messages.length, 0);
  }
});
test('provider429 circuit stops fresh and existing submission dispatch without a retry backlog', async () => {
  const f = fixture();
  f.env.testSend = async () => {
    f.messages.push('attempt');
    const error = Error('limited');
    error.code = 'provider_rate_limit';
    throw error;
  };
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 503);
  assert.equal(f.messages.length, 1);
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 503);
  assert.equal(
    (
      await f.service.fetch(
        f.request({
          change: (form) => {
            form.set(
              'submissionId',
              `${now}_99999999-e89b-42d3-a456-426614174000`,
            );
            form.set('email', 'another@example.test');
          },
        }),
        f.env,
      )
    ).status,
    503,
  );
  assert.equal(f.messages.length, 1);
  assert.equal(f.env.DELIVERIES.allocated(), 1);
});
test('cleanup failure preserves reservations and orphans; successful deletion confirms absence before refund', async () => {
  const f = fixture();
  assert.equal(
    (await f.service.fetch(f.request({ career: true }), f.env)).status,
    201,
  );
  f.setTime(now + 31 * 86400000);
  f.objects.set('unexpected.pdf', {
    key: 'unexpected.pdf',
    value: new Uint8Array(100),
    customMetadata: { expiresAt: String(now) },
  });
  const remove = f.env.PRIVATE_APPLICATIONS.delete;
  f.env.PRIVATE_APPLICATIONS.delete = async () => {};
  await assert.rejects(f.service.expire(f.env), /cleanup_unconfirmed/);
  assert.equal(f.objects.size, 3);
  f.env.PRIVATE_APPLICATIONS.delete = remove;
  await f.service.expire(f.env);
  assert.equal(f.objects.size, 1);
  assert.ok(f.objects.has('unexpected.pdf'));
});
test('receipt429 preserves accepted202 and shared pause prevents further sends', async () => {
  const f = fixture();
  let sends = 0;
  f.env.testSend = async () => {
    sends++;
    if (sends === 2) {
      const e = Error('limited');
      e.code = 'provider_rate_limit';
      throw e;
    }
    return 'accepted';
  };
  const response = await f.service.fetch(f.request(), f.env);
  assert.equal(response.status, 202);
  assert.equal((await response.json()).code, 'submitted_receipt_pending');
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 503);
  assert.equal(sends, 2);
});
test('Contact-first switch rejects Careers before admission, storage or provider work', async () => {
  const f = fixture();
  f.env.PEGASOFT_CAREERS_ENABLED = 'false';
  assert.equal(
    (await f.service.fetch(f.request({ career: true }), f.env)).status,
    503,
  );
  assert.equal(f.env.DELIVERIES.allocated(), 0);
  assert.equal(f.messages.length, 0);
  assert.equal(f.objects.size, 0);
  assert.equal((await f.service.fetch(f.request(), f.env)).status, 201);
});
