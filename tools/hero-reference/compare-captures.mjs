import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const workspaceRoot = process.cwd();
const manifestPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-anchors.json',
);
const landingDomReferencePath = path.join(
  workspaceRoot,
  'docs/hero-reference/live/recording-profile-dom.json',
);
const journeyDomReferencePath = path.join(
  workspaceRoot,
  'docs/hero-reference/live/recording-profile-journey-dom.json',
);
const journeyDomProbePath = path.join(
  workspaceRoot,
  'docs/hero-reference/live/journey-dom-probe.json',
);
const captureRoot = path.join(
  workspaceRoot,
  'apps/pegasoft-e2e/test-output/hero-reference/recording',
);
const implementationRoot = path.join(captureRoot, 'implementation');
const measurementRoot = path.join(captureRoot, 'measurements');
const comparisonRoot = path.join(captureRoot, 'comparisons');
const PRELIMINARY_RASTER_THRESHOLDS = {
  meanAbsoluteChannelError: 3,
  rootMeanSquareChannelError: 15,
  changedPixelRatioAt16: 0.03,
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const landingDomReference = JSON.parse(
  await readFile(landingDomReferencePath, 'utf8'),
);
const journeyDomReference = JSON.parse(
  await readFile(journeyDomReferencePath, 'utf8'),
);
const journeyDomProbe = JSON.parse(
  await readFile(journeyDomProbePath, 'utf8'),
);
const journeyProfileStateByKey = new Map(
  journeyDomReference.states.map((state) => [state.key, state]),
);
const journeyProbeStateByKey = new Map(
  journeyDomProbe.states.map((state) => [state.key, state]),
);

if (
  journeyDomReference.captureProfile.viewportCss.width !==
    journeyDomProbe.viewport.width ||
  journeyDomReference.captureProfile.viewportCss.height !==
    journeyDomProbe.viewport.height ||
  journeyDomReference.captureProfile.liveDevicePixelRatio !==
    journeyDomProbe.viewport.dpr
) {
  throw new Error(
    'Journey DOM profile and raw live probe capture profiles do not match',
  );
}

for (const state of journeyDomReference.states) {
  const probeState = journeyProbeStateByKey.get(state.probeStateKey);
  if (!probeState) {
    throw new Error(
      `${state.key}: journey DOM profile references a missing probe state`,
    );
  }
  if (probeState.key !== state.key) {
    throw new Error(
      `${state.key}: journey DOM profile aliases a different probe state`,
    );
  }
}

await mkdir(comparisonRoot, { recursive: true });

function relative(filePath) {
  return path.relative(workspaceRoot, filePath);
}

function createImageBuffers(reference, implementation) {
  const overlay = Buffer.alloc(reference.length);
  const heatmap = Buffer.alloc(reference.length);
  let absoluteError = 0;
  let squaredError = 0;
  let changedPixelCount = 0;
  let maximumChannelError = 0;

  for (let index = 0; index < reference.length; index += 3) {
    const redError = Math.abs(reference[index] - implementation[index]);
    const greenError = Math.abs(
      reference[index + 1] - implementation[index + 1],
    );
    const blueError = Math.abs(
      reference[index + 2] - implementation[index + 2],
    );
    const pixelError = Math.max(redError, greenError, blueError);

    absoluteError += redError + greenError + blueError;
    squaredError +=
      redError * redError +
      greenError * greenError +
      blueError * blueError;
    maximumChannelError = Math.max(maximumChannelError, pixelError);
    if (pixelError > 16) {
      changedPixelCount += 1;
    }

    overlay[index] = Math.round(
      (reference[index] + implementation[index]) / 2,
    );
    overlay[index + 1] = Math.round(
      (reference[index + 1] + implementation[index + 1]) / 2,
    );
    overlay[index + 2] = Math.round(
      (reference[index + 2] + implementation[index + 2]) / 2,
    );

    const amplified = Math.min(255, pixelError * 4);
    heatmap[index] = amplified;
    heatmap[index + 1] = Math.max(0, 196 - amplified);
    heatmap[index + 2] = Math.max(0, 255 - amplified * 2);
  }

  const channelCount = reference.length;
  const pixelCount = channelCount / 3;

  return {
    overlay,
    heatmap,
    metrics: {
      meanAbsoluteChannelError: absoluteError / channelCount,
      rootMeanSquareChannelError: Math.sqrt(squaredError / channelCount),
      maximumChannelError,
      changedPixelRatioAt16: changedPixelCount / pixelCount,
    },
  };
}

function createIdentityMaskAudit(pixelCount) {
  return {
    status: 'blocked',
    applied: false,
    provenance: {
      policyPath: 'docs/hero-reference/comparison-profiles.json',
      liveDomProfiles: [
        relative(landingDomReferencePath),
        relative(journeyDomReferencePath),
      ],
      sourceRasterLayer: 'recording-frame-rgb',
      sourceGlyphAlphaOrMask: null,
      implementationGlyphAlphaOrMask: null,
    },
    maskedPixelCount: 0,
    evaluatedPixelCount: pixelCount,
    maskCoverageRatio: 0,
    blockers: [
      'The recording provides a flattened RGB frame and no pixel-precise source glyph/logo alpha or mask layer.',
      'Color or edge segmentation inside a measured DOM box cannot prove that scene, background, container, or antialiasing pixels are excluded.',
    ],
    prohibitedFallback:
      'No DOM rectangle, inferred text silhouette, or color-threshold region is masked. Raster metrics remain fully unmasked.',
  };
}

function evaluateState(state, metrics) {
  const failures = Object.entries(PRELIMINARY_RASTER_THRESHOLDS)
    .filter(([metric, threshold]) => metrics[metric] > threshold)
    .map(([metric, threshold]) => ({
      metric,
      actual: metrics[metric],
      threshold,
      comparison: 'lte',
    }));
  const hasMeasuredLandmarkBounds =
    state.screenBounds?.status !== 'unknown' &&
    Array.isArray(state.screenBounds?.landmark);
  const hasMeasuredCopyBounds =
    state.activeCopyState?.value === 'none' ||
    (state.screenBounds?.status !== 'unknown' &&
      Array.isArray(state.screenBounds?.copy));

  if (failures.length > 0) {
    return {
      status: 'fail',
      failures,
      blockers: [],
      note: 'The unmasked raster gate already exceeds conservative diagnostic thresholds; structural calibration must precede masked acceptance.',
    };
  }

  const blockers = [];
  if (!hasMeasuredLandmarkBounds) {
    blockers.push('authoritative landmark bounds are unmeasured');
  }
  if (!hasMeasuredCopyBounds) {
    blockers.push('authoritative copy bounds are unmeasured');
  }

  if (blockers.length > 0) {
    return {
      status: 'blocked',
      failures: [],
      blockers,
      note: 'Raster diagnostics are within the preliminary gate, but the accuracy contract cannot pass without authoritative structural measurements.',
    };
  }

  return {
    status: 'pass',
    failures: [],
    blockers: [],
    note: 'Preliminary raster and available structural prerequisites pass. State-specific accuracy metrics remain the authoritative final gate.',
  };
}

const BOUND_COMPONENTS = ['x', 'y', 'width', 'height'];

function compareScalar(metric, expected, actual, tolerance) {
  const delta = actual - expected;

  return {
    metric,
    expected,
    actual,
    delta,
    absoluteDelta: Math.abs(delta),
    tolerance,
    status: Math.abs(delta) <= tolerance ? 'pass' : 'fail',
  };
}

function appendBoundsChecks({
  checks,
  failures,
  metricPrefix,
  label,
  expected,
  actual,
  components,
  tolerance,
}) {
  if (!actual) {
    failures.push({
      metric: metricPrefix,
      label,
      reason: 'missing-implementation-element',
    });
    return;
  }

  for (const component of components) {
    if (typeof actual[component] !== 'number') {
      failures.push({
        metric: `${metricPrefix}.${component}`,
        label,
        reason: 'missing-implementation-measurement',
      });
      continue;
    }

    checks.push(
      compareScalar(
        `${metricPrefix}.${component}`,
        expected[component],
        actual[component],
        tolerance,
      ),
    );
  }
}

function appendFailedChecks(checks, failures) {
  failures.push(
    ...checks
      .filter((check) => check.status === 'fail')
      .map((check) => ({
        metric: check.metric,
        expected: check.expected,
        actual: check.actual,
        absoluteDelta: check.absoluteDelta,
        tolerance: check.tolerance,
        reason: 'outside-tolerance',
      })),
  );
}

function evaluateLandingDomLayout(stateKey, measurement) {
  const applicable =
    landingDomReference.acceptance.applicableStates.includes(stateKey);

  if (!applicable) {
    return null;
  }

  if (!measurement) {
    return {
      status: 'blocked',
      referencePath: relative(landingDomReferencePath),
      note: 'The implementation measurement artifact is missing.',
      checks: [],
      failures: [
        {
          metric: 'measurement-artifact',
          reason: 'missing',
        },
      ],
    };
  }

  const tolerance =
    landingDomReference.acceptance.boundsToleranceCssPx;
  const checks = [
    compareScalar(
      'viewport.width',
      landingDomReference.captureProfile.viewportCss.width,
      measurement.viewport.width,
      tolerance,
    ),
    compareScalar(
      'viewport.height',
      landingDomReference.captureProfile.viewportCss.height,
      measurement.viewport.height,
      tolerance,
    ),
    compareScalar(
      'viewport.devicePixelRatio',
      landingDomReference.captureProfile
        .implementationCaptureDevicePixelRatio,
      measurement.viewport.devicePixelRatio,
      0,
    ),
    compareScalar(
      'scroll.x',
      landingDomReference.captureProfile.scrollCss.x,
      measurement.scroll.x,
      tolerance,
    ),
    compareScalar(
      'scroll.y',
      landingDomReference.captureProfile.scrollCss.y,
      measurement.scroll.y,
      tolerance,
    ),
  ];
  const failures = [];

  for (const [key, reference] of Object.entries(
    landingDomReference.bounds,
  )) {
    appendBoundsChecks({
      checks,
      failures,
      metricPrefix: `bounds.${key}`,
      label: reference.label,
      expected: reference.value,
      actual: measurement.bounds?.[key],
      components: BOUND_COMPONENTS,
      tolerance,
    });
  }

  appendFailedChecks(checks, failures);

  return {
    status: failures.length === 0 ? 'pass' : 'fail',
    profile: 'landing',
    referencePath: relative(landingDomReferencePath),
    implementationMeasurementPath: relative(
      path.join(measurementRoot, `${stateKey}.json`),
    ),
    boundsToleranceCssPx: tolerance,
    note:
      failures.length === 0
        ? 'All authoritative live DOM bounds pass independently.'
        : 'One or more authoritative live DOM bounds fail. Raster and WebGL gates remain independent.',
    checks,
    failures,
  };
}

function evaluateJourneyDomLayout(stateKey, measurement) {
  const profileState = journeyProfileStateByKey.get(stateKey);
  if (!profileState) {
    return null;
  }

  const probeState = journeyProbeStateByKey.get(
    profileState.probeStateKey,
  );
  if (!probeState) {
    throw new Error(
      `${stateKey}: journey DOM profile references a missing probe state`,
    );
  }

  if (!measurement) {
    return {
      status: 'blocked',
      profile: 'journey',
      referencePath: relative(journeyDomReferencePath),
      probePath: relative(journeyDomProbePath),
      note: 'The implementation measurement artifact is missing.',
      checks: [],
      failures: [
        {
          metric: 'measurement-artifact',
          reason: 'missing',
        },
      ],
    };
  }

  const boundsTolerance =
    journeyDomReference.acceptance.boundsToleranceCssPx;
  const scrollTolerance =
    journeyDomReference.acceptance.scrollToleranceCssPx;
  const activeStepIndexTolerance =
    journeyDomReference.acceptance.activeStepIndexTolerance;
  const checks = [
    compareScalar(
      'viewport.width',
      journeyDomReference.captureProfile.viewportCss.width,
      measurement.viewport.width,
      boundsTolerance,
    ),
    compareScalar(
      'viewport.height',
      journeyDomReference.captureProfile.viewportCss.height,
      measurement.viewport.height,
      boundsTolerance,
    ),
    compareScalar(
      'viewport.devicePixelRatio',
      journeyDomReference.captureProfile
        .implementationCaptureDevicePixelRatio,
      measurement.viewport.devicePixelRatio,
      0,
    ),
    compareScalar(
      'scroll.x',
      0,
      measurement.scroll.x,
      scrollTolerance,
    ),
    compareScalar(
      'scroll.y',
      probeState.actualScrollY,
      measurement.scroll.y,
      scrollTolerance,
    ),
  ];
  const failures = [];
  const processSteps = measurement.processSteps ?? [];
  const activeStepIndexes = processSteps
    .map((step, index) => (step.active ? index : -1))
    .filter((index) => index >= 0);

  if (activeStepIndexes.length !== 1) {
    failures.push({
      metric: 'processSteps.activeCount',
      expected: 1,
      actual: activeStepIndexes.length,
      reason: 'active-step-count-mismatch',
    });
  }

  const activeStepIndex = activeStepIndexes[0];
  if (activeStepIndex !== undefined) {
    checks.push(
      compareScalar(
        'processSteps.activeIndex',
        probeState.activeStepIndex,
        activeStepIndex,
        activeStepIndexTolerance,
      ),
    );

    const activeStep = processSteps[activeStepIndex];
    for (const mapping of journeyDomReference.boxMappings) {
      appendBoundsChecks({
        checks,
        failures,
        metricPrefix: `processSteps.active.${mapping.id}`,
        label: mapping.id,
        expected: probeState[mapping.probeField],
        actual: activeStep?.[mapping.implementationField],
        components: mapping.components,
        tolerance: boundsTolerance,
      });
    }
  }

  appendFailedChecks(checks, failures);

  return {
    status: failures.length === 0 ? 'pass' : 'fail',
    profile: 'journey',
    referencePath: relative(journeyDomReferencePath),
    probePath: relative(journeyDomProbePath),
    implementationMeasurementPath: relative(
      path.join(measurementRoot, `${stateKey}.json`),
    ),
    sourceTarget: profileState.target,
    sourceScrollY: probeState.actualScrollY,
    sourceActiveStepIndex: probeState.activeStepIndex,
    boundsToleranceCssPx: boundsTolerance,
    scrollToleranceCssPx: scrollTolerance,
    identityExclusions: journeyDomReference.identityExclusions,
    note:
      failures.length === 0
        ? 'All promoted live journey DOM layout gates pass independently.'
        : 'One or more promoted live journey DOM layout gates fail. Identity exclusions do not waive container layout, raster, or WebGL gates.',
    checks,
    failures,
  };
}

function evaluateDomLayout(stateKey, measurement) {
  const landing = evaluateLandingDomLayout(stateKey, measurement);
  if (landing) {
    return landing;
  }

  const journey = evaluateJourneyDomLayout(stateKey, measurement);
  if (journey) {
    return journey;
  }

  return {
    status: 'not-applicable',
    referencePaths: [
      relative(landingDomReferencePath),
      relative(journeyDomReferencePath),
    ],
    note: 'No locked live DOM profile covers this state.',
    checks: [],
    failures: [],
  };
}

const states = [];

for (const state of manifest.states) {
  const referencePath = path.join(
    workspaceRoot,
    state.anchor.capturePath,
  );
  const implementationPath = path.join(
    implementationRoot,
    `${state.key}.png`,
  );
  const measurementPath = path.join(
    measurementRoot,
    `${state.key}.json`,
  );
  let measurement = null;
  try {
    measurement = JSON.parse(await readFile(measurementPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  const referenceImage = await sharp(referencePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const implementationImage = await sharp(implementationPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    referenceImage.info.width !== implementationImage.info.width ||
    referenceImage.info.height !== implementationImage.info.height ||
    referenceImage.info.channels !== implementationImage.info.channels
  ) {
    throw new Error(
      `${state.key}: capture dimensions do not match the recording anchor`,
    );
  }

  const { overlay, heatmap, metrics } = createImageBuffers(
    referenceImage.data,
    implementationImage.data,
  );
  const imageOptions = {
    raw: {
      width: referenceImage.info.width,
      height: referenceImage.info.height,
      channels: 3,
    },
  };
  const overlayPath = path.join(
    comparisonRoot,
    `${state.key}-overlay.png`,
  );
  const heatmapPath = path.join(
    comparisonRoot,
    `${state.key}-heatmap.png`,
  );

  await sharp(overlay, imageOptions).png().toFile(overlayPath);
  await sharp(heatmap, imageOptions).png().toFile(heatmapPath);

  const acceptance = evaluateState(state, metrics);
  const domLayout = evaluateDomLayout(state.key, measurement);
  const identityMask = createIdentityMaskAudit(
    referenceImage.info.width * referenceImage.info.height,
  );

  states.push({
    key: state.key,
    authority: {
      recordingSha256: manifest.authority.sourceSha256,
      decodedFrameIndex: state.anchor.decodedFrameIndex,
      timestampSeconds: state.anchor.timestampSeconds,
      referencePath: state.anchor.capturePath,
    },
    implementationPath: relative(implementationPath),
    overlayPath: relative(overlayPath),
    heatmapPath: relative(heatmapPath),
    raster: {
      width: referenceImage.info.width,
      height: referenceImage.info.height,
      devicePixelRatio:
        manifest.authority.recordingProfile.devicePixelRatio.value,
    },
    metrics,
    metricsBasis: 'unmasked-raster',
    identityMask,
    preliminaryRasterThresholds: PRELIMINARY_RASTER_THRESHOLDS,
    domLayout,
    acceptance,
  });
}

const summary = states.reduce(
  (counts, state) => {
    counts[state.acceptance.status] += 1;
    return counts;
  },
  { pass: 0, fail: 0, blocked: 0 },
);
const domSummary = states.reduce(
  (counts, state) => {
    const status = state.domLayout.status;
    counts[status] += 1;
    return counts;
  },
  { pass: 0, fail: 0, blocked: 0, 'not-applicable': 0 },
);
const rasterStructuralGateSatisfied =
  summary.fail === 0 && summary.blocked === 0;
const domLayoutGateSatisfied =
  domSummary.fail === 0 && domSummary.blocked === 0;
const report = {
  schemaVersion: 4,
  generatedFrom: {
    manifestPath: relative(manifestPath),
    landingDomReferencePath: relative(landingDomReferencePath),
    journeyDomReferencePath: relative(journeyDomReferencePath),
    journeyDomProbePath: relative(journeyDomProbePath),
    recordingSha256: manifest.authority.sourceSha256,
  },
  authorityPolicy:
    'The recording and live site remain authoritative. Implementation captures, overlays, heatmaps, and this report are reproducible diagnostics.',
  identityMaskPolicy: {
    status: 'blocked',
    appliedMaskedPixelCount: 0,
    perStateRasterPixelCount:
      states[0].identityMask.evaluatedPixelCount,
    reportRasterPixelCount: states.reduce(
      (count, state) =>
        count + state.identityMask.evaluatedPixelCount,
      0,
    ),
    policy:
      'Only proven glyph/logo pixels may be masked. No flattened recording pixel is masked without a pixel-precise source alpha or mask layer.',
    consequence:
      'Every raster metric in this report remains unmasked; DOM identity exclusions affect only explicitly named DOM width/text checks.',
  },
  summary,
  domSummary,
  rasterStructuralGateSatisfied,
  domLayoutGateSatisfied,
  gateSatisfied:
    rasterStructuralGateSatisfied && domLayoutGateSatisfied,
  states,
};
const reportPath = path.join(captureRoot, 'comparison-report.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(
  `Compared ${states.length} states (raster/structure: ${summary.pass} pass, ${summary.fail} fail, ${summary.blocked} blocked; DOM: ${domSummary.pass} pass, ${domSummary.fail} fail, ${domSummary.blocked} blocked, ${domSummary['not-applicable']} not applicable); report: ${relative(reportPath)}`,
);

if (!report.gateSatisfied) {
  process.exitCode = 1;
}
