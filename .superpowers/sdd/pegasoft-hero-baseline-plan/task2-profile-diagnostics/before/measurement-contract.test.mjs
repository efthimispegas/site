import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as contract from './measurement-contract.mjs';
import {
  evaluateAcceptanceGates,
  evaluateVisibleText,
  evaluateFeaturePair,
  evaluateRouteAppearance,
  validateCaptureProvenance,
  sha256,
  resolveSourceBundleSha256,
  reviewedSupplementalGate,
  isCaptureInputPath,
  assembleComparisonAcceptance,
  applySourceMeasurementOverlay,
} from './measurement-contract.mjs';
import * as structural from '../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';
import {
  IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE,
  measureChromaFeature,
  measureRouteAppearanceBands,
  ROUTE_CONFIG_BY_STATE,
  IMPLEMENTATION_ROUTE_CONFIG_BY_STATE,
} from '../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';

const packetKeys = ['loader-mark', 'world-reveal', 'landing', 'landing-idle', 'activation-route', 'activation-contact', 'clearance-travel', 'clearance-field-preview', 'field-approach', 'field-contact', 'field-pulse-a', 'field-pulse-b', 'arrival-travel', 'arrival-lockup', 'journey-exit'];
function loaderPhaseFixture() {
  const expected = { runId: 'run', stateId: 'loader-mark', recordingSha256: 'a'.repeat(64), referenceSha256: 'b'.repeat(64), implementationSha256: 'c'.repeat(64) };
  return { expected: { ...expected, implementationCssClock: { nowMs: 1008, animations: [{ id: 0, kind: 'animation', observedAtMs: 3, initialTimeMs: 0, currentTime: 1005, animationName: 'local-dash', target: { selector: '#outer' } }] } }, evidence: { ...expected, schemaVersion: 1, reviewerType: 'independent-reviewer', reviewer: 'phase-reviewer', reviewRef: 'review.json', source: { clockBasis: 'loader-animation-onset', effectRole: 'outer-ellipse-dash', animationName: 'dash-move', targetSelector: '#loader .outer ellipse', ageMs: [1000, 1010], evidenceRef: 'recording-onset.json' }, implementation: { clockBasis: 'loader-animation-onset', effectRole: 'outer-ellipse-dash', animationName: 'local-dash', targetSelector: '#outer', animationId: 0, ageMs: [1005, 1005], evidenceRef: 'css-clock.json' } } };
}
test('a claimed local loader age must contain the captured native animation time', () => {
  const f = loaderPhaseFixture();
  f.expected.implementationCssClock.animations[0].currentTime = 2000;
  const result = contract.evaluateLoaderPhaseCorrespondence(f);
  assert.equal(result.status, 'blocked');
  assert.match(result.blockers.join(' '), /captured native animation/);
});
test('claimed native name and target must match the captured effect binding', () => {
  for (const change of [f => { delete f.expected.implementationCssClock.animations[0].animationName; }, f => { f.expected.implementationCssClock.animations[0].target = null; }, f => { f.evidence.implementation.animationName = 'logo-rotate'; }, f => { f.evidence.implementation.targetSelector = '#inner'; }]) {
    const f = loaderPhaseFixture(); change(f);
    assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
  }
});
test('source and local ages of different semantic effects cannot qualify a match', () => {
  for (const change of [f => { f.evidence.source.effectRole = 'logo-assembly'; }, f => { delete f.evidence.source.effectRole; }, f => { delete f.evidence.source.animationName; }, f => { delete f.evidence.source.targetSelector; }]) {
    const f = loaderPhaseFixture(); change(f);
    assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
  }
});
test('local loader phase requires an independently identified captured animation', () => {
  for (const change of [f => { delete f.evidence.implementation.animationId; }, f => { f.evidence.implementation.animationId = 7; }, f => { f.expected.implementationCssClock.animations[0].kind = 'transition'; }]) {
    const f = loaderPhaseFixture(); change(f);
    assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
  }
});
test('missing or ambiguous native clock readings cannot qualify local loader age', () => {
  for (const change of [f => { delete f.expected.implementationCssClock; }, f => { f.expected.implementationCssClock.animations.push({ ...f.expected.implementationCssClock.animations[0] }); }, f => { f.expected.implementationCssClock.animations[0].currentTime = NaN; }]) {
    const f = loaderPhaseFixture(); change(f);
    assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
  }
});
test('loader recording seek alone cannot qualify animation phase', () => {
  assert.equal(typeof contract.evaluateLoaderPhaseCorrespondence, 'function');
  const f = loaderPhaseFixture();
  f.evidence.source = { timestampSeconds: 2, ageMs: [2000, 2000], clockBasis: 'recording-seek', evidenceRef: 'anchor.json' };
  assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
});
test('independently pinned overlapping loader ages qualify correspondence', () => {
  assert.equal(typeof contract.evaluateLoaderPhaseCorrespondence, 'function');
  assert.equal(contract.evaluateLoaderPhaseCorrespondence(loaderPhaseFixture()).status, 'pass');
});
test('unknown, stale, self-reviewed or imprecise loader phase stays blocked', () => {
  assert.equal(typeof contract.evaluateLoaderPhaseCorrespondence, 'function');
  for (const change of [f => { f.evidence = null; }, f => { f.evidence.runId = 'other'; }, f => { f.evidence.referenceSha256 = 'd'.repeat(64); }, f => { f.evidence.implementationSha256 = 'd'.repeat(64); }, f => { f.evidence.reviewerType = 'author'; }, f => { f.evidence.source.ageMs = [0, 2000]; }, f => { f.evidence.source.ageMs = [1010, 1000]; }, f => { f.evidence.implementation.evidenceRef = ''; }]) {
    const f = loaderPhaseFixture(); change(f);
    assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
  }
});
test('different loader ages block graphics comparison without becoming a geometry failure', () => {
  assert.equal(typeof contract.evaluateLoaderPhaseCorrespondence, 'function');
  const f = loaderPhaseFixture(); f.evidence.implementation.ageMs = [2000, 2000];
  assert.equal(contract.evaluateLoaderPhaseCorrespondence(f).status, 'blocked');
});
function packetFixture() {
  const runId = '31515db9-ab30-430e-9721-669be939d945';
  const profile = { viewportWidth: 1508, viewportHeight: 761, screenshotDpr: 2, canvasCssWidth: 1508, canvasCssHeight: 761, canvasBackingWidth: 2639, canvasBackingHeight: 1331 };
  const stateInputs = Object.fromEntries(packetKeys.map(key => [key, { lifecycle: 'landing', target: 0 }]));
  const measurements = packetKeys.map(stateKey => ({
    schemaVersion: 7, runId, stateKey, buildId: 'build', inputTreeSha256: 'a'.repeat(64),
    viewport: { width: 1508, height: 761, devicePixelRatio: 2 },
    captureObservation: {
      requestedKey: stateKey, canvasVisible: true, fontsReady: true, loaderCleared: true,
      attributes: { 'data-hero-lifecycle': 'landing', 'data-hero-motion': 'full', 'data-hero-profile': 'desktop', 'data-hero-render-ready': 'true', 'data-hero-seed': '43117' },
      record: { renderedAtMs: 100, frame: { frameId: 2, measurementSequence: 1, nowMs: 100, deltaMs: 16, target: 0, rendered: { value: 0, velocity: 0 }, fieldElapsedMs: 0 }, appliedConsumers: Object.fromEntries(['camera','beam','activation','field','arrival'].map(name => [name, { frameId: 2, renderedProgress: 0, readback: {} }])), canvas: { cssWidth: 1508, cssHeight: 761, backingWidth: 2639, backingHeight: 1331 } },
      viewport: { width: 1508, height: 761, devicePixelRatio: 2 },
      inputLog: [{ kind: 'clock', value: 16 }],
      physical: { scrollY: 0, effectiveHeroHeight: 761, measurementSequence: 1 },
      renderedHistory: [{ frameId: 2, measurementSequence: 1, nowMs: 100, deltaMs: 16, target: 0, rendered: { value: 0, velocity: 0 }, fieldElapsedMs: 0 }],
      cssClock: { nowMs: 100, animations: [{ id: 1, observedAtMs: 1, initialTimeMs: 0, currentTime: 99 }], log: [{ type: 'advance', atMs: 100, deltaMs: 16 }] },
    },
  }));
  const manifest = { schemaVersion: 7, status: 'complete', runId, buildId: 'build', inputTreeSha256: 'a'.repeat(64), startedAt: '2026-09-30T00:00:00Z', completedAt: '2026-09-30T00:01:00Z', expectedStateCount: 15, capturedStateCount: 15, expectedStates: packetKeys, missingStates: [], failures: [], states: packetKeys.map(key => ({ key })), outcomes: packetKeys.map(state => ({ state, runId, status: 'complete' })) };
  return { manifest, measurements, expected: { stateKeys: packetKeys, states: stateInputs, profile, buildId: 'build', inputTreeSha256: 'a'.repeat(64) } };
}
function packetResult(fixture) {
  assert.equal(typeof contract.validateCapturePacket, 'function', 'capture packet validation is missing');
  return contract.validateCapturePacket(fixture);
}
test('complete coherent fifteen-state packet passes independent pins', () => assert.equal(packetResult(packetFixture()).status, 'pass'));
test('mixed measurement or outcome run IDs block the packet', () => {
  for (const change of [f => { f.measurements[0].runId = 'other'; }, f => { f.manifest.outcomes[0].runId = 'other'; }]) {
    const f = packetFixture(); change(f); assert.equal(packetResult(f).status, 'blocked');
  }
});
test('missing or duplicate states block comparison despite a complete label', () => {
  for (const change of [f => f.manifest.states.pop(), f => f.measurements.pop(), f => { f.measurements[1].stateKey = f.measurements[0].stateKey; }]) {
    const f = packetFixture(); change(f); assert.equal(packetResult(f).status, 'blocked');
  }
});
test('wrong viewport or self-consistent wrong backing dimensions block correspondence', () => {
  for (const change of [f => { f.measurements[0].viewport.width = 1440; }, f => { f.measurements[0].captureObservation.record.canvas.backingWidth = 3016; }]) {
    const f = packetFixture(); change(f); assert.equal(packetResult(f).status, 'blocked');
  }
});
test('stale input hashes or build IDs block a otherwise complete packet', () => {
  for (const change of [f => { f.expected.inputTreeSha256 = 'b'.repeat(64); }, f => { f.measurements[0].inputTreeSha256 = 'b'.repeat(64); }, f => { f.expected.buildId = 'other'; }]) {
    const f = packetFixture(); change(f); assert.equal(packetResult(f).status, 'blocked');
  }
});
test('pulse DOM labels cannot replace the actual applied pulse clock', () => {
  const f = packetFixture(); const m = f.measurements[10];
  f.expected.states[m.stateKey] = { lifecycle: 'landing', target: 0, fieldElapsedMs: 300 };
  m.captureObservation.attributes['data-hero-reference-state'] = 'field-pulse-a';
  assert.equal(packetResult(f).status, 'blocked');
  m.captureObservation.record.frame.fieldElapsedMs = 300;
  m.captureObservation.renderedHistory[0].fieldElapsedMs = 300;
  assert.equal(packetResult(f).status, 'blocked', 'clock assignment without rendered history is invalid');
});
test('stale consumer or CSS animation clocks block the packet', () => {
  for (const change of [f => { f.measurements[0].captureObservation.record.appliedConsumers.camera.frameId = 1; }, f => { f.measurements[0].captureObservation.cssClock.animations[0].currentTime = 10; }]) {
    const f = packetFixture(); change(f); assert.equal(packetResult(f).status, 'blocked');
  }
});
test('lawful rendered field history establishes applied pulse age regardless of DOM label', () => {
  const f = packetFixture(); const o = f.measurements[10].captureObservation;
  f.expected.states['field-pulse-a'] = { lifecycle: 'journey', target: 0.74, fieldElapsedMs: 300 };
  o.attributes['data-hero-lifecycle'] = 'journey';
  o.attributes['data-hero-reference-state'] = 'field-contact';
  Object.assign(o.record.frame, { target: 0.74, rendered: { value: 0.74, velocity: 0 }, fieldElapsedMs: 300 });
  for (const consumer of Object.values(o.record.appliedConsumers)) consumer.renderedProgress = 0.74;
  o.renderedHistory = [{ frameId: 1, nowMs: 84, deltaMs: 284, target: 0.74, rendered: { value: 0.74, velocity: 0 }, fieldElapsedMs: 284 }, structuredClone(o.record.frame)];
  assert.equal(packetResult(f).status, 'pass');
});
test('physical measurement sequence and effect age cannot be substituted', () => {
  const f = packetFixture(); f.measurements[0].captureObservation.physical.measurementSequence = 8;
  assert.equal(packetResult(f).status, 'blocked');
});
test('screenshot brackets must retain the observed frame and CSS clock', () => {
  assert.equal(typeof contract.validateCaptureBracket, 'function', 'screenshot bracket validation is missing');
  const fixture = packetFixture(); const observation = fixture.measurements[0].captureObservation;
  const before = { record: structuredClone(observation.record), cssClock: structuredClone(observation.cssClock) };
  const bracket = { schemaVersion: 1, runId: fixture.manifest.runId, stateId: 'loader-mark', before, after: structuredClone(before) };
  const input = { bracket, observation, runId: fixture.manifest.runId, stateId: 'loader-mark', captureFrameId: 2 };
  assert.equal(contract.validateCaptureBracket(input).status, 'pass');
  bracket.after.record.frame.frameId = 3;
  assert.equal(contract.validateCaptureBracket(input).status, 'blocked');
  bracket.after = structuredClone(before); bracket.after.cssClock.nowMs++;
  assert.equal(contract.validateCaptureBracket(input).status, 'blocked');
});
test('identity exclusions permit agreed copy and glyph differences only', () => {
  assert.equal(typeof contract.validateIdentityExclusions, 'function', 'identity exclusion validation is missing');
  assert.equal(contract.validateIdentityExclusions(['Title and description text content','Title glyph-sequence width','Step-number glyph pixels']).status, 'pass');
  for (const exclusion of ['whole destination object','landmark silhouette','background','title container']) {
    assert.equal(contract.validateIdentityExclusions([exclusion]).status, 'blocked');
  }
});
test('comparison requires an explicit capture selection and rejects conflicting selections', () => {
  assert.equal(typeof contract.resolveCaptureRoot, 'function', 'explicit capture selection is missing');
  const options = { argv: [], env: {}, workspaceRoot: '/workspace' };
  assert.throws(() => contract.resolveCaptureRoot(options), /explicit/i);
  assert.equal(contract.resolveCaptureRoot({ ...options, env: { HERO_CAPTURE_ROOT: 'packet' } }), '/workspace/packet');
  assert.throws(() => contract.resolveCaptureRoot({ ...options, argv: ['--capture-root','other'], env: { HERO_CAPTURE_ROOT: 'packet' } }), /conflict/i);
});

