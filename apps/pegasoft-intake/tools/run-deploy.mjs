import { spawnSync } from 'node:child_process';
import { env, exit } from 'node:process';
import { resolve } from 'node:path';
import { deploymentGate } from './deployment-config.mjs';
deploymentGate(env);
const result = spawnSync(
  'pnpm',
  [
    '--dir',
    resolve(import.meta.dirname, '../cloudflare-tooling'),
    'exec',
    'wrangler',
    'deploy',
    '--config',
    resolve(
      import.meta.dirname,
      '../../../dist/apps/pegasoft-intake/wrangler.toml',
    ),
    '--secrets-file',
    resolve(
      import.meta.dirname,
      '../../../dist/apps/pegasoft-intake/secrets.json',
    ),
    '--no-autoconfig',
    '--tag',
    env.GITHUB_SHA.slice(0, 8),
    '--message',
    env.GITHUB_SHA,
  ],
  { stdio: 'inherit', env },
);
exit(result.status ?? 1);
