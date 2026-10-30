import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { stdout } from 'node:process';

// Resolve the already pinned isolated Wrangler dependency, never a global install.
const require = createRequire(
  resolve(import.meta.dirname, '../cloudflare-tooling/package.json'),
);
const { Miniflare, convertV4MiniflareOptions } = require(
  require.resolve('miniflare', {
    paths: [dirname(require.resolve('wrangler'))],
  }),
);
// Bundle imports like the deployment build; v5 beta's legacy import discovery is unreliable.
const { build } = require(
  require.resolve('esbuild', { paths: [dirname(require.resolve('wrangler'))] }),
);
const bundle = await build({
  entryPoints: [
    resolve(
      import.meta.dirname,
      '../../../dist/apps/pegasoft-intake/worker.js',
    ),
  ],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
});
const persistence = await mkdtemp(join(tmpdir(), 'pegasoft-intake-synthetic-'));
const calls = [];
const input = {
  submissionId: `${Date.now()}_123e4567-e89b-42d3-a456-426614174000`,
  language: 'en',
  audience: 'Careers',
  values: {
    name: 'Synthetic runtime',
    email: 'applicant@example.test',
    role: 'Backend software engineer',
  },
  privacyVersion: 'synthetic-v1',
  cv: btoa('%PDF-1.7\nsynthetic'),
};
let runtime;
const createRuntime = (enabled) =>
  new Miniflare({
    ...convertV4MiniflareOptions({
      host: '127.0.0.1',
      port: 0,
      cf: false,
      workers: [
        {
          name: 'synthetic-intake',
          modules: true,
          script: bundle.outputFiles[0].text,
          compatibilityDate: '2026-10-28',
          durableObjects: {
            DELIVERIES: { className: 'IntakeDelivery', useSQLite: true },
          },
          r2Buckets: ['PRIVATE_APPLICATIONS'],
          bindings: {
            PEGASOFT_INTAKE_ENABLED: String(enabled),
            PEGASOFT_INTAKE_SENDER: 'sender@example.test',
            PEGASOFT_INTAKE_RECIPIENT: 'owner@example.test',
            PEGASOFT_RESEND_API_URL: 'https://api.resend.com/emails',
            RESEND_API_KEY: 'synthetic-not-a-key',
          },
          // No provider request can leave this fixture. Fail any unexpected destination.
          outboundService: async (request) => {
            assert.equal(request.url, 'https://api.resend.com/emails');
            assert.equal(request.method, 'POST');
            assert.equal(
              request.headers.get('Authorization'),
              'Bearer synthetic-not-a-key',
            );
            calls.push({
              key: request.headers.get('Idempotency-Key'),
              message: await request.json(),
            });
            return Response.json({ id: `synthetic-${calls.length}` });
          },
        },
      ],
    }),
    resourcePersistencePath: persistence,
  });
async function submit() {
  const namespace = await runtime.getDurableObjectNamespace('DELIVERIES');
  return namespace
    .get(namespace.idFromName(input.submissionId))
    .fetch('https://delivery.internal/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
}
try {
  runtime = createRuntime(true);
  const results = await Promise.all([submit(), submit(), submit()]);
  assert.deepEqual(
    results.map((r) => r.status),
    [201, 201, 201],
    JSON.stringify({
      responses: await Promise.all(results.map((r) => r.clone().json())),
      calls: calls.length,
    }),
  );
  const references = await Promise.all(
    results.map(async (r) => (await r.json()).reference),
  );
  assert.equal(new Set(references).size, 1);
  assert.equal(calls.length, 2);
  assert.equal(new Set(calls.map((c) => c.key)).size, 2);
  assert.deepEqual(
    calls.map((c) => c.message.to),
    [['owner@example.test'], ['applicant@example.test']],
  );
  const bucket = await runtime.getR2Bucket('PRIVATE_APPLICATIONS');
  assert.equal((await bucket.list()).objects.length, 2);
  await runtime.dispose();
  runtime = createRuntime(true);
  assert.equal((await submit()).status, 201);
  assert.equal(calls.length, 2, 'SQLite restart replay must not send again');
  assert.equal(
    (await (await runtime.getR2Bucket('PRIVATE_APPLICATIONS')).list()).objects
      .length,
    2,
  );
  await runtime.dispose();
  runtime = createRuntime(false);
  assert.equal((await submit()).status, 503);
  assert.equal(calls.length, 2);
  stdout.write(
    'Local workerd SQLite: concurrent deduplication, restart replay, private R2 persistence and disabled gate passed; zero external sends.\n',
  );
} finally {
  await runtime?.dispose();
  await rm(persistence, { recursive: true, force: true });
}