const config = {
  ...ROUTE_CONFIG_BY_STATE['clearance-travel'],
  roi: [0.1, 0.1, 0.8, 0.8],
  minimumSelectedPixels: 4,
  minimumComponentPixels: 2,
};
const image = { width: 100, height: 80, channels: 3 };
function raster(rectangles = [[20, 35, 60, 4, [30, 200, 250]]]) {
  const data = Buffer.alloc(image.width * image.height * 3, 100);
  for (const [left, top, width, height, rgb] of rectangles) {
    for (let y = top; y < top + height; y += 1)
      for (let x = left; x < left + width; x += 1) {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
        data.set(rgb, (y * image.width + x) * 3);
      }
  }
  return data;
}
function measured(data, candidateConfig = config) {
  const result = measureChromaFeature({
    data,
    image,
    dpr: 1,
    config: candidateConfig,
  });
  return {
    ...result,
    bands: measureRouteAppearanceBands({
      data,
      image,
      config: candidateConfig,
    }),
  };
}
const baseline = measured(raster());
function compare(candidate) {
  return evaluateFeaturePair({
    source: baseline.measurement,
    implementation: candidate.measurement,
    sourceQuality: baseline.debug.quality,
    implementationQuality: candidate.debug.quality,
  });
}

test('positive actual color selection and unchanged core/glow pass', () => {
  assert.equal(compare(measured(raster())).status, 'pass');
  assert.equal(
    evaluateRouteAppearance(baseline.bands, measured(raster()).bands).status,
    'pass',
  );
});
test('missing route is blocked, never not-applicable/pass', () =>
  assert.equal(compare(measured(raster([]))).status, 'blocked'));
