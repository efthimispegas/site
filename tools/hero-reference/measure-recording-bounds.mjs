import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { format as formatWithPrettier, resolveConfig } from 'prettier';
import sharp from 'sharp';
import { measureScreenComposition } from '../../apps/pegasoft-e2e/src/visual/screen-composition.mjs';
import {
  COPY_CONFIG_BY_STATE,
  FIELD_CONTACT_CENTER_CONFIG_BY_STATE,
  FIELD_TILE_PROFILE_CONFIG_BY_STATE,
  JOURNEY_EXIT_BOUNDARY_CONFIG,
  LANDMARK_CONFIG_BY_STATE,
  ROUTE_CONFIG_BY_STATE,
  measureChromaFeature,
  measureCopyInk,
  measureFieldTileProfile,
  measureHorizontalBoundary as measureSharedHorizontalBoundary,
  measureLandmarkFeature,
} from '../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';

const workspaceRoot = process.cwd();
const anchorsPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-anchors.json',
);
const outputPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-structural-bounds.json',
);
const semanticMasksPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-semantic-masks.json',
);
const evidenceRef = 'docs/hero-reference/recording-structural-bounds.json#';
const semanticMasksRef = 'docs/hero-reference/recording-semantic-masks.json';
const algorithmVersion = 'recording-structural-bounds-v16';
const semanticMaskReviewStatus = 'accepted-for-reference-refinement';
const semanticMaskReviewScope = 'source-reference-goal-only';

const argumentsSet = new Set(process.argv.slice(2));
const checkOnly = argumentsSet.has('--check');
const debugArgumentIndex = process.argv.indexOf('--debug-dir');
const debugDirectory =
  debugArgumentIndex >= 0
    ? path.resolve(workspaceRoot, process.argv[debugArgumentIndex + 1] ?? '')
    : null;

if (debugArgumentIndex >= 0 && !process.argv[debugArgumentIndex + 1]) {
  throw new Error('--debug-dir requires a directory path');
}

