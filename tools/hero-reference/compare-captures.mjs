import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { SCREEN_COMPOSITION_CONFIG } from '../../apps/pegasoft-e2e/src/visual/screen-composition.mjs';
import {
  IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE,
  LANDMARK_CONFIG_BY_STATE,
  ROUTE_CONFIG_BY_STATE,
  measureLandmarkFeature,
} from '../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';

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
const captureManifestPath = path.join(captureRoot, 'capture-manifest.json');
const PRELIMINARY_RASTER_THRESHOLDS = {
  meanAbsoluteChannelError: 3,
  rootMeanSquareChannelError: 15,
  changedPixelRatioAt16: 0.03,
};
const STRUCTURAL_TOLERANCES = {
  compositionCentroidNormalized: 0.0075,
  negativeSpaceOccupancy: 0.03,
  copyBoundsCssPixels: 2,
  landmarkEdgeSupportIouDiagnosticMinimum: 0.9,
  landmarkCenterNormalized: 0.0075,
  landmarkSilhouetteIouMinimum: 0.9,
  landmarkSizeRatio: 0.02,
  routeDirectionDegrees: 1,
  routeEndpointNormalized: 0.005,
  routeThicknessCssPixelsMinimum: 1,
  routeThicknessRatio: 0.1,
  sectionBoundaryBoundsCssPixels: 2,
};
const IMPLEMENTATION_ROUTE_STATES = new Set(Object.keys(ROUTE_CONFIG_BY_STATE));
const IMPLEMENTATION_LANDMARK_STATES = new Set([
  ...Object.keys(LANDMARK_CONFIG_BY_STATE),
  ...Object.keys(IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE),
]);
const IMPLEMENTATION_COPY_STATES = new Set([
  'landing',
  'landing-idle',
  'activation-route',
  'activation-contact',
  'clearance-travel',
  'clearance-field-preview',
  'field-approach',
  'field-contact',
  'field-pulse-a',
  'field-pulse-b',
  'arrival-lockup',
]);

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const captureManifest = JSON.parse(await readFile(captureManifestPath, 'utf8'));
const landingDomReference = JSON.parse(
  await readFile(landingDomReferencePath, 'utf8'),
);
const journeyDomReference = JSON.parse(
  await readFile(journeyDomReferencePath, 'utf8'),
);
const journeyDomProbe = JSON.parse(await readFile(journeyDomProbePath, 'utf8'));
const journeyProfileStateByKey = new Map(
  journeyDomReference.states.map((state) => [state.key, state]),
);
const journeyProbeStateByKey = new Map(
  journeyDomProbe.states.map((state) => [state.key, state]),
);

function isObservedScreenComposition(composition) {
  return (
    composition?.status === 'observed' &&
    composition.evidenceClass === 'observed' &&
    composition.label === SCREEN_COMPOSITION_CONFIG.label &&
    Number.isSafeInteger(composition.edgePixelSupport) &&
    composition.edgePixelSupport >=
      SCREEN_COMPOSITION_CONFIG.minimumEdgePixels &&
    Number.isFinite(composition.edgeDensity) &&
    composition.edgeDensity >= 0 &&
    composition.edgeDensity <= 1 &&
    Array.isArray(composition.edgeCentroid?.normalized) &&
    composition.edgeCentroid.normalized.length === 2 &&
    composition.edgeCentroid.normalized.every(
      (component) =>
        Number.isFinite(component) && component >= 0 && component <= 1,
    ) &&
    composition.grid?.columns === SCREEN_COMPOSITION_CONFIG.gridColumns &&
    composition.grid?.rows === SCREEN_COMPOSITION_CONFIG.gridRows &&
    Array.isArray(composition.grid.cells) &&
    composition.grid.cells.length ===
      SCREEN_COMPOSITION_CONFIG.gridColumns *
        SCREEN_COMPOSITION_CONFIG.gridRows &&
    composition.grid.cells.every(
      (cell, index) =>
        cell.column === index % SCREEN_COMPOSITION_CONFIG.gridColumns &&
        cell.row ===
          Math.floor(index / SCREEN_COMPOSITION_CONFIG.gridColumns) &&
        Number.isSafeInteger(cell.edgePixels) &&
        cell.edgePixels >= 0 &&
        Number.isFinite(cell.edgeDensity) &&
        cell.edgeDensity >= 0 &&
        cell.edgeDensity <= 1 &&
        Number.isFinite(cell.edgeShare) &&
        cell.edgeShare >= 0 &&
        cell.edgeShare <= 1 &&
        Number.isFinite(cell.negativeSpaceProxy) &&
        cell.negativeSpaceProxy >= 0 &&
        cell.negativeSpaceProxy <= 1,
    ) &&
    composition.method?.id === 'screen-space-sobel-grid' &&
    composition.method.sobelThreshold ===
      SCREEN_COMPOSITION_CONFIG.sobelThreshold &&
    composition.method.minimumEdgePixels ===
      SCREEN_COMPOSITION_CONFIG.minimumEdgePixels &&
    Array.isArray(composition.method.roiNormalized) &&
    composition.method.roiNormalized.length ===
      SCREEN_COMPOSITION_CONFIG.roi.length &&
    composition.method.roiNormalized.every(
      (value, index) => value === SCREEN_COMPOSITION_CONFIG.roi[index],
    )
  );
}

function isFiniteTuple(value, length) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((component) => Number.isFinite(component))
  );
}