test('moved route is a failure', () =>
  assert.equal(
    compare(measured(raster([[25, 45, 60, 4, [30, 200, 250]]]))).status,
    'fail',
  ));
test('route moved wholly outside ROI is blocked', () =>
  assert.equal(
    compare(measured(raster([[20, 0, 60, 4, [30, 200, 250]]]))).status,
    'blocked',
  ));
test('core width changes fail', () =>
  assert.equal(
    compare(measured(raster([[20, 33, 60, 9, [30, 200, 250]]]))).status,
    'fail',
  ));
test('glow-only change cannot hide behind unchanged core support', () => {
  const candidate = measured(
    raster([
      [18, 31, 64, 12, [120, 150, 155]],
      [20, 35, 60, 4, [30, 200, 250]],
    ]),
  );
  assert.equal(compare(candidate).status, 'pass');
  assert.equal(
    evaluateRouteAppearance(baseline.bands, candidate.bands).status,
    'fail',
  );
});
test('narrowed core with compensating larger glow fails appearance', () => {
  const candidate = measured(
    raster([
      [18, 31, 64, 12, [120, 150, 155]],
      [20, 36, 60, 2, [30, 200, 250]],
    ]),
  );
  assert.equal(
    evaluateRouteAppearance(baseline.bands, candidate.bands).status,
    'fail',
  );
});
test('bright neutral tile/recolored route cannot be accepted by white-cyan support', () => {
  const brightConfig = {
    ...config,
    predicate:
      IMPLEMENTATION_ROUTE_CONFIG_BY_STATE['clearance-travel'].predicate,
  };
  const candidate = measured(
    raster([[20, 30, 60, 14, [240, 250, 255]]]),
    brightConfig,
  );
  assert.notEqual(candidate.debug.quality.status, 'qualified');
  assert.notEqual(compare(candidate).status, 'pass');
});
test('contact/pulse overlap blocks ambiguous aggregate width', () => {
  const candidate = measured(
    raster([
      [20, 35, 60, 4, [30, 200, 250]],
      [45, 25, 15, 24, [30, 200, 250]],
    ]),
  );
  assert.equal(candidate.debug.quality.status, 'blocked');
  assert.notEqual(compare(candidate).status, 'pass');
});
test('clipped subject cannot be qualified even when a narrow ROI keeps its centroid', () => {
  const candidate = measured(raster(), {
    ...config,
    roi: [0.3, 0.1, 0.4, 0.8],
  });
  assert.equal(candidate.debug.quality.status, 'blocked');
});
test('component bounding box does not reintroduce rejected disconnected pixels', () => {
  const shape = raster([
    [20, 20, 40, 3, [30, 200, 250]],
    [20, 20, 3, 30, [30, 200, 250]],
    [20, 47, 40, 3, [30, 200, 250]],
    [40, 34, 2, 2, [30, 200, 250]],
  ]);
  const result = measured(shape, {
    ...config,
    method: 'largest-chroma-component',
  });
  assert.equal(
    result.debug.mask[34 * image.width + 40],
    0,
    'Previously selected because it fell within the selected C-shaped component bounding box.',
  );
  assert.equal(result.debug.mask[20 * image.width + 20], 1);
});
const ink = {
  kind: 'ordinary-visible-ink',
  subjects: [
    {
      id: 'cta',
      fontsLoaded: true,
      expectedLineCount: 1,
      lineCount: 1,
      glyphRects: [[12, 12, 80, 16]],
      clippingRects: [[10, 10, 90, 22]],
      clippingAncestorsInspected: true,
      clippingInspectionEvidence: 'fixture inspected full ancestor chain',
    },
  ],
};
test('visible glyph positive control passes, overflow and wrap fail', () => {
  assert.equal(evaluateVisibleText(ink, { cta: 1 }).status, 'pass');
  const overflow = structuredClone(ink);
  overflow.subjects[0].glyphRects[0][2] = 98;
  assert.equal(evaluateVisibleText(overflow, { cta: 1 }).status, 'fail');
  const wrap = structuredClone(ink);
  wrap.subjects[0].lineCount = 2;
  assert.equal(evaluateVisibleText(wrap, { cta: 1 }).status, 'fail');
  assert.equal(
    evaluateVisibleText({ status: 'pass', bounds: [0, 0, 90, 20] }).status,
    'blocked',
  );
});
test('approved identity differences remain diagnostic; all mandatory gates remain independent', () => {
  const good = { status: 'pass' };
  const input = {
    scene: good,
    visibleText: good,
    motion: good,
    finalReview: good,
    provenance: good,
    raster: { status: 'fail' },
  };
  assert.equal(evaluateAcceptanceGates(input).gateSatisfied, true);
  assert.equal(
    evaluateAcceptanceGates({ ...input, scene: { status: 'fail' } })
      .gateSatisfied,
    false,
  );
  assert.equal(
    evaluateAcceptanceGates({ ...input, visibleText: { status: 'fail' } })
      .gateSatisfied,
    false,
  );
  assert.equal(
    evaluateAcceptanceGates({ ...input, motion: undefined }).gateSatisfied,
    false,
  );
  assert.equal(
    evaluateAcceptanceGates({ ...input, finalReview: undefined }).gateSatisfied,
    false,
  );
});

