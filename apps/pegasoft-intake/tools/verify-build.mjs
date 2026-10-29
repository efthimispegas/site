import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const destination = resolve(
  import.meta.dirname,
  '../../..',
  'dist/apps/pegasoft-intake',
);
for (const name of ['worker.js', 'intake.js']) {
  assert.deepEqual(
    await readFile(resolve(destination, name)),
    await readFile(resolve(import.meta.dirname, '../src', name)),
    `Built ${name} must match its reviewed source`,
  );
}
const { default: worker } = await import(
  pathToFileURL(resolve(destination, 'worker.js'))
);
assert.equal(typeof worker.fetch, 'function');
assert.equal(typeof worker.scheduled, 'function');
const unavailable = await worker.fetch(
  new Request('https://intake.example/api/intake', { method: 'POST' }),
  { PEGASOFT_INTAKE_PATH: '/api/intake' },
);
assert.equal(
  unavailable.status,
  503,
  'Built Worker must fail closed before configuration',
);
let cleanup;
worker.scheduled(
  {},
  {
    PRIVATE_APPLICATIONS: {
      list: async () => ({ objects: [], truncated: false }),
    },
  },
  {
    waitUntil: (promise) => {
      cleanup = promise;
    },
  },
);
assert.ok(
  cleanup instanceof Promise,
  'Scheduled cleanup must be retained by the Worker context',
);
await cleanup;