function isValidStructuralFeature(feature, sourceArtifact, methodId) {
  if (
    !feature ||
    feature.sourceArtifact !== sourceArtifact ||
    feature.method?.id !== methodId ||
    !['observed', 'blocked'].includes(feature.status)
  ) {
    return false;
  }
  if (feature.status === 'blocked') {
    return typeof feature.reason === 'string' && feature.reason.length > 0;
  }
  return (
    feature.evidenceClass === 'observed' &&
    Number.isSafeInteger(feature.pixelSupport) &&
    feature.pixelSupport > 0 &&
    isFiniteTuple(feature.bounds?.rasterPixels, 4) &&
    isFiniteTuple(feature.bounds?.cssPixels, 4) &&
    isFiniteTuple(feature.bounds?.normalized, 4)
  );
}

function isValidRouteFeature(feature, sourceArtifact, stateKey) {
  const config = ROUTE_CONFIG_BY_STATE[stateKey];
  if (
    !config ||
    !isValidStructuralFeature(feature, sourceArtifact, config.method) ||
    feature.label !== config.label ||
    !isFiniteTuple(feature.method?.roiNormalized, 4) ||
    feature.method.roiNormalized.some(
      (component, index) => component !== config.roi[index],
    )
  ) {
    return false;
  }
  if (feature.status === 'blocked') {
    return true;
  }
  return (
    feature.method.predicate?.id === config.predicate.id &&
    feature.method.minimumComponentPixels === config.minimumComponentPixels &&
    feature.method.minimumSelectedPixels === config.minimumSelectedPixels &&
    isFiniteTuple(feature.geometry?.rasterPixels?.start, 2) &&
    isFiniteTuple(feature.geometry?.rasterPixels?.end, 2) &&
    isFiniteTuple(feature.geometry?.rasterPixels?.direction, 2) &&
    isFiniteTuple(feature.geometry?.cssPixels?.start, 2) &&
    isFiniteTuple(feature.geometry?.cssPixels?.end, 2) &&
    Number.isFinite(feature.geometry?.cssPixels?.principalSpan) &&
    Number.isFinite(
      feature.geometry?.cssPixels?.equivalentSelectedCoreThickness,
    ) &&
    isFiniteTuple(feature.geometry?.normalized?.start, 2) &&
    isFiniteTuple(feature.geometry?.normalized?.end, 2)
  );
}

function isValidLandmarkFeature(feature, sourceArtifact, stateKey) {
  const transferableConfig = LANDMARK_CONFIG_BY_STATE[stateKey];
  const semanticBlocker =
    IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE[stateKey];

  if (semanticBlocker) {
    return (
      isValidStructuralFeature(
        feature,
        sourceArtifact,
        semanticBlocker.method.id,
      ) &&
      feature.status === 'blocked' &&
      feature.label === semanticBlocker.label &&
      feature.reason === semanticBlocker.reason &&
      feature.method.sourceMethod === semanticBlocker.method.sourceMethod
    );
  }

  if (
    !transferableConfig ||
    !isValidStructuralFeature(
      feature,
      sourceArtifact,
      transferableConfig.method,
    ) ||
    feature.label !== transferableConfig.label ||
    !isFiniteTuple(feature.method?.roiNormalized, 4) ||
    feature.method.roiNormalized.some(
      (component, index) => component !== transferableConfig.roi[index],
    )
  ) {
    return false;
  }
  if (feature.status === 'blocked') {
    return true;
  }

  if (transferableConfig.method === 'largest-dilated-sobel-component') {
    return (
      feature.method.sobelThreshold === transferableConfig.sobelThreshold &&
      feature.method.dilationIterations ===
        transferableConfig.dilationIterations &&
      feature.method.minimumComponentPixels ===
        transferableConfig.minimumComponentPixels &&
      feature.method.minimumSelectedPixels ===
        transferableConfig.minimumSelectedPixels
    );
  }

  return (
    feature.method.predicate?.id === transferableConfig.predicate.id &&
    feature.method.minimumComponentPixels ===
      transferableConfig.minimumComponentPixels &&
    feature.method.minimumSelectedPixels ===
      transferableConfig.minimumSelectedPixels
  );
}

