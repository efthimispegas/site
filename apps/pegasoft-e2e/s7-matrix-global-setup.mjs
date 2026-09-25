import { workspaceRoot } from '@nx/devkit';
import { resolve } from 'node:path';

import { beginEvidenceAttempt } from './src/s7-evidence-harness.mjs';

export default async function globalSetup() {
  const runDirArgument = process.env.S7_MATRIX_RUN_DIR;
  if (!runDirArgument) {
    throw new Error('S7_MATRIX_RUN_DIR must select a fresh pinned evidence plan');
  }
  await beginEvidenceAttempt(resolve(workspaceRoot, runDirArgument), undefined, {
    resume: process.env.S7_MATRIX_RESUME === '1',
  });
}