function validCapture() {
  const bytes = Buffer.from('actual independent screenshot bytes');
  const hash = sha256(bytes);
  const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const provenance = {
    schemaVersion: 1,
    runId: 'fixture-run',
    stateId: 'landing',
    implementation: {
      gitRevision: 'fixture-revision',
      trackedDiffSha256: hash,
      untrackedInputFiles: [],
    },
    source: {
      siteUrl: 'https://www.vectrfl.com/',
      bundleSha256: hash,
      recordingSha256: hash,
    },
    build: {
      mode: 'test-enabled-production',
      buildId: 'fixture-build',
      startupCommand: 'fixture server',
    },
    environment: {
      node: process.version,
      browserName: 'fixture-browser',
      browserVersion: '1',
    },
    profile: {
      captureLabel: 'recording-desktop',
      viewportWidth: 1508,
      viewportHeight: 761,
      screenshotDpr: 2,
      canvasCssWidth: 1508,
      canvasCssHeight: 761,
      canvasBackingWidth: 2639,
      canvasBackingHeight: 1331,
      canvasDprX: 2639 / 1508,
      canvasDprY: 1331 / 761,
    },
    fonts: [{ family: 'fixture-font', loaded: true, verifiedVersion: '1' }],
    input: {
      physical: {
        scrollY: 0,
        effectiveHeroHeight: 761,
        measurementSequence: 5,
      },
      eventHistorySha256: hash,
      freezeAtMs: 8000,
      seed: 43117,
    },
    applied: {
      schemaVersion: 1,
      frameId: 42,
      captureFrameId: 42,
      readiness: 'ready',
      renderedProgress: 0,
      camera: {
        position: [-80, 66, 15],
        quaternion: [0, 0, 0, 1],
        projectionMatrix: matrix,
        matrixWorld: matrix,
      },
      measurementSequence: 5,
      nowMs: 8000,
      deltaMs: 16,
      sceneTargetProgress: 0,
      renderedVelocity: 0,
      routes: Object.fromEntries(
        ['feeder', 'feeder', 'feeder', 'feeder', 'blue-zero', 'blue-one'].map(
          (role, i) => [
            String(i),
            {
              role,
              visibleRange: [0, 1],
              headWorld: [0, 0.15, 0],
              physicalRadius: 0.075,
              readback: true,
            },
          ],
        ),
      ),
      effects: Object.fromEntries(
        ['fieldPulse', 'arrival', 'idle'].map((name) => [
          name,
          {
            inputDomain: 'rendered-progress',
            ratio: 0,
            active: false,
            elapsedMs: 0,
            resetSequence: 0,
            readback: true,
          },
        ]),
      ),
      appliedConsumers: Object.fromEntries(
        ['camera', 'beam', 'activation', 'field', 'arrival'].map((name) => [
          name,
          { frameId: 42, renderedProgress: 0, readback: true },
        ]),
      ),
    },
    artifacts: [
      {
        relativePath: 'landing.png',
        bytes: bytes.length,
        sha256: hash,
        profileId: 'recording-desktop',
        frameId: 42,
        runId: 'fixture-run',
        stateId: 'landing',
      },
    ],
  };
  const expected = {
    runId: 'fixture-run',
    stateId: 'landing',
    captureFrameId: 42,
    gitRevision: 'fixture-revision',
    trackedDiffSha256: hash,
    bundleSha256: hash,
    recordingSha256: hash,
    captureLabel: 'recording-desktop',
  };
  Object.assign(provenance.profile, {
    pointerClass: 'fine',
    isIos: false,
    reducedMotion: false,
  });
  Object.assign(expected, {
    profile: structuredClone(provenance.profile),
    untrackedInputFiles: [],
  });
  const measurementBytes = Buffer.from('{"fixture":"actual measured state"}');
  provenance.artifacts.push({
    relativePath: 'measurements/landing.json',
    bytes: measurementBytes.length,
    sha256: sha256(measurementBytes),
    profileId: 'recording-desktop',
    frameId: 42,
    runId: 'fixture-run',
    stateId: 'landing',
  });
  expected.artifacts = provenance.artifacts.map(
    ({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 }),
  );
  return {
    provenance,
    expected,
    artifacts: [
      { relativePath: 'landing.png', bytes },
      { relativePath: 'measurements/landing.json', bytes: measurementBytes },
    ],
  };
}
test('complete provenance with independently supplied bytes and expected pins passes', () =>
  assert.equal(validateCaptureProvenance(validCapture()).status, 'pass'));
