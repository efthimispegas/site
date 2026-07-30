import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const workspaceRoot = process.cwd();
const anchorsPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-anchors.json',
);
const outputPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-structural-bounds.json',
);
const evidenceRef =
  'docs/hero-reference/recording-structural-bounds.json#';
const algorithmVersion = 'recording-structural-bounds-v1';

const argumentsSet = new Set(process.argv.slice(2));
const checkOnly = argumentsSet.has('--check');
const debugArgumentIndex = process.argv.indexOf('--debug-dir');
const debugDirectory =
  debugArgumentIndex >= 0
    ? path.resolve(
        workspaceRoot,
        process.argv[debugArgumentIndex + 1] ?? '',
      )
    : null;

if (debugArgumentIndex >= 0 && !process.argv[debugArgumentIndex + 1]) {
  throw new Error('--debug-dir requires a directory path');
}

const DEEP_BLUE = {
  id: 'deep-blue',
  description:
    'b-r >= 55, b-g >= 25, b >= 120, and r <= 150 in 8-bit sRGB',
  test: (red, green, blue) =>
    blue - red >= 55 &&
    blue - green >= 25 &&
    blue >= 120 &&
    red <= 150,
};

const CYAN_ROUTE = {
  id: 'cyan-route',
  description:
    'b-r >= 70, g-r >= 40, b >= 180, g >= 135, and r <= 205 in 8-bit sRGB',
  test: (red, green, blue) =>
    blue - red >= 70 &&
    green - red >= 40 &&
    blue >= 180 &&
    green >= 135 &&
    red <= 205,
};

const STATE_MEASUREMENTS = {
  'loader-mark': {
    landmark: {
      label: 'central blue loader mark',
      method: 'chroma-component-union',
      predicate: DEEP_BLUE,
      roi: [0.3, 0.28, 0.4, 0.48],
      minimumComponentPixels: 24,
      minimumSelectedPixels: 300,
      rationale:
        'The manifest identifies the saturated blue loader mark as the central focus. The ROI excludes contour-only margins and the recorded pointer without constraining the resulting box.',
    },
  },
  'world-reveal': {
    landmark: {
      label: 'central blue loader mark during world reveal',
      method: 'chroma-component-union',
      predicate: DEEP_BLUE,
      roi: [0.3, 0.2, 0.4, 0.5],
      minimumComponentPixels: 24,
      minimumSelectedPixels: 300,
      rationale:
        'The blue loader mark remains the only saturated-blue central landmark while the pale world emerges. The ROI excludes the red rails and peripheral scene objects.',
    },
  },
  'clearance-travel': {
    route: {
      label: 'high-chroma core of connected cyan clearance route',
      method: 'largest-chroma-component',
      predicate: CYAN_ROUTE,
      roi: [0, 0.1, 0.66, 0.52],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The source record defines route direction as the observable focus. The saturated cyan route is connected, while the ambient dotted wake is split into smaller components.',
    },
  },
  'clearance-field-preview': {
    route: {
      label: 'high-chroma core of cyan route approaching the field preview',
      method: 'largest-chroma-component',
      predicate: CYAN_ROUTE,
      roi: [0.12, 0.4, 0.58, 0.5],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The ROI follows the lower transit band named by the manifest and excludes the top-right field tiles. Component size separates the continuous route from the dotted wake.',
    },
  },
  'field-pulse-b': {
    landmark: {
      label: 'elevated blue center tile',
      method: 'largest-chroma-component',
      predicate: DEEP_BLUE,
      roi: [0.35, 0.25, 0.3, 0.5],
      minimumComponentPixels: 120,
      minimumSelectedPixels: 1200,
      rationale:
        'The elevated saturated-blue center tile is the stable primary landmark named by the manifest. The later outer pulse band remains a separate effect and is not included in this silhouette box.',
    },
  },
  'arrival-travel': {
    route: {
      label: 'high-chroma core of second horizontal cyan route',
      method: 'largest-chroma-component',
      predicate: CYAN_ROUTE,
      roi: [0, 0.36, 0.62, 0.28],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The destination is beyond the right edge in this anchor, so the horizontal feed is the only measurable source-confirmed travel structure. The ROI excludes header and process copy.',
    },
  },
  'arrival-lockup': {
    landmark: {
      label: 'large frontal arrival arrow',
      method: 'largest-dilated-sobel-component',
      roi: [0.385, 0.24, 0.17, 0.48],
      sobelThreshold: 72,
      dilationIterations: 4,
      minimumComponentPixels: 1200,
      minimumSelectedPixels: 900,
      rationale:
        'The manifest identifies the frontal arrow as the primary landmark. A narrow semantic ROI excludes process copy, header, most of the incoming feed, and surrounding marks; the layered arrow is the largest connected edge structure inside it.',
    },
  },
};

