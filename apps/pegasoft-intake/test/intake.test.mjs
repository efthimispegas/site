import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntake, careerRoles } from '../src/intake.js';
import { CAREER_ROLES } from '../../pegasoft-concept/src/contact-form.js';

const origin = 'https://site.example';
const reference = '123e4567-e89b-42d3-a456-426614174000';
const now = 1_800_000_000_000;
function fixture() {
  const objects = new Map(),
    messages = [],
    rateKeys = [];
  const env = {
    PEGASOFT_INTAKE_ENABLED: 'true',
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
      list: async () => ({ objects: [...objects.values()], truncated: false }),
    },
    EMAIL: {
      send: async (message) => {
        messages.push(message);
        return { messageId: 'provider-accepted' };
      },
    },
    LIMITER: {
      limit: async ({ key }) => {
        rateKeys.push(key);
        return { success: true };
      },
    },
  };
  const service = createIntake({
    now: () => now,
    uuid: () => reference,
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
  return { env, service, objects, messages, rateKeys, request };
}
test('server role contract matches approved Careers options', () =>
  assert.deepEqual(careerRoles, CAREER_ROLES));
test('contact success means provider acceptance; no CV storage or public attachment', async () => {
  const f = fixture(),
    r = await f.service.fetch(f.request(), f.env);
  assert.equal(r.status, 201);
  assert.equal((await r.json()).reference, reference);
  assert.equal(f.objects.size, 0);
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].to, f.env.PEGASOFT_INTAKE_RECIPIENT);
  assert.equal(f.messages[0].replyTo, 'applicant@example.test');
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
test('mail failure removes stored CV/metadata and never exposes provider error', async () => {
  const f = fixture();
  f.env.EMAIL.send = async () => {
    throw Error('private provider details');
  };
  const r = await f.service.fetch(f.request({ career: true }), f.env);
  assert.equal(r.status, 503);
  assert.equal(f.objects.size, 0);
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
test('partial storage failure cleans up before reporting unavailability', async () => {
  const f = fixture();
  const put = f.env.PRIVATE_APPLICATIONS.put;
  f.env.PRIVATE_APPLICATIONS.put = async (...args) => {
    if (args[0].endsWith('application.json')) throw Error('storage details');
    return put(...args);
  };
  const result = await f.service.fetch(f.request({ career: true }), f.env);
  assert.equal(result.status, 503);
  assert.equal(f.objects.size, 0);
  assert.equal(f.messages.length, 0);
});
test('expiry traverses all pages and never deletes fresh objects', async () => {
  const f = fixture();
  const cursors = [];
  f.objects.set('applications/old/cv.pdf', { key: 'applications/old/cv.pdf' });
  f.objects.set('applications/new/cv.pdf', { key: 'applications/new/cv.pdf' });
  f.env.PRIVATE_APPLICATIONS.list = async (options) => {
    cursors.push(options.cursor);
    return options.cursor
      ? {
          objects: [
            {
              key: 'applications/new/cv.pdf',
              customMetadata: { expiresAt: String(now + 1) },
            },
          ],
          truncated: false,
        }
      : {
          objects: [
            {
              key: 'applications/old/cv.pdf',
              customMetadata: { expiresAt: String(now) },
            },
          ],
          truncated: true,
          cursor: 'next-page',
        };
  };
  await f.service.expire(f.env);
  assert.deepEqual(cursors, [undefined, 'next-page']);
  assert.deepEqual([...f.objects.keys()], ['applications/new/cv.pdf']);
});
test('cleanup removes expired objects only, including metadata', async () => {
  const f = fixture();
  f.env.PEGASOFT_INTAKE_ENABLED = 'false';
  delete f.env.EMAIL;
  f.objects.set('applications/old/cv.pdf', {
    key: 'applications/old/cv.pdf',
    customMetadata: { expiresAt: String(now) },
  });
  f.objects.set('applications/fresh/cv.pdf', {
    key: 'applications/fresh/cv.pdf',
    customMetadata: { expiresAt: String(now + 1) },
  });
  await f.service.expire(f.env);
  assert.equal(f.objects.size, 1);
  assert.ok(f.objects.has('applications/fresh/cv.pdf'));
});