for (const field of [
  'runId',
  'gitRevision',
  'trackedDiffSha256',
  'bundleSha256',
  'recordingSha256',
  'captureLabel',
]) {
  test(`stale or mixed ${field} is rejected against independent pins`, () => {
    const fixture = validCapture();
    fixture.expected[field] = 'different';
    assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  });
}
test('missing expected authority cannot validate a self-consistent capture', () => {
  const fixture = validCapture();
  delete fixture.expected;
  assert.equal(validateCaptureProvenance(fixture).status, 'blocked');
});
test('wrong bytes and missing artifact hash fail', () => {
  const fixture = validCapture();
  fixture.artifacts[0].bytes = Buffer.from('wrong');
  assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  const noHash = validCapture();
  delete noHash.provenance.artifacts[0].sha256;
  assert.equal(validateCaptureProvenance(noHash).status, 'fail');
});
test('duplicate/escaping paths and mixed frame/profile artifact fail', () => {
  for (const path of ['../landing.png', '/landing.png']) {
    const fixture = validCapture();
    fixture.provenance.artifacts[0].relativePath = path;
    assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  }
  const duplicate = validCapture();
  duplicate.provenance.artifacts.push(duplicate.provenance.artifacts[0]);
  assert.equal(validateCaptureProvenance(duplicate).status, 'fail');
  for (const key of ['frameId', 'profileId', 'runId']) {
    const fixture = validCapture();
    fixture.provenance.artifacts[0][key] = 'wrong';
    assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  }
});
test('stale applied frame, missing readiness or consumer acknowledgment block', () => {
  for (const change of [
    (p) => {
      p.applied.captureFrameId = 41;
    },
    (p) => {
      delete p.applied.readiness;
    },
    (p) => {
      p.applied.appliedConsumers.beam.frameId = 41;
    },
  ]) {
    const fixture = validCapture();
    change(fixture.provenance);
    assert.equal(validateCaptureProvenance(fixture).status, 'blocked');
  }
});
test('legacy capture stays historical/blocked, not silently qualified', () =>
  assert.equal(
    validateCaptureProvenance({ provenance: { schemaVersion: 7 } }).status,
    'blocked',
  ));