const BLOCKED_REASONS = {
  landing:
    'The pale industrial cluster shares color and edge statistics with background context; no deterministic segmentation isolates the complete semantic cluster without hand-drawn boundaries.',
  'landing-idle':
    'The pale industrial cluster shares color and edge statistics with background context; the red packet is a route effect rather than the complete primary landmark.',
  'activation-route':
    'The first destination is partially clipped at the lower edge and is not separable from rails and adjacent pale context by the approved chroma/edge methods.',
  'activation-contact':
    'The blue logo can be segmented, but it is only a feature on the destination; treating that logo box as the full building landmark would under-report the silhouette.',
  'clearance-travel':
    'This transit anchor has no single named destination silhouette; the source-confirmed cyan direction is measured separately as a route feature.',
  'clearance-field-preview':
    'The field is only partially visible and clipped by the upper-right frame edge; the approaching cyan route core is measured separately.',
  'field-approach':
    'The elevated center is pale and partially occluded among similarly colored tiles; a complete center or field silhouette cannot be isolated without semantic/manual annotation.',
  'field-contact':
    'The first reaction changes several pale/cyan tiles, but the elevated center tile and figure do not form a uniquely separable color component.',
  'field-pulse-a':
    'Bloom joins the inner pulse, route, and neighboring tiles; a threshold box would measure the bloom envelope rather than a stable structural landmark.',
  'field-pulse-b':
    'The outer pulse band is not part of the center-tile landmark box and remains independently unmeasured.',
  'arrival-travel':
    'The arrow destination remains beyond the right frame edge; the post-field horizontal cyan route core is measured separately.',
  'journey-exit':
    'The arrival landmark is no longer visible; the observable structure is the moving hero/next-section boundary, which is not a landmark silhouette.',
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

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function normalizedRoiToPixels(roi, width, height) {
  const [normalizedX, normalizedY, normalizedWidth, normalizedHeight] = roi;
  const x = Math.max(0, Math.floor(normalizedX * width));
  const y = Math.max(0, Math.floor(normalizedY * height));
  const right = Math.min(
    width,
    Math.ceil((normalizedX + normalizedWidth) * width),
  );
  const bottom = Math.min(
    height,
    Math.ceil((normalizedY + normalizedHeight) * height),
  );

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function createPredicateMask(data, image, roi, predicate) {
  const mask = new Uint8Array(image.width * image.height);
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;

  for (let y = roi.y; y < bottom; y += 1) {
    for (let x = roi.x; x < right; x += 1) {
      const pixelIndex = y * image.width + x;
      const channelIndex = pixelIndex * image.channels;
      if (
        predicate.test(
          data[channelIndex],
          data[channelIndex + 1],
          data[channelIndex + 2],
        )
      ) {
        mask[pixelIndex] = 1;
      }
    }
  }

  return mask;
}

function createSobelMask(data, image, roi, threshold) {
  const grayscale = new Uint8Array(image.width * image.height);
  const mask = new Uint8Array(image.width * image.height);
  const expandedX = Math.max(0, roi.x - 1);
  const expandedY = Math.max(0, roi.y - 1);
  const expandedRight = Math.min(
    image.width,
    roi.x + roi.width + 1,
  );
  const expandedBottom = Math.min(
    image.height,
    roi.y + roi.height + 1,
  );

  for (let y = expandedY; y < expandedBottom; y += 1) {
    for (let x = expandedX; x < expandedRight; x += 1) {
      const pixelIndex = y * image.width + x;
      const channelIndex = pixelIndex * image.channels;
      grayscale[pixelIndex] = Math.round(
        data[channelIndex] * 0.2126 +
          data[channelIndex + 1] * 0.7152 +
          data[channelIndex + 2] * 0.0722,
      );
    }
  }

  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;
  for (let y = Math.max(roi.y, 1); y < Math.min(bottom, image.height - 1); y += 1) {
    for (let x = Math.max(roi.x, 1); x < Math.min(right, image.width - 1); x += 1) {
      const topLeft = grayscale[(y - 1) * image.width + x - 1];
      const top = grayscale[(y - 1) * image.width + x];
      const topRight = grayscale[(y - 1) * image.width + x + 1];
      const left = grayscale[y * image.width + x - 1];
      const rightPixel = grayscale[y * image.width + x + 1];
      const bottomLeft = grayscale[(y + 1) * image.width + x - 1];
      const bottomPixel = grayscale[(y + 1) * image.width + x];
      const bottomRight = grayscale[(y + 1) * image.width + x + 1];
      const gradientX =
        -topLeft +
        topRight -
        2 * left +
        2 * rightPixel -
        bottomLeft +
        bottomRight;
      const gradientY =
        -topLeft -
        2 * top -
        topRight +
        bottomLeft +
        2 * bottomPixel +
        bottomRight;

      if (Math.abs(gradientX) + Math.abs(gradientY) >= threshold) {
        mask[y * image.width + x] = 1;
      }
    }
  }

  return mask;
}

function dilate(mask, width, height, roi, iterations) {
  let current = mask;
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = new Uint8Array(current);
    for (let y = roi.y; y < bottom; y += 1) {
      for (let x = roi.x; x < right; x += 1) {
        const pixelIndex = y * width + x;
        if (!current[pixelIndex]) {
          continue;
        }

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const candidateY = y + offsetY;
          if (candidateY < roi.y || candidateY >= bottom) {
            continue;
          }
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const candidateX = x + offsetX;
            if (candidateX < roi.x || candidateX >= right) {
              continue;
            }
            next[candidateY * width + candidateX] = 1;
          }
        }
      }
    }
    current = next;
  }

  return current;
}

