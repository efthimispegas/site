import { spawnSync } from 'node:child_process';
import { env, exit, stdout, stderr } from 'node:process';
import { resolve } from 'node:path';
import { deploymentGate } from './deployment-config.mjs';
import {
  verifyWorkerSecrets,
  deploymentEnvironment,
} from './worker-secrets.mjs';
deploymentGate(env);
await verifyWorkerSecrets(env);
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
    '--no-autoconfig',
    '--tag',
    env.GITHUB_SHA.slice(0, 8),
    '--message',
    env.GITHUB_SHA,
  ],
  { stdio: 'pipe', env: deploymentEnvironment(env) },
);
if (result.status !== 0) {
  stderr.write('Worker deployment failed; provider output withheld.\n');
  exit(result.status ?? 1);
}
await verifyWorkerSecrets(env);
stdout.write(
  'Worker deployed; required preprovisioned secret metadata verified.\n',
);