test('actual source evidence resolver reads sources and rejects conflicting bundle pins', async () => {
  const evidence = JSON.parse(
    await readFile(
      new URL(
        '../../docs/hero-reference/live/source-evidence.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.equal(
    resolveSourceBundleSha256(evidence),
    '352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494',
  );
  evidence.sources.push({
    url: 'https://www.vectrfl.com/_astro/CommonScripts.changed.js',
    sha256: 'a'.repeat(64),
  });
  assert.equal(resolveSourceBundleSha256(evidence), null);
});
test('unrelated current-frame artifact cannot replace compared PNG or measurement inputs', () => {
  const omitted = validCapture();
  omitted.provenance.artifacts.pop();
  assert.equal(validateCaptureProvenance(omitted).status, 'fail');
  const substituted = validCapture();
  substituted.provenance.artifacts[0].relativePath = 'unrelated.png';
  substituted.artifacts[0].relativePath = 'unrelated.png';
  assert.equal(validateCaptureProvenance(substituted).status, 'fail');
});
test('independent text coverage cannot omit CTA or bless a changed expected line count', () => {
  assert.equal(evaluateVisibleText(ink, { cta: 1, cue: 1 }).status, 'fail');
  const changed = structuredClone(ink);
  changed.subjects[0].expectedLineCount = 2;
  changed.subjects[0].lineCount = 2;
  assert.equal(evaluateVisibleText(changed, { cta: 1 }).status, 'fail');
  const unchecked = structuredClone(ink);
  unchecked.subjects[0].clippingRects = [];
  delete unchecked.subjects[0].clippingInspectionEvidence;
  assert.equal(evaluateVisibleText(unchecked, { cta: 1 }).status, 'blocked');
});
test('self-consistent wrong backing/device dimensions fail independent profile pins', () => {
  const fixture = validCapture();
  fixture.provenance.profile.canvasBackingWidth = 3016;
  fixture.provenance.profile.canvasDprX = 2;
  assert.equal(validateCaptureProvenance(fixture).status, 'fail');
});
test('untracked source bytes cannot be omitted or modified', () => {
  const fixture = validCapture();
  const bytes = Buffer.from('real source');
  const entry = { path: 'tools/new.mjs', sha256: sha256(bytes) };
  fixture.expected.untrackedInputFiles = [entry];
  assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  fixture.provenance.implementation.untrackedInputFiles = [entry];
  fixture.inputArtifacts = [{ path: entry.path, bytes }];
  assert.equal(validateCaptureProvenance(fixture).status, 'pass');
  fixture.inputArtifacts[0].bytes = Buffer.from('changed');
  assert.equal(validateCaptureProvenance(fixture).status, 'fail');
});
test('rendering assets and fonts are capture inputs, not just source code', () => {
  for (const extension of [
    'glb',
    'gltf',
    'svg',
    'png',
    'webp',
    'woff2',
    'hdr',
    'bin',
  ]) {
    const file = `apps/pegasoft/public/hero/asset.${extension}`;
    assert.equal(isCaptureInputPath(file), true);
    const fixture = validCapture();
    const bytes = Buffer.from('asset');
    const input = { path: file, sha256: sha256(bytes) };
    fixture.expected.untrackedInputFiles = [input];
    assert.equal(validateCaptureProvenance(fixture).status, 'fail');
    fixture.provenance.implementation.untrackedInputFiles = [input];
    fixture.inputArtifacts = [{ path: file, bytes: Buffer.from('corrupted') }];
    assert.equal(validateCaptureProvenance(fixture).status, 'fail');
  }
  assert.equal(
    isCaptureInputPath('apps/pegasoft-e2e/test-output/hero/shot.png'),
    false,
  );
});
test('missing route/contact clock payload and mismatched measurement sequence block', () => {
  for (const change of [
    (p) => {
      delete p.applied.routes;
    },
    (p) => {
      delete p.applied.effects.fieldPulse.elapsedMs;
    },
    (p) => {
      p.applied.measurementSequence = 9;
    },
  ]) {
    const fixture = validCapture();
    change(fixture.provenance);
    assert.equal(validateCaptureProvenance(fixture).status, 'blocked');
  }
});
test('supplemental review is explicit and bound; absent or stale review cannot produce final acceptance', () => {
  const fixture = validCapture();
  const record = {
    kind: 'normal-motion',
    status: 'pass',
    reviewerType: 'independent-reviewer',
    reviewer: 'reviewer',
    reviewRef: 'reviews/fixture.md',
    ...fixture.expected,
  };
  assert.equal(
    reviewedSupplementalGate(record, fixture.expected, 'normal-motion').status,
    'pass',
  );
  assert.equal(
    reviewedSupplementalGate(undefined, fixture.expected, 'normal-motion')
      .status,
    'blocked',
  );
  assert.equal(
    reviewedSupplementalGate(
      { ...record, runId: 'stale' },
      fixture.expected,
      'normal-motion',
    ).status,
    'blocked',
  );
  assert.equal(
    reviewedSupplementalGate(record, fixture.expected, 'final-review').status,
    'blocked',
  );
});
test('production comparator consumes shared gates and keeps diagnostic raster out of CLI exit gate', async () => {
  const code = await readFile(
    new URL('./compare-captures.mjs', import.meta.url),
    'utf8',
  );
  assert.match(code, /assembleComparisonAcceptance\(/);
  assert.match(code, /validateCaptureProvenance\(/);
  assert.match(code, /gateSatisfied: acceptance\.gateSatisfied/);
  assert.match(code, /if \(!report\.gateSatisfied\)/);
  assert.doesNotMatch(
    code,
    /gateSatisfied:\s*preliminaryRasterGateSatisfied\s*&&/,
  );
});
test('actual report assembly passes positive pixel/text/provenance controls and rejects core/glow corruption', () => {
  const fixture = validCapture();
  const reviewPins = fixture.expected;
  const common = {
    status: 'pass',
    reviewer: 'reviewer',
    reviewRef: 'independent-review.md',
    ...reviewPins,
  };
  const states = [
    {
      structuralAccuracy: compare(measured(raster())),
      visibleText: evaluateVisibleText(ink, { cta: 1 }),
    },
  ];
  const input = {
    states,
    provenance: validateCaptureProvenance(fixture),
    reviewPins,
    rasterSummary: { pass: 0, fail: 1 },
    motionReview: {
      ...common,
      kind: 'normal-motion',
      reviewerType: 'independent-reviewer',
    },
    finalReview: { ...common, kind: 'final-review', reviewerType: 'user' },
  };
  assert.equal(assembleComparisonAcceptance(input).gateSatisfied, true);
  const moved = compare(measured(raster([[25, 45, 60, 4, [30, 200, 250]]])));
  assert.equal(
    assembleComparisonAcceptance({
      ...input,
      states: [{ ...states[0], structuralAccuracy: moved }],
    }).gateSatisfied,
    false,
  );
  const glow = measured(
    raster([
      [18, 31, 64, 12, [120, 150, 155]],
      [20, 35, 60, 4, [30, 200, 250]],
    ]),
  );
  assert.equal(
    assembleComparisonAcceptance({
      ...input,
      states: [
        {
          ...states[0],
          structuralAccuracy: evaluateRouteAppearance(
            baseline.bands,
            glow.bands,
          ),
        },
      ],
    }).gateSatisfied,
    false,
  );
});
function validSourceOverlay() {
  const bytes = Buffer.from('verified unchanged source frame');
  const hash = sha256(bytes);
  const manifest = {
    authority: { sourceSha256: hash },
    states: [
      {
        key: 'clearance-travel',
        anchor: { capturePath: 'frame.png', captureSha256: hash },
        screenBounds: {
          routeGeometry: {
            cssPixels: { equivalentSelectedCoreThickness: 8.006 },
          },
        },
        cameraPose: { x: 1 },
      },
    ],
  };
  const expected = {
    baseManifestPath: 'docs/hero-reference/recording-anchors.json',
    baseManifestSha256: sha256(Buffer.from(JSON.stringify(manifest))),
    recordingSha256: hash,
    classifierSha256: hash,
  };
  const overlay = {
    schemaVersion: 1,
    status: 'reviewed',
    algorithmRevision: 'connected-component-membership-v2',
    ...expected,
    review: { reviewer: 'independent-reviewer', reviewRef: 'review.md' },
    amendments: [
      {
        stateId: 'clearance-travel',
        inputImage: { path: 'frame.png', sha256: hash },
        changes: [
          {
            jsonPointer:
              '/states/0/screenBounds/routeGeometry/cssPixels/equivalentSelectedCoreThickness',
            recorded: 8.006,
            recomputed: 7.992,
          },
        ],
      },
    ],
  };
  return {
    manifest,
    overlay,
    expected,
    sourceArtifacts: [{ path: 'frame.png', bytes }],
  };
}
test('reviewed source overlay updates only effective measurement, preserving historical manifest', () => {
  const fixture = validSourceOverlay();
  const before = JSON.stringify(fixture.manifest);
  const applied = applySourceMeasurementOverlay(fixture);
  assert.equal(
    applied.states[0].screenBounds.routeGeometry.cssPixels
      .equivalentSelectedCoreThickness,
    7.992,
  );
  assert.equal(JSON.stringify(fixture.manifest), before);
  assert.deepEqual(
    applySourceMeasurementOverlay({ ...fixture, overlay: null }),
    fixture.manifest,
  );
});
test('source overlay rejects hash/approval/state/before-value tampering', () => {
  for (const change of [
    (o) => {
      o.status = 'proposed';
    },
    (o) => {
      delete o.review;
    },
    (o) => {
      o.classifierSha256 = 'a'.repeat(64);
    },
    (o) => {
      o.baseManifestSha256 = 'a'.repeat(64);
    },
    (o) => {
      o.amendments[0].stateId = 'unknown';
    },
    (o) => {
      o.amendments[0].changes[0].recorded = 8;
    },
  ]) {
    const fixture = validSourceOverlay();
    change(fixture.overlay);
    assert.throws(
      () => applySourceMeasurementOverlay(fixture),
      /overlay rejected/,
    );
  }
});
test('source overlay rejects local/camera/control coordinates and conflicting duplicates', () => {
  for (const pointer of [
    '/states/0/cameraPose/x',
    '/structuralAccuracy/route/pixelSupport',
    '/states/0/progress/target',
    '/states/0/screenBounds/routeGeometry/__proto__/x',
    '/states/0/screenBounds/routeGeometry/rasterPixels/start/0',
    '/states/0/screenBounds/fieldProfileComponentProfile/componentCentroid/0',
    '/states/0/screenBounds/fieldProfileComponentProfile/componentCount',
  ]) {
    const fixture = validSourceOverlay();
    fixture.overlay.amendments[0].changes[0].jsonPointer = pointer;
    assert.throws(
      () => applySourceMeasurementOverlay(fixture),
      /overlay rejected/,
    );
  }
  const duplicate = validSourceOverlay();
  duplicate.overlay.amendments[0].changes.push(
    duplicate.overlay.amendments[0].changes[0],
  );
  assert.throws(
    () => applySourceMeasurementOverlay(duplicate),
    /overlay rejected/,
  );
  const corrupted = validSourceOverlay();
  corrupted.sourceArtifacts[0].bytes = Buffer.from('different');
  assert.throws(
    () => applySourceMeasurementOverlay(corrupted),
    /overlay rejected/,
  );
});

// Background admission previously merged the complete ROI into an oversized
// component. These fixtures exercise support and ambiguity, not acceptance.
const neutralFixtureConfig = {
  ...IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE['activation-contact'],
  roi: [0.1, 0.1, 0.8, 0.8], minimumComponentPixels: 20,
  maximumComponentPixels: 5000, maximumComponentWidth: 80,
  maximumComponentHeight: 70, minimumSelectedPixels: 500,
};
function neutralFixture(rects = [], background = [208,225,235]) {
  const info = {width:100,height:80,channels:3};
  const data = new Uint8Array(info.width*info.height*3);
  for(let i=0;i<info.width*info.height;i++)data.set(background,i*3);
  for(const [x,y,w,h,color] of rects)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)data.set(color,(yy*info.width+xx)*3);
  return {data,image:info,dpr:1,config:neutralFixtureConfig};
}
function separateNeutral(fixture) {
  assert.equal(typeof structural.measureBackgroundSeparatedLandmark, 'function', 'background-separated extractor is missing');
  return structural.measureBackgroundSeparatedLandmark(fixture);
}
test('background-separated landmark rejects every saved pale-background sample', () => {
  for(const bg of [[208,225,235],[207,224,234],[206,223,233]]) {
    const r=separateNeutral(neutralFixture([],bg));
    assert.equal(r.debug.mask.reduce((a,b)=>a+b,0),0);
    assert.equal(r.measurement.status,'blocked');
  }
});
test('background separation retains complete neutral support without a source mask', () => {
  const r=separateNeutral(neutralFixture([[30,20,40,35,[230,231,232]]]));
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0),1400);
  assert.deepEqual(r.measurement.bounds.rasterPixels,[30,20,40,35]);
  assert.equal(r.measurement.status,'observed');
  assert.equal(r.qualification.status,'blocked');
  assert.equal(r.measurement.method.semanticMask,null);
});
test('several eligible neutral subjects cannot silently assign a landmark role', () => {
  const r=separateNeutral(neutralFixture([[20,20,25,25,[230,231,232]],[55,20,25,25,[170,180,185]]]));
  assert.equal(r.measurement.status,'blocked');
  assert.match(r.measurement.reason,/ambiguous/i);
});
test('boundary-reaching foreground remains blocked after background removal', () => {
  const r=separateNeutral(neutralFixture([[10,20,30,35,[230,231,232]]]));
  assert.equal(r.qualification.status,'blocked');
  assert.equal(r.debug.quality.touchesBoundary,true);
});
test('unestablished background cannot be replaced with the foreground color', () => {
  const r=separateNeutral(neutralFixture([[10,8,80,64,[230,231,232]]]));
  assert.equal(r.measurement.status,'blocked');
  assert.match(r.measurement.reason,/background/i);
});
test('adjacent background color bins do not invent missing border evidence', () => {
  const f=neutralFixture([[30,20,40,35,[230,231,232]]]);
  for(let y=40;y<80;y++)for(let x=0;x<100;x++) {
    if(x>=30&&x<70&&y<55)continue;
    f.data.set([207,224,234],(y*100+x)*3);
  }
  const r=separateNeutral(f);
  assert.equal(r.measurement.status,'observed');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0),1400);
});
test('candidate filled silhouette includes enclosed logo/window holes', () => {
  const r=separateNeutral(neutralFixture([[30,20,40,35,[230,231,232]],[40,30,8,8,[40,30,220]]]));
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0),1400);
  assert.equal(r.debug.mask[33*100+43],1);
  assert.equal(r.foregroundEvidence.filledInteriorPixels,64);
});
test('candidate hole fill never closes an exterior concave opening', () => {
  const r=separateNeutral(neutralFixture([[30,20,40,35,[230,231,232]],[30,30,15,10,[208,225,235]]]));
  assert.equal(r.debug.mask[34*100+35],0);
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0),1250);
});

