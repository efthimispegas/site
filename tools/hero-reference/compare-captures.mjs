import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { SCREEN_COMPOSITION_CONFIG } from '../../apps/pegasoft-e2e/src/visual/screen-composition.mjs';
import {
  COPY_CONFIG_BY_STATE,
  FIELD_CONTACT_CENTER_CONFIG_BY_STATE,
  FIELD_TILE_PROFILE_CONFIG_BY_STATE,
  IMPLEMENTATION_ROUTE_CONFIG_BY_STATE,
  IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE,
  LANDMARK_CONFIG_BY_STATE,
  ROUTE_CONFIG_BY_STATE,
  deriveRouteCenterlineMask,
  measureChromaFeature,
  measureFieldTileProfile,
  measureLandmarkFeature,
} from '../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';

const workspaceRoot = process.cwd();
const manifestPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-anchors.json',
);
const semanticMaskManifestPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-semantic-masks.json',
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
  contactCenterCenterNormalized: 0.0075,
  contactCenterSilhouetteIouMinimum: 0.9,
  contactCenterSizeRatio: 0.02,
  fieldEnvelopeCenterNormalized: 0.0075,
  fieldEnvelopeSizeRatio: 0.02,
  fieldMedianTileCssPixelsMinimum: 1,
  fieldMedianTileSizeRatio: 0.02,
  fieldSelectedPixelOccupancy: 0.02,
  fieldTileComponentCountDelta: 0,
  fieldTileMaskIouMinimum: 0.9,
  landmarkCenterNormalized: 0.0075,
  landmarkSilhouetteIouMinimum: 0.9,
  landmarkSizeRatio: 0.02,
  routeCenterlineHausdorffNormalizedShortEdge: 0.0075,
  routeDirectionDegrees: 1,
  routeEndpointNormalized: 0.005,
  routeThicknessCssPixelsMinimum: 1,
  routeThicknessRatio: 0.1,
  sectionBoundaryBoundsCssPixels: 2,
};
const IMPLEMENTATION_ROUTE_STATES = new Set(Object.keys(ROUTE_CONFIG_BY_STATE));
const IMPLEMENTATION_LANDMARK_STATES = new Set([
  ...Object.keys(LANDMARK_CONFIG_BY_STATE),
  ...Object.keys(IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE),
]);
const IMPLEMENTATION_FIELD_PROFILE_STATES = new Set(
  Object.keys(FIELD_TILE_PROFILE_CONFIG_BY_STATE),
);
const IMPLEMENTATION_CONTACT_CENTER_STATES = new Set(
  Object.keys(FIELD_CONTACT_CENTER_CONFIG_BY_STATE),
);
const IMPLEMENTATION_COPY_STATES = new Set(Object.keys(COPY_CONFIG_BY_STATE));

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const semanticMaskManifest = JSON.parse(
  await readFile(semanticMaskManifestPath, 'utf8'),
);
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
if (
  semanticMaskManifest.schemaVersion !== 2 ||
  !Array.isArray(semanticMaskManifest.masks) ||
  semanticMaskManifest.reviewContract?.scope !== 'source-reference-goal-only' ||
  semanticMaskManifest.reviewContract?.implementationPixelClassification !==
    false ||
  semanticMaskManifest.reviewContract?.structuralAcceptance !== false ||
  semanticMaskManifest.reviewContract?.visualAcceptance !== false
) {
  throw new Error(
    'Semantic-mask manifest does not preserve the accepted source-reference-only review contract',
  );
}
const semanticMaskByStateKey = new Map(
  semanticMaskManifest.masks.map((entry) => [entry.stateKey, entry]),
);
assert.equal(
  semanticMaskByStateKey.size,
  semanticMaskManifest.masks.length,
  'Semantic source-mask state keys must be unique',
);
assert.deepEqual(
  [...semanticMaskByStateKey.keys()].sort(),
  Object.keys(IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE).sort(),
  'Semantic source masks and implementation-only classifiers must cover the same states',
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
  const sourceConfig = ROUTE_CONFIG_BY_STATE[stateKey];
  const config = IMPLEMENTATION_ROUTE_CONFIG_BY_STATE[stateKey] ?? sourceConfig;
  if (
    !config ||
    !isValidStructuralFeature(feature, sourceArtifact, config.method) ||
    feature.label !== config.label ||
    !isFiniteTuple(feature.method?.roiNormalized, 4) ||
    feature.method.roiNormalized.some(
      (component, index) => component !== config.roi[index],
    ) ||
    feature.method.sourcePredicate !== config.sourcePredicate
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
  const semanticConfig =
    IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[stateKey];

  if (semanticConfig) {
    if (
      !isValidStructuralFeature(
        feature,
        sourceArtifact,
        semanticConfig.method,
      ) ||
      feature.label !== semanticConfig.label ||
      feature.method.sourceMethod !== semanticConfig.sourceMethod ||
      !isFiniteTuple(feature.method?.roiNormalized, 4) ||
      feature.method.roiNormalized.some(
        (component, index) => component !== semanticConfig.roi[index],
      )
    ) {
      return false;
    }
    if (feature.status === 'blocked') {
      return true;
    }
    if (semanticConfig.method === 'seeded-contact-subject-union') {
      return (
        feature.method.predicate?.id === semanticConfig.predicate.id &&
        feature.method.figurePredicate?.id ===
          semanticConfig.figurePredicate.id &&
        feature.method.minimumComponentPixels ===
          semanticConfig.minimumComponentPixels &&
        feature.method.minimumSelectedPixels ===
          semanticConfig.minimumSelectedPixels &&
        feature.method.minimumFigureComponentPixels ===
          semanticConfig.minimumFigureComponentPixels &&
        feature.method.maximumFigureComponentPixels ===
          semanticConfig.maximumFigureComponentPixels &&
        feature.method.maximumFigureWidthRatio ===
          semanticConfig.maximumFigureWidthRatio &&
        feature.method.maximumFigureHeightRatio ===
          semanticConfig.maximumFigureHeightRatio &&
        feature.method.maximumFigureCenterDeltaRatio ===
          semanticConfig.maximumFigureCenterDeltaRatio &&
        feature.method.maximumFigureRootGapPixels ===
          semanticConfig.maximumFigureRootGapPixels &&
        feature.method.minimumFigureSelectedPixels ===
          semanticConfig.minimumFigureSelectedPixels &&
        Object.entries(semanticConfig.figureRoi).every(
          ([key, value]) => feature.method.figureRoi?.[key] === value,
        )
      );
    }
    return (
      feature.method.predicate?.id === semanticConfig.predicate.id &&
      feature.method.minimumComponentPixels ===
        semanticConfig.minimumComponentPixels &&
      feature.method.maximumComponentPixels ===
        semanticConfig.maximumComponentPixels &&
      feature.method.maximumComponentWidth ===
        semanticConfig.maximumComponentWidth &&
      feature.method.maximumComponentHeight ===
        semanticConfig.maximumComponentHeight &&
      feature.method.minimumComponentFillRatio ===
        semanticConfig.minimumComponentFillRatio &&
      feature.method.minimumSelectedPixels ===
        semanticConfig.minimumSelectedPixels
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

  return (
    feature.method.predicate?.id === transferableConfig.predicate.id &&
    feature.method.minimumComponentPixels ===
      transferableConfig.minimumComponentPixels &&
    feature.method.minimumSelectedPixels ===
      transferableConfig.minimumSelectedPixels
  );
}

function isValidFieldProfile(feature, sourceArtifact, stateKey) {
  const config = FIELD_TILE_PROFILE_CONFIG_BY_STATE[stateKey];
  if (
    !config ||
    !isValidStructuralFeature(feature, sourceArtifact, config.method) ||
    feature.label !== config.label ||
    !isFiniteTuple(feature.method?.roiNormalized, 4) ||
    feature.method.roiNormalized.some(
      (component, index) => component !== config.roi[index],
    ) ||
    feature.method.predicate?.id !== config.predicate.id ||
    feature.method.minimumComponentPixels !== config.minimumComponentPixels ||
    feature.method.maximumComponentPixels !== config.maximumComponentPixels ||
    feature.method.minimumComponentWidth !== config.minimumComponentWidth ||
    feature.method.maximumComponentWidth !== config.maximumComponentWidth ||
    feature.method.minimumComponentHeight !== config.minimumComponentHeight ||
    feature.method.maximumComponentHeight !== config.maximumComponentHeight ||
    feature.method.minimumComponentFillRatio !==
      config.minimumComponentFillRatio ||
    feature.method.maximumComponentFillRatio !==
      config.maximumComponentFillRatio ||
    feature.method.minimumSelectedComponents !==
      config.minimumSelectedComponents
  ) {
    return false;
  }
  if (feature.status === 'blocked') {
    return true;
  }
  return (
    Number.isSafeInteger(feature.componentProfile?.count) &&
    feature.componentProfile.count >= config.minimumSelectedComponents &&
    isFiniteTuple(feature.componentProfile?.center?.rasterPixels, 2) &&
    isFiniteTuple(feature.componentProfile?.center?.cssPixels, 2) &&
    isFiniteTuple(feature.componentProfile?.center?.normalized, 2) &&
    Number.isFinite(
      feature.componentProfile?.medianTileTop?.cssPixels?.width,
    ) &&
    Number.isFinite(
      feature.componentProfile?.medianTileTop?.cssPixels?.height,
    ) &&
    Number.isFinite(feature.componentProfile?.selectedPixelOccupancy)
  );
}

function isValidContactCenterFeature(feature, sourceArtifact, stateKey) {
  const config = FIELD_CONTACT_CENTER_CONFIG_BY_STATE[stateKey];
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
    feature.method.minimumSelectedPixels === config.minimumSelectedPixels
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
  const fieldProfileFeature = measurement.structuralAccuracy?.fieldProfile;
  const contactCenterFeature = measurement.structuralAccuracy?.contactCenter;
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
  const validFieldProfileFeature = IMPLEMENTATION_FIELD_PROFILE_STATES.has(
    stateKey,
  )
    ? isValidFieldProfile(fieldProfileFeature, expectedSourceArtifact, stateKey)
    : fieldProfileFeature === undefined;
  const validContactCenterFeature = IMPLEMENTATION_CONTACT_CENTER_STATES.has(
    stateKey,
  )
    ? isValidContactCenterFeature(
        contactCenterFeature,
        expectedSourceArtifact,
        stateKey,
      )
    : contactCenterFeature === undefined;
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
    measurement.schemaVersion !== 7 ||
    measurement.structuralAccuracy?.schemaVersion !== 6 ||
    !isObservedScreenComposition(screenComposition) ||
    screenComposition.sourceArtifact !== expectedSourceArtifact ||
    !validLandmarkFeature ||
    !validRouteFeature ||
    !validCopyFeature ||
    !validFieldProfileFeature ||
    !validContactCenterFeature ||
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
    captureManifest.schemaVersion !== 7 ||
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

function boundsFromBinaryMask(mask, width, height, dpr) {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  let pixelSupport = 0;

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    minimumX = Math.min(minimumX, x);
    minimumY = Math.min(minimumY, y);
    maximumX = Math.max(maximumX, x);
    maximumY = Math.max(maximumY, y);
    pixelSupport += 1;
  }

  assert.ok(pixelSupport > 0, 'Semantic source mask is empty');
  const rasterPixels = [
    minimumX,
    minimumY,
    maximumX - minimumX + 1,
    maximumY - minimumY + 1,
  ];
  return {
    pixelSupport,
    bounds: {
      rasterPixels,
      cssPixels: rasterPixels.map((component) => component / dpr),
      normalized: [
        Number((rasterPixels[0] / width).toFixed(6)),
        Number((rasterPixels[1] / height).toFixed(6)),
        Number((rasterPixels[2] / width).toFixed(6)),
        Number((rasterPixels[3] / height).toFixed(6)),
      ],
    },
  };
}

async function loadSourceSemanticLandmarkMask({ state, referenceImage, dpr }) {
  const manifestEntry = semanticMaskByStateKey.get(state.key);
  assert.ok(
    manifestEntry,
    `${state.key}: source semantic mask is not declared`,
  );
  assert.equal(manifestEntry.featureKind, 'landmark');
  assert.equal(manifestEntry.sourceCapturePath, state.anchor.capturePath);
  assert.equal(manifestEntry.sourceCaptureSha256, state.anchor.captureSha256);
  assert.equal(manifestEntry.reviewScope, 'source-reference-goal-only');
  assert.equal(manifestEntry.visualAcceptance, false);
  assert.equal(manifestEntry.implementationPixelClassifier, false);
  assert.ok(Number.isSafeInteger(manifestEntry.alphaThreshold));

  const maskPath = path.join(workspaceRoot, manifestEntry.maskPath);
  const maskArtifact = await readFile(maskPath);
  const maskSha256 = createHash('sha256').update(maskArtifact).digest('hex');
  assert.equal(
    maskSha256,
    manifestEntry.maskSha256,
    `${state.key}: source semantic mask hash drifted from its manifest`,
  );
  const maskImage = await sharp(maskArtifact)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(maskImage.info.width, referenceImage.info.width);
  assert.equal(maskImage.info.height, referenceImage.info.height);

  const mask = new Uint8Array(maskImage.info.width * maskImage.info.height);
  const alphaChannel = maskImage.info.channels - 1;
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = Number(
      maskImage.data[index * maskImage.info.channels + alphaChannel] >=
        manifestEntry.alphaThreshold,
    );
  }
  const measured = boundsFromBinaryMask(
    mask,
    maskImage.info.width,
    maskImage.info.height,
    dpr,
  );
  assert.ok(measured.pixelSupport >= manifestEntry.minimumSelectedPixels);
  assert.deepEqual(
    measured.bounds.cssPixels,
    state.screenBounds?.landmark,
    `${state.key}: source semantic mask bounds drifted from the locked manifest`,
  );

  return { manifestEntry, mask, ...measured };
}

async function measureLandmarkMaskEvidence({
  state,
  measurement,
  referenceImage,
  implementationImage,
  dpr,
}) {
  const semanticConfig =
    IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[state.key];
  if (semanticConfig) {
    const sourceMask = await loadSourceSemanticLandmarkMask({
      state,
      referenceImage,
      dpr,
    });
    const implementationResult = measureLandmarkFeature({
      data: implementationImage.data,
      image: implementationImage.info,
      dpr,
      config: semanticConfig,
    });
    const implementationMeasurement = implementationResult.measurement;
    const recordedImplementation = measurement?.structuralAccuracy?.landmark;
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
      `${state.key}: recomputed implementation semantic landmark drifted from the capture record`,
    );

    const overlap = countMaskOverlap(
      sourceMask.mask,
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
        semanticRole: 'silhouette',
        label: semanticConfig.label,
        method: {
          id: 'source-semantic-mask-vs-renderer-independent-implementation-mask',
          sourceMethod: 'source-semantic-mask',
          implementationMethod: semanticConfig.method,
          implementationSharedImplementation:
            'apps/pegasoft-e2e/src/visual/screen-structural-features.mjs#measureLandmarkFeature',
          sourceSemanticMask: {
            manifestPath: relative(semanticMaskManifestPath),
            artifactPath: sourceMask.manifestEntry.maskPath,
            sha256: sourceMask.manifestEntry.maskSha256,
            alphaThreshold: sourceMask.manifestEntry.alphaThreshold,
            reviewScope: sourceMask.manifestEntry.reviewScope,
            implementationPixelClassifier: false,
          },
        },
        reference: {
          artifactPath: state.anchor.capturePath,
          bounds: sourceMask.bounds,
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
              'The renderer-independent implementation landmark mask is unavailable.')
            : null,
        qualification:
          'The accepted SVG classifies only the locked vectrfl.com source silhouette. Localhost pixels are classified independently from rendered RGB and component geometry; overlap is eligible for silhouette IoU evaluation but does not itself confer structural or visual acceptance.',
      },
      comparison: createLandmarkMaskComparison(
        sourceMask.mask,
        implementationResult.debug.mask,
      ),
    };
  }

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

function measureFieldTileProfileEvidence({
  state,
  measurement,
  referenceImage,
  implementationImage,
  dpr,
}) {
  const config = FIELD_TILE_PROFILE_CONFIG_BY_STATE[state.key];
  if (!config) {
    return null;
  }

  const referenceResult = measureFieldTileProfile({
    data: referenceImage.data,
    image: referenceImage.info,
    dpr,
    config,
  });
  const implementationResult = measureFieldTileProfile({
    data: implementationImage.data,
    image: implementationImage.info,
    dpr,
    config,
  });
  const referenceMeasurement = referenceResult.measurement;
  const implementationMeasurement = implementationResult.measurement;
  const recordedImplementation = measurement?.structuralAccuracy?.fieldProfile;

  assert.equal(
    referenceMeasurement.status,
    'observed',
    `${state.key}: field tile profile no longer observes the locked recording anchor`,
  );
  assert.deepEqual(
    referenceMeasurement.bounds.cssPixels,
    state.screenBounds?.fieldProfile,
    `${state.key}: recomputed recording field envelope drifted from the locked manifest`,
  );
  assert.deepEqual(
    referenceMeasurement.componentProfile,
    state.screenBounds?.fieldProfileComponentProfile,
    `${state.key}: recomputed recording field component profile drifted from the locked manifest`,
  );
  assert.ok(
    recordedImplementation,
    `${state.key}: capture did not record a field tile profile`,
  );
  const recordedImplementationCore = Object.fromEntries(
    Object.entries(recordedImplementation).filter(
      ([property]) => property !== 'sourceArtifact',
    ),
  );
  assert.deepEqual(
    implementationMeasurement,
    recordedImplementationCore,
    `${state.key}: recomputed implementation field tile profile drifted from the capture record`,
  );

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
      semanticRole: 'visible-neutral-tile-top-profile',
      label: config.label,
      method: {
        id: config.method,
        sharedImplementation:
          'apps/pegasoft-e2e/src/visual/screen-structural-features.mjs#measureFieldTileProfile',
        sourceSemanticMask: null,
      },
      reference: {
        artifactPath: state.anchor.capturePath,
        bounds: referenceMeasurement.bounds,
        pixelSupport: overlap.referencePixelSupport,
        componentProfile: referenceMeasurement.componentProfile,
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
        componentProfile:
          implementationMeasurement.status === 'observed'
            ? implementationMeasurement.componentProfile
            : null,
      },
      overlap: {
        intersectionPixelCount: overlap.intersectionPixelCount,
        unionPixelCount: overlap.unionPixelCount,
        iou: overlap.iou,
      },
      reason: status === 'blocked' ? implementationMeasurement.reason : null,
      qualification:
        status === 'blocked'
          ? 'The shared predicate and component gates observe the locked source field, but the implementation does not emit enough source-qualifying visible tile tops; the comparison remains blocker evidence.'
          : 'The same renderer-independent predicate and component-shape gates isolate visible neutral tile tops in both locked rasters. Direct mask overlap, component count, field envelope, and median tile-top size are eligible structural evidence.',
    },
    comparison: createLandmarkMaskComparison(
      referenceResult.debug.mask,
      implementationResult.debug.mask,
    ),
  };
}