function connectedComponents(mask, width, height, roi) {
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(roi.width * roi.height);
  const components = [];
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;
  let nextLabel = 1;

  for (let startY = roi.y; startY < bottom; startY += 1) {
    for (let startX = roi.x; startX < right; startX += 1) {
      const startIndex = startY * width + startX;
      if (!mask[startIndex] || labels[startIndex] !== 0) {
        continue;
      }

      let head = 0;
      let tail = 0;
      let pixels = 0;
      let minX = startX;
      let minY = startY;
      let maxX = startX;
      let maxY = startY;
      queue[tail] = startIndex;
      tail += 1;
      labels[startIndex] = nextLabel;

      while (head < tail) {
        const pixelIndex = queue[head];
        head += 1;
        const y = Math.floor(pixelIndex / width);
        const x = pixelIndex - y * width;
        pixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const candidateY = y + offsetY;
          if (candidateY < roi.y || candidateY >= bottom) {
            continue;
          }
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) {
              continue;
            }
            const candidateX = x + offsetX;
            if (candidateX < roi.x || candidateX >= right) {
              continue;
            }
            const candidateIndex = candidateY * width + candidateX;
            if (
              mask[candidateIndex] &&
              labels[candidateIndex] === 0
            ) {
              labels[candidateIndex] = nextLabel;
              queue[tail] = candidateIndex;
              tail += 1;
            }
          }
        }
      }

      components.push({
        label: nextLabel,
        pixels,
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
      });
      nextLabel += 1;
    }
  }

  return { components, labels };
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

