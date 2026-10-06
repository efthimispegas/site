import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  finalizeCaptureRun,
  initializeCaptureRun,
  readCaptureRun,
  recordCaptureOutcome,
  type CaptureRunContext,
} from './hero-capture-run';

const provenance = {
  buildId: 'diagnostics-build',
  inputTreeSha256: 'a'.repeat(64),
};
let root: string;

test.beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'hero-capture-artifacts-'));
});

test.afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function artifacts(
  context: CaptureRunContext,
  state: string,
  runId = context.runId,
) {
  await writeFile(
    path.join(context.outputRoot, 'implementation', `${state}.png`),
    'image',
  );
  await writeFile(
    path.join(context.outputRoot, 'measurements', `${state}.json`),
    JSON.stringify({ runId, stateKey: state }),
  );
}

test('restart_preserves_run_artifacts', async () => {
  const context = await initializeCaptureRun(
    root,
    ['landing', 'field'],
    provenance,
  );
  await artifacts(context, 'landing');
  await recordCaptureOutcome(context, { state: 'landing', status: 'complete' });
  const restarted = await readCaptureRun(context.contextPath);
  expect(restarted.runId).toBe(context.runId);
  expect(
    await readFile(
      path.join(restarted.outputRoot, 'implementation/landing.png'),
      'utf8',
    ),
  ).toBe('image');
  await artifacts(restarted, 'field');
  await recordCaptureOutcome(restarted, { state: 'field', status: 'complete' });
  expect((await finalizeCaptureRun(restarted)).status).toBe('complete');
});

test('capture_run_preserves_historical_and_concurrent_outputs', async () => {
  const historical = path.join(root, 'test-output/hero-reference/recording');
  await mkdir(historical, { recursive: true });
  await writeFile(path.join(historical, 'earlier.png'), 'earlier');
  const first = await initializeCaptureRun(root, ['landing'], provenance);
  const second = await initializeCaptureRun(root, ['landing'], provenance);
  expect(second.runId).not.toBe(first.runId);
  expect(second.outputRoot).not.toBe(first.outputRoot);
  expect(await readFile(first.contextPath, 'utf8')).toContain(first.runId);
  expect(await readFile(path.join(historical, 'earlier.png'), 'utf8')).toBe(
    'earlier',
  );
});

test('capture_run_failed_and_missing_states_are_explicit', async () => {
  const context = await initializeCaptureRun(
    root,
    ['landing', 'field'],
    provenance,
  );
  await recordCaptureOutcome(context, {
    state: 'landing',
    status: 'failed',
    error: 'frame did not settle',
  });
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('failed');
  expect(manifest.missingStates).toEqual(['field']);
  expect(manifest.failures).toContainEqual(
    expect.objectContaining({
      state: 'landing',
      reason: 'frame did not settle',
    }),
  );
  expect(
    JSON.parse(
      await readFile(
        path.join(context.outputRoot, 'capture-manifest.json'),
        'utf8',
      ),
    ),
  ).toEqual(manifest);
});

test('capture_run_complete_manifest_hashes_all_artifacts', async () => {
  const context = await initializeCaptureRun(root, ['landing'], provenance);
  await artifacts(context, 'landing');
  await writeFile(path.join(context.outputRoot, 'input-log.json'), '[]');
  await recordCaptureOutcome(context, {
    state: 'landing',
    status: 'complete',
    artifacts: ['input-log.json'],
  });
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('complete');
  expect(manifest.schemaVersion).toBe(7);
  expect(manifest.runId).toBe(context.runId);
  expect(manifest.states[0]).toEqual({
    key: 'landing',
    implementation: {
      path: 'implementation/landing.png',
      bytes: 5,
      sha256: createHash('sha256').update('image').digest('hex'),
    },
    measurement: expect.objectContaining({ path: 'measurements/landing.json' }),
  });
  expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual(
    expect.arrayContaining([
      'capture-run.json',
      'implementation/landing.png',
      'measurements/landing.json',
      'input-log.json',
    ]),
  );
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(path.join(context.outputRoot, artifact.path));
    expect(artifact.sha256).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
    expect(artifact.bytes).toBe(bytes.length);
  }
});

test('capture_run_missing_or_changed_artifact_cannot_complete', async () => {
  const context = await initializeCaptureRun(root, ['landing'], provenance);
  await artifacts(context, 'landing');
  await recordCaptureOutcome(context, { state: 'landing', status: 'complete' });
  await writeFile(
    path.join(context.outputRoot, 'implementation/landing.png'),
    'replaced',
  );
  await rm(path.join(context.outputRoot, 'measurements/landing.json'));
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('failed');
  expect(
    manifest.failures.map((failure) => failure.reason).join(' '),
  ).toContain('changed');
  expect(
    manifest.failures.map((failure) => failure.reason).join(' '),
  ).toContain('missing');
});

test('capture_run_foreign_measurement_identity_cannot_complete', async () => {
  const context = await initializeCaptureRun(root, ['landing'], provenance);
  await artifacts(context, 'landing', 'another-run');
  await recordCaptureOutcome(context, { state: 'landing', status: 'complete' });
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('failed');
  expect(manifest.failures).toContainEqual(
    expect.objectContaining({
      state: 'landing',
      reason: expect.stringContaining('runId'),
    }),
  );
});

test('capture_run_failure_survives_later_success', async () => {
  const context = await initializeCaptureRun(root, ['landing'], provenance);
  await recordCaptureOutcome(context, {
    state: 'landing',
    status: 'failed',
    error: 'worker crashed',
  });
  await artifacts(context, 'landing');
  await recordCaptureOutcome(await readCaptureRun(context.contextPath), {
    state: 'landing',
    status: 'complete',
  });
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('failed');
  expect(manifest.failures).toContainEqual(
    expect.objectContaining({ reason: 'worker crashed' }),
  );
});

test('capture_run_failed_manifest_hashes_empty_partial_artifacts', async () => {
  const context = await initializeCaptureRun(root, ['landing'], provenance);
  await writeFile(
    path.join(context.outputRoot, 'implementation/landing.png'),
    '',
  );
  await recordCaptureOutcome(context, {
    state: 'landing',
    status: 'failed',
    artifacts: ['implementation/landing.png'],
    error: 'interrupted screenshot',
  });
  const manifest = await finalizeCaptureRun(context);
  expect(manifest.status).toBe('failed');
  expect(manifest.artifacts).toContainEqual({
    path: 'implementation/landing.png',
    bytes: 0,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });
});
