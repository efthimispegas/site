import { JSDOM } from 'jsdom';
import { setTimeout as pause } from 'node:timers/promises';
import { createContactForm } from '../../pegasoft-concept/src/contact-form.js';
import { createContactTransport } from '../../pegasoft-concept/src/contact-transport.js';
import { setLocale } from '../../pegasoft-concept/src/locale-messages.js';
import { createScope } from '../../pegasoft-concept/runtime/runtime-lifecycle.js';
import assert from 'node:assert/strict';
import { admissionInput } from '../src/admission.js';
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
// Local workerd rejects jurisdiction(), so adapt only the test binding while asserting EU selection.
// Production code and bindings remain unchanged; this cannot qualify real geographic placement.
const entry = resolve(
  import.meta.dirname,
  '../../../dist/apps/pegasoft-intake/worker.js',
);
const bundle = await build({
  stdin: {
    contents: `import worker,{IntakeDelivery as ActualDelivery,IntakeAdmission} from ${JSON.stringify(entry)};
    class LocalDelivery extends ActualDelivery {constructor(ctx,env){super(ctx,{...env,ADMISSION:{jurisdiction(value){if(value!=='eu')throw Error('jurisdiction');return env.ADMISSION;}}});}}
    export {LocalDelivery as IntakeDelivery,IntakeAdmission};
    export default {...worker,fetch(request,env,ctx){
      const scoped=ns=>({jurisdiction(value){if(value!=='eu')throw Error('jurisdiction');return ns;}});
      return worker.fetch(request,{...env,DELIVERIES:scoped(env.DELIVERIES),ADMISSION:scoped(env.ADMISSION),LIMITER:{limit:async()=>({success:true})}},ctx);
    }};`,
    resolveDir: import.meta.dirname,
    sourcefile: 'local-runtime-entry.js',
  },
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
const createRuntime = (enabled, contact = false) =>
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
            ADMISSION: { className: 'IntakeAdmission', useSQLite: true },
          },
          r2Buckets: ['PRIVATE_APPLICATIONS'],
          bindings: {
            PEGASOFT_INTAKE_ENABLED: String(enabled),
            PEGASOFT_CAREERS_ENABLED: contact ? 'false' : 'true',
            PEGASOFT_INTAKE_PATH: '/api/intake',
            PEGASOFT_INTAKE_ORIGINS: 'https://intake.example',
            PEGASOFT_PRIVACY_VERSION: 'synthetic-v1',
            PEGASOFT_TURNSTILE_SECRET: 'synthetic-challenge-secret',
            PEGASOFT_RATE_LIMIT_SALT: 'synthetic-key',
            PEGASOFT_TURNSTILE_VERIFY_URL:
              'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            PEGASOFT_CV_RETENTION_DAYS: '30',
            PEGASOFT_MAX_CV_BYTES: '5000000',
            PEGASOFT_MAX_REQUEST_BYTES: '5131072',
            PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'true',
            PEGASOFT_INTAKE_SENDER: 'sender@example.test',
            PEGASOFT_INTAKE_RECIPIENT: 'owner@example.test',
            PEGASOFT_RESEND_API_URL: 'https://api.resend.com/emails',
            RESEND_API_KEY: 'synthetic-not-a-key',
          },
          // No provider request can leave this fixture. Fail any unexpected destination.
          outboundService: async (request) => {
            if (
              request.url ===
              'https://challenges.cloudflare.com/turnstile/v0/siteverify'
            ) {
              return Response.json({
                success: true,
                hostname: 'intake.example',
                action: 'contact',
              });
            }
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
    resourcePersistencePath: contact
      ? join(persistence, 'contact')
      : persistence,
  });
