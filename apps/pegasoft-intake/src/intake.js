const audiences = {
  General: ['name', 'email', 'company', 'message'],
  'Company owner': ['name', 'email', 'company', 'goals'],
  Investor: ['name', 'email', 'firm', 'interest'],
  Careers: ['name', 'email', 'mobile', 'role', 'links'],
};
const optional = new Set(['mobile', 'links']);
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const day = 86_400_000;
export const careerRoles = [
  'Frontend software engineer',
  'Backend software engineer',
  'Fullstack software engineer',
  'DevOps engineer',
  'Sales specialist',
  'Operations specialist',
  'Administrator',
  'Business specialist',
  'Project manager',
  'Other',
];

class Rejection extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

function configuration(env) {
  const origins = String(env.PEGASOFT_INTAKE_ORIGINS || '')
    .split(',')
    .filter(Boolean);
  const number = (key) => {
    const value = Number(env[key]);
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new Error('configuration');
    return value;
  };
  if (
    env.PEGASOFT_INTAKE_ENABLED !== 'true' ||
    !origins.length ||
    !origins.every((value) => {
      const u = new URL(value);
      return u.protocol === 'https:' && u.origin === value;
    }) ||
    !emailPattern.test(env.PEGASOFT_INTAKE_RECIPIENT || '') ||
    !emailPattern.test(env.PEGASOFT_INTAKE_SENDER || '') ||
    !env.PEGASOFT_PRIVACY_VERSION ||
    !env.PEGASOFT_TURNSTILE_SECRET ||
    !env.PEGASOFT_RATE_LIMIT_SALT ||
    !env.PRIVATE_APPLICATIONS ||
    !env.EMAIL ||
    !env.LIMITER
  ) {
    throw new Error('configuration');
  }
  const verification = new URL(env.PEGASOFT_TURNSTILE_VERIFY_URL);
  if (
    verification.protocol !== 'https:' ||
    verification.hostname !== 'challenges.cloudflare.com' ||
    verification.pathname !== '/turnstile/v0/siteverify' ||
    verification.username ||
    verification.password ||
    verification.search ||
    verification.hash
  )
    throw new Error('configuration');
  const maxFile = number('PEGASOFT_MAX_CV_BYTES'),
    maxBody = number('PEGASOFT_MAX_REQUEST_BYTES');
  const retention = number('PEGASOFT_CV_RETENTION_DAYS');
  if (maxBody < maxFile || maxBody > 10 * 1024 * 1024 || retention > 365)
    throw new Error('configuration');
  return { origins, verification, maxFile, maxBody, retention };
}

function response(status, code, origin, reference) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(
    JSON.stringify({
      ok: status === 201,
      code,
      ...(reference ? { reference } : {}),
    }),
    { status, headers },
  );
}

async function boundedForm(request, limit) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    throw new Rejection(415, 'multipart_required');
  if (Number(request.headers.get('content-length')) > limit)
    throw new Rejection(413, 'request_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Rejection(400, 'empty_request');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Rejection(413, 'request_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(new Blob(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') },
    }).formData();
  } catch {
    throw new Rejection(400, 'invalid_multipart');
  }
}

function fields(form) {
  const audience = form.get('audience');
  if (
    !Object.hasOwn(audiences, audience) ||
    form.get('privacyAccepted') !== 'true'
  )
    throw new Rejection(400, 'invalid_fields');
  const keys = audiences[audience];
  const allowed = new Set([
    ...keys,
    'audience',
    'privacyAccepted',
    'privacyVersion',
    'turnstileToken',
    ...(audience === 'Careers' ? ['cv'] : []),
  ]);
  for (const key of form.keys())
    if (!allowed.has(key) || form.getAll(key).length !== 1)
      throw new Rejection(400, 'invalid_fields');
  const values = {};
  for (const key of keys) {
    const value = form.get(key);
    if (value !== null && typeof value !== 'string')
      throw new Rejection(400, 'invalid_fields');
    const text = (value || '').trim();
    const isOptional =
      optional.has(key) || (audience === 'General' && key === 'company');
    if (
      (!isOptional && !text) ||
      text.length >
        (['message', 'goals', 'interest', 'links'].includes(key)
          ? 5000
          : 250) ||
      Array.from(text).some((character) => {
        const code = character.codePointAt(0);
        return code < 32 && code !== 9 && code !== 10 && code !== 13;
      })
    )
      throw new Rejection(400, 'invalid_fields');
    values[key] = text;
  }
  if (!emailPattern.test(values.email))
    throw new Rejection(400, 'invalid_fields');
  if (audience === 'Careers' && !careerRoles.includes(values.role))
    throw new Rejection(400, 'invalid_fields');
  return { audience, values };
}

