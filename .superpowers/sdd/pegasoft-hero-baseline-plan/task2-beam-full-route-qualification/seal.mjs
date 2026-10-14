import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const root = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-beam-full-route-qualification';
const readJson = async p => JSON.parse(await readFile(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const pin = async path => { const b = await readFile(path); return { path, bytes: b.length, sha256: hash(b) }; };
const inputs = await readJson(`${root}/input-pins.json`);
for (const p of inputs) assert.deepEqual(await pin(p.path), p);
const prior = await readJson('.superpowers/sdd/pegasoft-hero-baseline-plan/task2-profile-ambiguity-refinement/review-packet.json');
for (const name of ['screen-profile-diagnostics.mjs', 'screen-structural-features.mjs']) {
  const reviewed = prior.inputs.find(p => p.path.endsWith(`/after/${name}`));
  assert.equal((await pin(`${root}/snapshots/${name}`)).sha256, reviewed.sha256);
}
const summary = await readJson(`${root}/summary.json`);
assert.equal(summary.rawImagePins, 6);
assert.equal(summary.labelledSections, 27);
assert.equal(summary.diagnosticObserved, 5);
assert.equal(summary.diagnosticBlocked, 22);
assert.equal(summary.backgroundChecks.length, 6);
for (const background of summary.backgroundChecks) {
  assert.equal(background.status, 'blocked');
  assert.equal(background.maximumAbsoluteResidual, 0);
}
assert.ok(summary.challenges.every(c => c.qualification === 'blocked'));
const checks = {
  schemaVersion: 1, status: 'pending-packet-repeatability',
  rawImageAuthorityPins: { status: 'pass', count: 6, authority: 'Historical anchors and capture manifest; no current provenance claim' },
  dependencies: { status: 'pass', count: 2, result: 'Frozen snapshots match latest independently reviewed refinement revision' },
  challengeEvaluation: { status: 'pass', labelledSections: 27, observedDiagnostic: 5, blockedDiagnostic: 22, qualified: 0 },
  blankControls: { status: 'pass', count: 6, maximumAbsoluteResidual: 0, limit: 'Finite producer labels; no calibration claim' },
  labelAudit: { status: 'pass', evidence: 'label-audit.json', independentReview: 'pending-root-commissioned-review' },
  reproducibility: { status: 'pending', expectedOutputs: 15, command: `node ${root}/evaluate.mjs --verify` },
  qualification: 'blocked',
  scope: { sourceTestRuntimeDocsChanges: 0, newCaptures: 0, gatesChanged: false, masksBorrowed: false },
  testsTypecheckLint: { status: 'not-required', reason: 'Evidence-only packet importing frozen dependencies; no production source or tests changed' }
};
async function paths(path) {
  const result = [];
  for (const e of await readdir(path, { withFileTypes: true })) {
    const p = `${path}/${e.name}`;
    result.push(...(e.isDirectory() ? await paths(p) : [p]));
  }
  return result;
}
async function seal(complete) {
  await writeFile(`${root}/checks.json`, JSON.stringify(checks, null, 2) + '\n');
  const inputPaths = new Set(inputs.map(p => p.path));
  const artifacts = [];
  for (const p of (await paths(root)).sort()) {
    if (p !== `${root}/review-packet.json` && !inputPaths.has(p)) artifacts.push(await pin(p));
  }
  await writeFile(`${root}/review-packet.json`, JSON.stringify({
    schemaVersion: 1, packetComplete: complete,
    scope: 'Full-route beam challenge and calibration feasibility; qualification blocked',
    inputs, artifacts, checksPath: `${root}/checks.json`, outcomePath: `${root}/outcome.json`,
    reproductionCommand: `node ${root}/evaluate.mjs --verify`,
    independentReview: 'pending-root-commissioned-review'
  }, null, 2) + '\n');
}
function verify() {
  const run = spawnSync(process.execPath, [`${root}/evaluate.mjs`, '--verify'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout);
  assert.equal(result.reproducibleOutputs, 15);
  assert.equal(result.qualification, 'blocked');
  return run.stdout;
}
await seal(false);
const output = verify();
await writeFile(`${root}/verification.log`, output);
checks.status = 'pass-with-qualification-blocked';
checks.reproducibility.status = 'pass';
checks.reproducibility.evidence = 'verification.log';
checks.reproducibility.result = 'All 15 outputs recomputed byte-for-byte from immutable dependency snapshots and pinned raw rasters';
await seal(true);
process.stdout.write(verify());
