import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const basePath = 'docs/hero-reference/repairs/s5/';
const originalPath =
  basePath + 'runs/d57a6900-b9bd-4d36-9668-4817c0012e59/profiles.json';
const correctionPath =
  basePath + 'runs/91a2ab9b-cf6d-471e-afc6-3ef9a1b5aa01/profiles.json';
const read = (path) => JSON.parse(readFileSync(path));
const pin = (path) => {
  const b = readFileSync(path);
  return {
    path,
    bytes: b.length,
    sha256: createHash('sha256').update(b).digest('hex'),
  };
};
const old = read(originalPath),
  fixed = read(correctionPath);
assert.equal(old.failures.length, 35);
assert.equal(fixed.failures.length, 0);
assert.equal(old.errors.length, 0);
assert.equal(fixed.errors.length, 0);
assert.equal(fixed.correctionOf, old.runId);
assert.deepEqual(old.implementation.before, old.implementation.after);
assert.deepEqual(old.implementation.before, fixed.implementation.before);
assert.deepEqual(fixed.implementation.before, fixed.implementation.after);
const oldMac = old.rows
  .map((r, index) => ({ r, index }))
  .filter(({ r }) => r.device === 'mac-no-touchend' && r.coarse);
assert.equal(oldMac.length, 14);
const correctionLinks = old.failures.map((failure, failureOrdinal) => {
  if (failureOrdinal < 28) {
    assert.equal(failure.device, 'mac-no-touchend');
    assert.equal(
      failure.label,
      failureOrdinal % 2 ? 'pointer authority' : 'backing',
    );
    const original = oldMac[Math.floor(failureOrdinal / 2)];
    assert.equal(original.r.width, failure.width);
    if (failureOrdinal % 2 === 0) assert.equal(original.r.h, failure.h);
    const correctedRowIndex = fixed.rows.findIndex(
      (r) =>
        r.device === 'mac-no-touchend' &&
        r.coarse &&
        r.width === original.r.width &&
        r.h === original.r.h,
    );
    assert.notEqual(correctedRowIndex, -1);
    const c = fixed.rows[correctedRowIndex];
    assert.equal(c.actual.touchEnd, false);
    assert.equal(c.actual.pointerFine, false);
    assert.equal(c.actual.pointerTrail, 'true');
    assert.deepEqual(c.actual.backing, c.expectedBacking);
    return {
      failureOrdinal,
      originalRowIndex: original.index,
      correctedRowIndex,
      kind: 'synthetic-capability-correction',
      originalRequestedNativePreconditionMet: false,
      correctedInput:
        'Native hasTouch=false plus explicit synthetic coarse matchMedia capability; no rendering outputs injected',
      mapping:
        failureOrdinal % 2
          ? 'Original failure omitted height; linked by paired backing/pointer assertion ordinal and source loop order, not by width alone'
          : 'Exact width/height plus assertion ordinal',
      status: 'corrected-synthetic-input-pass; native combination not claimed',
    };
  }
  assert.equal(failure.label, 'resize physical mapping');
  assert.equal(failure.source, true);
  const originalResizeIndex = old.resize.findIndex(
    (r) =>
      r.source &&
      r.width === failure.width &&
      r.height === failure.height &&
      r.orientation === failure.orientation,
  );
  const correctedResizeIndex = fixed.resize.findIndex(
    (r) =>
      r.source &&
      r.width === failure.width &&
      r.height === failure.height &&
      r.orientation === failure.orientation,
  );
  assert.notEqual(originalResizeIndex, -1);
  assert.notEqual(correctedResizeIndex, -1);
  const c = fixed.resize[correctedResizeIndex];
  assert.ok(Math.abs(c.actual.sceneTarget - failure.expectedTarget) < 1e-6);
  const trace = c.actual.sourceTrace.main.at(-1);
  assert.equal(trace.target, c.actual.sceneTarget);
  assert.equal(trace.scrollY, c.actual.scrollY);
  return {
    failureOrdinal,
    originalResizeIndex,
    correctedResizeIndex,
    kind: 'source-live-trace-correction',
    status: 'passed',
    oldField: 'state.scroll (stale export)',
    newField: 'window.__heroTrace.main last entry with physical scroll linkage',
  };
});
for (const run of [old, fixed])
  for (const artifact of run.artifacts) {
    const actual = pin(artifact.path);
    assert.equal(actual.sha256, artifact.sha256);
    assert.equal(actual.bytes, artifact.bytes);
  }
for (const source of fixed.resize.filter((r) => r.source)) {
  const local = fixed.resize.find(
    (r) =>
      !r.source &&
      r.width === source.width &&
      r.height === source.height &&
      r.orientation === source.orientation,
  );
  assert.deepEqual(source.actual.backing, local.actual.backing);
  assert.deepEqual(source.actual.display, local.actual.display);
  assert.equal(source.actual.sceneTarget, local.actual.sceneTarget);
  const aspect =
    local.actual.frame.camera.projectionMatrix[5] /
    local.actual.frame.camera.projectionMatrix[0];
  assert.ok(Math.abs(aspect - source.actual.sourceCamera.aspect) < 1e-6);
  assert.ok(
    Math.abs(
      local.actual.frame.camera.fovDegrees - source.actual.sourceCamera.fov,
    ) < 1e-6,
  );
}
const evidence = {
  schemaVersion: 1,
  status: 'implemented-evidence-verified-awaiting-independent-review',
  original: pin(originalPath),
  correction: pin(correctionPath),
  runtimeInputsIdentical: true,
  originalFailuresPreserved: 35,
  correctedFailureLinks: correctionLinks,
  coverage: {
    originalRows: old.rows.length,
    originalLocalPolicyRows: 196,
    correctedSyntheticPolicyRows: 14,
    sourceBackingProfiles: 5,
    subOneDprRows: 2,
    sourceLocalResizePairs: 7,
    pureProfileTests: 146,
    nativeMacNoTouchendCoarseCoverage:
      'Not claimed: Chromium couples hasTouch and ontouchend; synthetic capability input plus pure tests cover resolver behavior.',
  },
  qualification:
    'Profile predicates/backing/cache only. No graphics, readiness, native mobile browser, production or S7 acceptance.',
};
writeFileSync(
  new URL('./coverage-accounting.json', import.meta.url),
  JSON.stringify(evidence, null, 2) + '\n',
);
const artifacts = [
  ...new Set([
    originalPath,
    correctionPath,
    ...old.artifacts.map((a) => a.path),
    ...fixed.artifacts.map((a) => a.path),
    basePath + 'source-segments.json',
    basePath + 'regression-results.json',
    basePath + 'coverage-accounting.json',
    basePath + 'probe-profiles.mjs',
    basePath + 'prove-regressions.mjs',
    basePath + 'qualify-evidence.mjs',
    basePath + 'README.md',
  ]),
].map(pin);
writeFileSync(
  new URL('./artifact-manifest.json', import.meta.url),
  JSON.stringify(
    {
      schemaVersion: 1,
      status: 'awaiting-independent-review',
      scope:
        'S5 profile repair evidence; captured shared runtime is immutable even if subsequent S3 work advances',
      runtime: old.implementation.before,
      artifacts,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    linkedFailures: correctionLinks.length,
    artifacts: artifacts.length,
    resizePairs: 7,
  }),
);
