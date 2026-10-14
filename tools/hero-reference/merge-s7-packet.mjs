import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const runRelative = process.argv[2];
if (!runRelative) throw new Error('usage: node tools/hero-reference/merge-s7-packet.mjs <run-dir>');
const runDir = resolve(root, runRelative);

const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const fileRecord = async (path) => ({
  path: relative(root, path),
  bytes: (await stat(path)).size,
  sha256: await digest(path),
});

const plan = JSON.parse(await readFile(resolve(runDir, 'plan.json'), 'utf8'));
const attempt = JSON.parse(await readFile(resolve(runDir, 'attempt.json'), 'utf8'));
const shardNames = (await readdir(resolve(runDir, 'shards'))).filter((name) => name.endsWith('.json')).sort();
const shards = await Promise.all(shardNames.map(async (name) => {
  const path = resolve(runDir, 'shards', name);
  const shard = JSON.parse(await readFile(path, 'utf8'));
  const results = shard.results ?? [];
  return {
    ...(await fileRecord(path)),
    shardId: shard.shardId,
    profile: shard.profile,
    state: shard.state,
    fatal: shard.fatal,
    counts: {
      total: results.length,
      passed: results.filter(({ status }) => status === 'pass').length,
      notApplicable: results.filter(({ status }) => status === 'not-applicable').length,
      failed: results.filter(({ status }) => status === 'fail').length,
    },
  };
}));

const imagePaths = new Set();
for (const name of shardNames) {
  const shard = JSON.parse(await readFile(resolve(runDir, 'shards', name), 'utf8'));
  for (const result of shard.results ?? []) for (const image of result.rawImages ?? []) imagePaths.add(resolve(root, image.path));
}
const images = await Promise.all([...imagePaths].sort().map(fileRecord));
const playwrightResults = await fileRecord(resolve(runDir, 'playwright-results.json'));
const counts = {
  total: shards.reduce((sum, shard) => sum + shard.counts.total, 0),
  applicable: shards.reduce((sum, shard) => sum + shard.counts.passed + shard.counts.failed, 0),
  passed: shards.reduce((sum, shard) => sum + shard.counts.passed, 0),
  failed: shards.reduce((sum, shard) => sum + shard.counts.failed, 0),
  notApplicable: shards.reduce((sum, shard) => sum + shard.counts.notApplicable, 0),
};
const manifest = {
  schemaVersion: 1,
  status: 'complete-observed-awaiting-independent-review',
  runId: plan.runId,
  planHash: plan.planHash,
  attemptId: attempt.attemptId,
  planPath: relative(root, resolve(runDir, 'plan.json')),
  attemptPath: relative(root, resolve(runDir, 'attempt.json')),
  buildArtifact: plan.buildArtifact,
  buildMode: plan.buildMode,
  restorationContract: plan.restorationContract,
  matrixAccounting: plan.matrixAccounting,
  observedCounts: counts,
  planGroups: plan.groups,
  shards,
  artifacts: { playwrightResults, rawImages: images, rawImageCount: images.length },
  qualification: {
    qualifiedApplicableBrowserCells: 0,
    independentReview: 'pending-usage-gate',
    acceptanceStatus: 'not-accepted',
  },
  limitations: [
    'Observed packet is complete and strict validation passed; observations are not accepted cells until independent S7 review completes.',
    'Shipping production/context-loss evidence remains a separate check and is not replaced by the diagnostics matrix.',
    'Raw captures and applied-frame evidence do not establish final visual fidelity.',
  ],
};
await writeFile(resolve(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ runId: plan.runId, planHash: plan.planHash, counts, shards: shards.length, rawImages: images.length }));
