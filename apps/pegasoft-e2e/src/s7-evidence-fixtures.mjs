import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  S7_EVIDENCE_SCHEMA_VERSION,
  S7_CAPTURE_REPETITIONS,
  loadRepairMatrixContract,
} from './s7-evidence-harness.mjs';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export function syntheticSha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function syntheticPlan() {
  const { entryModes, makeRepairMatrix, profiles, states } =
    await loadRepairMatrixContract();
  const cells = makeRepairMatrix();
  const plan = {
    schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
    runId: 'synthetic-s7-run',
    planHash: 'synthetic-s7-plan',
    runDir: 'run',
    restorationContract: 'restoration-reachability-amendment-v1',
    matrixAccounting: { total: 360, applicable: 336, notApplicable: 24 },
    deterministicInputs: {
      captureRepetitions: S7_CAPTURE_REPETITIONS,
      profileOrder: profiles.map(({ id }) => id),
      stateOrder: states.map(([state]) => state),
      entryModeOrder: [...entryModes],
    },
    shards: profiles.flatMap(({ id: profile }) =>
      states.map(([state]) => ({
        id: `${profile}--${state}`,
        profile,
        state,
        expectedCellIds: cells
          .filter((cell) => cell.profile === profile && cell.state === state)
          .map(({ id }) => id),
      })),
    ),
  };
  return { plan, cells };
}

export async function syntheticPacket(root) {
  const { plan, cells } = await syntheticPlan();
  await mkdir(root, { recursive: true });
  const sha256 = syntheticSha256(PNG);
  const attempt = {
    schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
    attemptId: 'synthetic-attempt',
    runId: plan.runId,
    planHash: plan.planHash,
  };
  let frameId = 0;
  const imagePaths = [];
  const shards = [];
  for (const shard of plan.shards) {
    const results = [];
    for (const id of shard.expectedCellIds) {
      const expected = cells.find((cell) => cell.id === id);
      if (expected.status === 'not-applicable') {
        results.push({ id, status: expected.status, reason: expected.reason });
        continue;
      }
      frameId += 1;
      const fieldElapsedMs =
        expected.state === 'field-pulse-a'
          ? 300
          : expected.state === 'field-pulse-b'
            ? 2_800
            : 0;
      const target = expected.sceneSelection ?? 0;
      const observed = {
        renderedAtMs: frameId,
        appliedFrame: {
          renderedAtMs: frameId,
          frame: {
            frameId,
            target,
            rendered: { value: target },
            fieldElapsedMs,
          },
          appliedConsumers: { world: { frameId } },
        },
      };
      const rawImages = [];
      for (
        let repetition = 1;
        repetition <= S7_CAPTURE_REPETITIONS;
        repetition += 1
      ) {
        const imagePath = `${plan.runDir}/images/${shard.id}/${id.replaceAll('/', '--')}--repeat-${repetition}.png`;
        await mkdir(resolve(root, imagePath, '..'), { recursive: true });
        await writeFile(resolve(root, imagePath), PNG);
        imagePaths.push(imagePath);
        rawImages.push({ path: imagePath, sha256 });
      }
      const restorationEvidence =
        expected.entryMode === 'native-restored'
          ? {
              navigation: 'genuine-non-hero-away-back',
              awayUrl: '/privacy?s7-away=1',
              restoredUrl: '/',
              expectedScrollY: 100,
              preNavigationScrollY: 100,
              restoredScrollY: 100,
              postBackScrollCorrection: false,
              firstEligible: observed,
            }
          : null;
      results.push({
        id,
        status: 'pass',
        selectedContract:
          expected.state === 'field-contact' &&
          expected.entryMode === 'native-restored'
            ? plan.restorationContract
            : null,
        rawImages,
        observed,
        restorationEvidence,
      });
    }
    shards.push({
      schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
      runId: plan.runId,
      planHash: plan.planHash,
      attemptId: attempt.attemptId,
      shardId: shard.id,
      profile: shard.profile,
      state: shard.state,
      expectedCellIds: shard.expectedCellIds,
      fatal: null,
      results,
    });
  }
  return { plan, attempt, shards, imagePaths };
}

export function clonePacket(packet) {
  return structuredClone(packet);
}
