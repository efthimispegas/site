import assert from 'node:assert/strict';
import { mkdir, mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import {
  CellAssertionError,
  beginEvidenceAttempt,
  cellAssertion,
  closeShardResources,
  executeShardCells,
  S7_CONTRACT_FILES,
  sha256File,
  validateEvidencePacket,
  validatePlanInputs,
} from './s7-evidence-harness.mjs';
import {
  clonePacket,
  syntheticSha256,
  syntheticPacket,
  syntheticPlan,
} from './s7-evidence-fixtures.mjs';

const tempRoot = () => mkdtemp(resolve(tmpdir(), 's7-evidence-test-'));
const rejects = (promise, pattern) => assert.rejects(promise, pattern);

test('test-contract provenance excludes mutable sprint summaries but keeps normative contracts', () => {
  assert(!S7_CONTRACT_FILES.includes('docs/hero-reference/repair-sprints.md'));
  assert.deepEqual(S7_CONTRACT_FILES, [
    'docs/hero-reference/repairs/s0/contracts/repair-matrix.mjs',
    'docs/hero-reference/repairs/s7/restoration-reachability-amendment-v1-draft.md',
    'docs/hero-reference/repairs/s7/restoration-reachability-amendment-v1-review.md',
  ]);
});

test('execution records genuine cell assertions and continues', async () => {
  const executed = [];
  const persisted = [];
  const results = await executeShardCells({
    cells: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    executeCell: async (cell) => {
      executed.push(cell.id);
      if (cell.id === 'b') throw new CellAssertionError('assertion failed');
      return { ...cell, status: 'pass' };
    },
    persist: async (state) => persisted.push(state),
  });
  assert.deepEqual(executed, ['a', 'b', 'c']);
  assert.equal(results[1].errorKind, 'cell-assertion');
  assert.equal(persisted.length, 3);
  assert.deepEqual(
    persisted.at(-1).results.map(({ id }) => id),
    ['a', 'b', 'c'],
  );
});

test('explicit predicate timeout becomes a cell assertion while test timeout stays fatal', async () => {
  await assert.rejects(
    cellAssertion(async () => {
      throw new Error('page.waitForFunction: Timeout 10000ms exceeded');
    }),
    CellAssertionError,
  );
  await assert.rejects(
    cellAssertion(async () => {
      throw new Error('Test timeout of 90000ms exceeded');
    }),
    (error) =>
      !(error instanceof CellAssertionError) &&
      /Test timeout/.test(error.message),
  );
});

for (const [label, error, fatalContext] of [
  ['timeout', new Error('test timeout after 10ms'), undefined],
  [
    'page closure',
    new Error('page.goto: Target page, context or browser has been closed'),
    { pageClosed: true },
  ],
  [
    'context closure',
    new Error('context has been closed'),
    { contextClosed: true },
  ],
  [
    'abort',
    Object.assign(new Error('cancelled'), { name: 'AbortError' }),
    undefined,
  ],
  [
    'filesystem I/O',
    Object.assign(new Error('write failed'), { code: 'EIO' }),
    undefined,
  ],
  [
    'unknown programming error',
    new TypeError('cannot read property'),
    undefined,
  ],
]) {
  test(`execution stops after ${label} and persists fatal result`, async () => {
    const executed = [];
    const persisted = [];
    await rejects(
      executeShardCells({
        cells: [{ id: 'a' }, { id: 'fatal' }, { id: 'later' }],
        executeCell: async (cell) => {
          executed.push(cell.id);
          if (cell.id === 'fatal') throw error;
          return { ...cell, status: 'pass' };
        },
        fatalContext: async () => fatalContext ?? {},
        persist: async (state) => persisted.push(state),
      }),
      error,
    );
    assert.deepEqual(executed, ['a', 'fatal']);
    assert.equal(persisted.length, 2);
    assert.equal(persisted.at(-1).fatal.cellId, 'fatal');
    assert.equal(persisted.at(-1).fatal.errorKind, 'fatal-runner');
  });
}

test('resource cleanup closes open page and context', async () => {
  const calls = [];
  const page = { isClosed: () => false, close: async () => calls.push('page') };
  const context = { close: async () => calls.push('context') };
  await closeShardResources({ page, context });
  assert.deepEqual(calls, ['page', 'context']);
});

test('resource cleanup has a short independent deadline', async () => {
  const started = Date.now();
  await assert.rejects(
    closeShardResources({
      page: {
        isClosed: () => false,
        close: () => new Promise(() => undefined),
      },
      context: { close: async () => undefined },
      timeoutMs: 10,
    }),
    (error) =>
      error instanceof AggregateError &&
      error.errors.some((item) => /cleanup exceeded 10ms/.test(item.message)),
  );
  assert(Date.now() - started < 200);
});

test('attempt creation rejects reuse and pre-existing evidence', async () => {
  const root = await tempRoot();
  const { plan } = await syntheticPlan();
  const runDir = resolve(root, plan.runDir);
  await mkdir(runDir, { recursive: true });
  const attempt = await beginEvidenceAttempt(runDir, plan);
  await rejects(beginEvidenceAttempt(runDir, plan), /EEXIST/);
  const other = await tempRoot();
  const dirtyRun = resolve(other, plan.runDir);
  await mkdir(resolve(dirtyRun, 'shards'), { recursive: true });
  await writeFile(resolve(dirtyRun, 'shards', 'old.json'), '{}');
  await rejects(beginEvidenceAttempt(dirtyRun, plan), /not empty/);

  const resumed = await beginEvidenceAttempt(runDir, plan, { resume: true });
  assert.equal(resumed.attemptId, attempt.attemptId);
  await rejects(
    beginEvidenceAttempt(
      runDir,
      { ...plan, planHash: 'different' },
      { resume: true },
    ),
    /planHash differs from plan/,
  );
});

test('validator accepts a complete synthetic packet without current-input checks', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  assert.deepEqual(
    await validateEvidencePacket({
      ...packet,
      root,
      verifyCurrentInputs: false,
    }),
    { total: 360, applicable: 336, passed: 336, failed: 0, notApplicable: 24 },
  );
});

