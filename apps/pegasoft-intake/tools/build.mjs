import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const destination = resolve(
  import.meta.dirname,
  '../../..',
  'dist/apps/pegasoft-intake',
);
await mkdir(destination, { recursive: true });
for (const name of ['worker.js', 'intake.js']) {
  await copyFile(
    resolve(import.meta.dirname, '../src', name),
    resolve(destination, name),
  );
}
