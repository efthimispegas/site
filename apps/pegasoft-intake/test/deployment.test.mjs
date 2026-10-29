import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentFixture } from './deployment-fixture.mjs';
import {
  deploymentConfiguration,
  deploymentGate,
} from '../tools/deployment-config.mjs';
import { verifyProvider } from '../tools/provider-verification.mjs';

test('deployment disables intake/public endpoints and never copies API credentials', () => {
  const config = deploymentConfiguration({
    ...deploymentFixture,
    CLOUDFLARE_API_TOKEN: 'must-not-copy',
    PEGASOFT_RATE_LIMIT_SALT: 'synthetic-salt',
  });
  assert.equal(config.expected.vars.PEGASOFT_INTAKE_ENABLED, 'false');
  assert.match(
    config.toml,
    /workers_dev = false\npreview_urls = false\nroutes = \[\]/,
  );
  assert.match(config.toml, /destination_address = "recipient@example.test"/);
  assert.deepEqual(config.secrets, {
    PEGASOFT_RATE_LIMIT_SALT: 'synthetic-salt',
  });
  assert.ok(!JSON.stringify(config).includes('must-not-copy'));
  assert.ok(!config.toml.includes('synthetic-salt'));
});
test('deployment rejects activation, wrong retention/residency and malformed configuration', () => {
  for (const override of [
    { PEGASOFT_INTAKE_ENABLED: 'true' },
    { PEGASOFT_CV_RETENTION_DAYS: '31' },
    { PEGASOFT_R2_JURISDICTION: 'default' },
    { PEGASOFT_MAX_CV_BYTES: '6000000' },
    { PEGASOFT_INTAKE_WORKER_NAME: '../another-worker' },
    {
      PEGASOFT_INTAKE_RECIPIENT:
        'recipient@example.test\nBcc: other@example.test',
    },
    { PEGASOFT_INTAKE_ORIGINS: 'http://intake.example' },
    { PEGASOFT_TURNSTILE_VERIFY_URL: 'https://other.example/verify' },
  ])
    assert.throws(() =>
      deploymentConfiguration({ ...deploymentFixture, ...override }),
    );
});
test('deployment gate permits only ready manual main workflows pinned to the same SHA', () => {
  const env = {
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: 'a'.repeat(40),
    PEGASOFT_SOURCE_REVISION: 'a'.repeat(40),
    PEGASOFT_INTAKE_DEPLOY_READY: 'true',
    CLOUDFLARE_API_TOKEN: 'synthetic-token',
  };
  assert.doesNotThrow(() => deploymentGate(env));
  for (const override of [
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_ACTIONS: 'false' },
    { PEGASOFT_INTAKE_DEPLOY_READY: '' },
    { PEGASOFT_SOURCE_REVISION: 'b'.repeat(40) },
    { CLOUDFLARE_API_TOKEN: '' },
  ])
    assert.throws(() => deploymentGate({ ...env, ...override }));
});
function providerFixture() {
  const expected = deploymentConfiguration(deploymentFixture).expected;
  const replies = {
    '/settings': {
      bindings: [
        ...Object.entries(expected.vars).map(([name, text]) => ({
          name,
          text,
          type: 'plain_text',
        })),
        {
          name: 'PRIVATE_APPLICATIONS',
          type: 'r2_bucket',
          bucket_name: expected.bucket,
          jurisdiction: 'eu',
        },
        {
          name: 'EMAIL',
          type: 'send_email',
          destination_address: expected.vars.PEGASOFT_INTAKE_RECIPIENT,
        },
        {
          name: 'LIMITER',
          type: 'ratelimit',
          namespace_id: expected.namespace,
          simple: { limit: expected.limit, period: 60 },
        },
      ],
    },
    '/subdomain': { enabled: false, previews_enabled: false },
    '/schedules': { schedules: [{ cron: expected.cron }] },
  };
  const calls = [];
  const options = {
    expected,
    token: 'synthetic-token',
    apiOrigin: 'https://api.cloudflare.com',
    fetcher: async (url, request) => {
      assert.equal(request.headers.Authorization, 'Bearer synthetic-token');
      const path = '/' + url.split('/').at(-1);
      calls.push(path);
      return Response.json({ success: true, result: replies[path] });
    },
  };
  return { replies, calls, options };
}
test('provider verification reads source revision, private bindings, endpoint flags and expiry schedule', async () => {
  const f = providerFixture();
  assert.deepEqual(await verifyProvider(f.options), {
    revision: deploymentFixture.PEGASOFT_SOURCE_REVISION,
    enabled: false,
    workersDevEnabled: false,
    previewUrlsEnabled: false,
    settingsVerified: true,
    deliveryVerified: false,
  });
  assert.deepEqual(f.calls, ['/settings', '/subdomain', '/schedules']);
});
test('provider verification rejects unsafe or mismatched remote state without reading CVs', async () => {
  for (const change of [
    (f) => {
      f.replies['/subdomain'].enabled = true;
    },
    (f) => {
      f.replies['/settings'].bindings.push({
        name: 'UNEXPECTED_SECRET',
        type: 'secret_text',
      });
    },
    (f) => {
      f.replies['/settings'].observability = { enabled: true };
    },
    (f) => {
      f.replies['/settings'].bindings.find(
        (b) => b.name === 'PRIVATE_APPLICATIONS',
      ).bucket_name = 'wrong-bucket';
    },
    (f) => {
      f.replies['/settings'].bindings.find(
        (b) => b.name === 'PEGASOFT_SOURCE_REVISION',
      ).text = 'c'.repeat(40);
    },
    (f) => {
      f.replies['/schedules'].schedules = [];
    },
    (f) => {
      f.options.apiOrigin = 'https://other.example';
    },
    (f) => {
      f.options.fetcher = async () =>
        new Response('private provider error', { status: 403 });
    },
  ]) {
    const f = providerFixture();
    change(f);
    await assert.rejects(
      verifyProvider(f.options),
      (error) => !error.message.includes('private provider error'),
    );
    assert.ok(
      f.calls.every((path) =>
        ['/settings', '/subdomain', '/schedules'].includes(path),
      ),
    );
  }
});