function measureFieldContactCenterEvidence({
  state,
  measurement,
  referenceImage,
  implementationImage,
  dpr,
}) {
  const config = FIELD_CONTACT_CENTER_CONFIG_BY_STATE[state.key];
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
  const recordedImplementation = measurement?.structuralAccuracy?.contactCenter;

  assert.equal(
    referenceMeasurement.status,
    'observed',
    `${state.key}: contact-center measurement no longer observes the locked recording anchor`,
  );
  assert.deepEqual(
    referenceMeasurement.bounds.cssPixels,
    state.screenBounds?.contactCenter,
    `${state.key}: recomputed recording contact-center bounds drifted from the locked manifest`,
  );
  assert.ok(
    recordedImplementation,
    `${state.key}: capture did not record a contact-center measurement`,
  );
  const recordedImplementationCore = Object.fromEntries(
    Object.entries(recordedImplementation).filter(
      ([property]) => property !== 'sourceArtifact',
    ),
  );
  assert.deepEqual(
    implementationMeasurement,
    recordedImplementationCore,
    `${state.key}: recomputed implementation contact-center measurement drifted from the capture record`,
  );

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
      semanticRole: 'contact-center-tile-silhouette',
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
      reason: status === 'blocked' ? implementationMeasurement.reason : null,
      qualification:
        'This shared chroma silhouette locates the saturated contact center only. It is independent evidence and does not substitute for the source-tied tile-plus-standing-figure semantic landmark union.',
    },
    comparison: createLandmarkMaskComparison(
      referenceResult.debug.mask,
      implementationResult.debug.mask,
    ),
  };
}

