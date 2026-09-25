import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const S7_EVIDENCE_SCHEMA_VERSION = 1;
export const S7_RESTORATION_CONTRACT =
  'restoration-reachability-amendment-v1';
export const S7_CAPTURE_REPETITIONS = 2;
export const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
let matrixContractPromise;
export function loadRepairMatrixContract() {
  matrixContractPromise ??= import(
    pathToFileURL(
      resolve(
        workspaceRoot,
        'docs/hero-reference/repairs/s0/contracts/repair-matrix.mjs',
      ),
    ).href
  );
  return matrixContractPromise;
}

const IMPLEMENTATION_ROOTS = [
  'apps/pegasoft/src/app/shared/hero-scene',
];
const IMPLEMENTATION_FILES = [
  'apps/pegasoft/src/app/shared/pegasoft-home.tsx',
  'apps/pegasoft/src/app/shared/pegasoft-home.module.css',
];
const CONTRACT_FILES = [
  'docs/hero-reference/repairs/s0/contracts/repair-matrix.mjs',
  'docs/hero-reference/repairs/s7/restoration-reachability-amendment-v1-draft.md',
  'docs/hero-reference/repairs/s7/restoration-reachability-amendment-v1-review.md',
];

// Sprint summaries are mutable status records. Keep them out of the sealed
// contract hash so a handover/status update cannot invalidate runtime
// evidence. Normative matrix and restoration-contract files remain hashed.
export const S7_CONTRACT_FILES = [...CONTRACT_FILES];
const REFERENCE_FILES = [
  'docs/hero-reference/live/source-evidence.json',
  'docs/hero-reference/recording-measurement-amendments-v1.json',
  'docs/vectrfl_recording.mov',
];
const CONFIG_FILES = [
  'apps/pegasoft-e2e/project.json',
  'apps/pegasoft-e2e/playwright.s7.matrix.config.ts',
  'apps/pegasoft-e2e/s7-matrix-global-setup.mjs',
  'apps/pegasoft-e2e/src/hero-s7-matrix.spec.ts',
  'apps/pegasoft-e2e/src/s7-evidence-harness.mjs',
  'apps/pegasoft/next.config.js',
  'apps/pegasoft/project.json',
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function sha256File(path) {
  return sha256(await readFile(path));
}

async function walkFiles(rootPath, predicate = () => true) {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = resolve(rootPath, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path, predicate)));
    else if (entry.isFile() && predicate(path)) files.push(path);
  }
  return files;
}

async function existingFiles(paths, root) {
  const files = [];
  for (const item of paths) {
    const absolute = resolve(root, item);
    const metadata = await stat(absolute);
    if (metadata.isDirectory()) files.push(...(await walkFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

async function hashFileSet(paths, root) {
  const unique = [...new Set(paths.map((path) => resolve(path)))].sort();
  const files = [];
  for (const path of unique) {
    files.push({
      path: relative(root, path),
      bytes: (await stat(path)).size,
      sha256: await sha256File(path),
    });
  }
  return {
    sha256: sha256(
      files.map(({ path, bytes, sha256: digest }) => `${path}\0${bytes}\0${digest}\n`).join(''),
    ),
    files,
  };
}

async function hashGroup(paths, root) {
  return hashFileSet(await existingFiles(paths, root), root);
}

async function hashBuild(buildRoot, root) {
  const files = await walkFiles(
    buildRoot,
    (path) => !path.includes('/cache/'),
  );
  assert(files.length > 0, `diagnostics build is empty: ${buildRoot}`);
  return hashFileSet(files, root);
}

export async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export class CellAssertionError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'CellAssertionError';
  }
}

export async function cellAssertion(operation) {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      (error instanceof Error && error.name === 'AbortError') ||
      /test timeout|target (page|context|browser).*closed|browser has been closed|context has been closed|worker process exited|interrupted/i.test(
        message,
      )
    ) {
      throw error;
    }
    throw new CellAssertionError(
      message,
      { cause: error },
    );
  }
}

export function classifyExecutionError(
  error,
  { pageClosed = false, contextClosed = false, aborted = false } = {},
) {
  if (error instanceof CellAssertionError) return 'cell-assertion';
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  if (
    aborted ||
    pageClosed ||
    contextClosed ||
    name === 'AbortError' ||
    /test timeout|timeout of \d+ms exceeded|target (page|context|browser).*closed|page\.\w+:.*closed|browser has been closed|context has been closed|worker process exited|interrupted/i.test(
      message,
    )
  ) {
    return 'fatal-runner';
  }
  return 'fatal-runner';
}