export function createIntake({
  now = () => Date.now(),
  uuid = () => crypto.randomUUID(),
  fetcher = fetch,
} = {}) {
  return {
    async fetch(request, env) {
      if (new URL(request.url).pathname !== env.PEGASOFT_INTAKE_PATH)
        return response(404, 'not_found');
      let config;
      try {
        config = configuration(env);
      } catch {
        return response(503, 'intake_unavailable');
      }
      const origin = request.headers.get('Origin');
      if (!config.origins.includes(origin))
        return response(403, 'origin_rejected');
      if (request.method === 'OPTIONS')
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            Vary: 'Origin',
            'Cache-Control': 'no-store',
          },
        });
      if (request.method !== 'POST')
        return response(405, 'method_not_allowed', origin);
      let saved = [];
      try {
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) throw new Rejection(403, 'request_rejected');
        const bytes = new TextEncoder().encode(
          env.PEGASOFT_RATE_LIMIT_SALT + ':' + ip,
        );
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const key = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
        if (!(await env.LIMITER.limit({ key })).success)
          throw new Rejection(429, 'rate_limited');
        const form = await boundedForm(request, config.maxBody);
        const { audience, values } = fields(form);
        if (form.get('privacyVersion') !== env.PEGASOFT_PRIVACY_VERSION)
          throw new Rejection(400, 'privacy_version_required');
        const token = form.get('turnstileToken');
        if (typeof token !== 'string' || !token || token.length > 2048)
          throw new Rejection(403, 'challenge_failed');
        const verification = await fetcher(config.verification, {
          method: 'POST',
          body: new URLSearchParams({
            secret: env.PEGASOFT_TURNSTILE_SECRET,
            response: token,
            remoteip: ip,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const challenge = verification.ok ? await verification.json() : {};
        if (
          challenge.success !== true ||
          challenge.hostname !== new URL(origin).hostname ||
          challenge.action !== (audience === 'Careers' ? 'careers' : 'contact')
        )
          throw new Rejection(403, 'challenge_failed');
        const reference = uuid(),
          createdAt = now(),
          expiresAt = createdAt + config.retention * day;
        if (!/^[0-9a-f-]{36}$/i.test(reference)) throw new Error('reference');
        if (audience === 'Careers') {
          const file = form.get('cv');
          if (
            !file ||
            typeof file === 'string' ||
            !file.size ||
            file.size > config.maxFile
          )
            throw new Rejection(400, 'invalid_cv');
          const data = await file.arrayBuffer();
          if (
            file.type !== 'application/pdf' ||
            !file.name.toLowerCase().endsWith('.pdf') ||
            new TextDecoder().decode(data.slice(0, 5)) !== '%PDF-'
          )
            throw new Rejection(400, 'invalid_cv');
          const prefix = 'applications/' + reference + '/';
          const metadata = {
            createdAt: String(createdAt),
            expiresAt: String(expiresAt),
            status: 'quarantine',
          };
          // No original filenames or applicant names in object keys or public URLs.
          saved.push(prefix + 'cv.pdf');
          await env.PRIVATE_APPLICATIONS.put(saved[0], data, {
            httpMetadata: { contentType: 'application/pdf' },
            customMetadata: metadata,
          });
          saved.push(prefix + 'application.json');
          await env.PRIVATE_APPLICATIONS.put(
            saved[1],
            JSON.stringify({
              reference,
              audience,
              values,
              createdAt,
              expiresAt,
              privacyVersion: env.PEGASOFT_PRIVACY_VERSION,
            }),
            {
              httpMetadata: { contentType: 'application/json' },
              customMetadata: metadata,
            },
          );
        }
        const lines = [
          'Audience: ' + audience,
          'Reference: ' + reference,
          ...Object.entries(values).map(([name, value]) => name + ': ' + value),
        ];
        if (audience === 'Careers')
          lines.push(
            'CV: private quarantine storage only. Authorized Cloudflare reviewers use reference above.',
            'CV expires: ' + new Date(expiresAt).toISOString(),
          );
        const delivery = await env.EMAIL.send({
          to: env.PEGASOFT_INTAKE_RECIPIENT,
          from: env.PEGASOFT_INTAKE_SENDER,
          replyTo: values.email,
          subject: 'Website ' + audience + ' [' + reference + ']',
          text: lines.join('\n'),
        });
        if (!delivery?.messageId) throw new Error('delivery');
        return response(201, 'submitted', origin, reference);
      } catch (error) {
        // Retention is a second safety net if storage/provider cleanup fails.
        if (saved.length) {
          try {
            await env.PRIVATE_APPLICATIONS.delete(saved);
          } catch {
            return response(503, 'intake_unavailable', origin);
          }
        }
        return response(
          error instanceof Rejection ? error.status : 503,
          error instanceof Rejection ? error.message : 'intake_unavailable',
          origin,
        );
      }
    },
    async expire(env) {
      // Cleanup must continue if intake or email delivery is disabled.
      if (!env.PRIVATE_APPLICATIONS) throw new Error('storage_unavailable');
      let cursor;
      do {
        const page = await env.PRIVATE_APPLICATIONS.list({
          prefix: 'applications/',
          include: ['customMetadata'],
          ...(cursor ? { cursor } : {}),
        });
        const expired = page.objects
          .filter((object) => {
            const expiresAt = Number(object.customMetadata?.expiresAt);
            return (
              Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= now()
            );
          })
          .map((object) => object.key);
        if (expired.length) await env.PRIVATE_APPLICATIONS.delete(expired);
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return { retentionDays: Number(env.PEGASOFT_CV_RETENTION_DAYS) };
    },
  };
}
