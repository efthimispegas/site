import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
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
const evidenceRef = 'docs/hero-reference/recording-structural-bounds.json#';
const algorithmVersion = 'recording-structural-bounds-v2';

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

const DEEP_BLUE = {
  id: 'deep-blue',
  description: 'b-r >= 55, b-g >= 25, b >= 120, and r <= 150 in 8-bit sRGB',
  test: (red, green, blue) =>
    blue - red >= 55 && blue - green >= 25 && blue >= 120 && red <= 150,
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
    primaryStructure: 'landmark',
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
    primaryStructure: 'landmark',
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
  landing: {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'landing industrial context aggregate',
      reason:
        'The landing focus is a disconnected industrial-context aggregate with members clipped by the lower viewport. A single enclosure would encode subjective membership and cannot be used as a precise landmark gate.',
    },
  },
  'landing-idle': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'landing industrial context aggregate at route idle',
      reason:
        'The landing focus remains a disconnected, lower-viewport-clipped aggregate. The red packet is a route effect, and neither it nor a near-viewport-wide hand enclosure is a defensible landmark substitute.',
    },
  },
  'activation-route': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'first-destination building before route contact',
      reason:
        'The destination building is fully visible, correcting the prior clipping claim, but its pale silhouette is not isolated by the approved pixel methods. A versioned semantic mask with explicit inclusion rules is required.',
    },
  },
  'activation-contact': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'logo-bearing first-destination building at route contact',
      reason:
        'The complete destination building is visible, but only its blue logo is deterministically separable. A logo box would under-report the structure; a reviewed semantic silhouette mask is still required.',
    },
  },
  'clearance-travel': {
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'This is a route-primary transit anchor with no single destination landmark in frame.',
    },
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
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'The approaching route is the primary structure. The field is only a secondary preview clipped by the top and right viewport edges.',
    },
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
  'field-approach': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'elevated field-center tile and figure',
      reason:
        'Only a pale fragment of the elevated center and figure is visible among similar tiles, and the fixed header/viewport occludes its upper extent. Partial censored evidence cannot supply a complete landmark box.',
    },
  },
  'field-contact': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'elevated center tile and standing figure at first contact',
      reason:
        'The complete center tile and figure are visible, but current chroma support covers only part of the blue tile and not the pale figure. A reviewed semantic mask is required before this union becomes source evidence.',
    },
  },
  'field-pulse-a': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'field center during inner pulse',
      reason:
        'Bloom occludes the center tile and figure and joins the route with neighboring tiles. The luminous envelope is an effect observable, not a substitute for the hidden structural landmark.',
    },
  },
  'field-pulse-b': {
    primaryStructure: 'landmark',
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
    primaryStructure: 'route',
    landmark: {
      status: 'not-applicable',
      label: null,
      reason:
        'This is a route-primary travel anchor; the arrival-arrow destination remains outside the right viewport edge.',
    },
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
    primaryStructure: 'landmark',
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
    boundary: {
      label: 'hero-to-following-section boundary at journey exit',
      method: 'dominant-horizontal-boundary',
      roi: [0, 0.32, 1, 0.5],
      minimumPixelDelta: 8,
      minimumMeanDelta: 20,
      minimumRowSupportRatio: 0.8,
      minimumDominanceRatio: 3,
      verticalExclusionRadius: 3,
      localSearchRadius: 3,
      maximumVerticalStandardDeviation: 1,
      rationale:
        'The compositional focus is the nearly full-width horizontal discontinuity between the pale hero and the following white section. Row support, peak dominance, and per-column vertical variance reject text and arrow edges.',
    },
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
  const expandedRight = Math.min(image.width, roi.x + roi.width + 1);
  const expandedBottom = Math.min(image.height, roi.y + roi.height + 1);

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
  for (
    let y = Math.max(roi.y, 1);
    y < Math.min(bottom, image.height - 1);
    y += 1
  ) {
    for (
      let x = Math.max(roi.x, 1);
      x < Math.min(right, image.width - 1);
      x += 1
    ) {
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
            if (mask[candidateIndex] && labels[candidateIndex] === 0) {
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

function colorDelta(data, leftIndex, rightIndex) {
  return (
    (Math.abs(data[leftIndex] - data[rightIndex]) +
      Math.abs(data[leftIndex + 1] - data[rightIndex + 1]) +
      Math.abs(data[leftIndex + 2] - data[rightIndex + 2])) /
    3
  );
}

function standardDeviation(values, mean) {
  if (values.length === 0) {
    return 0;
  }

  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
  );
}

function selectChromaComponents(mask, image, roi, config) {
  const { components } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
  const eligible = components.filter(
    (component) => component.pixels >= config.minimumComponentPixels,
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
    const componentRight = component.bounds.x + component.bounds.width;
    const componentBottom = component.bounds.y + component.bounds.height;
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

async function measureHorizontalBoundary(
  sourcePath,
  data,
  image,
  stateKey,
  config,
  dpr,
) {
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;
  const rowScores = [];

  for (let y = roi.y + 1; y < bottom; y += 1) {
    let deltaSum = 0;
    let supportedColumns = 0;
    for (let x = roi.x; x < right; x += 1) {
      const currentIndex = (y * image.width + x) * image.channels;
      const priorIndex = ((y - 1) * image.width + x) * image.channels;
      const delta = colorDelta(data, currentIndex, priorIndex);
      deltaSum += delta;
      if (delta >= config.minimumPixelDelta) {
        supportedColumns += 1;
      }
    }

    const meanDelta = deltaSum / roi.width;
    const rowSupportRatio = supportedColumns / roi.width;
    rowScores.push({
      y,
      meanDelta,
      rowSupportRatio,
      score: meanDelta * rowSupportRatio,
    });
  }

  rowScores.sort(
    (left, rightScore) =>
      rightScore.score - left.score || left.y - rightScore.y,
  );
  const peak = rowScores[0];
  const runnerUp = rowScores.find(
    (candidate) =>
      Math.abs(candidate.y - peak.y) > config.verticalExclusionRadius,
  );
  const dominanceRatio =
    runnerUp && runnerUp.score > 0 ? peak.score / runnerUp.score : null;
  const localRows = [];
  const selectedMask = new Uint8Array(image.width * image.height);
  const localTop = Math.max(roi.y + 1, peak.y - config.localSearchRadius);
  const localBottom = Math.min(bottom - 1, peak.y + config.localSearchRadius);

  for (let x = roi.x; x < right; x += 1) {
    let bestDelta = -1;
    let bestY = peak.y;
    for (let y = localTop; y <= localBottom; y += 1) {
      const currentIndex = (y * image.width + x) * image.channels;
      const priorIndex = ((y - 1) * image.width + x) * image.channels;
      const delta = colorDelta(data, currentIndex, priorIndex);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestY = y;
      }
    }

    if (bestDelta >= config.minimumPixelDelta) {
      localRows.push(bestY);
      selectedMask[bestY * image.width + x] = 1;
    }
  }

  const localSupportRatio = localRows.length / roi.width;
  const meanY =
    localRows.reduce((sum, value) => sum + value, 0) /
    Math.max(localRows.length, 1);
  const verticalStandardDeviation = standardDeviation(localRows, meanY);
  const selected = boundsFromMask(selectedMask, image.width, image.height);
  const qualityFailures = [];

  if (peak.meanDelta < config.minimumMeanDelta) {
    qualityFailures.push(
      `mean row delta ${round(peak.meanDelta)} is below ${config.minimumMeanDelta}`,
    );
  }
  if (peak.rowSupportRatio < config.minimumRowSupportRatio) {
    qualityFailures.push(
      `peak row support ${round(peak.rowSupportRatio)} is below ${config.minimumRowSupportRatio}`,
    );
  }
  if (
    dominanceRatio !== null &&
    dominanceRatio < config.minimumDominanceRatio
  ) {
    qualityFailures.push(
      `peak dominance ${round(dominanceRatio)} is below ${config.minimumDominanceRatio}`,
    );
  }
  if (localSupportRatio < config.minimumRowSupportRatio) {
    qualityFailures.push(
      `local column support ${round(localSupportRatio)} is below ${config.minimumRowSupportRatio}`,
    );
  }
  if (verticalStandardDeviation > config.maximumVerticalStandardDeviation) {
    qualityFailures.push(
      `vertical standard deviation ${round(verticalStandardDeviation)} exceeds ${config.maximumVerticalStandardDeviation}`,
    );
  }
  if (!selected) {
    qualityFailures.push('no supported boundary pixels were selected');
  }

  if (qualityFailures.length > 0 || !selected) {
    return {
      status: 'blocked',
      label: config.label,
      reason: `The deterministic ${config.method} quality gate failed: ${qualityFailures.join('; ')}.`,
      method: {
        id: config.method,
        roiNormalized: config.roi,
        roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
      },
    };
  }

  await writeDebugOverlay(
    sourcePath,
    stateKey,
    'boundary',
    selectedMask,
    image,
    selected.bounds,
  );

  return {
    status: 'observed',
    evidenceClass: 'observed',
    label: config.label,
    bounds: serializeBounds(selected.bounds, image, dpr),
    position: {
      rasterY: round(meanY),
      cssY: round(meanY / dpr),
      normalizedY: round(meanY / image.height, 6),
    },
    pixelSupport: selected.pixels,
    method: {
      id: config.method,
      roiNormalized: config.roi,
      roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
      minimumPixelDelta: config.minimumPixelDelta,
      minimumMeanDelta: config.minimumMeanDelta,
      minimumRowSupportRatio: config.minimumRowSupportRatio,
      minimumDominanceRatio: config.minimumDominanceRatio,
      verticalExclusionRadius: config.verticalExclusionRadius,
      localSearchRadius: config.localSearchRadius,
      maximumVerticalStandardDeviation: config.maximumVerticalStandardDeviation,
      peakRasterY: peak.y,
      peakMeanDelta: round(peak.meanDelta),
      peakRowSupportRatio: round(peak.rowSupportRatio),
      peakScore: round(peak.score),
      runnerUpRasterY: runnerUp?.y ?? null,
      runnerUpScore: round(runnerUp?.score ?? 0),
      dominanceRatio: dominanceRatio === null ? null : round(dominanceRatio),
      localColumnSupportRatio: round(localSupportRatio),
      verticalStandardDeviation: round(verticalStandardDeviation),
      rationale: config.rationale,
    },
  };
}

function selectLargestDilatedEdgeComponent(originalMask, image, roi, config) {
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
    .filter((component) => component.pixels >= config.minimumComponentPixels)
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
      if (originalMask[index] && labels[index] === selectedComponent.label) {
        selectedMask[index] = 1;
      }
    }
  }

  return {
    selectedMask,
    selectedComponents: selectedComponent ? [selectedComponent] : [],
    eligibleComponentCount: eligible.length,
    totalComponentCount: components.length,
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

async function measureFeature(
  sourcePath,
  data,
  image,
  stateKey,
  featureKind,
  config,
  dpr,
) {
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  let selection;

  if (
    config.method === 'chroma-component-union' ||
    config.method === 'largest-chroma-component'
  ) {
    const mask = createPredicateMask(data, image, roi, config.predicate);
    selection = selectChromaComponents(mask, image, roi, config);
  } else if (config.method === 'largest-dilated-sobel-component') {
    const mask = createSobelMask(data, image, roi, config.sobelThreshold);
    selection = selectLargestDilatedEdgeComponent(mask, image, roi, config);
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
        roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
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
      roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
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
      selectedComponentCount: selection.selectedComponents.length,
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
    return measureHorizontalBoundary(
      sourcePath,
      data,
      image,
      stateKey,
      config,
      dpr,
    );
  }

  return measureFeature(
    sourcePath,
    data,
    image,
    stateKey,
    featureKind,
    config,
    dpr,
  );
}

function updateAnchorScreenBounds(anchor, stateEvidence, stateIndex) {
  const prior = anchor.screenBounds ?? {};
  const landmarkObserved = stateEvidence.landmark?.status === 'observed';
  const routeObserved = stateEvidence.route?.status === 'observed';
  const boundaryObserved = stateEvidence.boundary?.status === 'observed';
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
  const primaryEvidenceRef =
    stateEvidence.primaryStructure.kind === 'landmark'
      ? landmarkEvidenceRef
      : stateEvidence.primaryStructure.kind === 'route'
        ? routeEvidenceRef
        : boundaryEvidenceRef;
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
    routeLabel: stateEvidence.route.label ?? null,
    routeEvidenceRef,
    boundaryStatus: stateEvidence.boundary.status,
    boundary: boundaryObserved ? stateEvidence.boundary.bounds.cssPixels : null,
    boundaryLabel: stateEvidence.boundary.label ?? null,
    boundaryEvidenceRef,
    copyStatus:
      prior.copyStatus ??
      (anchor.activeCopyState?.value === 'none' ? 'not-applicable' : 'unknown'),
    reason: primaryObserved
      ? `Primary ${stateEvidence.primaryStructure.kind} measured by the reproducible recording structural-bounds pipeline; independently owned copy evidence is preserved.`
      : stateEvidence.primaryStructure.reason,
  };

  return next;
}

const manifest = JSON.parse(await readFile(anchorsPath, 'utf8'));
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
    config.primaryStructure !== 'boundary'
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
  const primaryFeature = {
    landmark,
    route,
    boundary,
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
      label: primaryFeature.label ?? null,
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
    primaryStructureMeasured: 0,
    primaryStructureBlocked: 0,
  },
);

const report = {
  schemaVersion: 2,
  algorithmVersion,
  generatedBy: 'tools/hero-reference/measure-recording-bounds.mjs',
  authority: {
    recordingPath: 'docs/vectrfl_recording.mov',
    recordingSha256: manifest.authority.sourceSha256,
    anchorManifest: 'docs/hero-reference/recording-anchors.json',
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
      'No output rectangle is hand-entered. State configuration supplies only a documented normalized semantic ROI and fixed segmentation/quality thresholds.',
    featureStatus:
      'Every landmark is explicitly observed, blocked, or not-applicable. Each state names a landmark, route, or boundary as its primary structure so a route-primary or transition-primary frame is not failed for lacking a destination silhouette.',
    chroma:
      'Color methods threshold raw 8-bit sRGB pixels, find 8-connected components, and either union every qualifying component or select the largest qualifying component.',
    edges:
      'The arrow method computes luma with Rec. 709 coefficients, applies a 3x3 Sobel L1 magnitude threshold, dilates only for component association, and reports the bounds of original (non-dilated) edge pixels.',
    boundary:
      'The journey-exit boundary is the dominant horizontal row discontinuity. It must satisfy minimum color delta, row support, peak dominance, local column support, and vertical-variance gates.',
    quality:
      'An applicable feature is blocked when selected support misses its fixed gate or semantic isolation would substitute a partial/effect-only feature. Not-applicable is reserved for a feature that is not the state’s source-visible structural role.',
    reproducibility:
      'The authoritative MOV SHA and every input PNG SHA are verified before measurement. --check recomputes both evidence files and fails on byte drift.',
  },
  summary,
  states,
};

const updatedManifest = {
  ...manifest,
  schemaVersion: 2,
  anchorPolicy: {
    ...manifest.anchorPolicy,
    unmeasuredFields:
      'Rendered pixels do not expose camera transforms. Live trace calibration supplies progress targets independently. Structural evidence measures four landmarks, three route cores, and one section boundary; four route/transition-primary states mark landmark bounds not applicable, while seven genuinely ambiguous landmark states remain blocked.',
  },
  structuralBoundsEvidence: {
    status:
      summary.primaryStructureBlocked === 0 ? 'observed' : 'partially-observed',
    verifiedOn: '2026-07-30',
    artifact: 'docs/hero-reference/recording-structural-bounds.json',
    algorithmVersion,
    landmarkMeasured: summary.landmarkMeasured,
    landmarkBlocked: summary.landmarkBlocked,
    landmarkNotApplicable: summary.landmarkNotApplicable,
    routeMeasured: summary.routeMeasured,
    boundaryMeasured: summary.boundaryMeasured,
    primaryStructureMeasured: summary.primaryStructureMeasured,
    primaryStructureBlocked: summary.primaryStructureBlocked,
  },
  states: manifest.states.map((anchor) => {
    const stateIndex = states.findIndex((state) => state.key === anchor.key);
    const stateEvidence = states[stateIndex];
    return {
      ...anchor,
      screenBounds: updateAnchorScreenBounds(anchor, stateEvidence, stateIndex),
    };
  }),
  unresolvableFromRecordingAlone: manifest.unresolvableFromRecordingAlone.map(
    (entry) =>
      entry.field === 'screen-space bounds'
        ? {
            ...entry,
            status: 'partially-observed',
            reason:
              'The deterministic structural-bounds pipeline measures four landmarks, three route cores, and one section boundary. Four route/transition-primary states correctly mark landmark bounds not applicable; seven landmark-primary states and all applicable recording copy bounds remain blocked or unknown.',
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
    writeFileAtomically(outputPath, reportText),
    writeFileAtomically(anchorsPath, manifestText),
  ]);
}

console.log(
  `Recording bounds: ${summary.landmarkMeasured} landmark measured, ${summary.landmarkBlocked} landmark blocked, ${summary.landmarkNotApplicable} landmark not applicable, ${summary.routeMeasured} route measured, ${summary.boundaryMeasured} boundary measured${checkOnly ? ' (reproducibility check passed)' : ''}.`,
);