export async function executeShardCells({
  cells,
  executeCell,
  persist,
  fatalContext = () => ({}),
}) {
  const results = [];
  for (const cell of cells) {
    try {
      results.push(await executeCell(cell));
      await persist({ results: [...results], fatal: null });
    } catch (error) {
      const errorKind = classifyExecutionError(error, fatalContext());
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorKind === 'fatal-runner') {
        const fatal = { cellId: cell.id, errorKind, error: errorMessage };
        await persist({ results: [...results], fatal });
        throw error;
      }
      results.push({
        ...cell,
        status: 'fail',
        errorKind,
        error: errorMessage,
      });
      await persist({ results: [...results], fatal: null });
    }
  }
  return results;
}

async function withinCleanupDeadline(operation, label, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} cleanup exceeded ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function closeShardResources({ page, context, timeoutMs = 5_000 }) {
  const failures = [];
  if (page && !page.isClosed()) {
    await withinCleanupDeadline(() => page.close(), 'page', timeoutMs).catch(
      (error) => failures.push(error),
    );
  }
  if (context) {
    await withinCleanupDeadline(() => context.close(), 'context', timeoutMs).catch(
      (error) => failures.push(error),
    );
  }
  if (failures.length > 0) throw new AggregateError(failures, 'resource cleanup failed');
}