function countSelectedPixels(mask) {
  let count = 0;
  for (const selected of mask) {
    count += Number(selected === 1);
  }
  return count;
}

function unionBounds(left, right) {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maximumX = Math.max(left.x + left.width, right.x + right.width);
  const maximumY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: maximumX - x, height: maximumY - y };
}

function distanceTransform1d(input, length, output, locations, boundaries) {
  let envelopeIndex = 0;
  locations[0] = 0;
  boundaries[0] = Number.NEGATIVE_INFINITY;
  boundaries[1] = Number.POSITIVE_INFINITY;

  for (let coordinate = 1; coordinate < length; coordinate += 1) {
    let intersection;
    do {
      const location = locations[envelopeIndex];
      intersection =
        (input[coordinate] +
          coordinate * coordinate -
          (input[location] + location * location)) /
        (2 * coordinate - 2 * location);
      if (intersection <= boundaries[envelopeIndex]) {
        envelopeIndex -= 1;
      } else {
        break;
      }
    } while (envelopeIndex >= 0);

    envelopeIndex += 1;
    locations[envelopeIndex] = coordinate;
    boundaries[envelopeIndex] = intersection;
    boundaries[envelopeIndex + 1] = Number.POSITIVE_INFINITY;
  }

  envelopeIndex = 0;
  for (let coordinate = 0; coordinate < length; coordinate += 1) {
    while (boundaries[envelopeIndex + 1] < coordinate) {
      envelopeIndex += 1;
    }
    const location = locations[envelopeIndex];
    const delta = coordinate - location;
    output[coordinate] = delta * delta + input[location];
  }
}