function verifyMeasurementSemantics(stateKey, artifact) {
  let measurement;
  try {
    measurement = JSON.parse(artifact.toString('utf8'));
  } catch {
    throw new Error(`${stateKey}: measurement artifact is not valid JSON`);
  }

  const recordingProfile = manifest.authority.recordingProfile;
  const state = measurement.state;
  const surface = measurement.renderSurface;
  const screenComposition = measurement.structuralAccuracy?.screenComposition;
  const expectedSourceArtifact = path.posix.join(
    'implementation',
    `${stateKey}.png`,
  );
  const copyFeature = measurement.structuralAccuracy?.copy;
  const landmarkFeature = measurement.structuralAccuracy?.landmark;
  const routeFeature = measurement.structuralAccuracy?.route;
  const boundaryFeature = measurement.structuralAccuracy?.boundary;
  const validRouteFeature = IMPLEMENTATION_ROUTE_STATES.has(stateKey)
    ? isValidRouteFeature(routeFeature, expectedSourceArtifact, stateKey)
    : routeFeature === undefined;
  const validLandmarkFeature = IMPLEMENTATION_LANDMARK_STATES.has(stateKey)
    ? isValidLandmarkFeature(landmarkFeature, expectedSourceArtifact, stateKey)
    : landmarkFeature === undefined;
  const validCopyFeature = IMPLEMENTATION_COPY_STATES.has(stateKey)
    ? isValidStructuralFeature(
        copyFeature,
        expectedSourceArtifact,
        'predicate-component-union',
      )
    : copyFeature === undefined;
  const validBoundaryFeature =
    stateKey === 'journey-exit'
      ? isValidStructuralFeature(
          boundaryFeature,
          expectedSourceArtifact,
          'dominant-horizontal-boundary',
        )
      : boundaryFeature === undefined;
  const validSurface =
    surface?.kind === 'canvas' &&
    surface.canvasPresent === true &&
    surface.webglContextAvailable === true &&
    ['webgl', 'webgl2'].includes(surface.webglContextType) &&
    surface.webglContextLost === false &&
    Number.isSafeInteger(surface.width) &&
    surface.width > 0 &&
    Number.isSafeInteger(surface.height) &&
    surface.height > 0 &&
    Boolean(measurement.bounds?.canvas);

  if (
    measurement.schemaVersion !== 5 ||
    measurement.structuralAccuracy?.schemaVersion !== 4 ||
    !isObservedScreenComposition(screenComposition) ||
    screenComposition.sourceArtifact !== expectedSourceArtifact ||
    !validLandmarkFeature ||
    !validRouteFeature ||
    !validCopyFeature ||
    !validBoundaryFeature ||
    measurement.stateKey !== stateKey ||
    measurement.viewport?.width !== recordingProfile.cssViewport.width ||
    measurement.viewport?.height !== recordingProfile.cssViewport.height ||
    measurement.viewport?.devicePixelRatio !==
      recordingProfile.devicePixelRatio.value ||
    state?.['data-hero-reference-state'] !== stateKey ||
    state?.['data-hero-render-ready'] !== 'true' ||
    state?.['data-hero-motion'] !== 'full' ||
    state?.['data-hero-profile'] !== 'recording-desktop' ||
    state?.['data-hero-seed'] !== '43117' ||
    !validSurface
  ) {
    throw new Error(
      `${stateKey}: measurement does not prove a ready full-motion recording-desktop WebGL canvas`,
    );
  }
}

async function verifyCaptureArtifact(stateKey, kind, evidence) {
  const expectedRelativePath = path.posix.join(
    kind === 'implementation' ? 'implementation' : 'measurements',
    `${stateKey}.${kind === 'implementation' ? 'png' : 'json'}`,
  );

  if (
    !evidence ||
    evidence.path !== expectedRelativePath ||
    !Number.isSafeInteger(evidence.bytes) ||
    evidence.bytes <= 0 ||
    !/^[a-f0-9]{64}$/u.test(evidence.sha256)
  ) {
    throw new Error(
      `${stateKey}: capture manifest has invalid ${kind} evidence`,
    );
  }

  const artifact = await readFile(path.join(captureRoot, expectedRelativePath));
  const sha256 = createHash('sha256').update(artifact).digest('hex');

  if (artifact.byteLength !== evidence.bytes || sha256 !== evidence.sha256) {
    throw new Error(
      `${stateKey}: ${kind} artifact does not match the completed capture manifest`,
    );
  }

  if (kind === 'measurement') {
    verifyMeasurementSemantics(stateKey, artifact);
  }
}

async function verifyCaptureManifest() {
  const expectedKeys = manifest.states.map((state) => state.key);
  const capturedKeys = Array.isArray(captureManifest.states)
    ? captureManifest.states.map((state) => state.key)
    : [];
  const captureStartedAt = Date.parse(captureManifest.startedAt);
  const captureCompletedAt = Date.parse(captureManifest.completedAt);
  const validRunId =
    typeof captureManifest.runId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      captureManifest.runId,
    );
  const validRunWindow =
    Number.isFinite(captureStartedAt) &&
    Number.isFinite(captureCompletedAt) &&
    captureStartedAt <= captureCompletedAt;

  if (
    captureManifest.schemaVersion !== 5 ||
    captureManifest.status !== 'complete' ||
    !validRunId ||
    !validRunWindow ||
    captureManifest.expectedStateCount !== expectedKeys.length ||
    captureManifest.capturedStateCount !== expectedKeys.length ||
    capturedKeys.length !== expectedKeys.length ||
    capturedKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(
      'Capture manifest is incomplete or does not match the authoritative state order',
    );
  }

  await Promise.all(
    captureManifest.states.flatMap((state) => [
      verifyCaptureArtifact(state.key, 'implementation', state.implementation),
      verifyCaptureArtifact(state.key, 'measurement', state.measurement),
    ]),
  );
}

await verifyCaptureManifest();

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
      redError * redError + greenError * greenError + blueError * blueError;
    maximumChannelError = Math.max(maximumChannelError, pixelError);
    if (pixelError > 16) {
      changedPixelCount += 1;
    }

    overlay[index] = Math.round((reference[index] + implementation[index]) / 2);
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

function createLandmarkMaskComparison(referenceMask, implementationMask) {
  assert.equal(referenceMask.length, implementationMask.length);
  const comparison = Buffer.alloc(referenceMask.length * 3);

  for (let index = 0; index < referenceMask.length; index += 1) {
    const outputIndex = index * 3;
    const referenceSelected = referenceMask[index] === 1;
    const implementationSelected = implementationMask[index] === 1;
    const color =
      referenceSelected && implementationSelected
        ? [245, 245, 245]
        : referenceSelected
          ? [255, 64, 192]
          : implementationSelected
            ? [0, 200, 255]
            : [14, 16, 20];

    comparison[outputIndex] = color[0];
    comparison[outputIndex + 1] = color[1];
    comparison[outputIndex + 2] = color[2];
  }

  return comparison;
}