function selectChromaComponents(mask, image, roi, config) {
  const { components } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
  const eligible = components.filter(
    (component) =>
      component.pixels >= config.minimumComponentPixels,
  );
  const selected =
    config.method === 'largest-chroma-component'
      ? eligible
          .slice()
          .sort(
            (left, right) =>
              right.pixels - left.pixels ||
              left.bounds.y - right.bounds.y ||
              left.bounds.x - right.bounds.x,
          )
          .slice(0, 1)
      : eligible;
  const selectedMask = new Uint8Array(mask.length);

  for (const component of selected) {
    const componentRight =
      component.bounds.x + component.bounds.width;
    const componentBottom =
      component.bounds.y + component.bounds.height;
    for (let y = component.bounds.y; y < componentBottom; y += 1) {
      for (let x = component.bounds.x; x < componentRight; x += 1) {
        const index = y * image.width + x;
        if (mask[index]) {
          selectedMask[index] = 1;
        }
      }
    }
  }

  return {
    selectedMask,
    selectedComponents: selected,
    eligibleComponentCount: eligible.length,
    totalComponentCount: components.length,
  };
}

function selectLargestDilatedEdgeComponent(
  originalMask,
  image,
  roi,
  config,
) {
  const dilated = dilate(
    originalMask,
    image.width,
    image.height,
    roi,
    config.dilationIterations,
  );
  const { components, labels } = connectedComponents(
    dilated,
    image.width,
    image.height,
    roi,
  );
  const eligible = components
    .filter(
      (component) =>
        component.pixels >= config.minimumComponentPixels,
    )
    .sort(
      (left, right) =>
        right.pixels - left.pixels ||
        left.bounds.y - right.bounds.y ||
        left.bounds.x - right.bounds.x,
    );
  const selectedComponent = eligible[0] ?? null;
  const selectedMask = new Uint8Array(originalMask.length);

  if (selectedComponent) {
    for (let index = 0; index < originalMask.length; index += 1) {
      if (
        originalMask[index] &&
        labels[index] === selectedComponent.label
      ) {
        selectedMask[index] = 1;
      }
    }
  }

  return {
    selectedMask,
    selectedComponents: selectedComponent
      ? [selectedComponent]
      : [],
    eligibleComponentCount: eligible.length,
    totalComponentCount: components.length,
  };
}