test('validator rejects missing and duplicate shard IDs', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const missing = clonePacket(packet);
  missing.shards.pop();
  await rejects(
    validateEvidencePacket({ ...missing, root, verifyCurrentInputs: false }),
    /missing shards/,
  );
  const duplicate = clonePacket(packet);
  duplicate.shards[1].shardId = duplicate.shards[0].shardId;
  await rejects(
    validateEvidencePacket({ ...duplicate, root, verifyCurrentInputs: false }),
    /duplicate shard/,
  );
});

test('validator rejects mixed plan/run provenance', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const mixedRun = clonePacket(packet);
  mixedRun.shards[0].runId = 'another-run';
  await rejects(
    validateEvidencePacket({ ...mixedRun, root, verifyCurrentInputs: false }),
    /mixed run/,
  );
  const mixedPlan = clonePacket(packet);
  mixedPlan.shards[0].planHash = 'another-plan';
  await rejects(
    validateEvidencePacket({ ...mixedPlan, root, verifyCurrentInputs: false }),
    /mixed plan/,
  );
});

test('validator rejects missing, corrupt, and hash-mismatched PNG evidence', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  await unlink(resolve(root, packet.imagePaths[0]));
  await rejects(
    validateEvidencePacket({ ...packet, root, verifyCurrentInputs: false }),
    /ENOENT/,
  );

  const corruptRoot = await tempRoot();
  const corrupt = await syntheticPacket(corruptRoot);
  await writeFile(resolve(corruptRoot, corrupt.imagePaths[0]), 'not png');
  const corruptResult = corrupt.shards
    .find(({ results }) => results.some(({ status }) => status === 'pass'))
    .results.find(({ status }) => status === 'pass');
  corruptResult.rawImages[0].sha256 = syntheticSha256('not png');
  await rejects(
    validateEvidencePacket({
      ...corrupt,
      root: corruptRoot,
      verifyCurrentInputs: false,
    }),
    /png|image|input buffer|corrupt/i,
  );

  const mismatchRoot = await tempRoot();
  const mismatched = await syntheticPacket(mismatchRoot);
  mismatched.shards
    .find(({ results }) => results.some(({ status }) => status === 'pass'))
    .results.find(({ status }) => status === 'pass').rawImages[0].sha256 =
    '0'.repeat(64);
  await rejects(
    validateEvidencePacket({
      ...mismatched,
      root: mismatchRoot,
      verifyCurrentInputs: false,
    }),
    /hash mismatch/,
  );
});

test('validator rejects signature-only PNGs and reused or noncanonical image paths', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const signatureOnly = clonePacket(packet);
  const target = signatureOnly.shards
    .flatMap(({ results }) => results)
    .find(({ status }) => status === 'pass');
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  await writeFile(resolve(root, target.rawImages[0].path), signature);
  target.rawImages[0].sha256 = syntheticSha256(signature);
  await rejects(
    validateEvidencePacket({
      ...signatureOnly,
      root,
      verifyCurrentInputs: false,
    }),
    /png|image|input buffer|corrupt/i,
  );

  const reusedRoot = await tempRoot();
  const reused = await syntheticPacket(reusedRoot);
  const passing = reused.shards
    .flatMap(({ results }) => results)
    .filter(({ status }) => status === 'pass');
  passing[1].rawImages[0] = structuredClone(passing[0].rawImages[0]);
  await rejects(
    validateEvidencePacket({
      ...reused,
      root: reusedRoot,
      verifyCurrentInputs: false,
    }),
    /noncanonical|duplicate image/,
  );
});