const STATE_MEASUREMENTS = {
  'loader-mark': {
    primaryStructure: 'landmark',
    landmark: LANDMARK_CONFIG_BY_STATE['loader-mark'],
  },
  'world-reveal': {
    primaryStructure: 'landmark',
    landmark: LANDMARK_CONFIG_BY_STATE['world-reveal'],
    route: ROUTE_CONFIG_BY_STATE['world-reveal'],
  },
  landing: {
    primaryStructure: 'composition',
    primaryStructureLabel: 'resolved landing screen-space composition',
    landmark: {
      status: 'blocked',
      label: 'landing industrial context aggregate',
      reason:
        'The landing focus is a disconnected industrial-context aggregate with members clipped by the lower viewport. A single enclosure would encode subjective membership and cannot be used as a precise landmark gate.',
    },
    route: {
      status: 'not-applicable',
      label: null,
      reason:
        'The locked resolved-landing frame contains no source-visible route pixels. Red rails appear in the earlier reveal and later landing-idle anchors; an off-screen or future continuation is not inferred here.',
    },
    copy: COPY_CONFIG_BY_STATE.landing,
  },
  'landing-idle': {
    primaryStructure: 'composition',
    primaryStructureLabel:
      'resolved landing screen-space composition during route idle',
    landmark: {
      status: 'blocked',
      label: 'landing industrial context aggregate at route idle',
      reason:
        'The landing focus remains a disconnected, lower-viewport-clipped aggregate. The red packet is a route effect, and neither it nor a near-viewport-wide hand enclosure is a defensible landmark substitute.',
    },
    route: ROUTE_CONFIG_BY_STATE['landing-idle'],
    copy: COPY_CONFIG_BY_STATE['landing-idle'],
  },
  'activation-route': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'first-destination building before route contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete destination building is fully visible. A hash-locked, source-frame-tied semantic silhouette includes its connected volumes while excluding rails, shadows, figures, vegetation, and surrounding context.',
    },
    route: ROUTE_CONFIG_BY_STATE['activation-route'],
    copy: COPY_CONFIG_BY_STATE['activation-route'],
  },
  'activation-contact': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'logo-bearing first-destination building at route contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete logo-bearing destination is visible. A hash-locked semantic silhouette prevents the separable blue logo or red contact rails from substituting for the full landmark.',
    },
    route: ROUTE_CONFIG_BY_STATE['activation-contact'],
    copy: COPY_CONFIG_BY_STATE['activation-contact'],
  },
  'clearance-travel': {
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'This is a route-primary transit anchor with no single destination landmark in frame.',
    },
    route: ROUTE_CONFIG_BY_STATE['clearance-travel'],
    copy: COPY_CONFIG_BY_STATE['clearance-travel'],
  },
  'clearance-field-preview': {
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'The approaching route is the primary structure. The field is only a secondary preview clipped by the top and right viewport edges.',
    },
    route: ROUTE_CONFIG_BY_STATE['clearance-field-preview'],
    copy: COPY_CONFIG_BY_STATE['clearance-field-preview'],
    fieldProfile: FIELD_TILE_PROFILE_CONFIG_BY_STATE['clearance-field-preview'],
  },
  'field-approach': {
    primaryStructure: 'fieldProfile',
    primaryStructureLabel: 'visible bright-neutral field tile-top profile',
    landmark: {
      status: 'blocked',
      label: 'elevated field-center tile and figure',
      reason:
        'Only a pale fragment of the elevated center and figure is visible among similar tiles, and the fixed header/viewport occludes its upper extent. Partial censored evidence cannot supply a complete landmark box.',
    },
    route: ROUTE_CONFIG_BY_STATE['field-approach'],
    copy: COPY_CONFIG_BY_STATE['field-approach'],
    fieldProfile: FIELD_TILE_PROFILE_CONFIG_BY_STATE['field-approach'],
  },
  'field-contact': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'elevated center tile and standing figure at first contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete center tile and its standing figure are visible. Their hash-locked semantic union excludes the incoming route, adjacent reacting tiles, and contact glow.',
    },
    route: ROUTE_CONFIG_BY_STATE['field-contact'],
    copy: COPY_CONFIG_BY_STATE['field-contact'],
    fieldProfile: FIELD_TILE_PROFILE_CONFIG_BY_STATE['field-contact'],
    contactCenter: FIELD_CONTACT_CENTER_CONFIG_BY_STATE['field-contact'],
  },
  'field-pulse-a': {
    primaryStructure: 'fieldProfile',
    primaryStructureLabel:
      'visible bright-neutral field tile-top profile during inner pulse',
    landmark: {
      status: 'blocked',
      label: 'field center during inner pulse',
      reason:
        'Bloom occludes the center tile and figure and joins the route with neighboring tiles. The luminous envelope is an effect observable, not a substitute for the hidden structural landmark.',
    },
    route: ROUTE_CONFIG_BY_STATE['field-pulse-a'],
    copy: COPY_CONFIG_BY_STATE['field-pulse-a'],
    fieldProfile: FIELD_TILE_PROFILE_CONFIG_BY_STATE['field-pulse-a'],
  },
  'field-pulse-b': {
    primaryStructure: 'landmark',
    landmark: LANDMARK_CONFIG_BY_STATE['field-pulse-b'],
    route: ROUTE_CONFIG_BY_STATE['field-pulse-b'],
    copy: COPY_CONFIG_BY_STATE['field-pulse-b'],
    fieldProfile: FIELD_TILE_PROFILE_CONFIG_BY_STATE['field-pulse-b'],
  },
  'arrival-travel': {
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'This is a route-primary travel anchor; the arrival-arrow destination remains outside the right viewport edge.',
    },
    route: ROUTE_CONFIG_BY_STATE['arrival-travel'],
    copy: COPY_CONFIG_BY_STATE['arrival-travel'],
  },
  'arrival-lockup': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'large frontal arrival arrow',
      method: 'source-semantic-mask',
      rationale:
        'The complete layered arrow is fully visible, but its pale material overlaps the surrounding bloom and background palette. A hash-locked, source-frame-tied semantic silhouette includes the filled shaft, tip, and diagonal arms while excluding the cyan feed, bloom, wake, and surrounding marks.',
    },
    route: ROUTE_CONFIG_BY_STATE['arrival-lockup'],
    copy: COPY_CONFIG_BY_STATE['arrival-lockup'],
  },
  'journey-exit': {
    primaryStructure: 'boundary',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'The state focus is the section handoff. An upper arrival-arrow fragment remains visible, correcting the prior absence claim, but the following section censors the rest of the arrow.',
    },
    route: {
      status: 'not-applicable',
      label: null,
      reason:
        'The route is no longer a separately readable primary structure at the section-handoff anchor.',
    },
    boundary: JOURNEY_EXIT_BOUNDARY_CONFIG,
    copy: COPY_CONFIG_BY_STATE['journey-exit'],
  },
};

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function writeFileAtomically(filePath, contents) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`,
  );
  await writeFile(temporaryPath, contents, 'utf8');
  await rename(temporaryPath, filePath);
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function boundsFromMask(mask, width, height) {
  let pixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    pixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (pixels === 0) {
    return null;
  }

  return {
    pixels,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function serializeBounds(bounds, image, dpr) {
  return {
    rasterPixels: [bounds.x, bounds.y, bounds.width, bounds.height],
    cssPixels: [
      round(bounds.x / dpr),
      round(bounds.y / dpr),
      round(bounds.width / dpr),
      round(bounds.height / dpr),
    ],
    normalized: [
      round(bounds.x / image.width, 6),
      round(bounds.y / image.height, 6),
      round(bounds.width / image.width, 6),
      round(bounds.height / image.height, 6),
    ],
  };
}

async function writeDebugOverlay(
  sourcePath,
  stateKey,
  featureKind,
  selectedMask,
  image,
  bounds,
) {
  if (!debugDirectory) {
    return;
  }

  await mkdir(debugDirectory, { recursive: true });
  const tint = Buffer.alloc(image.width * image.height * 4);
  for (let index = 0; index < selectedMask.length; index += 1) {
    if (!selectedMask[index]) {
      continue;
    }
    const channelIndex = index * 4;
    tint[channelIndex] = 255;
    tint[channelIndex + 1] = 0;
    tint[channelIndex + 2] = 180;
    tint[channelIndex + 3] = 150;
  }

  const svg = Buffer.from(
    `<svg width="${image.width}" height="${image.height}" xmlns="http://www.w3.org/2000/svg"><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="#ffea00" stroke-width="6"/></svg>`,
  );
  await sharp(sourcePath)
    .composite([
      {
        input: tint,
        raw: {
          width: image.width,
          height: image.height,
          channels: 4,
        },
      },
      { input: svg },
    ])
    .png()
    .toFile(path.join(debugDirectory, `${stateKey}-${featureKind}.png`));
}

async function selectSemanticMask(sourcePath, image, stateKey, featureKind) {
  const entry = semanticMasksByKey.get(`${stateKey}:${featureKind}`);
  if (!entry) {
    throw new Error(
      `${stateKey}/${featureKind}: no source semantic mask is declared in ${semanticMasksRef}`,
    );
  }

  const relativeSourcePath = path
    .relative(workspaceRoot, sourcePath)
    .split(path.sep)
    .join('/');
  if (entry.sourceCapturePath !== relativeSourcePath) {
    throw new Error(
      `${stateKey}/${featureKind}: semantic mask source ${entry.sourceCapturePath} does not match ${relativeSourcePath}`,
    );
  }

  const actualSourceSha = await sha256File(sourcePath);
  if (entry.sourceCaptureSha256 !== actualSourceSha) {
    throw new Error(
      `${stateKey}/${featureKind}: semantic mask source SHA mismatch (${actualSourceSha} != ${entry.sourceCaptureSha256})`,
    );
  }

  const maskPath = path.join(workspaceRoot, entry.maskPath);
  const maskBuffer = await readFile(maskPath);
  const actualMaskSha = sha256(maskBuffer);
  if (actualMaskSha !== entry.maskSha256) {
    throw new Error(
      `${stateKey}/${featureKind}: semantic mask SHA mismatch (${actualMaskSha} != ${entry.maskSha256})`,
    );
  }

  const { data: maskData, info: maskInfo } = await sharp(maskBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    maskInfo.width !== image.width ||
    maskInfo.height !== image.height ||
    maskInfo.channels !== 4
  ) {
    throw new Error(
      `${stateKey}/${featureKind}: semantic mask must rasterize to ${image.width}x${image.height} RGBA; received ${maskInfo.width}x${maskInfo.height}x${maskInfo.channels}`,
    );
  }
  if (
    !Number.isInteger(entry.alphaThreshold) ||
    entry.alphaThreshold < 1 ||
    entry.alphaThreshold > 255 ||
    !Number.isInteger(entry.minimumSelectedPixels) ||
    entry.minimumSelectedPixels < 1
  ) {
    throw new Error(
      `${stateKey}/${featureKind}: semantic mask thresholds must be positive integers and alphaThreshold must not exceed 255`,
    );
  }

  const selectedMask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < selectedMask.length; index += 1) {
    if (maskData[index * maskInfo.channels + 3] >= entry.alphaThreshold) {
      selectedMask[index] = 1;
    }
  }
  const selected = boundsFromMask(selectedMask, image.width, image.height);
  if (
    selected &&
    (selected.bounds.x === 0 ||
      selected.bounds.y === 0 ||
      selected.bounds.x + selected.bounds.width === image.width ||
      selected.bounds.y + selected.bounds.height === image.height)
  ) {
    throw new Error(
      `${stateKey}/${featureKind}: complete-landmark semantic mask touches the source raster edge`,
    );
  }

  return {
    selectedMask,
    selectedComponents: selected ? [selected] : [],
    eligibleComponentCount: selected ? 1 : 0,
    totalComponentCount: selected ? 1 : 0,
    minimumSelectedPixels: entry.minimumSelectedPixels,
    semanticMask: {
      manifest: semanticMasksRef,
      maskPath: entry.maskPath,
      maskSha256: entry.maskSha256,
      sourceCapturePath: entry.sourceCapturePath,
      sourceCaptureSha256: entry.sourceCaptureSha256,
      alphaThreshold: entry.alphaThreshold,
      inclusion: entry.inclusion,
      exclusion: entry.exclusion,
      uncertainty: entry.uncertainty,
      reviewStatus: entry.reviewStatus,
      reviewScope: entry.reviewScope,
      visualAcceptance: entry.visualAcceptance,
      implementationPixelClassifier: entry.implementationPixelClassifier,
    },
  };
}

async function measureFeature(
  sourcePath,
  image,
  stateKey,
  featureKind,
  config,
  dpr,
) {
  if (config.method !== 'source-semantic-mask') {
    throw new Error(
      `Only source-semantic-mask remains source-tool-specific; received ${config.method}`,
    );
  }
  const selection = await selectSemanticMask(
    sourcePath,
    image,
    stateKey,
    featureKind,
  );

  const selected = boundsFromMask(
    selection.selectedMask,
    image.width,
    image.height,
  );
  const minimumSelectedPixels =
    selection.minimumSelectedPixels ?? config.minimumSelectedPixels;
  if (!selected || selected.pixels < minimumSelectedPixels) {
    return {
      status: 'blocked',
      label: config.label,
      reason: `The deterministic ${config.method} quality gate found ${selected?.pixels ?? 0} selected pixels; at least ${minimumSelectedPixels} are required.`,
      method: {
        id: config.method,
        roiNormalized: null,
        roiRasterPixels: null,
        semanticMask: selection.semanticMask ?? null,
      },
    };
  }

  await writeDebugOverlay(
    sourcePath,
    stateKey,
    featureKind,
    selection.selectedMask,
    image,
    selected.bounds,
  );

  return {
    status: 'observed',
    evidenceClass: 'observed',
    label: config.label,
    bounds: serializeBounds(selected.bounds, image, dpr),
    geometry: null,
    pixelSupport: selected.pixels,
    method: {
      id: config.method,
      roiNormalized: null,
      roiRasterPixels: null,
      predicate: null,
      sobelThreshold: null,
      dilationIterations: 0,
      connectivity: null,
      minimumComponentPixels: null,
      maximumComponentPixels: null,
      maximumComponentWidth: null,
      maximumComponentHeight: null,
      minimumComponentFillRatio: null,
      minimumSelectedPixels,
      totalComponentCount: selection.totalComponentCount,
      eligibleComponentCount: selection.eligibleComponentCount,
      selectedComponentCount: selection.selectedComponents.length,
      semanticMask: selection.semanticMask ?? null,
      rationale: config.rationale,
    },
  };
}

async function measureConfiguredFeature({
  sourcePath,
  data,
  image,
  stateKey,
  featureKind,
  config,
  dpr,
}) {
  if (config.status) {
    if (config.status !== 'blocked' && config.status !== 'not-applicable') {
      throw new Error(
        `${stateKey}/${featureKind}: unsupported declared status ${config.status}`,
      );
    }
    if (!config.reason) {
      throw new Error(
        `${stateKey}/${featureKind}: ${config.status} requires a reason`,
      );
    }
    return {
      status: config.status,
      label: config.label ?? null,
      reason: config.reason,
    };
  }

  if (featureKind === 'boundary') {
    const result = measureSharedHorizontalBoundary({
      data,
      image,
      dpr,
      config,
    });
    if (result.measurement.status === 'observed') {
      await writeDebugOverlay(
        sourcePath,
        stateKey,
        featureKind,
        result.debug.mask,
        image,
        result.debug.bounds,
      );
    }
    return result.measurement;
  }

  if (featureKind === 'copy') {
    const result = measureCopyInk({ data, image, dpr, config });
    if (result.measurement.status === 'observed') {
      await writeDebugOverlay(
        sourcePath,
        stateKey,
        featureKind,
        result.debug.mask,
        image,
        result.debug.bounds,
      );
    }
    return result.measurement;
  }

  if (featureKind === 'fieldProfile') {
    const result = measureFieldTileProfile({ data, image, dpr, config });
    if (result.measurement.status === 'observed') {
      await writeDebugOverlay(
        sourcePath,
        stateKey,
        featureKind,
        result.debug.mask,
        image,
        result.debug.bounds,
      );
    }
    return result.measurement;
  }

  if (
    featureKind === 'route' &&
    (config.method === 'chroma-component-union' ||
      config.method === 'largest-chroma-component')
  ) {
    const result = measureChromaFeature({ data, image, dpr, config });
    if (result.measurement.status === 'observed') {
      await writeDebugOverlay(
        sourcePath,
        stateKey,
        featureKind,
        result.debug.mask,
        image,
        result.debug.bounds,
      );
    }
    return result.measurement;
  }

  if (
    (featureKind === 'landmark' || featureKind === 'contactCenter') &&
    config.method !== 'source-semantic-mask'
  ) {
    const result = measureLandmarkFeature({ data, image, dpr, config });
    if (result.measurement.status === 'observed') {
      await writeDebugOverlay(
        sourcePath,
        stateKey,
        featureKind,
        result.debug.mask,
        image,
        result.debug.bounds,
      );
    }
    return result.measurement;
  }

  return measureFeature(sourcePath, image, stateKey, featureKind, config, dpr);
}

function updateAnchorScreenBounds(anchor, stateEvidence, stateIndex) {
  const prior = anchor.screenBounds ?? {};
  const landmarkObserved = stateEvidence.landmark?.status === 'observed';
  const routeObserved = stateEvidence.route?.status === 'observed';
  const boundaryObserved = stateEvidence.boundary?.status === 'observed';
  const copyObserved = stateEvidence.copy?.status === 'observed';
  const fieldProfileObserved =
    stateEvidence.fieldProfile?.status === 'observed';
  const contactCenterObserved =
    stateEvidence.contactCenter?.status === 'observed';
  const primaryObserved = stateEvidence.primaryStructure.status === 'observed';
  const landmarkEvidenceRef = landmarkObserved
    ? `${evidenceRef}/states/${stateIndex}/landmark`
    : null;
  const routeEvidenceRef = routeObserved
    ? `${evidenceRef}/states/${stateIndex}/route`
    : null;
  const boundaryEvidenceRef = boundaryObserved
    ? `${evidenceRef}/states/${stateIndex}/boundary`
    : null;
  const copyEvidenceRef = copyObserved
    ? `${evidenceRef}/states/${stateIndex}/copy`
    : null;
  const fieldProfileEvidenceRef = fieldProfileObserved
    ? `${evidenceRef}/states/${stateIndex}/fieldProfile`
    : null;
  const contactCenterEvidenceRef = contactCenterObserved
    ? `${evidenceRef}/states/${stateIndex}/contactCenter`
    : null;
  const primaryEvidenceRef = stateEvidence.primaryStructure.evidenceRef;
  const next = {
    ...prior,
    status: primaryObserved ? 'observed' : 'unknown',
    coordinateSpace: 'css-pixels',
    profileId: 'recording-desktop',
    primaryStructure: {
      ...stateEvidence.primaryStructure,
      evidenceRef: primaryEvidenceRef,
    },
    landmarkStatus: stateEvidence.landmark.status,
    landmark: landmarkObserved ? stateEvidence.landmark.bounds.cssPixels : null,
    landmarkLabel: stateEvidence.landmark.label ?? null,
    landmarkEvidenceRef,
    routeStatus: stateEvidence.route.status,
    route: routeObserved ? stateEvidence.route.bounds.cssPixels : null,
    routeGeometry: routeObserved ? stateEvidence.route.geometry : null,
    routeLabel: stateEvidence.route.label ?? null,
    routeEvidenceRef,
    boundaryStatus: stateEvidence.boundary.status,
    boundary: boundaryObserved ? stateEvidence.boundary.bounds.cssPixels : null,
    boundaryLabel: stateEvidence.boundary.label ?? null,
    boundaryEvidenceRef,
    copyStatus: stateEvidence.copy.status,
    copy: copyObserved ? stateEvidence.copy.bounds.cssPixels : null,
    copyLabel: stateEvidence.copy.label ?? null,
    copyEvidenceRef,
    fieldProfileStatus: stateEvidence.fieldProfile.status,
    fieldProfile: fieldProfileObserved
      ? stateEvidence.fieldProfile.bounds.cssPixels
      : null,
    fieldProfileComponentProfile: fieldProfileObserved
      ? stateEvidence.fieldProfile.componentProfile
      : null,
    fieldProfileLabel: stateEvidence.fieldProfile.label ?? null,
    fieldProfileEvidenceRef,
    contactCenterStatus: stateEvidence.contactCenter.status,
    contactCenter: contactCenterObserved
      ? stateEvidence.contactCenter.bounds.cssPixels
      : null,
    contactCenterLabel: stateEvidence.contactCenter.label ?? null,
    contactCenterEvidenceRef,
    reason: primaryObserved
      ? `Primary ${stateEvidence.primaryStructure.kind} measured by the reproducible recording structural-bounds pipeline; copy evidence is classified independently.`
      : stateEvidence.primaryStructure.reason,
  };

  return next;
}

function updateAnchorScreenComposition(stateEvidence, stateIndex) {
  const composition = stateEvidence.composition;
  return {
    ...composition,
    evidenceRef:
      composition.status === 'observed'
        ? `${evidenceRef}/states/${stateIndex}/composition`
        : null,
  };
}

const [manifest, semanticMaskManifest] = await Promise.all([
  readFile(anchorsPath, 'utf8').then((contents) => JSON.parse(contents)),
  readFile(semanticMasksPath, 'utf8').then((contents) => JSON.parse(contents)),
]);
if (
  semanticMaskManifest.schemaVersion !== 2 ||
  semanticMaskManifest.authority.recordingSha256 !==
    manifest.authority.sourceSha256 ||
  semanticMaskManifest.authority.rasterPixels.width !==
    manifest.authority.recordingProfile.rasterPixels.width ||
  semanticMaskManifest.authority.rasterPixels.height !==
    manifest.authority.recordingProfile.rasterPixels.height ||
  semanticMaskManifest.reviewContract?.status !== semanticMaskReviewStatus ||
  semanticMaskManifest.reviewContract?.scope !== semanticMaskReviewScope ||
  semanticMaskManifest.reviewContract?.implementationPixelClassification !==
    false ||
  semanticMaskManifest.reviewContract?.structuralAcceptance !== false ||
  semanticMaskManifest.reviewContract?.visualAcceptance !== false
) {
  throw new Error(
    `${semanticMasksRef}: authority and refinement-only review contract must match the locked recording manifest`,
  );
}
const semanticMasksByKey = new Map();
for (const entry of semanticMaskManifest.masks) {
  const key = `${entry.stateKey}:${entry.featureKind}`;
  if (semanticMasksByKey.has(key)) {
    throw new Error(`${semanticMasksRef}: duplicate semantic mask ${key}`);
  }
  if (
    entry.reviewStatus !== semanticMaskReviewStatus ||
    entry.reviewScope !== semanticMaskReviewScope ||
    entry.visualAcceptance !== false ||
    entry.implementationPixelClassifier !== false
  ) {
    throw new Error(
      `${semanticMasksRef}: ${key} review permits source-reference refinement only`,
    );
  }
  if (
    path.isAbsolute(entry.maskPath) ||
    path.isAbsolute(entry.sourceCapturePath) ||
    !entry.maskPath.startsWith('docs/hero-reference/annotations/') ||
    !entry.sourceCapturePath.startsWith('docs/hero-reference/recording/')
  ) {
    throw new Error(
      `${semanticMasksRef}: only repository-relative annotation and locked-frame paths are allowed`,
    );
  }
  semanticMasksByKey.set(key, entry);
}
const configuredSemanticMaskKeys = new Set(
  Object.entries(STATE_MEASUREMENTS).flatMap(([stateKey, stateConfig]) =>
    ['landmark', 'route', 'boundary']
      .filter(
        (featureKind) =>
          stateConfig[featureKind]?.method === 'source-semantic-mask',
      )
      .map((featureKind) => `${stateKey}:${featureKind}`),
  ),
);
if (
  configuredSemanticMaskKeys.size !== semanticMasksByKey.size ||
  [...configuredSemanticMaskKeys].some((key) => !semanticMasksByKey.has(key))
) {
  throw new Error(
    `${semanticMasksRef}: every semantic mask must map one-to-one to an active measurement configuration`,
  );
}
const recordingPath = path.join(workspaceRoot, 'docs/vectrfl_recording.mov');
const recordingSha = await sha256File(recordingPath);
if (recordingSha !== manifest.authority.sourceSha256) {
  throw new Error(
    `Authoritative recording SHA mismatch (${recordingSha} != ${manifest.authority.sourceSha256})`,
  );
}
const dpr = manifest.authority.recordingProfile.devicePixelRatio.value;
const states = [];

for (const anchor of manifest.states) {
  const sourcePath = path.join(workspaceRoot, anchor.anchor.capturePath);
  const sourceBuffer = await readFile(sourcePath);
  const actualSha = sha256(sourceBuffer);
  if (actualSha !== anchor.anchor.captureSha256) {
    throw new Error(
      `${anchor.key}: locked frame SHA mismatch (${actualSha} != ${anchor.anchor.captureSha256})`,
    );
  }

  const { data, info } = await sharp(sourceBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    info.width !== manifest.authority.recordingProfile.rasterPixels.width ||
    info.height !== manifest.authority.recordingProfile.rasterPixels.height ||
    info.channels !== 3
  ) {
    throw new Error(
      `${anchor.key}: expected 3016x1522 RGB input, received ${info.width}x${info.height}x${info.channels}`,
    );
  }

  const image = {
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
  const config = STATE_MEASUREMENTS[anchor.key];
  if (!config) {
    throw new Error(
      `${anchor.key}: every source state requires explicit structural configuration`,
    );
  }
  if (
    config.primaryStructure !== 'landmark' &&
    config.primaryStructure !== 'route' &&
    config.primaryStructure !== 'boundary' &&
    config.primaryStructure !== 'fieldProfile' &&
    config.primaryStructure !== 'composition'
  ) {
    throw new Error(
      `${anchor.key}: unsupported primary structure ${config.primaryStructure}`,
    );
  }
  if (!config.landmark) {
    throw new Error(`${anchor.key}: landmark applicability must be explicit`);
  }
  const landmark = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'landmark',
    config: config.landmark,
    dpr,
  });
  const route = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'route',
    config:
      config.route ??
      (anchor.route?.segment === 'none'
        ? {
            status: 'not-applicable',
            reason: 'The source state has no applicable route structure.',
          }
        : {
            status: 'blocked',
            reason:
              'The applicable route structure is not yet measured in this pass.',
          }),
    dpr,
  });
  const boundary = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'boundary',
    config: config.boundary ?? {
      status: 'not-applicable',
      reason:
        'No section-transition boundary is applicable to this source state.',
    },
    dpr,
  });
  const copy = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'copy',
    config:
      config.copy ??
      (anchor.activeCopyState?.value === 'none'
        ? {
            status: 'not-applicable',
            reason: 'The source state has no applicable hero copy.',
          }
        : {
            status: 'blocked',
            reason:
              'The applicable source copy is not yet defensibly measurable in this pass.',
          }),
    dpr,
  });
  const fieldProfile = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'fieldProfile',
    config: config.fieldProfile ?? {
      status: 'not-applicable',
      reason:
        'No rounded-tile field profile is applicable to this source state.',
    },
    dpr,
  });
  const contactCenter = await measureConfiguredFeature({
    sourcePath,
    data,
    image,
    stateKey: anchor.key,
    featureKind: 'contactCenter',
    config: config.contactCenter ?? {
      status: 'not-applicable',
      reason:
        'No independently measurable field contact center is applicable to this source state.',
    },
    dpr,
  });
  const { measurement: composition, debug: compositionDebug } =
    measureScreenComposition({ data, image, dpr });
  if (composition.status === 'observed') {
    await writeDebugOverlay(
      sourcePath,
      anchor.key,
      'composition',
      compositionDebug.mask,
      image,
      compositionDebug.roi,
    );
  }
  const primaryFeature = {
    landmark,
    route,
    boundary,
    copy,
    fieldProfile,
    composition,
  }[config.primaryStructure];
  const stateIndex = states.length;
  const stateEvidence = {
    key: anchor.key,
    source: {
      recordingSha256: manifest.authority.sourceSha256,
      decodedFrameIndex: anchor.anchor.decodedFrameIndex,
      timestampSeconds: anchor.anchor.timestampSeconds,
      capturePath: anchor.anchor.capturePath,
      captureSha256: anchor.anchor.captureSha256,
      rasterPixels: {
        width: info.width,
        height: info.height,
      },
      devicePixelRatio: dpr,
    },
    primaryStructure: {
      kind: config.primaryStructure,
      status: primaryFeature.status,
      label: config.primaryStructureLabel ?? primaryFeature.label ?? null,
      evidenceRef:
        primaryFeature.status === 'observed'
          ? `${evidenceRef}/states/${stateIndex}/${config.primaryStructure}`
          : null,
      reason:
        primaryFeature.status === 'observed' ? null : primaryFeature.reason,
    },
    landmark,
    route,
    boundary,
    copy,
    fieldProfile,
    contactCenter,
    composition,
  };

  states.push(stateEvidence);
}

const summary = states.reduce(
  (counts, state) => {
    if (state.landmark.status === 'observed') {
      counts.landmarkMeasured += 1;
    } else if (state.landmark.status === 'blocked') {
      counts.landmarkBlocked += 1;
    } else {
      counts.landmarkNotApplicable += 1;
    }
    if (state.route.status === 'observed') {
      counts.routeMeasured += 1;
    } else if (state.route.status === 'blocked') {
      counts.routeBlocked += 1;
    } else {
      counts.routeNotApplicable += 1;
    }
    if (state.boundary.status === 'observed') {
      counts.boundaryMeasured += 1;
    } else if (state.boundary.status === 'blocked') {
      counts.boundaryBlocked += 1;
    } else {
      counts.boundaryNotApplicable += 1;
    }
    if (state.copy.status === 'observed') {
      counts.copyMeasured += 1;
    } else if (state.copy.status === 'blocked') {
      counts.copyBlocked += 1;
    } else {
      counts.copyNotApplicable += 1;
    }
    if (state.fieldProfile.status === 'observed') {
      counts.fieldProfileMeasured += 1;
    } else if (state.fieldProfile.status === 'blocked') {
      counts.fieldProfileBlocked += 1;
    } else {
      counts.fieldProfileNotApplicable += 1;
    }
    if (state.contactCenter.status === 'observed') {
      counts.contactCenterMeasured += 1;
    } else if (state.contactCenter.status === 'blocked') {
      counts.contactCenterBlocked += 1;
    } else {
      counts.contactCenterNotApplicable += 1;
    }
    if (state.composition.status === 'observed') {
      counts.compositionMeasured += 1;
    } else {
      counts.compositionBlocked += 1;
    }
    if (state.primaryStructure.status === 'observed') {
      counts.primaryStructureMeasured += 1;
    } else {
      counts.primaryStructureBlocked += 1;
    }
    return counts;
  },
  {
    totalAnchors: states.length,
    landmarkMeasured: 0,
    landmarkBlocked: 0,
    landmarkNotApplicable: 0,
    routeMeasured: 0,
    routeBlocked: 0,
    routeNotApplicable: 0,
    boundaryMeasured: 0,
    boundaryBlocked: 0,
    boundaryNotApplicable: 0,
    copyMeasured: 0,
    copyBlocked: 0,
    copyNotApplicable: 0,
    fieldProfileMeasured: 0,
    fieldProfileBlocked: 0,
    fieldProfileNotApplicable: 0,
    contactCenterMeasured: 0,
    contactCenterBlocked: 0,
    contactCenterNotApplicable: 0,
    compositionMeasured: 0,
    compositionBlocked: 0,
    primaryStructureMeasured: 0,
    primaryStructureBlocked: 0,
  },
);

const report = {
  schemaVersion: 10,
  algorithmVersion,
  generatedBy: 'tools/hero-reference/measure-recording-bounds.mjs',
  authority: {
    recordingPath: 'docs/vectrfl_recording.mov',
    recordingSha256: manifest.authority.sourceSha256,
    anchorManifest: 'docs/hero-reference/recording-anchors.json',
    semanticMaskManifest: semanticMasksRef,
    derivativePolicy:
      'Locked PNG frames are reproducible derivatives. The MOV SHA plus decoded frame index and PTS remain authoritative.',
  },
  coordinateSpaces: {
    rasterPixels: {
      width: manifest.authority.recordingProfile.rasterPixels.width,
      height: manifest.authority.recordingProfile.rasterPixels.height,
    },
    cssPixels: {
      width: manifest.authority.recordingProfile.cssViewport.width,
      height: manifest.authority.recordingProfile.cssViewport.height,
    },
    devicePixelRatio: dpr,
    boundsFormat: '[x, y, width, height]',
    pixelConvention:
      'Half-open rectangle enclosing every selected source pixel; width and height include the final selected raster coordinate.',
  },
  methodPolicy: {
    noManualBoxes:
      'No output rectangle is hand-entered. Pixel methods derive boxes from fixed segmentation rules; source-semantic-mask methods derive boxes from hash-locked SVG classifications tied to the exact recording frame.',
    featureStatus:
      'Every landmark, route, boundary, copy, field-profile, contact-center, and composition feature is explicitly observed, blocked, or not-applicable. Each state names the directly visible landmark, route, boundary, field profile, or composition as its primary structure, so a scene-, field-, route-, or transition-primary frame is not failed for lacking an isolatable destination silhouette.',
    chroma:
      'Color methods threshold raw 8-bit sRGB pixels, find 8-connected components, and either union every qualifying component or select the largest qualifying component.',
    boundary:
      'The journey-exit boundary is the dominant horizontal row discontinuity. It must satisfy minimum color delta, row support, peak dominance, local column support, and vertical-variance gates.',
    semanticMasks:
      'A semantic mask is permitted only for a complete visible subject that deterministic chroma/edge isolation under-reports. Its manifest locks the recording SHA, frame PNG SHA, SVG SHA, raster, alpha threshold, support gate, inclusion/exclusion rules, uncertainty, and review status. Review permits reference-goal refinement only: a source mask cannot classify implementation pixels or confer structural or final visual acceptance. Partial, clipped, effect-only, or disconnected aggregate subjects remain blocked.',
    routeGeometry:
      'Every observed route core reports deterministic PCA direction, selected-core endpoints, principal span, and equivalent selected-core thickness. These describe thresholded visible route pixels only; they never infer clipped continuation, a glow envelope, or a single-rail width from a parallel/branched union.',
    copyInk:
      'Observed copy bounds enclose selected visible ink, not an inferred DOM container. Fixed source-state ROIs and a dark-neutral predicate with glyph-scale component gates reject large scene geometry. Arrival travel records only its surviving dark ink while the body fades; journey exit censors the header-overlap band and records the visible lower ladder. Neither state borrows a box from another frame.',
    fieldTileProfile:
      'Applicable field states report a shared bright-neutral predicate, component-shape gates, visible tile-top count, field envelope, component centroid, median tile-top size, and mask support. Clipped, activated, recolored, or bloom-obscured tiles are never inferred; changes in surviving neutral components remain part of the observed reaction profile.',
    fieldContactCenter:
      'The field-contact state independently reports the largest saturated blue/violet center-tile component through the same source/implementation predicate. It locates contact without substituting for the source-tied tile-plus-standing-figure semantic landmark union.',
    screenComposition:
      'Every state reports a fixed-grid binary Sobel edge-support distribution, density, and centroid below the header band. These are screen-space composition and negative-space proxies; the 3D camera position/quaternion remain explicitly unknown and are never reconstructed from rendered pixels.',
    quality:
      'An applicable feature is blocked when selected support misses its fixed gate or semantic isolation would substitute a partial/effect-only feature. Not-applicable is reserved for a feature that is not the state’s source-visible structural role.',
    reproducibility:
      'The authoritative MOV SHA, every input PNG SHA, and every referenced semantic SVG SHA are verified before measurement. --check recomputes both generated evidence files and fails on byte drift.',
  },
  summary,
  states,
};

const updatedManifest = {
  ...manifest,
  schemaVersion: 6,
  anchorPolicy: {
    ...manifest.anchorPolicy,
    unmeasuredFields: `Rendered pixels do not expose camera transforms. Live trace calibration supplies progress targets independently. Structural evidence measures ${summary.landmarkMeasured} landmarks, ${summary.routeMeasured} route cores, ${summary.copyMeasured} copy-ink envelopes, ${summary.fieldProfileMeasured} field tile profiles, ${summary.contactCenterMeasured} field contact center, ${summary.compositionMeasured} screen-space composition proxies, and ${summary.boundaryMeasured} section boundary; ${summary.landmarkNotApplicable} states mark landmark bounds not applicable and ${summary.landmarkBlocked} non-primary landmarks remain honestly blocked, while ${summary.copyBlocked} copy states, ${summary.fieldProfileBlocked} field profiles, and ${summary.contactCenterBlocked} contact centers remain blocked.`,
  },
  structuralBoundsEvidence: {
    status:
      summary.primaryStructureBlocked === 0 ? 'observed' : 'partially-observed',
    verifiedOn: '2026-09-14',
    artifact: 'docs/hero-reference/recording-structural-bounds.json',
    algorithmVersion,
    landmarkMeasured: summary.landmarkMeasured,
    landmarkBlocked: summary.landmarkBlocked,
    landmarkNotApplicable: summary.landmarkNotApplicable,
    routeMeasured: summary.routeMeasured,
    routeBlocked: summary.routeBlocked,
    routeNotApplicable: summary.routeNotApplicable,
    boundaryMeasured: summary.boundaryMeasured,
    copyMeasured: summary.copyMeasured,
    copyBlocked: summary.copyBlocked,
    copyNotApplicable: summary.copyNotApplicable,
    fieldProfileMeasured: summary.fieldProfileMeasured,
    fieldProfileBlocked: summary.fieldProfileBlocked,
    fieldProfileNotApplicable: summary.fieldProfileNotApplicable,
    contactCenterMeasured: summary.contactCenterMeasured,
    contactCenterBlocked: summary.contactCenterBlocked,
    contactCenterNotApplicable: summary.contactCenterNotApplicable,
    compositionMeasured: summary.compositionMeasured,
    compositionBlocked: summary.compositionBlocked,
    primaryStructureMeasured: summary.primaryStructureMeasured,
    primaryStructureBlocked: summary.primaryStructureBlocked,
  },
  states: manifest.states.map((anchor) => {
    const stateIndex = states.findIndex((state) => state.key === anchor.key);
    const stateEvidence = states[stateIndex];
    return {
      ...anchor,
      screenBounds: updateAnchorScreenBounds(anchor, stateEvidence, stateIndex),
      screenComposition: updateAnchorScreenComposition(
        stateEvidence,
        stateIndex,
      ),
    };
  }),
  unresolvableFromRecordingAlone: manifest.unresolvableFromRecordingAlone.map(
    (entry) => {
      if (entry.field === 'camera position and quaternion') {
        return {
          ...entry,
          reason:
            'Rendered pixels do not expose the 3D camera transform. All 15 states instead carry observed screen-space edge-support distributions and centroids as comparison proxies; those proxies do not recover position or quaternion.',
        };
      }
      return entry.field === 'screen-space bounds'
        ? {
            ...entry,
            status: 'partially-observed',
            reason: `The deterministic structural-bounds pipeline measures ${summary.landmarkMeasured} landmarks, ${summary.routeMeasured} route cores, ${summary.copyMeasured} copy-ink envelopes, ${summary.fieldProfileMeasured} field tile profiles, ${summary.contactCenterMeasured} field contact center, ${summary.compositionMeasured} screen-space composition proxies, and ${summary.boundaryMeasured} section boundary. ${summary.landmarkNotApplicable} states correctly mark landmark bounds not applicable; ${summary.landmarkBlocked} non-primary landmarks remain honestly blocked without blocking their states, while ${summary.copyBlocked} copy states, ${summary.fieldProfileBlocked} field profiles, and ${summary.contactCenterBlocked} contact centers remain blocked.`,
          }
        : entry;
    },
  ),
};

const prettierConfig = (await resolveConfig(outputPath)) ?? {};
const [reportText, manifestText] = await Promise.all([
  formatWithPrettier(JSON.stringify(report), {
    ...prettierConfig,
    filepath: outputPath,
  }),
  formatWithPrettier(JSON.stringify(updatedManifest), {
    ...prettierConfig,
    filepath: anchorsPath,
  }),
]);

if (checkOnly) {
  const [existingReport, existingManifest] = await Promise.all([
    readFile(outputPath, 'utf8'),
    readFile(anchorsPath, 'utf8'),
  ]);
  if (existingReport !== reportText) {
    throw new Error(
      'recording-structural-bounds.json is not reproducible; run the measurement script without --check',
    );
  }
  if (existingManifest !== manifestText) {
    throw new Error(
      'recording-anchors.json structural bounds are not reproducible; run the measurement script without --check',
    );
  }
} else {
  await Promise.all([
    writeFileAtomically(outputPath, reportText),
    writeFileAtomically(anchorsPath, manifestText),
  ]);
}

console.log(
  `Recording bounds: ${summary.landmarkMeasured} landmark measured, ${summary.landmarkBlocked} landmark blocked, ${summary.landmarkNotApplicable} landmark not applicable, ${summary.routeMeasured} route measured, ${summary.copyMeasured} copy measured, ${summary.copyBlocked} copy blocked, ${summary.fieldProfileMeasured} field profile measured, ${summary.fieldProfileBlocked} field profile blocked, ${summary.contactCenterMeasured} contact center measured, ${summary.contactCenterBlocked} contact center blocked, ${summary.boundaryMeasured} boundary measured, ${summary.compositionMeasured} composition measured${checkOnly ? ' (reproducibility check passed)' : ''}.`,
);
