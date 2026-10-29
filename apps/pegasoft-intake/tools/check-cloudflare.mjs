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
await writeFile(
  resolve(output, 'wrangler-test.toml'),
  deploymentConfiguration(deploymentFixture).toml,
);
// A dry run uses synthetic configuration and receives no deployment credential.
const childEnv = { ...env };
for (const key of [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_API_KEY',
  'CLOUDFLARE_EMAIL',
])
  delete childEnv[key];
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
    resolve(output, 'wrangler-test.toml'),
    '--outdir',
    resolve(output, 'bundle'),
  ],
  { env: childEnv, stdio: 'inherit' },
);
exit(result.status ?? 1);
