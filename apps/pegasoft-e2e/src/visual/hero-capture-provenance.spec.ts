import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildCaptureProvenance,
  type CaptureProvenanceInput,
} from './hero-capture-provenance';
import {
  initializeCaptureRun,
  recordCaptureOutcome,
  finalizeCaptureRun,
} from './hero-capture-run';

const projectRoot = path.resolve(__dirname, '../..');
const runRoot = path.join(
  projectRoot,
  'test-output/hero-reference/runs/31515db9-ab30-430e-9721-669be939d945',
);
const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

async function fixture() {
  const artifactBytes = await Promise.all(
    ['implementation/field-contact.png', 'measurements/field-contact.json'].map(
      async (relativePath) => ({
        relativePath,
        bytes: await readFile(path.join(runRoot, relativePath)),
      }),
    ),
  );
  const measurement = JSON.parse(artifactBytes[1].bytes.toString());
  const context = JSON.parse(
    await readFile(path.join(runRoot, 'capture-run.json'), 'utf8'),
  );
  const input: CaptureProvenanceInput = {
    context,
    state: 'field-contact',
    measurement,
    artifacts: artifactBytes.map(({ relativePath, bytes }) => ({
      path: relativePath,
      bytes: bytes.length,
      sha256: hash(bytes),
    })),
    sourceIdentity: {
      siteUrl: 'https://vectrfl.com',
      bundleSha256: 'b'.repeat(64),
      recordingSha256: 'c'.repeat(64),
    },
    implementationIdentity: {
      gitRevision: 'fixture-revision',
      trackedDiffSha256: 'd'.repeat(64),
      untrackedInputFiles: [],
    },
    environment: {
      browserName: 'chromium',
      browserVersion: 'fixture-browser',
      node: process.version,
    },
    fontEvidence: [
      {
        family: 'Fixture font',
        loaded: true,
        verifiedVersion: 'fixture-version',
      },
    ],
    profile: {
      captureLabel: 'recording-desktop',
      pointerClass: 'fine',
      isIos: false,
      reducedMotion: false,
    },
    physical: {
      scrollY: 2478,
      effectiveHeroHeight: 761,
      measurementSequence: 3,
    },
    build: {
      mode: 'test-enabled-production',
      startupCommand: 'fixture-startup',
    },
  };
  return { input, measurement, artifactBytes };
}

test('provenance_saved_field_contact_passes_independent_validator_pins', async () => {
  const { input, artifactBytes } = await fixture();
  const provenance = buildCaptureProvenance(input);
  const contractUrl = pathToFileURL(
    path.resolve(
      projectRoot,
      '../../tools/hero-reference/measurement-contract.mjs',
    ),
  ).href;
  const { validateCaptureProvenance } = await import(contractUrl);
  const result = validateCaptureProvenance({
    provenance,
    expected: {
      runId: '31515db9-ab30-430e-9721-669be939d945',
      stateId: 'field-contact',
      gitRevision: 'fixture-revision',
      trackedDiffSha256: 'd'.repeat(64),
      untrackedInputFiles: [],
      bundleSha256: 'b'.repeat(64),
      recordingSha256: 'c'.repeat(64),
      captureLabel: 'recording-desktop',
      captureFrameId: 266,
      profile: {
        viewportWidth: 1508,
        viewportHeight: 761,
        screenshotDpr: 2,
        canvasCssWidth: 1508,
        canvasCssHeight: 761,
        canvasBackingWidth: 2639,
        canvasBackingHeight: 1331,
        canvasDprX: 2639 / 1508,
        canvasDprY: 1331 / 761,
        pointerClass: 'fine',
        isIos: false,
        reducedMotion: false,
      },
      artifacts: artifactBytes.map(({ relativePath, bytes }) => ({
        relativePath,
        bytes: bytes.length,
        sha256: hash(bytes),
      })),
    },
    artifacts: artifactBytes,
    inputArtifacts: [],
  });
  expect(result).toEqual({ status: 'pass', failures: [], blockers: [] });
  expect(provenance).toMatchObject({
    applied: {
      frameId: 266,
      renderedProgress: 0.7383965076654941,
      camera: { position: [5.8648807253506945, 66, 75] },
      effects: {
        fieldPulse: { elapsedMs: 224, ratio: 0.6132169221831383 },
        arrival: { elapsedMs: 0, active: false },
      },
    },
  });
});