function squaredDistanceTransform(mask, imageWidth, bounds) {
  const { x, y, width, height } = bounds;
  const area = width * height;
  const intermediate = new Float64Array(area);
  const distances = new Float64Array(area);
  const maximumLength = Math.max(width, height);
  const input = new Float64Array(maximumLength);
  const output = new Float64Array(maximumLength);
  const locations = new Int32Array(maximumLength);
  const boundaries = new Float64Array(maximumLength + 1);
  const unreachableDistance = width * width + height * height + 1;

  for (let localY = 0; localY < height; localY += 1) {
    const imageOffset = (y + localY) * imageWidth + x;
    const localOffset = localY * width;
    for (let localX = 0; localX < width; localX += 1) {
      input[localX] = mask[imageOffset + localX] ? 0 : unreachableDistance;
    }
    distanceTransform1d(input, width, output, locations, boundaries);
    for (let localX = 0; localX < width; localX += 1) {
      intermediate[localOffset + localX] = output[localX];
    }
  }

  for (let localX = 0; localX < width; localX += 1) {
    for (let localY = 0; localY < height; localY += 1) {
      input[localY] = intermediate[localY * width + localX];
    }
    distanceTransform1d(input, height, output, locations, boundaries);
    for (let localY = 0; localY < height; localY += 1) {
      distances[localY * width + localX] = output[localY];
    }
  }

  return distances;
}