async function admission(path, body = {}) {
  const ns = await runtime.getDurableObjectNamespace('ADMISSION');
  return ns
    .get(ns.idFromName('launch-v1'))
    .fetch('https://admission.internal' + path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
}
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
  assert.equal((await admission('/reconcile')).status, 200);
  const reservation = await (
    await admission(
      '/reserve',
      await admissionInput(input, 'synthetic-key', '192.0.2.1'),
    )
  ).json();
  assert.equal(reservation.allowed, true);
  input.reference = reservation.reference;
  input.admissionToken = reservation.token;
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
  const candidates = await Promise.all(
    Array.from({ length: 60 }, async (_, i) => {
      const candidate = {
        ...input,
        submissionId: `${Date.now()}_${(i + 1).toString(16).padStart(8, '0')}-e89b-42d3-a456-426614174000`,
        audience: 'General',
        cv: null,
        values: {
          name: 'Synthetic',
          email: `bot-${i}@example.test`,
          company: '',
          message: `Synthetic ${i}`,
        },
      };
      return admissionInput(candidate, 'synthetic-key', `192.0.2.${i + 2}`);
    }),
  );
  const admitted = await Promise.all(
    candidates.map((candidate) => admission('/reserve', candidate)),
  );
  assert.equal(
    admitted.filter((response) => response.status === 200).length,
    19,
    'SQLite global cap must include the existing reservation',
  );
  let status = await (await admission('/status')).json();
  assert.equal(status.usage.day, 20);
  assert.equal(status.usage.emailDay, 40);
  assert.equal(status.circuit.reason, 'admission_budget');
  assert.equal(calls.length, 2, 'rejected admissions cannot send');
  assert.equal(
    (await (await runtime.getR2Bucket('PRIVATE_APPLICATIONS')).list()).objects
      .length,
    2,
  );
  await runtime.dispose();
  runtime = createRuntime(true);
  status = await (await admission('/status')).json();
  assert.equal(status.usage.day, 20);
  assert.equal(status.circuit.reason, 'admission_budget');
  assert.equal(
    (await admission('/reserve', candidates[0])).status,
    503,
    'pause also gates existing reservations',
  );
  await runtime.dispose();
  runtime = createRuntime(false);
  assert.equal((await submit()).status, 503);
  assert.equal(calls.length, 2);

  await runtime.dispose();
  runtime = createRuntime(true, true);
  assert.equal((await admission('/reconcile')).status, 200);
  const beforeContact = calls.length;
  for (const language of ['en', 'el']) {
    setLocale(language);
    const dom = new JSDOM('<main><div id="panel"></div></main>', {
      url: 'https://intake.example/' + language + '/',
    });
    const previous = globalThis.AbortController;
    let scope;
    try {
      globalThis.AbortController = dom.window.AbortController;
      scope = createScope();
    } finally {
      globalThis.AbortController = previous;
    }
    try {
      const panel = dom.window.document.querySelector('#panel');
      let lost = true,
        attempts = 0,
        challenges = 0;
      const identities = [],
        responses = [];
      const transport = createContactTransport({
        path: '/api/intake',
        origin: 'https://intake.example',
        fetcher: async (path, options) => {
          attempts++;
          identities.push(options.body.get('submissionId'));
          const wire = new Request('https://intake.example' + path, options);
          const result = await runtime.dispatchFetch(wire.url, {
            method: wire.method,
            body: await wire.arrayBuffer(),
            headers: {
              ...Object.fromEntries(wire.headers),
              Origin: 'https://intake.example',
              'CF-Connecting-IP': '192.0.2.100',
            },
          });
          responses.push({
            status: result.status,
            body: await result.clone().json(),
          });
          if (lost) {
            lost = false;
            throw new TypeError(
              'Synthetic response lost after Worker completion',
            );
          }
          return result;
        },
      });
      const view = createContactForm({
        panel,
        scope,
        config: {
          enabled: true,
          path: '/api/intake',
          siteKey: 'synthetic-public-site-key',
          privacyVersion: 'synthetic-v1',
          privacyPath: '/privacy/',
        },
        dependencies: {
          challenge: {
            run: async () => 'synthetic-token-' + ++challenges,
            reset() {},
            dispose() {},
          },
          send: transport,
        },
      });
      view.show('General');
      const form = panel.querySelector('form');
      for (const [name, value] of Object.entries({
        name: 'Synthetic composed flow',
        email: 'synthetic-' + language + '@example.test',
        company: '',
        message: 'Synthetic local-only enquiry',
      }))
        form.elements.namedItem(name).value = value;
      form.elements.namedItem('privacyAccepted').checked = true;
      async function submitForm() {
        form.dispatchEvent(
          new dom.window.Event('submit', { bubbles: true, cancelable: true }),
        );
        const deadline = Date.now() + 5000;
        while (
          form.getAttribute('aria-busy') === 'true' &&
          Date.now() < deadline
        )
          await pause(5);
        assert.notEqual(
          form.getAttribute('aria-busy'),
          'true',
          'Composed form must settle',
        );
      }
      await submitForm();
      assert.equal(
        form.dataset.received,
        'false',
        'Lost response cannot claim receipt',
      );
      await submitForm();
      assert.equal(
        form.dataset.received,
        'true',
        JSON.stringify({
          language,
          responses,
          status: form.querySelector('output').textContent,
        }),
      );
      assert.equal(identities.length, 2);
      assert.equal(
        identities[0],
        identities[1],
        'Retry must retain the identity through the real Worker',
      );
      assert.equal(challenges, 2, 'Retry requires a fresh challenge');
      assert.match(
        form.querySelector('output').textContent,
        language === 'el' ? /Ευχαριστούμε/ : /Thank you/,
      );
      await submitForm();
      assert.equal(attempts, 2, 'Terminal success cannot send again');
      view.show('Careers');
      assert.equal(panel.querySelector('input[type=file]'), null);
    } finally {
      scope.dispose();
      dom.window.close();
    }
  }
  assert.equal(
    calls.length - beforeContact,
    4,
    'Two local languages produce exactly two intercepted messages each, despite response-loss replay',
  );
  assert.equal(
    (await (await runtime.getR2Bucket('PRIVATE_APPLICATIONS')).list()).objects
      .length,
    0,
    'Contact must not write CV objects',
  );
  stdout.write(
    'Local workerd SQLite: delivery deduplication, global distinct-ID admission concurrency/persistence, private R2 persistence, shared pause, disabled gate, and EN/EL DOM form → transport → Worker → SQL replay passed; zero external sends.\n',
  );
} finally {
  await runtime?.dispose();
  await rm(persistence, { recursive: true, force: true });
}