function countMaskOverlap(referenceMask, implementationMask) {
  assert.equal(referenceMask.length, implementationMask.length);
  let referencePixelSupport = 0;
  let implementationPixelSupport = 0;
  let intersectionPixelCount = 0;
  let unionPixelCount = 0;

  for (let index = 0; index < referenceMask.length; index += 1) {
    const referenceSelected = referenceMask[index] === 1;
    const implementationSelected = implementationMask[index] === 1;
    referencePixelSupport += Number(referenceSelected);
    implementationPixelSupport += Number(implementationSelected);
    intersectionPixelCount += Number(
      referenceSelected && implementationSelected,
    );
    unionPixelCount += Number(referenceSelected || implementationSelected);
  }

  return {
    referencePixelSupport,
    implementationPixelSupport,
    intersectionPixelCount,
    unionPixelCount,
    iou:
      unionPixelCount === 0 ? null : intersectionPixelCount / unionPixelCount,
  };
}

function measureLandmarkMaskEvidence({
  state,
  measurement,
  referenceImage,
  implementationImage,
  dpr,
}) {
  const config = LANDMARK_CONFIG_BY_STATE[state.key];
  if (!config) {
    return null;
  }

  const referenceResult = measureLandmarkFeature({
    data: referenceImage.data,
    image: referenceImage.info,
    dpr,
    config,
  });
  const implementationResult = measureLandmarkFeature({
    data: implementationImage.data,
    image: implementationImage.info,
    dpr,
    config,
  });
  const referenceMeasurement = referenceResult.measurement;
  const implementationMeasurement = implementationResult.measurement;
  const recordedImplementation = measurement?.structuralAccuracy?.landmark;
  const sourceBounds = state.screenBounds?.landmark;

  assert.equal(
    referenceMeasurement.status,
    'observed',
    `${state.key}: transferable landmark measurement no longer observes the locked recording anchor`,
  );
  assert.deepEqual(
    referenceMeasurement.bounds.cssPixels,
    sourceBounds,
    `${state.key}: recomputed recording landmark bounds drifted from the locked manifest`,
  );
  assert.ok(
    recordedImplementation,
    `${state.key}: capture did not record a landmark measurement`,
  );
  const recordedImplementationCore = Object.fromEntries(
    Object.entries(recordedImplementation).filter(
      ([property]) => property !== 'sourceArtifact',
    ),
  );
  assert.deepEqual(
    implementationMeasurement,
    recordedImplementationCore,
    `${state.key}: recomputed implementation landmark measurement drifted from the capture record`,
  );

  const semanticRole = config.method.includes('chroma')
    ? 'silhouette'
    : 'edge-support-proxy';
  const overlap = countMaskOverlap(
    referenceResult.debug.mask,
    implementationResult.debug.mask,
  );
  const status =
    implementationMeasurement.status === 'observed' &&
    Number.isFinite(overlap.iou)
      ? 'observed'
      : 'blocked';

  return {
    evidence: {
      status,
      evidenceClass: status === 'observed' ? 'observed' : 'blocked',
      semanticRole,
      label: config.label,
      method: {
        id: config.method,
        sharedImplementation:
          'apps/pegasoft-e2e/src/visual/screen-structural-features.mjs#measureLandmarkFeature',
        sourceSemanticMask: null,
      },
      reference: {
        artifactPath: state.anchor.capturePath,
        bounds: referenceMeasurement.bounds,
        pixelSupport: overlap.referencePixelSupport,
      },
      implementation: {
        artifactPath: relative(
          path.join(implementationRoot, `${state.key}.png`),
        ),
        bounds:
          implementationMeasurement.status === 'observed'
            ? implementationMeasurement.bounds
            : null,
        pixelSupport: overlap.implementationPixelSupport,
      },
      overlap: {
        intersectionPixelCount: overlap.intersectionPixelCount,
        unionPixelCount: overlap.unionPixelCount,
        iou: overlap.iou,
      },
      reason:
        status === 'blocked'
          ? (implementationMeasurement.reason ??
            'The implementation landmark mask is unavailable.')
          : null,
      qualification:
        status === 'blocked'
          ? 'The shared chroma predicate observes the locked source landmark, but the implementation fails the unchanged source-pixel quality gate; the emitted comparison remains blocker evidence.'
          : semanticRole === 'silhouette'
            ? 'The shared chroma predicate isolates the same landmark role in the locked recording and implementation rasters; overlap is eligible for silhouette IoU evaluation.'
            : 'Sobel selects observable edge support, not a filled semantic silhouette. Its IoU is diagnostic and cannot satisfy silhouette acceptance.',
    },
    comparison: createLandmarkMaskComparison(
      referenceResult.debug.mask,
      implementationResult.debug.mask,
    ),
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

function evaluatePreliminaryRaster(metrics) {
  const failures = Object.entries(PRELIMINARY_RASTER_THRESHOLDS)
    .filter(([metric, threshold]) => metrics[metric] > threshold)
    .map(([metric, threshold]) => ({
      metric,
      actual: metrics[metric],
      threshold,
      comparison: 'lte',
    }));
  if (failures.length > 0) {
    return {
      status: 'fail',
      failures,
      note: 'The full-frame unmasked raster exceeds one or more conservative preliminary thresholds.',
    };
  }

  return {
    status: 'pass',
    failures: [],
    note: 'The full-frame unmasked raster is within preliminary diagnostic thresholds. This is not structural or final visual acceptance.',
  };
}

function evaluateStructuralAccuracy(state, measurement, landmarkMaskEvidence) {
  const blockers = [];
  const checks = [];
  const failures = [];
  const primaryStructure = state.screenBounds?.primaryStructure ?? {
    kind: 'landmark',
    status: 'blocked',
  };
  const primaryBounds = state.screenBounds?.[primaryStructure.kind];
  const sourcePrimaryMeasured =
    primaryStructure.status === 'observed' && Array.isArray(primaryBounds);
  const sourceRouteMeasured =
    state.screenBounds?.routeStatus === 'observed' ||
    state.screenBounds?.routeStatus === 'not-applicable';
  const sourceCopyMeasured =
    state.activeCopyState?.value === 'none' ||
    Array.isArray(state.screenBounds?.copy);
  const sourceComposition = state.screenComposition;
  const sourceCompositionMeasured =
    isObservedScreenComposition(sourceComposition) &&
    typeof sourceComposition.evidenceRef === 'string';
  const implementationStructural = measurement?.structuralAccuracy;
  const implementationComposition = implementationStructural?.screenComposition;
  const implementationCompositionMeasured = isObservedScreenComposition(
    implementationComposition,
  );
  const implementationPrimaryMeasured =
    implementationStructural?.[primaryStructure.kind]?.status === 'observed';
  const implementationPrimaryBlocked =
    implementationStructural?.[primaryStructure.kind]?.status === 'blocked';

  if (!sourcePrimaryMeasured) {
    blockers.push(
      `authoritative source ${primaryStructure.kind} primary-structure bounds are unmeasured`,
    );
  }
  if (!sourceRouteMeasured) {
    blockers.push('authoritative source route bounds are unmeasured');
  }
  if (!sourceCopyMeasured) {
    blockers.push('authoritative source copy bounds are unmeasured');
  }
  if (!sourceCompositionMeasured) {
    blockers.push(
      'authoritative source screen-space composition proxy is unmeasured',
    );
  }
  if (sourcePrimaryMeasured && !implementationPrimaryMeasured) {
    blockers.push(
      primaryStructure.kind === 'route'
        ? implementationPrimaryBlocked
          ? 'implementation route source-predicate quality gate is blocked'
          : 'implementation route bounds are not emitted'
        : primaryStructure.kind === 'landmark' && implementationPrimaryBlocked
          ? IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE[state.key]
            ? 'implementation landmark semantic isolation is blocked'
            : 'implementation landmark source-pixel quality gate is blocked'
          : `implementation ${primaryStructure.kind} primary-structure bounds are not emitted`,
    );
  }
  if (
    state.screenBounds?.routeStatus === 'observed' &&
    primaryStructure.kind !== 'route' &&
    implementationStructural?.route?.status !== 'observed'
  ) {
    blockers.push(
      implementationStructural?.route?.status === 'blocked'
        ? 'implementation route source-predicate quality gate is blocked'
        : 'implementation route bounds are not emitted',
    );
  }
  if (
    Array.isArray(state.screenBounds?.copy) &&
    implementationStructural?.copy?.status !== 'observed'
  ) {
    blockers.push('implementation copy bounds are not emitted');
  }
  if (!implementationCompositionMeasured) {
    blockers.push(
      'implementation screen-space composition proxy is not emitted',
    );
  }

  if (
    primaryStructure.kind === 'landmark' &&
    sourcePrimaryMeasured &&
    implementationStructural?.landmark?.status === 'observed'
  ) {
    const [sourceX, sourceY, sourceWidth, sourceHeight] = primaryBounds;
    const [actualX, actualY, actualWidth, actualHeight] =
      implementationStructural.landmark.bounds.cssPixels;
    const profileWidth = manifest.authority.recordingProfile.cssViewport.width;
    const profileHeight =
      manifest.authority.recordingProfile.cssViewport.height;

    checks.push(
      compareScalar(
        'landmark.center.normalized.x',
        (sourceX + sourceWidth / 2) / profileWidth,
        (actualX + actualWidth / 2) / profileWidth,
        STRUCTURAL_TOLERANCES.landmarkCenterNormalized,
      ),
      compareScalar(
        'landmark.center.normalized.y',
        (sourceY + sourceHeight / 2) / profileHeight,
        (actualY + actualHeight / 2) / profileHeight,
        STRUCTURAL_TOLERANCES.landmarkCenterNormalized,
      ),
      compareScalar(
        'landmark.size.cssPixels.width',
        sourceWidth,
        actualWidth,
        sourceWidth * STRUCTURAL_TOLERANCES.landmarkSizeRatio,
      ),
      compareScalar(
        'landmark.size.cssPixels.height',
        sourceHeight,
        actualHeight,
        sourceHeight * STRUCTURAL_TOLERANCES.landmarkSizeRatio,
      ),
    );
    if (landmarkMaskEvidence?.status === 'observed') {
      if (landmarkMaskEvidence.semanticRole === 'silhouette') {
        checks.push(
          compareMinimum(
            'landmark.silhouette.iou',
            STRUCTURAL_TOLERANCES.landmarkSilhouetteIouMinimum,
            landmarkMaskEvidence.overlap.iou,
          ),
        );
      } else {
        checks.push(
          compareMinimum(
            'landmark.edgeSupport.iou',
            STRUCTURAL_TOLERANCES.landmarkEdgeSupportIouDiagnosticMinimum,
            landmarkMaskEvidence.overlap.iou,
          ),
        );
        blockers.push(
          'landmark silhouette IoU evidence is not emitted by the current edge-support proxy',
        );
      }
    } else {
      blockers.push(
        'landmark mask-overlap evidence is blocked for the observed implementation landmark',
      );
    }
  }

  if (
    state.screenBounds?.routeStatus === 'observed' &&
    implementationStructural?.route?.status === 'observed'
  ) {
    const sourceRouteGeometry = state.screenBounds.routeGeometry;
    const implementationRouteGeometry = implementationStructural.route.geometry;
    if (
      !isFiniteTuple(sourceRouteGeometry?.normalized?.start, 2) ||
      !isFiniteTuple(sourceRouteGeometry?.normalized?.end, 2) ||
      !isFiniteTuple(sourceRouteGeometry?.rasterPixels?.direction, 2) ||
      !Number.isFinite(
        sourceRouteGeometry?.cssPixels?.equivalentSelectedCoreThickness,
      )
    ) {
      blockers.push('authoritative source route geometry is unmeasured');
    } else {
      for (const [endpoint, component, index] of [
        ['start', 'x', 0],
        ['start', 'y', 1],
        ['end', 'x', 0],
        ['end', 'y', 1],
      ]) {
        checks.push(
          compareScalar(
            `route.${endpoint}.normalized.${component}`,
            sourceRouteGeometry.normalized[endpoint][index],
            implementationRouteGeometry.normalized[endpoint][index],
            STRUCTURAL_TOLERANCES.routeEndpointNormalized,
          ),
        );
      }

      const sourceThickness =
        sourceRouteGeometry.cssPixels.equivalentSelectedCoreThickness;
      checks.push(
        compareScalar(
          'route.equivalentSelectedCoreThickness.cssPixels',
          sourceThickness,
          implementationRouteGeometry.cssPixels.equivalentSelectedCoreThickness,
          Math.max(
            STRUCTURAL_TOLERANCES.routeThicknessCssPixelsMinimum,
            sourceThickness * STRUCTURAL_TOLERANCES.routeThicknessRatio,
          ),
        ),
        compareRouteDirection(
          sourceRouteGeometry.rasterPixels.direction,
          implementationRouteGeometry.rasterPixels.direction,
        ),
      );
    }
    blockers.push(
      'route centerline Hausdorff evidence is not emitted by the current core-envelope proxy',
    );
  }

  if (
    Array.isArray(state.screenBounds?.copy) &&
    implementationStructural?.copy?.status === 'observed'
  ) {
    appendBoundsChecks({
      checks,
      failures,
      metricPrefix: 'copy.bounds',
      label: state.screenBounds.copyLabel,
      expected: boundsTupleToObject(state.screenBounds.copy),
      actual: boundsTupleToObject(
        implementationStructural.copy.bounds.cssPixels,
      ),
      components: BOUND_COMPONENTS,
      tolerance: STRUCTURAL_TOLERANCES.copyBoundsCssPixels,
    });
  }

  if (
    primaryStructure.kind === 'boundary' &&
    sourcePrimaryMeasured &&
    implementationStructural?.boundary?.status === 'observed'
  ) {
    appendBoundsChecks({
      checks,
      failures,
      metricPrefix: 'boundary.bounds',
      label: primaryStructure.label,
      expected: boundsTupleToObject(primaryBounds),
      actual: boundsTupleToObject(
        implementationStructural.boundary.bounds.cssPixels,
      ),
      components: BOUND_COMPONENTS,
      tolerance: STRUCTURAL_TOLERANCES.sectionBoundaryBoundsCssPixels,
    });
  }

  if (sourceCompositionMeasured && implementationCompositionMeasured) {
    checks.push(
      compareScalar(
        'composition.negativeSpaceOccupancy',
        1 - sourceComposition.edgeDensity,
        1 - implementationComposition.edgeDensity,
        STRUCTURAL_TOLERANCES.negativeSpaceOccupancy,
      ),
      compareScalar(
        'composition.edgeCentroid.normalized.x',
        sourceComposition.edgeCentroid.normalized[0],
        implementationComposition.edgeCentroid.normalized[0],
        STRUCTURAL_TOLERANCES.compositionCentroidNormalized,
      ),
      compareScalar(
        'composition.edgeCentroid.normalized.y',
        sourceComposition.edgeCentroid.normalized[1],
        implementationComposition.edgeCentroid.normalized[1],
        STRUCTURAL_TOLERANCES.compositionCentroidNormalized,
      ),
    );

    for (
      let index = 0;
      index < sourceComposition.grid.cells.length;
      index += 1
    ) {
      const sourceCell = sourceComposition.grid.cells[index];
      const implementationCell = implementationComposition.grid.cells[index];
      checks.push(
        compareScalar(
          `composition.grid.cells.${index}.negativeSpaceProxy`,
          sourceCell.negativeSpaceProxy,
          implementationCell.negativeSpaceProxy,
          STRUCTURAL_TOLERANCES.negativeSpaceOccupancy,
        ),
      );
    }
  }
  appendFailedChecks(checks, failures);

  const status =
    blockers.length > 0 ? 'blocked' : failures.length > 0 ? 'fail' : 'pass';

  return {
    status,
    checks,
    failures,
    blockers,
    landmarkMaskEvidence,
    tolerances: STRUCTURAL_TOLERANCES,
    note:
      blockers.length > 0
        ? 'Measured composition and available geometry checks are reported, but structural accuracy remains blocked until the remaining source and implementation geometry prerequisites exist.'
        : 'Structural screen-space evidence is evaluated against the locked Phase 1 tolerances.',
  };
}

const BOUND_COMPONENTS = ['x', 'y', 'width', 'height'];

function boundsTupleToObject([x, y, width, height]) {
  return { x, y, width, height };
}

function compareRouteDirection(expected, actual) {
  const expectedDegrees =
    (Math.atan2(expected[1], expected[0]) * 180) / Math.PI;
  const actualDegrees = (Math.atan2(actual[1], actual[0]) * 180) / Math.PI;
  const rawDelta = Math.abs(actualDegrees - expectedDegrees) % 180;
  const absoluteDelta = Math.min(rawDelta, 180 - rawDelta);

  return {
    metric: 'route.direction.degrees',
    expected: expectedDegrees,
    actual: actualDegrees,
    delta: actualDegrees - expectedDegrees,
    absoluteDelta,
    tolerance: STRUCTURAL_TOLERANCES.routeDirectionDegrees,
    status:
      absoluteDelta <= STRUCTURAL_TOLERANCES.routeDirectionDegrees
        ? 'pass'
        : 'fail',
  };
}

const JOURNEY_STEP_BOX_MAPPINGS = [
  {
    id: 'bounds',
    probeField: 'box',
    implementationField: 'bounds',
    components: BOUND_COMPONENTS,
  },
  {
    id: 'header',
    probeField: 'header',
    implementationField: 'header',
    components: BOUND_COMPONENTS,
  },
  {
    id: 'number',
    probeField: 'number',
    implementationField: 'number',
    components: BOUND_COMPONENTS,
  },
  {
    id: 'title',
    probeField: 'title',
    implementationField: 'title',
    components: ['x', 'y', 'height'],
  },
  {
    id: 'body',
    probeField: 'body',
    implementationField: 'body',
    components: BOUND_COMPONENTS,
  },
];

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

function compareMinimum(metric, minimum, actual) {
  const delta = actual - minimum;

  return {
    metric,
    expected: minimum,
    actual,
    delta,
    absoluteDelta: Math.max(0, -delta),
    tolerance: 0,
    comparison: 'gte',
    status: actual >= minimum ? 'pass' : 'fail',
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

  const tolerance = landingDomReference.acceptance.boundsToleranceCssPx;
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
      landingDomReference.captureProfile.implementationCaptureDevicePixelRatio,
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

  for (const [key, reference] of Object.entries(landingDomReference.bounds)) {
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

  const probeState = journeyProbeStateByKey.get(profileState.probeStateKey);
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

  const boundsTolerance = journeyDomReference.acceptance.boundsToleranceCssPx;
  const scrollTolerance = journeyDomReference.acceptance.scrollToleranceCssPx;
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
      journeyDomReference.captureProfile.implementationCaptureDevicePixelRatio,
      measurement.viewport.devicePixelRatio,
      0,
    ),
    compareScalar('scroll.x', 0, measurement.scroll.x, scrollTolerance),
    compareScalar(
      'scroll.y',
      probeState.actualScrollY,
      measurement.scroll.y,
      scrollTolerance,
    ),
  ];
  const failures = [];
  const processSteps = measurement.processSteps ?? [];
  const sourceSteps = probeState.steps ?? [];
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

  appendBoundsChecks({
    checks,
    failures,
    metricPrefix: 'processSteps.container',
    label: 'full process-step ladder',
    expected: probeState.flowSteps,
    actual: measurement.bounds?.processSteps,
    components: BOUND_COMPONENTS,
    tolerance: boundsTolerance,
  });

  if (sourceSteps.length !== 4 || processSteps.length !== 4) {
    failures.push({
      metric: 'processSteps.count',
      expected: 4,
      actual: processSteps.length,
      sourceCount: sourceSteps.length,
      reason: 'process-step-count-mismatch',
    });
  } else {
    for (let index = 0; index < sourceSteps.length; index += 1) {
      const sourceStep = sourceSteps[index];
      const implementationStep = processSteps[index];

      for (const mapping of JOURNEY_STEP_BOX_MAPPINGS) {
        appendBoundsChecks({
          checks,
          failures,
          metricPrefix: `processSteps.${index}.${mapping.id}`,
          label: `process step ${index + 1} ${mapping.id}`,
          expected: sourceStep?.[mapping.probeField],
          actual: implementationStep?.[mapping.implementationField],
          components: mapping.components,
          tolerance: boundsTolerance,
        });
      }
    }
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
  const referencePath = path.join(workspaceRoot, state.anchor.capturePath);
  const implementationPath = path.join(implementationRoot, `${state.key}.png`);
  const measurementPath = path.join(measurementRoot, `${state.key}.json`);
  let measurement = null;
  try {
    measurement = JSON.parse(await readFile(measurementPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  const referenceArtifact = await readFile(referencePath);
  const referenceSha256 = createHash('sha256')
    .update(referenceArtifact)
    .digest('hex');
  if (
    !/^[a-f0-9]{64}$/u.test(state.anchor.captureSha256) ||
    referenceSha256 !== state.anchor.captureSha256
  ) {
    throw new Error(
      `${state.key}: recording anchor does not match captureSha256`,
    );
  }
  const referenceImage = await sharp(referenceArtifact)
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
  const overlayPath = path.join(comparisonRoot, `${state.key}-overlay.png`);
  const heatmapPath = path.join(comparisonRoot, `${state.key}-heatmap.png`);

  await sharp(overlay, imageOptions).png().toFile(overlayPath);
  await sharp(heatmap, imageOptions).png().toFile(heatmapPath);

  const preliminaryRaster = evaluatePreliminaryRaster(metrics);
  const landmarkMaskResult = measureLandmarkMaskEvidence({
    state,
    measurement,
    referenceImage,
    implementationImage,
    dpr: manifest.authority.recordingProfile.devicePixelRatio.value,
  });
  let landmarkMaskEvidence = landmarkMaskResult?.evidence ?? null;
  if (landmarkMaskResult) {
    const landmarkMaskPath = path.join(
      comparisonRoot,
      `${state.key}-landmark-mask.png`,
    );
    await sharp(landmarkMaskResult.comparison, imageOptions)
      .png()
      .toFile(landmarkMaskPath);
    landmarkMaskEvidence = {
      ...landmarkMaskEvidence,
      comparisonArtifactPath: relative(landmarkMaskPath),
      comparisonLegend: {
        referenceOnly: '#ff40c0',
        implementationOnly: '#00c8ff',
        intersection: '#f5f5f5',
        neither: '#0e1014',
      },
    };
  }
  const structuralAccuracy = evaluateStructuralAccuracy(
    state,
    measurement,
    landmarkMaskEvidence,
  );
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
      referenceSha256,
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
    preliminaryRaster,
    structuralAccuracy,
  });
}

const preliminaryRasterSummary = states.reduce(
  (counts, state) => {
    counts[state.preliminaryRaster.status] += 1;
    return counts;
  },
  { pass: 0, fail: 0 },
);
const structuralAccuracySummary = states.reduce(
  (counts, state) => {
    counts[state.structuralAccuracy.status] += 1;
    return counts;
  },
  { pass: 0, fail: 0, blocked: 0 },
);
const structuralCheckSummary = states.reduce(
  (summary, state) => {
    for (const check of state.structuralAccuracy.checks) {
      const group = check.metric.startsWith('copy.')
        ? 'copy'
        : check.metric.startsWith('landmark.')
          ? 'landmark'
          : check.metric.startsWith('route.')
            ? 'route'
            : check.metric.startsWith('boundary.')
              ? 'boundary'
              : 'composition';
      summary[group][check.status] += 1;
    }
    return summary;
  },
  {
    composition: { pass: 0, fail: 0 },
    copy: { pass: 0, fail: 0 },
    landmark: { pass: 0, fail: 0 },
    route: { pass: 0, fail: 0 },
    boundary: { pass: 0, fail: 0 },
  },
);
const domSummary = states.reduce(
  (counts, state) => {
    const status = state.domLayout.status;
    counts[status] += 1;
    return counts;
  },
  { pass: 0, fail: 0, blocked: 0, 'not-applicable': 0 },
);
const preliminaryRasterGateSatisfied = preliminaryRasterSummary.fail === 0;
const structuralAccuracyGateSatisfied =
  structuralAccuracySummary.fail === 0 &&
  structuralAccuracySummary.blocked === 0;
const domLayoutGateSatisfied =
  domSummary.fail === 0 && domSummary.blocked === 0;
const report = {
  schemaVersion: 10,
  generatedFrom: {
    manifestPath: relative(manifestPath),
    captureManifestPath: relative(captureManifestPath),
    captureRunId: captureManifest.runId,
    captureCompletedAt: captureManifest.completedAt,
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
    perStateRasterPixelCount: states[0].identityMask.evaluatedPixelCount,
    reportRasterPixelCount: states.reduce(
      (count, state) => count + state.identityMask.evaluatedPixelCount,
      0,
    ),
    policy:
      'Only proven glyph/logo pixels may be masked. No flattened recording pixel is masked without a pixel-precise source alpha or mask layer.',
    consequence:
      'Every raster metric in this report remains unmasked; DOM identity exclusions affect only explicitly named DOM width/text checks.',
  },
  preliminaryRasterSummary,
  structuralAccuracySummary,
  structuralCheckSummary,
  structuralTolerances: STRUCTURAL_TOLERANCES,
  domSummary,
  preliminaryRasterGateSatisfied,
  structuralAccuracyGateSatisfied,
  domLayoutGateSatisfied,
  gateSatisfied:
    preliminaryRasterGateSatisfied &&
    structuralAccuracyGateSatisfied &&
    domLayoutGateSatisfied,
  states,
};
const reportPath = path.join(captureRoot, 'comparison-report.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(
  `Compared ${states.length} states (preliminary raster: ${preliminaryRasterSummary.pass} pass, ${preliminaryRasterSummary.fail} fail; structural accuracy: ${structuralAccuracySummary.pass} pass, ${structuralAccuracySummary.fail} fail, ${structuralAccuracySummary.blocked} blocked; DOM: ${domSummary.pass} pass, ${domSummary.fail} fail, ${domSummary.blocked} blocked, ${domSummary['not-applicable']} not applicable); report: ${relative(reportPath)}`,
);

if (!report.gateSatisfied) {
  process.exitCode = 1;
}