function serializeBounds(bounds, image, dpr) {
  return {
    rasterPixels: [
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    ],
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
    .toFile(
      path.join(
        debugDirectory,
        `${stateKey}-${featureKind}.png`,
      ),
    );
}

async function measureFeature(
  sourcePath,
  data,
  image,
  stateKey,
  featureKind,
  config,
  dpr,
) {
  const roi = normalizedRoiToPixels(
    config.roi,
    image.width,
    image.height,
  );
  let selection;

  if (
    config.method === 'chroma-component-union' ||
    config.method === 'largest-chroma-component'
  ) {
    const mask = createPredicateMask(
      data,
      image,
      roi,
      config.predicate,
    );
    selection = selectChromaComponents(mask, image, roi, config);
  } else if (
    config.method === 'largest-dilated-sobel-component'
  ) {
    const mask = createSobelMask(
      data,
      image,
      roi,
      config.sobelThreshold,
    );
    selection = selectLargestDilatedEdgeComponent(
      mask,
      image,
      roi,
      config,
    );
  } else {
    throw new Error(`Unknown measurement method: ${config.method}`);
  }

  const selected = boundsFromMask(
    selection.selectedMask,
    image.width,
    image.height,
  );
  if (!selected || selected.pixels < config.minimumSelectedPixels) {
    return {
      status: 'blocked',
      label: config.label,
      reason: `The deterministic ${config.method} quality gate found ${selected?.pixels ?? 0} selected pixels; at least ${config.minimumSelectedPixels} are required.`,
      method: {
        id: config.method,
        roiNormalized: config.roi,
        roiRasterPixels: [
          roi.x,
          roi.y,
          roi.width,
          roi.height,
        ],
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
    pixelSupport: selected.pixels,
    method: {
      id: config.method,
      roiNormalized: config.roi,
      roiRasterPixels: [
        roi.x,
        roi.y,
        roi.width,
        roi.height,
      ],
      predicate: config.predicate
        ? {
            id: config.predicate.id,
            description: config.predicate.description,
          }
        : null,
      sobelThreshold: config.sobelThreshold ?? null,
      dilationIterations: config.dilationIterations ?? 0,
      connectivity: 8,
      minimumComponentPixels: config.minimumComponentPixels,
      minimumSelectedPixels: config.minimumSelectedPixels,
      totalComponentCount: selection.totalComponentCount,
      eligibleComponentCount: selection.eligibleComponentCount,
      selectedComponentCount:
        selection.selectedComponents.length,
      rationale: config.rationale,
    },
  };
}

function updateAnchorScreenBounds(
  anchor,
  stateEvidence,
  stateIndex,
) {
  const prior = anchor.screenBounds ?? {};
  const landmarkObserved =
    stateEvidence.landmark?.status === 'observed';
  const routeObserved = stateEvidence.route?.status === 'observed';
  const next = {
    status: landmarkObserved ? 'observed' : 'unknown',
    coordinateSpace: 'css-pixels',
    profileId: 'recording-desktop',
    landmark: landmarkObserved
      ? stateEvidence.landmark.bounds.cssPixels
      : null,
    landmarkLabel: landmarkObserved
      ? stateEvidence.landmark.label
      : null,
    landmarkEvidenceRef: landmarkObserved
      ? `${evidenceRef}/states/${stateIndex}/landmark`
      : null,
    route: routeObserved
      ? stateEvidence.route.bounds.cssPixels
      : null,
    routeLabel: routeObserved ? stateEvidence.route.label : null,
    routeEvidenceRef: routeObserved
      ? `${evidenceRef}/states/${stateIndex}/route`
      : null,
    copy: null,
    copyStatus:
      anchor.activeCopyState?.value === 'none'
        ? 'not-applicable'
        : 'unknown',
    reason: landmarkObserved
      ? 'Primary landmark measured by the reproducible recording structural-bounds pipeline; copy remains independently unmeasured when applicable.'
      : stateEvidence.blockedReason ??
        prior.reason ??
        'Primary landmark remains unmeasured.',
  };

  return next;
}

const manifest = JSON.parse(await readFile(anchorsPath, 'utf8'));
const recordingPath = path.join(
  workspaceRoot,
  'docs/vectrfl_recording.mov',
);
const recordingSha = await sha256File(recordingPath);
if (recordingSha !== manifest.authority.sourceSha256) {
  throw new Error(
    `Authoritative recording SHA mismatch (${recordingSha} != ${manifest.authority.sourceSha256})`,
  );
}
const dpr =
  manifest.authority.recordingProfile.devicePixelRatio.value;
const states = [];

for (const anchor of manifest.states) {
  const sourcePath = path.join(
    workspaceRoot,
    anchor.anchor.capturePath,
  );
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
    info.width !==
      manifest.authority.recordingProfile.rasterPixels.width ||
    info.height !==
      manifest.authority.recordingProfile.rasterPixels.height ||
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
  const config = STATE_MEASUREMENTS[anchor.key] ?? {};
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
    landmark: config.landmark
      ? await measureFeature(
          sourcePath,
          data,
          image,
          anchor.key,
          'landmark',
          config.landmark,
          dpr,
        )
      : {
          status: 'blocked',
          reason:
            BLOCKED_REASONS[anchor.key] ??
            'No approved deterministic landmark segmentation is defined for this anchor.',
        },
    route: config.route
      ? await measureFeature(
          sourcePath,
          data,
          image,
          anchor.key,
          'route',
          config.route,
          dpr,
        )
      : {
          status: 'not-measured',
          reason:
            'This pass only measures a route when it is the anchor’s named primary directional structure.',
        },
  };

  if (stateEvidence.landmark.status !== 'observed') {
    stateEvidence.blockedReason =
      stateEvidence.landmark.reason;
  }
  states.push(stateEvidence);
}

const summary = states.reduce(
  (counts, state) => {
    if (state.landmark.status === 'observed') {
      counts.landmarkMeasured += 1;
    } else {
      counts.landmarkBlocked += 1;
    }
    if (state.route.status === 'observed') {
      counts.routeMeasured += 1;
    }
    return counts;
  },
  {
    totalAnchors: states.length,
    landmarkMeasured: 0,
    landmarkBlocked: 0,
    routeMeasured: 0,
  },
);

const report = {
  schemaVersion: 1,
  algorithmVersion,
  generatedBy:
    'tools/hero-reference/measure-recording-bounds.mjs',
  authority: {
    recordingPath: 'docs/vectrfl_recording.mov',
    recordingSha256: manifest.authority.sourceSha256,
    anchorManifest:
      'docs/hero-reference/recording-anchors.json',
    derivativePolicy:
      'Locked PNG frames are reproducible derivatives. The MOV SHA plus decoded frame index and PTS remain authoritative.',
  },
  coordinateSpaces: {
    rasterPixels: {
      width:
        manifest.authority.recordingProfile.rasterPixels.width,
      height:
        manifest.authority.recordingProfile.rasterPixels.height,
    },
    cssPixels: {
      width:
        manifest.authority.recordingProfile.cssViewport.width,
      height:
        manifest.authority.recordingProfile.cssViewport.height,
    },
    devicePixelRatio: dpr,
    boundsFormat: '[x, y, width, height]',
    pixelConvention:
      'Half-open rectangle enclosing every selected source pixel; width and height include the final selected raster coordinate.',
  },
  methodPolicy: {
    noManualBoxes:
      'No output rectangle is hand-entered. State configuration supplies only a documented normalized semantic ROI and fixed segmentation/quality thresholds.',
    chroma:
      'Color methods threshold raw 8-bit sRGB pixels, find 8-connected components, and either union every qualifying component or select the largest qualifying component.',
    edges:
      'The arrow method computes luma with Rec. 709 coefficients, applies a 3x3 Sobel L1 magnitude threshold, dilates only for component association, and reports the bounds of original (non-dilated) edge pixels.',
    quality:
      'A state is blocked when the selected support does not meet its fixed pixel gate or when the semantic landmark cannot be isolated without substituting a partial feature.',
    reproducibility:
      'The authoritative MOV SHA and every input PNG SHA are verified before measurement. --check recomputes both evidence files and fails on byte drift.',
  },
  summary,
  states,
};

const updatedManifest = {
  ...manifest,
  anchorPolicy: {
    ...manifest.anchorPolicy,
    unmeasuredFields:
      'Rendered pixels do not expose camera transforms. Live trace calibration supplies progress targets independently. This structural-bounds pass measures four primary landmarks and three route cores while keeping eleven ambiguous landmark silhouettes explicitly blocked.',
  },
  structuralBoundsEvidence: {
    status:
      summary.landmarkBlocked === 0
        ? 'observed'
        : 'partially-observed',
    verifiedOn: '2026-07-30',
    artifact:
      'docs/hero-reference/recording-structural-bounds.json',
    algorithmVersion,
    landmarkMeasured: summary.landmarkMeasured,
    landmarkBlocked: summary.landmarkBlocked,
    routeMeasured: summary.routeMeasured,
  },
  states: manifest.states.map((anchor) => {
    const stateIndex = states.findIndex(
      (state) => state.key === anchor.key,
    );
    const stateEvidence = states[stateIndex];
    return {
      ...anchor,
      screenBounds: updateAnchorScreenBounds(
        anchor,
        stateEvidence,
        stateIndex,
      ),
    };
  }),
  unresolvableFromRecordingAlone:
    manifest.unresolvableFromRecordingAlone.map((entry) =>
      entry.field === 'screen-space bounds'
        ? {
            ...entry,
            status: 'partially-observed',
            reason:
              'The deterministic structural-bounds pipeline measures four primary landmarks and three route cores; eleven landmark silhouettes and all applicable copy bounds remain blocked or unknown.',
          }
        : entry,
    ),
};

const reportText = `${JSON.stringify(report, null, 2)}\n`;
const manifestText = `${JSON.stringify(updatedManifest, null, 2)}\n`;

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
    writeFile(outputPath, reportText, 'utf8'),
    writeFile(anchorsPath, manifestText, 'utf8'),
  ]);
}

console.log(
  `Recording bounds: ${summary.landmarkMeasured} landmark measured, ${summary.landmarkBlocked} landmark blocked, ${summary.routeMeasured} route measured${checkOnly ? ' (reproducibility check passed)' : ''}.`,
);