function maximumSquaredDistanceToMask(
  sourceMask,
  imageWidth,
  bounds,
  distances,
) {
  let maximumSquaredDistance = 0;

  for (let localY = 0; localY < bounds.height; localY += 1) {
    const imageOffset = (bounds.y + localY) * imageWidth + bounds.x;
    const localOffset = localY * bounds.width;
    for (let localX = 0; localX < bounds.width; localX += 1) {
      if (sourceMask[imageOffset + localX]) {
        maximumSquaredDistance = Math.max(
          maximumSquaredDistance,
          distances[localOffset + localX],
        );
      }
    }
  }

  return maximumSquaredDistance;
}

function measureSymmetricHausdorff({
  referenceMask,
  implementationMask,
  image,
  bounds,
  dpr,
}) {
  const distanceToImplementation = squaredDistanceTransform(
    implementationMask,
    image.width,
    bounds,
  );
  const referenceToImplementation = Math.sqrt(
    maximumSquaredDistanceToMask(
      referenceMask,
      image.width,
      bounds,
      distanceToImplementation,
    ),
  );
  const distanceToReference = squaredDistanceTransform(
    referenceMask,
    image.width,
    bounds,
  );
  const implementationToReference = Math.sqrt(
    maximumSquaredDistanceToMask(
      implementationMask,
      image.width,
      bounds,
      distanceToReference,
    ),
  );
  const symmetric = Math.max(
    referenceToImplementation,
    implementationToReference,
  );
  const shortEdge = Math.min(image.width, image.height);

  return {
    rasterPixels: {
      referenceToImplementation,
      implementationToReference,
      symmetric,
    },
    cssPixels: {
      referenceToImplementation: referenceToImplementation / dpr,
      implementationToReference: implementationToReference / dpr,
      symmetric: symmetric / dpr,
    },
    normalizedShortEdge: {
      referenceToImplementation: referenceToImplementation / shortEdge,
      implementationToReference: implementationToReference / shortEdge,
      symmetric: symmetric / shortEdge,
    },
  };
}

function dilateForComparison(mask, width, height, radius) {
  const displayMask = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    for (
      let candidateY = Math.max(0, y - radius);
      candidateY <= Math.min(height - 1, y + radius);
      candidateY += 1
    ) {
      for (
        let candidateX = Math.max(0, x - radius);
        candidateX <= Math.min(width - 1, x + radius);
        candidateX += 1
      ) {
        displayMask[candidateY * width + candidateX] = 1;
      }
    }
  }
  return displayMask;
}

function createRouteCenterlineComparison(
  referenceMask,
  implementationMask,
  image,
) {
  return createLandmarkMaskComparison(
    dilateForComparison(referenceMask, image.width, image.height, 2),
    dilateForComparison(implementationMask, image.width, image.height, 2),
  );
}

