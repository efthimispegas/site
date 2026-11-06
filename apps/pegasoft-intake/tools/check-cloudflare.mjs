import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { env, exit } from 'node:process';
import { deploymentFixture } from '../test/deployment-fixture.mjs';
import { deploymentConfiguration } from './deployment-config.mjs';
const output = resolve(
  import.meta.dirname,
  '../../../dist/apps/pegasoft-intake',
);
// A dry run uses synthetic configuration and receives no deployment credential.
const childEnv = { ...env };
for (const key of [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_API_KEY',
  'CLOUDFLARE_EMAIL',
])
  delete childEnv[key];
for (const [stage, overrides] of [
  ['disabled', {}],
  [
    'contact',
    {
      PEGASOFT_INTAKE_ENABLED: 'true',
      PEGASOFT_CONTACT_ACTIVATION_READY: 'true',
      PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'true',
      PEGASOFT_INTAKE_ZONE_ID: 'c'.repeat(32),
    },
  ],
]) {
  const file = resolve(output, `wrangler-${stage}-test.toml`);
  await writeFile(
    file,
    deploymentConfiguration({ ...deploymentFixture, ...overrides }).toml,
  );
  const result = spawnSync(
    'pnpm',
    [
      '--dir',
      resolve(import.meta.dirname, '../cloudflare-tooling'),
      'exec',
      'wrangler',
      'deploy',
      '--dry-run',
      '--no-autoconfig',
      '--config',
      file,
      '--outdir',
      resolve(output, 'bundle-' + stage),
    ],
    { env: childEnv, stdio: 'inherit' },
  );
  if (result.status !== 0) exit(result.status ?? 1);
}
