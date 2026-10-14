import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { measureBeamCrossSectionDiagnostic, measureExitBoundaryDiagnostic } from './after/screen-profile-diagnostics.mjs';
import { measureBeamCrossSectionDiagnostic as beforeBeam } from './before/screen-profile-diagnostics.mjs';

const root = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-profile-ambiguity-refinement';
const run = 'apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const json = async (p) => JSON.parse(await readFile(p));
const pins = await json(`${root}/input-pins.json`);
for (const p of pins) {
  const b = await readFile(p.path);
  assert.equal(hash(b), p.sha256, `Input changed: ${p.path}`);
  assert.equal(b.length, p.bytes);
}
const capture = await json(`${run}/capture-manifest.json`);
const anchors = await json('docs/hero-reference/recording-anchors.json');
const oldBeam = await json('.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/beam/diagnostic.json');
const oldExit = await json('.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/exit/diagnostics.json');
const profiles = [], exitFrames = [];
for (const key of ['arrival-lockup', 'journey-exit']) {
  const source = anchors.states.find((s) => s.key === key).anchor;
  const local = capture.states.find((s) => s.key === key).implementation;
  for (const role of ['source', 'local']) {
    const p = role === 'source' ? source.capturePath : `${run}/${local.path}`;
    const b = await readFile(p);
    assert.equal(hash(b), role === 'source' ? source.captureSha256 : local.sha256);
    const { data, info: image } = await sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (key === 'arrival-lockup') {
      for (const fixedCoordinate of [24, 80]) {
        const diagnostic = measureBeamCrossSectionDiagnostic({ data, image, dpr: 2,
          section: { axis: 'vertical', fixedCoordinate, stripWidth: 5,
            range: [600, 900], sidebands: [[600, 630], [870, 900]] },
          peakFractions: [0.5, 0.8, 0.9], residualThresholds: [3, 5, 10],
        });
        assert.equal(diagnostic.status, 'observed-diagnostic');
        assert.equal(diagnostic.qualification.status, 'blocked');
        const historical = oldBeam.profiles.find((p) => p.role === role && p.x === fixedCoordinate);
        assert.deepEqual(diagnostic.peakWidths[0].rasterBounds, historical.brightPeakHalfHeight.rasterBounds);
        assert.deepEqual(diagnostic.residualEnvelopes.map((e) => e.rasterBounds),
          historical.residualEnvelopes.map((e) => e.rasterBounds));
        profiles.push({ role, imagePath: p, diagnostic });
      }
    } else {
      // Saved arrival activation/wake opacity is not effective world opacity,
      // and the old packet contains no applied crop-plane/world-opacity values.
      const diagnostic = measureExitBoundaryDiagnostic({ data, image, dpr: 2 });
      const historical = oldExit.frames.find((f) => f.role === (role === 'local' ? 'implementation' : 'source'));
      assert.deepEqual(diagnostic.measurement, historical.classifierMeasurement);
      assert.equal(diagnostic.peak.y, historical.diagnostic.peak.y);
      assert.equal(diagnostic.peak.score, historical.diagnostic.peak.score);
      assert.equal(diagnostic.diagnosticMeanCssY, historical.diagnostic.diagnosticMeanCssY);
      assert.equal(diagnostic.applied.cropPlane.value, null);
      assert.equal(diagnostic.applied.effectiveWorldOpacity.value, null);
      assert.equal(diagnostic.qualification.status, 'blocked');
      exitFrames.push({ role, imagePath: p, diagnostic });
    }
  }
}
const beam = { schemaVersion: 1, status: 'diagnostic-only-blocked', historicalRunId: capture.runId,
  inputImagePinsVerified: 2, independentlyEvaluatedProfiles: profiles.length,
  historicalProfileReproductions: profiles.length, profiles };
const exit = { schemaVersion: 1, status: 'diagnostic-only-blocked', historicalRunId: capture.runId,
  inputImagePinsVerified: 2, historicalClassifierReproductions: exitFrames.length, frames: exitFrames };
function fixture(rows) {
  const image = { width: 32, height: 80, channels: 3 };
  const data = new Uint8Array(32 * 80 * 3);
  for (let i = 0; i < 32 * 80; i++) data.set([180, 200, 210], i * 3);
  for (const [a, b, rgb] of rows)
    for (let y = a; y <= b; y++)
      for (let x = 0; x < 32; x++) data.set(rgb, (y * 32 + x) * 3);
  return { data, image, dpr: 2,
    section: { axis: 'vertical', fixedCoordinate: 12, stripWidth: 3,
      range: [10, 70], sidebands: [[10, 20], [60, 70]] },
    peakFractions: [0.5, 0.8], residualThresholds: [5, 45],
    maximumSidebandNoise: 3, minimumPeakExcess: 5 };
}
const literal = fixture([[27, 43, [170, 225, 250]], [33, 37, [240, 250, 255]],
  [48, 52, [240, 250, 255]], [44, 47, [190, 210, 220]]]);
const ambiguityBefore = beforeBeam(literal);
const ambiguityAfter = measureBeamCrossSectionDiagnostic(literal);
const plateau = measureBeamCrossSectionDiagnostic(fixture([[27, 43, [240, 250, 255]]]));
assert.equal(ambiguityBefore.status, 'observed-diagnostic');
assert.equal(ambiguityAfter.status, 'blocked');
assert.equal(ambiguityAfter.peakWidths.length, 0);
assert.equal(plateau.status, 'observed-diagnostic');
assert.deepEqual(plateau.peakWidths[0].rasterBounds, [27, 43]);
assert.equal(plateau.peakWidths[0].cssSpan, 8.5);
assert.equal(plateau.qualification.status, 'blocked');
const ambiguity = { schemaVersion: 1, status: 'reproduced-and-refined',
  fixture: 'Literal reviewed dim-bridge fixture, unchanged background/sidebands.',
  before: ambiguityBefore, after: ambiguityAfter, singlePlateauControl: plateau };
const outputs = {
  'beam-raster-diagnostics.json': JSON.stringify(beam, null, 2) + '\n',
  'exit-raster-diagnostics.json': JSON.stringify(exit, null, 2) + '\n',
  'ambiguity-fixture-diagnostics.json': JSON.stringify(ambiguity, null, 2) + '\n',
};
if (process.argv.includes('--verify')) {
  const packet = await json(`${root}/review-packet.json`);
  for (const p of [...packet.inputs, ...packet.artifacts]) {
    const b = await readFile(p.path);
    assert.equal(hash(b), p.sha256, `Packet pin changed: ${p.path}`);
    assert.equal(b.length, p.bytes);
  }
  for (const [name, bytes] of Object.entries(outputs))
    assert.equal(await readFile(`${root}/${name}`, 'utf8'), bytes, `Repeatability failed: ${name}`);
  console.log(JSON.stringify({ status: 'pass', inputPins: packet.inputs.length,
    artifactPins: packet.artifacts.length, repeatedOutputs: 3, beamProfiles: 4,
    exitClassifierReproductions: 2, qualification: 'blocked' }, null, 2));
} else {
  for (const [name, bytes] of Object.entries(outputs)) await writeFile(`${root}/${name}`, bytes);
  console.log(JSON.stringify({ status: 'pass', historicalImagePins: 4,
    beamProfileReproductions: 4, exitClassifierReproductions: 2,
    reviewedFixtureBefore: ambiguityBefore.status, reviewedFixtureAfter: ambiguityAfter.status,
    singlePlateau: plateau.status, qualification: 'blocked' }));
}