// Break caught: a neutral antialias fringe attached to an excluded red rail
// must block use of the otherwise eligible component, without deleting its
// diagnostic support. Literal areas come from the rectangles below.
test('candidate rejects contour-connected red ambiguity while preserving diagnostic building support', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [25,30,5,6,[213,201,213]],
    [20,30,5,6,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'blocked');
  assert.match(r.measurement.reason, /contour.*red|red.*contour/i);
  assert.equal(r.debug.quality.status, 'blocked');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1430);
  assert.equal(r.debug.mask[32*100+25], 1);
  assert.equal(r.debug.mask[32*100+40], 1);
  assert.equal(r.qualification.status, 'blocked');
});

// Break caught: expanding the adjacency search across an unselected gap
// would falsely reject a detached route next to a complete building.
test('candidate does not treat detached red support as contour-connected ambiguity', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [20,30,5,6,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'observed');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1400);
  assert.equal(r.qualification.status, 'blocked');
});

// Break caught: inspecting unfilled color support instead of the outer filled
// contour would misclassify an enclosed logo as a connected external rail.
test('candidate ambiguity handling preserves an enclosed red logo interior', () => {
  const r = separateNeutral(neutralFixture([
    [30,20,40,35,[230,231,232]],
    [40,30,8,8,[255,77,103]],
  ]));
  assert.equal(r.measurement.status, 'observed');
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1400);
  assert.equal(r.foregroundEvidence.filledInteriorPixels, 64);
  assert.equal(r.debug.mask[33*100+43], 1);
});

// Break caught: reporting observed geometry for an ROI-clipped connected
// endpoint invents full-subject separation. Its shaft and endpoint must remain
// diagnostic support until a validated rule can assign their roles.
test('candidate blocks clipped endpoint separation while retaining shaft support', () => {
  const r = separateNeutral(neutralFixture([
    [24,20,40,35,[219,224,226]],
    [7,30,17,15,[244,253,255]],
  ]));
  assert.equal(r.measurement.status, 'blocked');
  assert.match(r.measurement.reason, /boundary|separation/i);
  assert.equal(r.debug.mask.reduce((a,b)=>a+b,0), 1610);
  assert.equal(r.debug.mask[35*100+40], 1);
  assert.equal(r.debug.mask[35*100+10], 1);
  assert.equal(r.foregroundEvidence?.boundarySeparation?.status, 'blocked');
  assert.equal(r.foregroundEvidence?.boundarySeparation?.externalContinuationPixels, 15);
  assert.equal(r.qualification.status, 'blocked');
});