test('provenance_stale_camera_readback_rejected', async () => {
  const { input, measurement } = await fixture();
  measurement.captureObservation.record.appliedConsumers.camera.frameId = 265;
  expect(() => buildCaptureProvenance(input)).toThrow(/camera.*frame/u);
});

test('provenance_missing_route_readback_rejected', async () => {
  const { input, measurement } = await fixture();
  delete measurement.captureObservation.record.appliedConsumers['red-feeder-2'];
  expect(() => buildCaptureProvenance(input)).toThrow(/red-feeder-2/u);
});

test('provenance_acknowledgment_without_actual_object_readback_rejected', async () => {
  const { input, measurement } = await fixture();
  measurement.captureObservation.record.appliedConsumers.camera.readback = {};
  expect(() => buildCaptureProvenance(input)).toThrow(/camera/u);
});

test('provenance_field_clock_disagrees_with_completed_frame_rejected', async () => {
  const { input, measurement } = await fixture();
  measurement.captureObservation.record.appliedConsumers.field.readback.clockElapsedMs = 0;
  expect(() => buildCaptureProvenance(input)).toThrow(/field.*clock/u);
});

test('provenance_unknown_physical_height_is_not_guessed_from_viewport', async () => {
  const { input } = await fixture();
  input.physical.effectiveHeroHeight = Number.NaN;
  expect(() => buildCaptureProvenance(input)).toThrow(/effectiveHeroHeight/u);
});

test('provenance_saved_journey_exit_preserves_material_readback_roundtrip', async () => {
  const { input } = await fixture();
  const files = await Promise.all(
    ['implementation/journey-exit.png', 'measurements/journey-exit.json'].map(
      async (relativePath) => ({
        relativePath,
        bytes: await readFile(path.join(runRoot, relativePath)),
      }),
    ),
  );
  const measurement = JSON.parse(files[1].bytes.toString());
  input.state = 'journey-exit';
  input.measurement = measurement;
  input.physical.scrollY = measurement.scroll.y;
  input.physical.measurementSequence =
    measurement.captureObservation.record.frame.measurementSequence;
  input.artifacts = files.map(({ relativePath, bytes }) => ({
    path: relativePath,
    bytes: bytes.length,
    sha256: hash(bytes),
  }));
  const actualRatio =
    measurement.captureObservation.record.appliedConsumers.arrival.readback
      .activationRatio;
  expect(buildCaptureProvenance(input).applied.effects.arrival.ratio).toBe(
    actualRatio,
  );
});

test('provenance_survives_durable_outcome_and_manifest_finalization', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hero-provenance-'));
  try {
    const { input, measurement, artifactBytes } = await fixture();
    input.context = await initializeCaptureRun(root, ['field-contact'], {
      buildId: input.context.buildId,
      inputTreeSha256: input.context.inputTreeSha256,
    });
    measurement.runId = input.context.runId;
    const currentArtifacts = [
      artifactBytes[0],
      {
        relativePath: 'measurements/field-contact.json',
        bytes: Buffer.from(JSON.stringify(measurement)),
      },
    ];
    for (const artifact of currentArtifacts)
      await writeFile(
        path.join(input.context.outputRoot, artifact.relativePath),
        artifact.bytes,
      );
    input.artifacts = currentArtifacts.map(({ relativePath, bytes }) => ({
      path: relativePath,
      bytes: bytes.length,
      sha256: hash(bytes),
    }));
    const captureProvenance = buildCaptureProvenance(input);
    await recordCaptureOutcome(input.context, {
      state: 'field-contact',
      status: 'complete',
      captureProvenance,
    });
    const manifest = await finalizeCaptureRun(input.context);
    expect(manifest.status).toBe('complete');
    expect(manifest.outcomes[0].captureProvenance).toEqual(captureProvenance);
    expect(manifest.states[0].captureProvenance).toEqual(captureProvenance);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
