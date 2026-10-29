import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { env, loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { deploymentConfiguration } from './deployment-config.mjs';
const local = resolve(import.meta.dirname, '../.env');
if (existsSync(local)) loadEnvFile(local);
const config = deploymentConfiguration(env);
const output = resolve(
  import.meta.dirname,
  '../../../dist/apps/pegasoft-intake',
);
await mkdir(output, { recursive: true });
for (const [name, value] of [
  ['wrangler.toml', config.toml],
  ['secrets.json', JSON.stringify(config.secrets)],
  ['expected.json', JSON.stringify(config.expected)],
])
  await writeFile(resolve(output, name), value, { mode: 0o600 });
