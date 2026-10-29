import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from 'node:process';
import { deploymentGate } from './deployment-config.mjs';
import { verifyProvider } from './provider-verification.mjs';
deploymentGate(env);
const root = resolve(import.meta.dirname, '../../../dist/apps/pegasoft-intake');
const expected = JSON.parse(
  await readFile(resolve(root, 'expected.json'), 'utf8'),
);
const result = await verifyProvider({
  expected,
  token: env.CLOUDFLARE_API_TOKEN,
  apiOrigin: env.CLOUDFLARE_API_ORIGIN,
});
await writeFile(resolve(root, 'verification.json'), JSON.stringify(result), {
  mode: 0o600,
});