function measureRouteCenterlineEvidence({
  state,
  measurement,
  referenceImage,
  implementationImage,
  dpr,
}) {
  const sourceConfig = ROUTE_CONFIG_BY_STATE[state.key];
  if (!sourceConfig) {
    return null;
  }
  const implementationConfig =
    IMPLEMENTATION_ROUTE_CONFIG_BY_STATE[state.key] ?? sourceConfig;

  const referenceResult = measureChromaFeature({
    data: referenceImage.data,
    image: referenceImage.info,
    dpr,
    config: sourceConfig,
  });
  const implementationResult = measureChromaFeature({
    data: implementationImage.data,
    image: implementationImage.info,
    dpr,
    config: implementationConfig,
  });
  const referenceMeasurement = referenceResult.measurement;
  const implementationMeasurement = implementationResult.measurement;
  const recordedImplementation = measurement?.structuralAccuracy?.route;

  assert.equal(
    referenceMeasurement.status,
    'observed',
    `${state.key}: route measurement no longer observes the locked recording anchor`,
  );
  assert.deepEqual(
    referenceMeasurement.bounds.cssPixels,
    state.screenBounds.route,
    `${state.key}: recomputed recording route bounds drifted from the locked manifest`,
  );
  assert.deepEqual(
    referenceMeasurement.geometry,
    state.screenBounds.routeGeometry,
    `${state.key}: recomputed recording route geometry drifted from the locked manifest`,
  );
  assert.ok(
    recordedImplementation,
    `${state.key}: capture omitted route evidence`,
  );
  const recordedImplementationCore = Object.fromEntries(
    Object.entries(recordedImplementation).filter(
      ([property]) => property !== 'sourceArtifact',
    ),
  );
  assert.deepEqual(
    implementationMeasurement,
    recordedImplementationCore,
    `${state.key}: recomputed implementation route measurement drifted from the capture record`,
  );

  if (implementationMeasurement.status !== 'observed') {
    return {
      evidence: {
        status: 'blocked',
        evidenceClass: 'blocked',
        semanticRole: 'visible-route-core-centerline-set',
        label: sourceConfig.label,
        method: {
          sourceMaskSelection: sourceConfig.method,
          sourcePredicate: sourceConfig.predicate.id,
          implementationMaskSelection: implementationConfig.method,
          implementationPredicate: implementationConfig.predicate.id,
          centerline: 'zhang-suen-thinning-8-neighbor-v1',
          distance: 'symmetric-euclidean-hausdorff',
          sourceSemanticMask: null,
        },
        reference: {
          artifactPath: state.anchor.capturePath,
          bounds: referenceMeasurement.bounds,
          pixelSupport: referenceMeasurement.pixelSupport,
        },
        implementation: {
          artifactPath: relative(
            path.join(implementationRoot, `${state.key}.png`),
          ),
          bounds: null,
          pixelSupport: 0,
        },
        hausdorff: null,
        reason: implementationMeasurement.reason,
        qualification:
          implementationConfig === sourceConfig
            ? 'The implementation fails the unchanged source-pixel route quality gate, so no implementation centerline or Hausdorff distance is inferred.'
            : 'The implementation fails its renderer-independent visible-route quality gate, so no implementation centerline or Hausdorff distance is inferred.',
      },
      comparison: null,
    };
  }

  const referenceCenterline = deriveRouteCenterlineMask({
    mask: referenceResult.debug.mask,
    width: referenceImage.info.width,
    height: referenceImage.info.height,
    bounds: referenceResult.debug.bounds,
  });
  const implementationCenterline = deriveRouteCenterlineMask({
    mask: implementationResult.debug.mask,
    width: implementationImage.info.width,
    height: implementationImage.info.height,
    bounds: implementationResult.debug.bounds,
  });
  const referenceCenterlinePixelSupport =
    countSelectedPixels(referenceCenterline);
  const implementationCenterlinePixelSupport = countSelectedPixels(
    implementationCenterline,
  );
  assert.ok(
    referenceCenterlinePixelSupport > 0 &&
      implementationCenterlinePixelSupport > 0,
    `${state.key}: observed route masks produced an empty centerline`,
  );
  const comparisonBounds = unionBounds(
    referenceResult.debug.bounds,
    implementationResult.debug.bounds,
  );
  const hausdorff = measureSymmetricHausdorff({
    referenceMask: referenceCenterline,
    implementationMask: implementationCenterline,
    image: referenceImage.info,
    bounds: comparisonBounds,
    dpr,
  });

  return {
    evidence: {
      status: 'observed',
      evidenceClass: 'observed',
      semanticRole: 'visible-route-core-centerline-set',
      label: sourceConfig.label,
      method: {
        sourceMaskSelection: sourceConfig.method,
        sourcePredicate: sourceConfig.predicate.id,
        implementationMaskSelection: implementationConfig.method,
        implementationPredicate: implementationConfig.predicate.id,
        centerline: 'zhang-suen-thinning-8-neighbor-v1',
        distance: 'symmetric-euclidean-hausdorff',
        sourceSemanticMask: null,
      },
      reference: {
        artifactPath: state.anchor.capturePath,
        bounds: referenceMeasurement.bounds,
        pixelSupport: referenceMeasurement.pixelSupport,
        centerlinePixelSupport: referenceCenterlinePixelSupport,
      },
      implementation: {
        artifactPath: relative(
          path.join(implementationRoot, `${state.key}.png`),
        ),
        bounds: implementationMeasurement.bounds,
        pixelSupport: implementationMeasurement.pixelSupport,
        centerlinePixelSupport: implementationCenterlinePixelSupport,
      },
      hausdorff,
      reason: null,
      qualification:
        implementationConfig === sourceConfig
          ? 'The deterministic skeleton measures the visible route-core centerline set selected by the same renderer-independent predicate in both rasters. It does not infer an unobservable renderer spline or hidden continuation.'
          : 'The deterministic skeleton compares independently selected visible route-core centerline sets: saturated cyan in the source and bright near-white cyan in localhost. Neither mask borrows pixels from the other or infers an unobservable renderer spline or hidden continuation.',
    },
    comparison: createRouteCenterlineComparison(
      referenceCenterline,
      implementationCenterline,
      referenceImage.info,
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

function evaluateStructuralAccuracy(
  state,
  measurement,
  landmarkMaskEvidence,
  routeCenterlineEvidence,
  fieldTileProfileEvidence,
  fieldContactCenterEvidence,
) {
  const blockers = [];
  const checks = [];
  const failures = [];
  const primaryStructure = state.screenBounds?.primaryStructure ?? {
    kind: 'landmark',
    status: 'blocked',
  };
  const primaryBounds = state.screenBounds?.[primaryStructure.kind];
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
  const sourcePrimaryMeasured =
    primaryStructure.status === 'observed' &&
    (primaryStructure.kind === 'composition'
      ? sourceCompositionMeasured
      : Array.isArray(primaryBounds));
  const implementationStructural = measurement?.structuralAccuracy;
  const implementationComposition = implementationStructural?.screenComposition;
  const implementationCompositionMeasured = isObservedScreenComposition(
    implementationComposition,
  );
  const fieldProfileApplicable = IMPLEMENTATION_FIELD_PROFILE_STATES.has(
    state.key,
  );
  const sourceFieldProfileMeasured =
    state.screenBounds?.fieldProfileStatus === 'observed' &&
    Array.isArray(state.screenBounds?.fieldProfile) &&
    state.screenBounds?.fieldProfileComponentProfile;
  const implementationFieldProfile = implementationStructural?.fieldProfile;
  const contactCenterApplicable = IMPLEMENTATION_CONTACT_CENTER_STATES.has(
    state.key,
  );
  const sourceContactCenterMeasured =
    state.screenBounds?.contactCenterStatus === 'observed' &&
    Array.isArray(state.screenBounds?.contactCenter);
  const implementationContactCenter = implementationStructural?.contactCenter;
  const implementationPrimaryFeature =
    primaryStructure.kind === 'composition'
      ? implementationComposition
      : implementationStructural?.[primaryStructure.kind];
  const implementationPrimaryMeasured =
    implementationPrimaryFeature?.status === 'observed';
  const implementationPrimaryBlocked =
    implementationPrimaryFeature?.status === 'blocked';

  if (!sourcePrimaryMeasured) {
    blockers.push(
      `authoritative source ${primaryStructure.kind} primary-structure evidence is unmeasured`,
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
        : primaryStructure.kind === 'fieldProfile'
          ? implementationPrimaryBlocked
            ? 'implementation field tile profile source-predicate quality gate is blocked'
            : 'implementation field tile profile is not emitted'
          : primaryStructure.kind === 'landmark' && implementationPrimaryBlocked
            ? IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[state.key]
              ? 'implementation landmark renderer-independent quality gate is blocked'
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
  if (
    primaryStructure.kind !== 'composition' &&
    !implementationCompositionMeasured
  ) {
    blockers.push(
      'implementation screen-space composition proxy is not emitted',
    );
  }
  if (
    primaryStructure.kind !== 'fieldProfile' &&
    fieldProfileApplicable &&
    !sourceFieldProfileMeasured
  ) {
    blockers.push('authoritative source field tile profile is unmeasured');
  }
  if (
    primaryStructure.kind !== 'fieldProfile' &&
    fieldProfileApplicable &&
    sourceFieldProfileMeasured &&
    implementationFieldProfile?.status !== 'observed'
  ) {
    blockers.push(
      implementationFieldProfile?.status === 'blocked'
        ? 'implementation field tile profile source-predicate quality gate is blocked'
        : 'implementation field tile profile is not emitted',
    );
  }
  if (contactCenterApplicable && !sourceContactCenterMeasured) {
    blockers.push('authoritative source field contact center is unmeasured');
  }
  if (
    contactCenterApplicable &&
    sourceContactCenterMeasured &&
    implementationContactCenter?.status !== 'observed'
  ) {
    blockers.push(
      implementationContactCenter?.status === 'blocked'
        ? 'implementation field contact-center source-predicate quality gate is blocked'
        : 'implementation field contact center is not emitted',
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
    if (routeCenterlineEvidence?.status === 'observed') {
      checks.push(
        compareMaximum(
          'route.centerline.hausdorff.normalizedShortEdge',
          STRUCTURAL_TOLERANCES.routeCenterlineHausdorffNormalizedShortEdge,
          routeCenterlineEvidence.hausdorff.normalizedShortEdge.symmetric,
        ),
      );
    } else {
      blockers.push(
        'route centerline Hausdorff evidence is blocked for the observed implementation route',
      );
    }
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
    fieldProfileApplicable &&
    sourceFieldProfileMeasured &&
    implementationFieldProfile?.status === 'observed'
  ) {
    const [sourceX, sourceY, sourceWidth, sourceHeight] =
      state.screenBounds.fieldProfile;
    const [actualX, actualY, actualWidth, actualHeight] =
      implementationFieldProfile.bounds.cssPixels;
    const profileWidth = manifest.authority.recordingProfile.cssViewport.width;
    const profileHeight =
      manifest.authority.recordingProfile.cssViewport.height;
    const sourceProfile = state.screenBounds.fieldProfileComponentProfile;
    const actualProfile = implementationFieldProfile.componentProfile;
    const sourceMedian = sourceProfile.medianTileTop.cssPixels;
    const actualMedian = actualProfile.medianTileTop.cssPixels;

    checks.push(
      compareScalar(
        'field.envelope.center.normalized.x',
        (sourceX + sourceWidth / 2) / profileWidth,
        (actualX + actualWidth / 2) / profileWidth,
        STRUCTURAL_TOLERANCES.fieldEnvelopeCenterNormalized,
      ),
      compareScalar(
        'field.envelope.center.normalized.y',
        (sourceY + sourceHeight / 2) / profileHeight,
        (actualY + actualHeight / 2) / profileHeight,
        STRUCTURAL_TOLERANCES.fieldEnvelopeCenterNormalized,
      ),
      compareScalar(
        'field.envelope.size.cssPixels.width',
        sourceWidth,
        actualWidth,
        sourceWidth * STRUCTURAL_TOLERANCES.fieldEnvelopeSizeRatio,
      ),
      compareScalar(
        'field.envelope.size.cssPixels.height',
        sourceHeight,
        actualHeight,
        sourceHeight * STRUCTURAL_TOLERANCES.fieldEnvelopeSizeRatio,
      ),
      compareScalar(
        'field.tileTop.componentCount',
        sourceProfile.count,
        actualProfile.count,
        STRUCTURAL_TOLERANCES.fieldTileComponentCountDelta,
      ),
      compareScalar(
        'field.tileTop.median.cssPixels.width',
        sourceMedian.width,
        actualMedian.width,
        Math.max(
          STRUCTURAL_TOLERANCES.fieldMedianTileCssPixelsMinimum,
          sourceMedian.width * STRUCTURAL_TOLERANCES.fieldMedianTileSizeRatio,
        ),
      ),
      compareScalar(
        'field.tileTop.median.cssPixels.height',
        sourceMedian.height,
        actualMedian.height,
        Math.max(
          STRUCTURAL_TOLERANCES.fieldMedianTileCssPixelsMinimum,
          sourceMedian.height * STRUCTURAL_TOLERANCES.fieldMedianTileSizeRatio,
        ),
      ),
      compareScalar(
        'field.tileTop.selectedPixelOccupancy',
        sourceProfile.selectedPixelOccupancy,
        actualProfile.selectedPixelOccupancy,
        STRUCTURAL_TOLERANCES.fieldSelectedPixelOccupancy,
      ),
    );
    if (fieldTileProfileEvidence?.status === 'observed') {
      checks.push(
        compareMinimum(
          'field.tileTop.mask.iou',
          STRUCTURAL_TOLERANCES.fieldTileMaskIouMinimum,
          fieldTileProfileEvidence.overlap.iou,
        ),
      );
    } else {
      blockers.push(
        'field tile-profile mask-overlap evidence is blocked for the observed implementation profile',
      );
    }
  }

  if (
    contactCenterApplicable &&
    sourceContactCenterMeasured &&
    implementationContactCenter?.status === 'observed'
  ) {
    const [sourceX, sourceY, sourceWidth, sourceHeight] =
      state.screenBounds.contactCenter;
    const [actualX, actualY, actualWidth, actualHeight] =
      implementationContactCenter.bounds.cssPixels;
    const profileWidth = manifest.authority.recordingProfile.cssViewport.width;
    const profileHeight =
      manifest.authority.recordingProfile.cssViewport.height;

    checks.push(
      compareScalar(
        'contactCenter.center.normalized.x',
        (sourceX + sourceWidth / 2) / profileWidth,
        (actualX + actualWidth / 2) / profileWidth,
        STRUCTURAL_TOLERANCES.contactCenterCenterNormalized,
      ),
      compareScalar(
        'contactCenter.center.normalized.y',
        (sourceY + sourceHeight / 2) / profileHeight,
        (actualY + actualHeight / 2) / profileHeight,
        STRUCTURAL_TOLERANCES.contactCenterCenterNormalized,
      ),
      compareScalar(
        'contactCenter.size.cssPixels.width',
        sourceWidth,
        actualWidth,
        sourceWidth * STRUCTURAL_TOLERANCES.contactCenterSizeRatio,
      ),
      compareScalar(
        'contactCenter.size.cssPixels.height',
        sourceHeight,
        actualHeight,
        sourceHeight * STRUCTURAL_TOLERANCES.contactCenterSizeRatio,
      ),
    );
    if (fieldContactCenterEvidence?.status === 'observed') {
      checks.push(
        compareMinimum(
          'contactCenter.silhouette.iou',
          STRUCTURAL_TOLERANCES.contactCenterSilhouetteIouMinimum,
          fieldContactCenterEvidence.overlap.iou,
        ),
      );
    } else {
      blockers.push(
        'field contact-center mask-overlap evidence is blocked for the observed implementation center',
      );
    }
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
    routeCenterlineEvidence,
    fieldTileProfileEvidence,
    fieldContactCenterEvidence,
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

function compareMaximum(metric, maximum, actual) {
  const delta = actual - maximum;

  return {
    metric,
    expected: maximum,
    actual,
    delta,
    absoluteDelta: Math.max(0, delta),
    tolerance: 0,
    comparison: 'lte',
    status: actual <= maximum ? 'pass' : 'fail',
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
  const landmarkMaskResult = await measureLandmarkMaskEvidence({
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
  const routeCenterlineResult = measureRouteCenterlineEvidence({
    state,
    measurement,
    referenceImage,
    implementationImage,
    dpr: manifest.authority.recordingProfile.devicePixelRatio.value,
  });
  let routeCenterlineEvidence = routeCenterlineResult?.evidence ?? null;
  if (routeCenterlineResult?.comparison) {
    const routeCenterlinePath = path.join(
      comparisonRoot,
      `${state.key}-route-centerline.png`,
    );
    await sharp(routeCenterlineResult.comparison, imageOptions)
      .png()
      .toFile(routeCenterlinePath);
    routeCenterlineEvidence = {
      ...routeCenterlineEvidence,
      comparisonArtifactPath: relative(routeCenterlinePath),
      comparisonLegend: {
        referenceOnly: '#ff40c0',
        implementationOnly: '#00c8ff',
        intersection: '#f5f5f5',
        neither: '#0e1014',
        displayDilationRadiusRasterPixels: 2,
      },
    };
  }
  const fieldTileProfileResult = measureFieldTileProfileEvidence({
    state,
    measurement,
    referenceImage,
    implementationImage,
    dpr: manifest.authority.recordingProfile.devicePixelRatio.value,
  });
  let fieldTileProfileEvidence = fieldTileProfileResult?.evidence ?? null;
  if (fieldTileProfileResult) {
    const fieldTileProfilePath = path.join(
      comparisonRoot,
      `${state.key}-field-tile-profile.png`,
    );
    await sharp(fieldTileProfileResult.comparison, imageOptions)
      .png()
      .toFile(fieldTileProfilePath);
    fieldTileProfileEvidence = {
      ...fieldTileProfileEvidence,
      comparisonArtifactPath: relative(fieldTileProfilePath),
      comparisonLegend: {
        referenceOnly: '#ff40c0',
        implementationOnly: '#00c8ff',
        intersection: '#f5f5f5',
        neither: '#0e1014',
      },
    };
  }
  const fieldContactCenterResult = measureFieldContactCenterEvidence({
    state,
    measurement,
    referenceImage,
    implementationImage,
    dpr: manifest.authority.recordingProfile.devicePixelRatio.value,
  });
  let fieldContactCenterEvidence = fieldContactCenterResult?.evidence ?? null;
  if (fieldContactCenterResult) {
    const fieldContactCenterPath = path.join(
      comparisonRoot,
      `${state.key}-contact-center-mask.png`,
    );
    await sharp(fieldContactCenterResult.comparison, imageOptions)
      .png()
      .toFile(fieldContactCenterPath);
    fieldContactCenterEvidence = {
      ...fieldContactCenterEvidence,
      comparisonArtifactPath: relative(fieldContactCenterPath),
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
    routeCenterlineEvidence,
    fieldTileProfileEvidence,
    fieldContactCenterEvidence,
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
        : check.metric.startsWith('contactCenter.')
          ? 'contactCenter'
          : check.metric.startsWith('field.')
            ? 'field'
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
    contactCenter: { pass: 0, fail: 0 },
    field: { pass: 0, fail: 0 },
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
  schemaVersion: 16,
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