test('validator rejects a valid non-PNG stored at a canonical PNG path', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const target = packet.shards
    .flatMap(({ results }) => results)
    .find(({ status }) => status === 'pass');
  const imagePath = resolve(root, target.rawImages[0].path);
  await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toFile(imagePath);
  target.rawImages[0].sha256 = await sha256File(imagePath);
  await rejects(
    validateEvidencePacket({ ...packet, root, verifyCurrentInputs: false }),
    /not a PNG/,
  );
});

test('validator rejects missing and duplicate cell IDs and changed N/A category', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const missing = clonePacket(packet);
  missing.shards.find(({ results }) => results.length === 6).results.pop();
  await rejects(
    validateEvidencePacket({ ...missing, root, verifyCurrentInputs: false }),
    /missing, reordered, or unexpected cell IDs/,
  );

  const duplicate = clonePacket(packet);
  const duplicateResults = duplicate.shards.find(
    ({ results }) => results.length === 6,
  ).results;
  duplicateResults[1].id = duplicateResults[0].id;
  await rejects(
    validateEvidencePacket({ ...duplicate, root, verifyCurrentInputs: false }),
    /missing, reordered, or unexpected cell IDs/,
  );

  const changedCategory = clonePacket(packet);
  const na = changedCategory.shards
    .flatMap(({ results }) => results)
    .find(({ status }) => status === 'not-applicable');
  na.status = 'pass';
  await rejects(
    validateEvidencePacket({
      ...changedCategory,
      root,
      verifyCurrentInputs: false,
    }),
    /changed N\/A category/,
  );
});

test('validator rejects target, rendered, and field-clock predicate failures', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const targetMismatch = clonePacket(packet);
  targetMismatch.shards
    .flatMap(({ results }) => results)
    .find(
      ({ id }) => id === 'landing/desktop/forward',
    ).observed.appliedFrame.frame.target = 0.25;
  await rejects(
    validateEvidencePacket({
      ...targetMismatch,
      root,
      verifyCurrentInputs: false,
    }),
    /target\/rendered mismatch|different target/,
  );

  const renderedMismatch = clonePacket(packet);
  renderedMismatch.shards
    .flatMap(({ results }) => results)
    .find(
      ({ id }) => id === 'landing/desktop/forward',
    ).observed.appliedFrame.frame.rendered.value = 0.25;
  await rejects(
    validateEvidencePacket({
      ...renderedMismatch,
      root,
      verifyCurrentInputs: false,
    }),
    /target\/rendered mismatch/,
  );

  const contactPhase = clonePacket(packet);
  contactPhase.shards
    .flatMap(({ results }) => results)
    .find(
      ({ id }) => id === 'field-contact/desktop/forward',
    ).observed.appliedFrame.frame.rendered.value = 0.25;
  await validateEvidencePacket({
    ...contactPhase,
    root,
    verifyCurrentInputs: false,
  });

  const clockMismatch = clonePacket(packet);
  clockMismatch.shards
    .flatMap(({ results }) => results)
    .find(
      ({ id }) => id === 'field-pulse-a/desktop/forward',
    ).observed.appliedFrame.frame.fieldElapsedMs = 1_700;
  await rejects(
    validateEvidencePacket({
      ...clockMismatch,
      root,
      verifyCurrentInputs: false,
    }),
    /invalid pulse-A clock/,
  );
});

test('validator rejects contract, scroll, first-eligible, and restored-clock failures', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const findRestored = (candidate) =>
    candidate.shards
      .flatMap(({ results }) => results)
      .find(({ id }) => id === 'field-contact/desktop/native-restored');

  const wrongContract = clonePacket(packet);
  findRestored(wrongContract).selectedContract = 'other';
  await rejects(
    validateEvidencePacket({
      ...wrongContract,
      root,
      verifyCurrentInputs: false,
    }),
    /wrong restoration contract/,
  );

  const wrongScroll = clonePacket(packet);
  findRestored(wrongScroll).restorationEvidence.restoredScrollY += 2;
  await rejects(
    validateEvidencePacket({
      ...wrongScroll,
      root,
      verifyCurrentInputs: false,
    }),
    /scroll was not restored/,
  );

  const wrongFirst = clonePacket(packet);
  findRestored(wrongFirst).restorationEvidence.firstEligible = structuredClone(
    findRestored(wrongFirst).restorationEvidence.firstEligible,
  );
  findRestored(
    wrongFirst,
  ).restorationEvidence.firstEligible.appliedFrame.frame.frameId += 1;
  await rejects(
    validateEvidencePacket({ ...wrongFirst, root, verifyCurrentInputs: false }),
    /first eligible frame changed/,
  );

  const wrongClock = clonePacket(packet);
  findRestored(wrongClock).observed.appliedFrame.frame.fieldElapsedMs = -1;
  findRestored(
    wrongClock,
  ).restorationEvidence.firstEligible.appliedFrame.frame.fieldElapsedMs = -1;
  await rejects(
    validateEvidencePacket({ ...wrongClock, root, verifyCurrentInputs: false }),
    /invalid restored field clock|left the field family/,
  );
});

