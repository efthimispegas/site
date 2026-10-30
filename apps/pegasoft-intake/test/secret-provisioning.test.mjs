import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deploymentConfiguration } from '../tools/deployment-config.mjs';
import {
  deploymentEnvironment,
  provisionWorkerSecrets,
} from '../tools/secret-provisioning.mjs';
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
    RESEND_API_KEY: 'synthetic-resend-token',
    PEGASOFT_TURNSTILE_SECRET: 'synthetic-challenge-secret',
  };
}
test('generated configuration cannot serialize credentials; child process receives no runtime secrets', async () => {
  const env = environment(),
    config = deploymentConfiguration(env);
  const serialized = JSON.stringify(config);
  for (const value of [
    env.CLOUDFLARE_API_TOKEN,
    env.RESEND_API_KEY,
    env.PEGASOFT_TURNSTILE_SECRET,
  ])
    assert.ok(!serialized.includes(value));
  const child = deploymentEnvironment(env);
  assert.equal(child.RESEND_API_KEY, undefined);
  assert.equal(child.PEGASOFT_TURNSTILE_SECRET, undefined);
  const prepare = await readFile(
    new URL('../tools/prepare-deployment.mjs', import.meta.url),
    'utf8',
  );
  const deploy = await readFile(
    new URL('../tools/run-deploy.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(!prepare.includes('secrets.json'));
  assert.ok(!deploy.includes('--secrets-file'));
});
test('secret provisioning uses authenticated memory-only provider PUTs to the disabled Worker', async () => {
  const env = environment(),
    names = [];
  const result = await provisionWorkerSecrets(env, async (url, request) => {
    assert.ok(
      url.endsWith(
        `/workers/scripts/${env.PEGASOFT_INTAKE_WORKER_NAME}/secrets`,
      ),
    );
    assert.equal(request.method, 'PUT');
    assert.equal(request.redirect, 'error');
    assert.ok(request.signal);
    assert.equal(
      request.headers.Authorization,
      `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    );
    const body = JSON.parse(request.body);
    assert.equal(body.text, env[body.name]);
    assert.notEqual(body.name, 'CLOUDFLARE_API_TOKEN');
    names.push(body.name);
    return Response.json({ success: true });
  });
  assert.deepEqual(result.secretNames, names);
  assert.ok(names.includes('RESEND_API_KEY'));
});
test('provisioning gate and generic errors prevent unapproved writes and provider detail leakage', async () => {
  let calls = 0;
  await assert.rejects(
    provisionWorkerSecrets(
      { ...environment(), PEGASOFT_INTAKE_DEPLOY_READY: '' },
      async () => {
        calls++;
      },
    ),
  );
  assert.equal(calls, 0);
  await assert.rejects(
    provisionWorkerSecrets(
      environment(),
      async () => new Response('private echoed credential', { status: 403 }),
    ),
    (error) => !error.message.includes('echoed'),
  );
});

test('network and malformed provider JSON errors are always redacted', async () => {
  for (const fetcher of [
    async () => {
      throw Error('echoed private token');
    },
    async () => new Response('echoed private token', { status: 200 }),
    async () =>
      Response.json({ success: false, errors: ['echoed private token'] }),
  ]) {
    await assert.rejects(
      provisionWorkerSecrets(environment(), fetcher),
      (error) => {
        assert.equal(
          error.message,
          'Private secret provisioning failed; provider details withheld',
        );
        assert.equal(error.cause, undefined);
        return true;
      },
    );
  }
});
