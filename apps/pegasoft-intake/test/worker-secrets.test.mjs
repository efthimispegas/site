import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deploymentConfiguration } from '../tools/deployment-config.mjs';
import {
  deploymentEnvironment,
  verifyWorkerSecrets,
} from '../tools/worker-secrets.mjs';
import { deploymentFixture } from './deployment-fixture.mjs';
function environment() {
  return {
    ...deploymentFixture,
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: deploymentFixture.PEGASOFT_SOURCE_REVISION,
    PEGASOFT_INTAKE_DEPLOY_READY: 'true',
    CLOUDFLARE_API_TOKEN: 'synthetic-deploy-token',
  };
}
const names = [
  'PEGASOFT_TURNSTILE_SECRET',
  'PEGASOFT_RATE_LIMIT_SALT',
  'RESEND_API_KEY',
];
const metadata = () => ({
  success: true,
  result: { bindings: names.map((name) => ({ name, type: 'secret_text' })) },
});
test('required Worker secret names are independent of local or CI credential copies; files serialize no values', async () => {
  const env = {
    ...environment(),
    RESEND_API_KEY: 'synthetic-resend-token',
    PEGASOFT_TURNSTILE_SECRET: 'synthetic-challenge-secret',
  };
  const config = deploymentConfiguration(environment());
  assert.deepEqual(config.expected.secretNames, names);
  for (const value of [
    env.CLOUDFLARE_API_TOKEN,
    env.RESEND_API_KEY,
    env.PEGASOFT_TURNSTILE_SECRET,
  ])
    assert.ok(!JSON.stringify(deploymentConfiguration(env)).includes(value));
  const child = deploymentEnvironment(env);
  assert.equal(child.RESEND_API_KEY, undefined);
  assert.equal(child.PEGASOFT_TURNSTILE_SECRET, undefined);
  const prepare = await readFile(
      new URL('../tools/prepare-deployment.mjs', import.meta.url),
      'utf8',
    ),
    deploy = await readFile(
      new URL('../tools/run-deploy.mjs', import.meta.url),
      'utf8',
    );
  assert.ok(!prepare.includes('secrets.json'));
  assert.ok(!deploy.includes('--secrets-file'));
  assert.ok(!deploy.includes('provisionWorkerSecrets'));
});
test('preprovisioned encrypted metadata passes using only the existing Cloudflare deployment credential and GET', async () => {
  const env = environment();
  let calls = 0;
  const result = await verifyWorkerSecrets(env, async (url, request) => {
    calls++;
    assert.ok(
      url.endsWith(
        `/workers/scripts/${env.PEGASOFT_INTAKE_WORKER_NAME}/settings`,
      ),
    );
    assert.equal(request.method, 'GET');
    assert.equal(request.body, undefined);
    assert.equal(
      request.headers.Authorization,
      'Bearer synthetic-deploy-token',
    );
    assert.equal(request.redirect, 'error');
    return Response.json(metadata());
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.requiredSecretNames, names);
  assert.equal(env.RESEND_API_KEY, undefined);
});
test('missing, duplicate or plain-text credentials fail closed without echoing provider values', async () => {
  for (const change of [
    (data) => data.result.bindings.pop(),
    (data) => (data.result.bindings[0].type = 'plain_text'),
    (data) =>
      data.result.bindings.push({
        ...data.result.bindings[0],
        text: 'private-echo',
      }),
  ]) {
    const data = metadata();
    change(data);
    await assert.rejects(
      verifyWorkerSecrets(environment(), async () => Response.json(data)),
      (error) =>
        error.message.includes('owner provisioning') &&
        !error.message.includes('private-echo'),
    );
  }
});
test('unapproved metadata access and network/JSON/provider failures are gated and redacted', async () => {
  let calls = 0;
  await assert.rejects(
    verifyWorkerSecrets(
      { ...environment(), PEGASOFT_INTAKE_DEPLOY_READY: '' },
      async () => {
        calls++;
      },
    ),
  );
  assert.equal(calls, 0);
  for (const fetcher of [
    async () => {
      throw Error('echoed private token');
    },
    async () => new Response('echoed private token', { status: 200 }),
    async () => new Response('echoed private token', { status: 403 }),
    async () => Response.json({ success: false }),
  ])
    await assert.rejects(
      verifyWorkerSecrets(environment(), fetcher),
      (error) => !error.message.includes('echoed') && error.cause === undefined,
    );
});
test('workflow retains no Resend or Turnstile secret copy and does not create/update Worker keys', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/pegasoft-intake.yml', import.meta.url),
    'utf8',
  );
  assert.ok(!workflow.includes('secrets.RESEND_API_KEY'));
  assert.ok(!workflow.includes('secrets.PEGASOFT_TURNSTILE_SECRET'));
  assert.ok(workflow.includes('secrets.CLOUDFLARE_INTAKE_API_TOKEN'));
});