test('validator rejects reordered IDs, cross-shard reassignment, and changed N/A', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const reordered = clonePacket(packet);
  reordered.shards[2].results.reverse();
  await rejects(
    validateEvidencePacket({ ...reordered, root, verifyCurrentInputs: false }),
    /reordered|unexpected cell IDs/,
  );

  const reassigned = clonePacket(packet);
  const left = reassigned.plan.shards.find(({ state }) => state === 'landing');
  const right = reassigned.plan.shards.find(
    ({ state }) => state === 'landing-idle',
  );
  [left.expectedCellIds[0], right.expectedCellIds[0]] = [
    right.expectedCellIds[0],
    left.expectedCellIds[0],
  ];
  const leftRecord = reassigned.shards.find(
    ({ shardId }) => shardId === left.id,
  );
  const rightRecord = reassigned.shards.find(
    ({ shardId }) => shardId === right.id,
  );
  leftRecord.expectedCellIds = [...left.expectedCellIds];
  rightRecord.expectedCellIds = [...right.expectedCellIds];
  await rejects(
    validateEvidencePacket({ ...reassigned, root, verifyCurrentInputs: false }),
    /partition differs/,
  );

  const changedNa = clonePacket(packet);
  const na = changedNa.shards
    .flatMap(({ results }) => results)
    .find(({ status }) => status === 'not-applicable');
  na.reason = 'changed';
  await rejects(
    validateEvidencePacket({ ...changedNa, root, verifyCurrentInputs: false }),
    /changed N\/A reason/,
  );
});

test('validator rejects mixed attempts and malformed committed/restoration evidence', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  const mixed = clonePacket(packet);
  mixed.shards[0].attemptId = 'old-attempt';
  await rejects(
    validateEvidencePacket({ ...mixed, root, verifyCurrentInputs: false }),
    /mixed attempt/,
  );

  const badFrame = clonePacket(packet);
  const passing = badFrame.shards
    .flatMap(({ results }) => results)
    .find(({ status }) => status === 'pass');
  passing.observed.appliedFrame.appliedConsumers.world.frameId += 1;
  await rejects(
    validateEvidencePacket({ ...badFrame, root, verifyCurrentInputs: false }),
    /consumer frame mismatch/,
  );

  const badRestoration = clonePacket(packet);
  const restored = badRestoration.shards
    .flatMap(({ results }) => results)
    .find(({ id }) => id === 'field-contact/desktop/native-restored');
  restored.restorationEvidence.postBackScrollCorrection = true;
  await rejects(
    validateEvidencePacket({
      ...badRestoration,
      root,
      verifyCurrentInputs: false,
    }),
    /post-back correction/,
  );
});

test('validator rejects packet accounting other than 360/336/24', async () => {
  const root = await tempRoot();
  const packet = await syntheticPacket(root);
  for (const [key, value] of [
    ['total', 359],
    ['applicable', 335],
    ['notApplicable', 23],
  ]) {
    const altered = clonePacket(packet);
    altered.plan.matrixAccounting[key] = value;
    await rejects(
      validateEvidencePacket({ ...altered, root, verifyCurrentInputs: false }),
      /matrix accounting|counts|360|336|24/,
    );
  }
});

for (const staleGroup of [
  'build',
  'implementation',
  'testContract',
  'reference',
  'runnerConfig',
]) {
  test(`validator independently rejects stale ${staleGroup} provenance`, async () => {
    const root = await tempRoot();
    const groups = {};
    for (const label of [
      'build',
      'implementation',
      'testContract',
      'reference',
      'runnerConfig',
    ]) {
      const file = `${label}.txt`;
      const contents = `pinned-${label}`;
      await writeFile(resolve(root, file), contents);
      const digest = syntheticSha256(contents);
      groups[label] = {
        sha256: syntheticSha256(
          `${file}\0${Buffer.byteLength(contents)}\0${digest}\n`,
        ),
        files: [
          { path: file, bytes: Buffer.byteLength(contents), sha256: digest },
        ],
      };
    }
    const plan = { groups };
    await validatePlanInputs(plan, root);
    await writeFile(resolve(root, `${staleGroup}.txt`), 'stale');
    await rejects(
      validatePlanInputs(plan, root),
      new RegExp(`stale or mixed ${staleGroup}`),
    );
  });
}