export async function beginEvidenceAttempt(runDir, providedPlan, { resume = false } = {}) {
  const plan = providedPlan ?? (await loadEvidencePlan(runDir));
  if (resume) {
    const attempt = await loadEvidenceAttempt(runDir);
    assert.equal(attempt.schemaVersion, S7_EVIDENCE_SCHEMA_VERSION);
    assert.equal(attempt.runId, plan.runId, 'resume refused: attempt runId differs from plan');
    assert.equal(
      attempt.planHash,
      plan.planHash,
      'resume refused: attempt planHash differs from plan',
    );
    return attempt;
  }
  for (const directory of ['shards', 'images', 'playwright-output']) {
    const target = resolve(runDir, directory);
    try {
      const entries = await readdir(target);
      assert.equal(entries.length, 0, `fresh attempt refused: ${directory} is not empty`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const attempt = {
    schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
    attemptId: randomUUID(),
    runId: plan.runId,
    planHash: plan.planHash,
    startedAtUtc: new Date().toISOString(),
  };
  const attemptPath = resolve(runDir, 'attempt.json');
  const handle = await open(attemptPath, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(attempt, null, 2)}\n`);
  } finally {
    await handle.close();
  }
  return attempt;
}

export async function loadEvidenceAttempt(runDir) {
  return JSON.parse(await readFile(resolve(runDir, 'attempt.json'), 'utf8'));
}

function shardId(profile, state) {
  return `${profile}--${state}`;
}

function expectedShardPlan(cells, profiles, states) {
  return profiles.flatMap(({ id: profile }) =>
    states.map(([state]) => ({
      id: shardId(profile, state),
      profile,
      state,
      expectedCellIds: cells
        .filter((cell) => cell.profile === profile && cell.state === state)
        .map((cell) => cell.id),
    })),
  );
}

export async function createEvidencePlan({
  runDir,
  root = workspaceRoot,
  buildRoot = resolve(root, 'apps/pegasoft/.next-s7-diagnostics'),
  runId = `s7-${new Date().toISOString().replaceAll(/[:.]/gu, '-')}`,
}) {
  const {
    entryModes,
    makeRepairMatrix,
    profiles,
    states,
    validateRepairMatrix,
  } = await loadRepairMatrixContract();
  const cells = makeRepairMatrix();
  validateRepairMatrix(cells);
  const implementationFiles = [
    ...(await existingFiles(IMPLEMENTATION_ROOTS, root)).filter((path) =>
      /\.(?:css|ts|tsx)$/u.test(path),
    ),
    ...(await existingFiles(IMPLEMENTATION_FILES, root)),
  ];
  const groups = {
    build: await hashBuild(buildRoot, root),
    implementation: await hashFileSet(implementationFiles, root),
    testContract: await hashGroup(CONTRACT_FILES, root),
    reference: await hashGroup(REFERENCE_FILES, root),
    runnerConfig: await hashGroup(CONFIG_FILES, root),
  };
  const plan = {
    schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
    runId,
    createdAtUtc: new Date().toISOString(),
    runDir: relative(root, runDir),
    buildArtifact: relative(root, buildRoot),
    buildMode: 'test-enabled-production',
    restorationContract: S7_RESTORATION_CONTRACT,
    matrixAccounting: { total: 360, applicable: 336, notApplicable: 24 },
    deterministicInputs: {
      locale: 'en-US',
      timezoneId: 'UTC',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      captureRepetitions: S7_CAPTURE_REPETITIONS,
      profileOrder: profiles.map(({ id }) => id),
      stateOrder: states.map(([state]) => state),
      entryModeOrder: [...entryModes],
    },
    groups,
    shards: expectedShardPlan(cells, profiles, states),
  };
  plan.planHash = sha256(JSON.stringify(plan));
  await atomicWriteJson(resolve(runDir, 'plan.json'), plan);
  return plan;
}

export async function loadEvidencePlan(runDir) {
  const plan = JSON.parse(await readFile(resolve(runDir, 'plan.json'), 'utf8'));
  const { planHash, ...unsigned } = plan;
  assert.equal(planHash, sha256(JSON.stringify(unsigned)), 'plan hash mismatch');
  return plan;
}

async function validateFileGroup(group, root, label) {
  assert(group && Array.isArray(group.files), `missing ${label} provenance group`);
  const current = await hashFileSet(
    group.files.map(({ path }) => resolve(root, path)),
    root,
  );
  assert.equal(current.sha256, group.sha256, `stale or mixed ${label} inputs`);
}

export async function validatePlanInputs(plan, root = workspaceRoot) {
  for (const label of [
    'build',
    'implementation',
    'testContract',
    'reference',
    'runnerConfig',
  ]) {
    await validateFileGroup(plan.groups[label], root, label);
  }
}

async function assertPng(path) {
  const metadata = await sharp(path, { failOn: 'error' }).metadata();
  assert.equal(metadata.format, 'png', `not a PNG: ${path}`);
  const decoded = await sharp(path, { failOn: 'error' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.format, 'raw');
  assert(decoded.info.width > 0 && decoded.info.height > 0, `empty PNG: ${path}`);
}

function assertCommittedFrame(expected, result) {
  const record = result.observed?.appliedFrame;
  const frame = record?.frame;
  assert(Number.isInteger(frame?.frameId) && frame.frameId > 0, `${expected.id} invalid frame ID`);
  assert(Number.isFinite(result.observed?.renderedAtMs) && result.observed.renderedAtMs > 0, `${expected.id} invalid render timestamp`);
  assert(Number.isFinite(frame.target), `${expected.id} invalid target`);
  assert(Number.isFinite(frame.rendered?.value), `${expected.id} invalid rendered value`);
  const capturesContactPhase =
    expected.state === 'field-contact' && expected.entryMode !== 'native-restored';
  if (!capturesContactPhase) {
    assert(Math.abs(frame.target - frame.rendered.value) <= 0.002, `${expected.id} target/rendered mismatch`);
  }
  if (expected.sceneSelection !== null) {
    assert(Math.abs(frame.target - expected.sceneSelection) <= 0.002, `${expected.id} selected a different target`);
  }
  const consumers = Object.values(record.appliedConsumers ?? {});
  assert(consumers.length > 0, `${expected.id} missing applied consumers`);
  assert(consumers.every((consumer) => consumer.frameId === frame.frameId), `${expected.id} consumer frame mismatch`);
  if (expected.state === 'field-contact' && expected.entryMode !== 'native-restored') {
    assert(Number.isFinite(frame.fieldElapsedMs) && frame.fieldElapsedMs >= 0 && frame.fieldElapsedMs < 300, `${expected.id} invalid contact clock`);
  }
  if (expected.state === 'field-pulse-a') {
    assert(Number.isFinite(frame.fieldElapsedMs) && frame.fieldElapsedMs >= 300 && frame.fieldElapsedMs < 1_600, `${expected.id} invalid pulse-A clock`);
  }
  if (expected.state === 'field-pulse-b') {
    assert(Number.isFinite(frame.fieldElapsedMs) && frame.fieldElapsedMs >= 2_800, `${expected.id} invalid pulse-B clock`);
  }
}

function classifyFieldFamily(result) {
  const frame = result.observed.appliedFrame.frame;
  if (!(frame.target >= 0.72 && frame.target < 0.82)) return null;
  if (frame.fieldElapsedMs < 300) return 'field-contact';
  if (frame.fieldElapsedMs < 1_600) return 'field-pulse-a';
  return 'field-pulse-b';
}

function assertRestoration(expected, result) {
  if (expected.entryMode !== 'native-restored') return;
  const evidence = result.restorationEvidence;
  assert.equal(evidence?.navigation, 'genuine-non-hero-away-back', `${expected.id} lacks genuine restoration`);
  assert.equal(evidence?.postBackScrollCorrection, false, `${expected.id} used post-back correction`);
  assert(evidence.awayUrl && evidence.restoredUrl && evidence.awayUrl !== evidence.restoredUrl, `${expected.id} invalid away/back URLs`);
  assert(Math.abs(evidence.restoredScrollY - evidence.preNavigationScrollY) <= 1, `${expected.id} scroll was not restored`);
  assert(Math.abs(evidence.restoredScrollY - evidence.expectedScrollY) <= 1, `${expected.id} restored unexpected scroll`);
  if (expected.state === 'field-contact') {
    assert.equal(result.selectedContract, S7_RESTORATION_CONTRACT, `${expected.id} wrong restoration contract`);
    const first = evidence.firstEligible;
    assert(first, `${expected.id} missing first eligible frame`);
    assert.equal(first.appliedFrame?.frame?.frameId, result.observed.appliedFrame.frame.frameId, `${expected.id} first eligible frame changed`);
    assert.equal(first.renderedAtMs, result.observed.renderedAtMs, `${expected.id} first eligible timestamp changed`);
    assert(Number.isFinite(first.appliedFrame?.frame?.fieldElapsedMs) && first.appliedFrame.frame.fieldElapsedMs >= 0, `${expected.id} invalid restored field clock`);
    assert(['field-contact', 'field-pulse-a', 'field-pulse-b'].includes(classifyFieldFamily(result)), `${expected.id} left the field family`);
  }
}

export async function validateEvidencePacket({
  plan,
  attempt,
  shards,
  root = workspaceRoot,
  verifyCurrentInputs = true,
}) {
  if (verifyCurrentInputs) await validatePlanInputs(plan, root);
  const {
    entryModes,
    makeRepairMatrix,
    profiles,
    states,
    validateRepairMatrix,
  } = await loadRepairMatrixContract();
  assert.equal(attempt?.schemaVersion, S7_EVIDENCE_SCHEMA_VERSION, 'missing attempt record');
  assert.equal(attempt?.runId, plan.runId, 'attempt uses another run');
  assert.equal(attempt?.planHash, plan.planHash, 'attempt uses another plan');
  assert.equal(typeof attempt?.attemptId, 'string', 'missing attempt ID');
  assert.deepEqual(
    plan.matrixAccounting,
    { total: 360, applicable: 336, notApplicable: 24 },
    'matrix accounting must remain 360/336/24',
  );
  assert.deepEqual(
    plan.deterministicInputs.profileOrder,
    profiles.map(({ id }) => id),
    'profile order differs from the contract',
  );
  assert.deepEqual(
    plan.deterministicInputs.stateOrder,
    states.map(([state]) => state),
    'state order differs from the contract',
  );
  assert.deepEqual(
    plan.deterministicInputs.entryModeOrder,
    entryModes,
    'entry-mode order differs from the contract',
  );
  const expectedShardIds = new Set(plan.shards.map(({ id }) => id));
  assert.equal(expectedShardIds.size, 60, 'plan must contain 60 unique shards');
  const expectedCells = makeRepairMatrix();
  validateRepairMatrix(expectedCells);
  assert.deepEqual(
    plan.shards,
    expectedShardPlan(expectedCells, profiles, states),
    'plan shard partition differs from the S0 generator',
  );
  const planShardById = new Map(plan.shards.map((shard) => [shard.id, shard]));
  const actualShardIds = new Set();
  const allResults = [];
  for (const shard of shards) {
    assert.equal(shard.schemaVersion, S7_EVIDENCE_SCHEMA_VERSION);
    assert.equal(shard.runId, plan.runId, `mixed run in shard ${shard.shardId}`);
    assert.equal(shard.planHash, plan.planHash, `mixed plan in shard ${shard.shardId}`);
    assert.equal(shard.attemptId, attempt.attemptId, `mixed attempt in shard ${shard.shardId}`);
    assert(!actualShardIds.has(shard.shardId), `duplicate shard ${shard.shardId}`);
    actualShardIds.add(shard.shardId);
    assert(expectedShardIds.has(shard.shardId), `unexpected shard ${shard.shardId}`);
    const plannedShard = planShardById.get(shard.shardId);
    assert.equal(shard.profile, plannedShard.profile, `wrong profile in ${shard.shardId}`);
    assert.equal(shard.state, plannedShard.state, `wrong state in ${shard.shardId}`);
    assert.deepEqual(
      shard.expectedCellIds,
      plannedShard.expectedCellIds,
      `changed expected IDs in ${shard.shardId}`,
    );
    assert.deepEqual(
      shard.results.map(({ id }) => id),
      plannedShard.expectedCellIds,
      `missing, reordered, or unexpected cell IDs in ${shard.shardId}`,
    );
    assert.equal(shard.fatal, null, `fatal runner failure in ${shard.shardId}`);
    allResults.push(...shard.results);
  }
  assert.deepEqual([...actualShardIds].sort(), [...expectedShardIds].sort(), 'missing shards');
  const byId = new Map();
  const ownedImagePaths = new Set();
  for (const result of allResults) {
    assert(!byId.has(result.id), `duplicate cell ${result.id}`);
    byId.set(result.id, result);
  }
  assert.deepEqual(
    [...byId.keys()].sort(),
    expectedCells.map(({ id }) => id).sort(),
    'missing or unexpected cell IDs',
  );
  for (const expected of expectedCells) {
    const result = byId.get(expected.id);
    if (expected.status === 'not-applicable') {
      assert.equal(result.status, 'not-applicable', `${expected.id} changed N/A category`);
      assert.equal(result.reason, expected.reason, `${expected.id} changed N/A reason`);
      continue;
    }
    assert.equal(result.status, 'pass', `${expected.id} is not a pass`);
    assert.equal(result.errorKind, undefined, `${expected.id} retains an error kind`);
    assert.equal(
      result.rawImages?.length,
      plan.deterministicInputs.captureRepetitions,
      `${expected.id} capture count mismatch`,
    );
    for (let index = 0; index < result.rawImages.length; index += 1) {
      const image = result.rawImages[index];
      const expectedImagePath = relative(
        root,
        resolve(
          root,
          plan.runDir,
          'images',
          shardId(expected.profile, expected.state),
          `${expected.id.replaceAll('/', '--')}--repeat-${index + 1}.png`,
        ),
      );
      assert.equal(image.path, expectedImagePath, `${expected.id} noncanonical image path`);
      assert(!ownedImagePaths.has(image.path), `duplicate image ownership: ${image.path}`);
      ownedImagePaths.add(image.path);
      const imagePath = resolve(root, image.path);
      assert.equal(await sha256File(imagePath), image.sha256, `${expected.id} image hash mismatch`);
      await assertPng(imagePath);
    }
    assertCommittedFrame(expected, result);
    assertRestoration(expected, result);
  }
  const counts = {
    total: allResults.length,
    applicable: allResults.filter(({ status }) => status !== 'not-applicable').length,
    passed: allResults.filter(({ status }) => status === 'pass').length,
    failed: allResults.filter(({ status }) => status === 'fail').length,
    notApplicable: allResults.filter(({ status }) => status === 'not-applicable').length,
  };
  assert.deepEqual(counts, {
    total: 360,
    applicable: 336,
    passed: 336,
    failed: 0,
    notApplicable: 24,
  });
  return counts;
}

async function readShards(runDir) {
  const shardDir = resolve(runDir, 'shards');
  const names = (await readdir(shardDir)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(names.map(async (name) => JSON.parse(await readFile(resolve(shardDir, name), 'utf8'))));
}

async function main() {
  const [command, runDirArgument] = process.argv.slice(2);
  assert(command === 'create-plan' || command === 'validate', 'usage: s7-evidence-harness.mjs <create-plan|validate> <run-dir>');
  assert(runDirArgument, 'run directory is required');
  const runDir = resolve(workspaceRoot, runDirArgument);
  if (command === 'create-plan') {
    const plan = await createEvidencePlan({ runDir });
    console.log(JSON.stringify({ runId: plan.runId, planHash: plan.planHash, shards: plan.shards.length }));
    return;
  }
  const plan = await loadEvidencePlan(runDir);
  const counts = await validateEvidencePacket({
    plan,
    attempt: await loadEvidenceAttempt(runDir),
    shards: await readShards(runDir),
  });
  console.log(JSON.stringify({ runId: plan.runId, planHash: plan.planHash, counts }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
