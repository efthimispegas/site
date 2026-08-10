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
const semanticMasksPath = path.join(
  workspaceRoot,
  'docs/hero-reference/recording-semantic-masks.json',
);
const evidenceRef = 'docs/hero-reference/recording-structural-bounds.json#';
const semanticMasksRef = 'docs/hero-reference/recording-semantic-masks.json';
const algorithmVersion = 'recording-structural-bounds-v6';

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

const RED_ROUTE = {
  id: 'red-route',
  description:
    'r-g >= 55, r-b >= 35, r >= 180, and g <= 195 in 8-bit sRGB',
  test: (red, green, blue) =>
    red - green >= 55 && red - blue >= 35 && red >= 180 && green <= 195,
};

const DARK_COPY = {
  id: 'dark-neutral-copy-ink',
  description:
    'max(r,g,b) <= 150 and max(r,g,b)-min(r,g,b) <= 40 in 8-bit sRGB',
  test: (red, green, blue) => {
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    return maximum <= 150 && maximum - minimum <= 40;
  },
};

const PROCESS_COPY_ROI = [0.042, 0.52, 0.39, 0.43];
const SCREEN_COMPOSITION = {
  label: 'screen-space edge-support distribution proxy',
  roi: [0.01, 0.12, 0.98, 0.87],
  sobelThreshold: 36,
  gridColumns: 4,
  gridRows: 4,
  minimumEdgePixels: 1000,
};

const LANDING_COPY = {
  label: 'visible centered landing headline and supporting-copy ink envelope',
  method: 'predicate-component-union',
  predicate: DARK_COPY,
  roi: [0.24, 0.15, 0.52, 0.44],
  minimumComponentPixels: 8,
  maximumComponentPixels: 25000,
  maximumComponentWidth: 260,
  maximumComponentHeight: 220,
  minimumComponentFillRatio: 0.1,
  minimumSelectedPixels: 12000,
  rationale:
    'The center-only ROI contains the complete landing headline and supporting copy while excluding the fixed header and scroll cue. Dark-neutral glyph components are bounded by glyph-scale size and fill gates so pale world geometry cannot substitute for copy ink.',
};

function processCopy(roi) {
  return {
    label: 'visible four-row process-ladder copy ink envelope',
    method: 'predicate-component-union',
    predicate: DARK_COPY,
    roi,
    minimumComponentPixels: 8,
    maximumComponentPixels: 8000,
    maximumComponentWidth: 150,
    maximumComponentHeight: 110,
    minimumComponentFillRatio: 0.1,
    minimumSelectedPixels: 2500,
    rationale:
      'The state-specific left-column ROI contains the complete readable four-row process ladder and excludes the fixed header. Dark-neutral components must satisfy glyph-scale area, dimensions, and fill gates; large scene structures and decorative geometry are not admitted as copy ink.',
  };
}

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
    route: {
      label: 'visible high-chroma core of emerging red landing rails',
      method: 'chroma-component-union',
      predicate: RED_ROUTE,
      roi: [0.34, 0.58, 0.34, 0.42],
      minimumComponentPixels: 20,
      minimumSelectedPixels: 180,
      rationale:
        'The lower-center ROI contains the source-visible emerging red rails while excluding the blue loader mark and unrelated pale world geometry. Only visible saturated route pixels are reported; the bottom-clipped continuation remains outside the measurement.',
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
    route: {
      status: 'not-applicable',
      label: null,
      reason:
        'The locked resolved-landing frame contains no source-visible route pixels. Red rails appear in the earlier reveal and later landing-idle anchors; an off-screen or future continuation is not inferred here.',
    },
    copy: LANDING_COPY,
  },
  'landing-idle': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'landing industrial context aggregate at route idle',
      reason:
        'The landing focus remains a disconnected, lower-viewport-clipped aggregate. The red packet is a route effect, and neither it nor a near-viewport-wide hand enclosure is a defensible landmark substitute.',
    },
    route: {
      label: 'visible high-chroma core of landing-idle red route',
      method: 'chroma-component-union',
      predicate: RED_ROUTE,
      roi: [0.2, 0.54, 0.52, 0.46],
      minimumComponentPixels: 20,
      minimumSelectedPixels: 120,
      rationale:
        'The same lower journey band captures the saturated landing route at the later local-clock phase. It remains route evidence and is not substituted for the blocked industrial aggregate landmark.',
    },
    copy: LANDING_COPY,
  },
  'activation-route': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'first-destination building before route contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete destination building is fully visible. A hash-locked, source-frame-tied semantic silhouette includes its connected volumes while excluding rails, shadows, figures, vegetation, and surrounding context.',
    },
    route: {
      label: 'visible high-chroma core of parallel red activation rails',
      method: 'chroma-component-union',
      predicate: RED_ROUTE,
      roi: [0.24, 0, 0.5, 0.76],
      minimumComponentPixels: 80,
      minimumSelectedPixels: 1500,
      rationale:
        'The source-visible activation network is a separated bundle of saturated red rails. Unioning qualifying components preserves the parallel structure and branch handoffs without using the destination mask or ground shadows.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
  },
  'activation-contact': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'logo-bearing first-destination building at route contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete logo-bearing destination is visible. A hash-locked semantic silhouette prevents the separable blue logo or red contact rails from substituting for the full landmark.',
    },
    route: {
      label: 'visible high-chroma core of red activation contact rails',
      method: 'chroma-component-union',
      predicate: RED_ROUTE,
      roi: [0.08, 0, 0.44, 0.53],
      minimumComponentPixels: 80,
      minimumSelectedPixels: 1200,
      rationale:
        'The upper-left-to-contact ROI isolates the saturated parallel rail bundle as it reaches the destination. The building silhouette and blue logo are excluded by the red predicate.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
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
    copy: processCopy(PROCESS_COPY_ROI),
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
      method: 'chroma-component-union',
      predicate: CYAN_ROUTE,
      roi: [0.12, 0.4, 0.58, 0.5],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The ROI follows the lower transit band named by the manifest and excludes the top-right field tiles. Qualifying-component support preserves source-visible beam segments split by copy/white core while rejecting the smaller dotted wake.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
  },
  'field-approach': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'elevated field-center tile and figure',
      reason:
        'Only a pale fragment of the elevated center and figure is visible among similar tiles, and the fixed header/viewport occludes its upper extent. Partial censored evidence cannot supply a complete landmark box.',
    },
    route: {
      label: 'visible high-chroma core of cyan field-approach feed',
      method: 'chroma-component-union',
      predicate: CYAN_ROUTE,
      roi: [0, 0.44, 0.72, 0.46],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The lower transit band isolates the cyan approach feed from the top-right field tiles. Unioning only supported components preserves beam sections split by copy/white core while rejecting the dotted wake and small tile reactions.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
  },
  'field-contact': {
    primaryStructure: 'landmark',
    landmark: {
      label: 'elevated center tile and standing figure at first contact',
      method: 'source-semantic-mask',
      rationale:
        'The complete center tile and its standing figure are visible. Their hash-locked semantic union excludes the incoming route, adjacent reacting tiles, and contact glow.',
    },
    route: {
      label: 'visible high-chroma core of cyan route before field contact',
      method: 'chroma-component-union',
      predicate: CYAN_ROUTE,
      roi: [0, 0.44, 0.48, 0.42],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The ROI ends before the elevated center so supported incoming-feed components remain measurable without merging contact glow or adjacent reacting tiles into the route core.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
  },
  'field-pulse-a': {
    primaryStructure: 'landmark',
    landmark: {
      status: 'blocked',
      label: 'field center during inner pulse',
      reason:
        'Bloom occludes the center tile and figure and joins the route with neighboring tiles. The luminous envelope is an effect observable, not a substitute for the hidden structural landmark.',
    },
    route: {
      label: 'visible high-chroma core of incoming cyan feed during inner pulse',
      method: 'chroma-component-union',
      predicate: CYAN_ROUTE,
      roi: [0, 0.43, 0.45, 0.3],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The left-side ROI unions supported sections of the still-readable incoming feed before it merges with the inner bloom. The occluded center, smaller dotted wake, and luminous pulse remain outside route evidence.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
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
    route: {
      label: 'visible high-chroma core of incoming cyan feed during outer pulse',
      method: 'chroma-component-union',
      predicate: CYAN_ROUTE,
      roi: [0, 0.43, 0.45, 0.3],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The same left-side transit ROI unions supported incoming-feed sections while excluding the outer tile reaction, smaller dotted wake, and elevated blue center landmark.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
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
    copy: {
      status: 'blocked',
      label: 'transitioning four-row process-ladder copy',
      reason:
        'The active arrival body copy is materially faded into similar-valued field tiles and route bloom at this travel anchor. A dark-ink box would report only the headings, while a looser threshold would merge scene structure; bounds from the later lockup are not inferred backward.',
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
    route: {
      label: 'visible high-chroma core of cyan arrival feed before the arrow',
      method: 'largest-chroma-component',
      predicate: CYAN_ROUTE,
      roi: [0, 0.37, 0.4, 0.2],
      minimumComponentPixels: 180,
      minimumSelectedPixels: 180,
      rationale:
        'The left horizontal band isolates the saturated arrival feed before it reaches the layered arrow. Arrow edges, surrounding marks, copy, and the glow field lie outside the selected core.',
    },
    copy: processCopy(PROCESS_COPY_ROI),
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
    copy: {
      status: 'blocked',
      label: 'clipped exiting process-ladder copy',
      reason:
        'The exiting ladder is vertically clipped and overlaps the fixed left navigation at this exact frame. Visible dark pixels cannot distinguish the two text systems, and a complete pre-exit ladder box is not inferred through the section handoff.',
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

async function measureScreenComposition(
  sourcePath,
  data,
  image,
  stateKey,
  config,
  dpr,
) {
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createSobelMask(
    data,
    image,
    roi,
    config.sobelThreshold,
  );
  const selected = boundsFromMask(mask, image.width, image.height);
  const cellCount = config.gridColumns * config.gridRows;
  const cellEdgePixels = Array.from({ length: cellCount }, () => 0);
  const cellPixels = Array.from({ length: cellCount }, () => 0);
  let sumX = 0;
  let sumY = 0;
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;

  for (let y = roi.y; y < bottom; y += 1) {
    const row = Math.min(
      config.gridRows - 1,
      Math.floor(((y - roi.y) * config.gridRows) / roi.height),
    );
    for (let x = roi.x; x < right; x += 1) {
      const column = Math.min(
        config.gridColumns - 1,
        Math.floor(((x - roi.x) * config.gridColumns) / roi.width),
      );
      const cellIndex = row * config.gridColumns + column;
      cellPixels[cellIndex] += 1;
      if (mask[y * image.width + x]) {
        cellEdgePixels[cellIndex] += 1;
        sumX += x;
        sumY += y;
      }
    }
  }

  if (!selected || selected.pixels < config.minimumEdgePixels) {
    return {
      status: 'blocked',
      label: config.label,
      reason: `The deterministic screen-composition quality gate found ${selected?.pixels ?? 0} edge-support pixels; at least ${config.minimumEdgePixels} are required.`,
      method: {
        id: 'screen-space-sobel-grid',
        roiNormalized: config.roi,
        roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
        sobelThreshold: config.sobelThreshold,
      },
    };
  }

  await writeDebugOverlay(
    sourcePath,
    stateKey,
    'composition',
    mask,
    image,
    roi,
  );

  const edgeDensity = selected.pixels / (roi.width * roi.height);
  const centroidX = sumX / selected.pixels;
  const centroidY = sumY / selected.pixels;
  return {
    status: 'observed',
    evidenceClass: 'observed',
    label: config.label,
    edgePixelSupport: selected.pixels,
    edgeDensity: round(edgeDensity, 6),
    edgeCentroid: {
      rasterPixels: [round(centroidX), round(centroidY)],
      cssPixels: [round(centroidX / dpr), round(centroidY / dpr)],
      normalized: [
        round(centroidX / image.width, 6),
        round(centroidY / image.height, 6),
      ],
    },
    grid: {
      columns: config.gridColumns,
      rows: config.gridRows,
      cells: cellEdgePixels.map((edgePixels, index) => ({
        column: index % config.gridColumns,
        row: Math.floor(index / config.gridColumns),
        edgePixels,
        edgeDensity: round(edgePixels / cellPixels[index], 6),
        edgeShare: round(edgePixels / selected.pixels, 6),
        negativeSpaceProxy: round(1 - edgePixels / cellPixels[index], 6),
      })),
    },
    method: {
      id: 'screen-space-sobel-grid',
      roiNormalized: config.roi,
      roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
      sobelThreshold: config.sobelThreshold,
      minimumEdgePixels: config.minimumEdgePixels,
      interpretation:
        'Binary Sobel support is summarized in a fixed 4x4 screen grid after excluding the fixed-header band and outer raster border. Edge density and centroid are rendered composition proxies only; negativeSpaceProxy means absence of thresholded edges, not proof of empty 3D space or a recovered camera transform.',
    },
  };
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

function deriveRouteCoreGeometry(mask, width, height, dpr) {
  let pixels = 0;
  let sumX = 0;
  let sumY = 0;

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    pixels += 1;
    sumX += x;
    sumY += y;
  }

  if (pixels === 0) {
    return null;
  }

  const meanX = sumX / pixels;
  const meanY = sumY / pixels;
  let covarianceXX = 0;
  let covarianceXY = 0;
  let covarianceYY = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    const centeredX = x - meanX;
    const centeredY = y - meanY;
    covarianceXX += centeredX * centeredX;
    covarianceXY += centeredX * centeredY;
    covarianceYY += centeredY * centeredY;
  }
  covarianceXX /= pixels;
  covarianceXY /= pixels;
  covarianceYY /= pixels;

  const angle = 0.5 * Math.atan2(
    2 * covarianceXY,
    covarianceXX - covarianceYY,
  );
  let axisX = Math.cos(angle);
  let axisY = Math.sin(angle);
  if (
    (Math.abs(axisX) >= Math.abs(axisY) && axisX < 0) ||
    (Math.abs(axisX) < Math.abs(axisY) && axisY < 0)
  ) {
    axisX *= -1;
    axisY *= -1;
  }

  let minimumProjection = Number.POSITIVE_INFINITY;
  let maximumProjection = Number.NEGATIVE_INFINITY;
  let start = null;
  let end = null;
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const x = index - y * width;
    const projection = (x - meanX) * axisX + (y - meanY) * axisY;
    if (projection < minimumProjection) {
      minimumProjection = projection;
      start = [x, y];
    }
    if (projection > maximumProjection) {
      maximumProjection = projection;
      end = [x, y];
    }
  }

  const principalSpan = Math.max(maximumProjection - minimumProjection, 1);
  const equivalentSelectedCoreThickness = pixels / principalSpan;
  return {
    rasterPixels: {
      start,
      end,
      direction: [round(axisX, 6), round(axisY, 6)],
      principalSpan: round(principalSpan),
      equivalentSelectedCoreThickness: round(equivalentSelectedCoreThickness),
    },
    cssPixels: {
      start: start.map((value) => round(value / dpr)),
      end: end.map((value) => round(value / dpr)),
      principalSpan: round(principalSpan / dpr),
      equivalentSelectedCoreThickness: round(
        equivalentSelectedCoreThickness / dpr,
      ),
    },
    normalized: {
      start: [round(start[0] / width, 6), round(start[1] / height, 6)],
      end: [round(end[0] / width, 6), round(end[1] / height, 6)],
    },
    interpretation:
      'PCA of selected high-chroma route-core pixels. Direction is oriented left-to-right for predominantly horizontal cores or top-to-bottom for predominantly vertical cores. Equivalent thickness is selected pixel area divided by principal span; for parallel or branched unions it is an aggregate core measure, not a single-rail or glow-envelope width.',
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
    (component) =>
      component.pixels >= config.minimumComponentPixels &&
      component.pixels <=
        (config.maximumComponentPixels ?? Number.POSITIVE_INFINITY) &&
      component.bounds.width <=
        (config.maximumComponentWidth ?? Number.POSITIVE_INFINITY) &&
      component.bounds.height <=
        (config.maximumComponentHeight ?? Number.POSITIVE_INFINITY) &&
      component.pixels /
        (component.bounds.width * component.bounds.height) >=
        (config.minimumComponentFillRatio ?? 0),
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
    },
  };
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
  const roi = config.roi
    ? normalizedRoiToPixels(config.roi, image.width, image.height)
    : null;
  let selection;

  if (config.method === 'source-semantic-mask') {
    selection = await selectSemanticMask(
      sourcePath,
      image,
      stateKey,
      featureKind,
    );
  } else if (
    config.method === 'chroma-component-union' ||
    config.method === 'largest-chroma-component' ||
    config.method === 'predicate-component-union'
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
  const minimumSelectedPixels =
    selection.minimumSelectedPixels ?? config.minimumSelectedPixels;
  if (!selected || selected.pixels < minimumSelectedPixels) {
    return {
      status: 'blocked',
      label: config.label,
      reason: `The deterministic ${config.method} quality gate found ${selected?.pixels ?? 0} selected pixels; at least ${minimumSelectedPixels} are required.`,
      method: {
        id: config.method,
        roiNormalized: config.roi ?? null,
        roiRasterPixels: roi
          ? [roi.x, roi.y, roi.width, roi.height]
          : null,
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
    geometry:
      featureKind === 'route'
        ? deriveRouteCoreGeometry(
            selection.selectedMask,
            image.width,
            image.height,
            dpr,
          )
        : null,
    pixelSupport: selected.pixels,
    method: {
      id: config.method,
      roiNormalized: config.roi ?? null,
      roiRasterPixels: roi
        ? [roi.x, roi.y, roi.width, roi.height]
        : null,
      predicate: config.predicate
        ? {
            id: config.predicate.id,
            description: config.predicate.description,
          }
        : null,
      sobelThreshold: config.sobelThreshold ?? null,
      dilationIterations: config.dilationIterations ?? 0,
      connectivity: config.method === 'source-semantic-mask' ? null : 8,
      minimumComponentPixels: config.minimumComponentPixels ?? null,
      maximumComponentPixels: config.maximumComponentPixels ?? null,
      maximumComponentWidth: config.maximumComponentWidth ?? null,
      maximumComponentHeight: config.maximumComponentHeight ?? null,
      minimumComponentFillRatio: config.minimumComponentFillRatio ?? null,
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
  const copyObserved = stateEvidence.copy?.status === 'observed';
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
    copyStatus: stateEvidence.copy.status,
    copy: copyObserved ? stateEvidence.copy.bounds.cssPixels : null,
    copyLabel: stateEvidence.copy.label ?? null,
    copyEvidenceRef,
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
  semanticMaskManifest.schemaVersion !== 1 ||
  semanticMaskManifest.authority.recordingSha256 !==
    manifest.authority.sourceSha256 ||
  semanticMaskManifest.authority.rasterPixels.width !==
    manifest.authority.recordingProfile.rasterPixels.width ||
  semanticMaskManifest.authority.rasterPixels.height !==
    manifest.authority.recordingProfile.rasterPixels.height
) {
  throw new Error(
    `${semanticMasksRef}: authority must match the locked recording manifest`,
  );
}
const semanticMasksByKey = new Map();
for (const entry of semanticMaskManifest.masks) {
  const key = `${entry.stateKey}:${entry.featureKind}`;
  if (semanticMasksByKey.has(key)) {
    throw new Error(`${semanticMasksRef}: duplicate semantic mask ${key}`);
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
  const composition = await measureScreenComposition(
    sourcePath,
    data,
    image,
    anchor.key,
    SCREEN_COMPOSITION,
    dpr,
  );
  const primaryFeature = {
    landmark,
    route,
    boundary,
    copy,
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
    copy,
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
    compositionMeasured: 0,
    compositionBlocked: 0,
    primaryStructureMeasured: 0,
    primaryStructureBlocked: 0,
  },
);

const report = {
  schemaVersion: 6,
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
      'Every landmark, route, boundary, and copy feature is explicitly observed, blocked, or not-applicable. Each state names a landmark, route, or boundary as its primary structure so a route-primary or transition-primary frame is not failed for lacking a destination silhouette.',
    chroma:
      'Color methods threshold raw 8-bit sRGB pixels, find 8-connected components, and either union every qualifying component or select the largest qualifying component.',
    edges:
      'The arrow method computes luma with Rec. 709 coefficients, applies a 3x3 Sobel L1 magnitude threshold, dilates only for component association, and reports the bounds of original (non-dilated) edge pixels.',
    boundary:
      'The journey-exit boundary is the dominant horizontal row discontinuity. It must satisfy minimum color delta, row support, peak dominance, local column support, and vertical-variance gates.',
    semanticMasks:
      'A semantic mask is permitted only for a complete visible subject that deterministic chroma/edge isolation under-reports. Its manifest locks the recording SHA, frame PNG SHA, SVG SHA, raster, alpha threshold, support gate, inclusion/exclusion rules, uncertainty, and review status. Partial, clipped, effect-only, or disconnected aggregate subjects remain blocked.',
    routeGeometry:
      'Every observed route core reports deterministic PCA direction, selected-core endpoints, principal span, and equivalent selected-core thickness. These describe thresholded visible route pixels only; they never infer clipped continuation, a glow envelope, or a single-rail width from a parallel/branched union.',
    copyInk:
      'Observed copy bounds enclose selected visible ink, not an inferred DOM container. Fixed source-state ROIs exclude the header; a dark-neutral predicate and glyph-scale component area, dimensions, and fill gates reject large scene geometry. Faded or header-overlapped copy remains blocked rather than borrowing a box from another frame.',
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
  schemaVersion: 2,
  anchorPolicy: {
    ...manifest.anchorPolicy,
    unmeasuredFields:
      `Rendered pixels do not expose camera transforms. Live trace calibration supplies progress targets independently. Structural evidence measures ${summary.landmarkMeasured} landmarks, ${summary.routeMeasured} route cores, ${summary.copyMeasured} copy-ink envelopes, ${summary.compositionMeasured} screen-space composition proxies, and ${summary.boundaryMeasured} section boundary; ${summary.landmarkNotApplicable} route/transition-primary states mark landmark bounds not applicable, while ${summary.landmarkBlocked} genuinely ambiguous landmark states and ${summary.copyBlocked} copy states remain blocked.`,
  },
  structuralBoundsEvidence: {
    status:
      summary.primaryStructureBlocked === 0 ? 'observed' : 'partially-observed',
    verifiedOn: '2026-08-10',
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
            reason:
              `The deterministic structural-bounds pipeline measures ${summary.landmarkMeasured} landmarks, ${summary.routeMeasured} route cores, ${summary.copyMeasured} copy-ink envelopes, ${summary.compositionMeasured} screen-space composition proxies, and ${summary.boundaryMeasured} section boundary. ${summary.landmarkNotApplicable} route/transition-primary states correctly mark landmark bounds not applicable; ${summary.landmarkBlocked} landmark-primary states and ${summary.copyBlocked} copy states remain blocked.`,
          }
        : entry;
    },
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
  `Recording bounds: ${summary.landmarkMeasured} landmark measured, ${summary.landmarkBlocked} landmark blocked, ${summary.landmarkNotApplicable} landmark not applicable, ${summary.routeMeasured} route measured, ${summary.copyMeasured} copy measured, ${summary.copyBlocked} copy blocked, ${summary.boundaryMeasured} boundary measured, ${summary.compositionMeasured} composition measured${checkOnly ? ' (reproducibility check passed)' : ''}.`,
);
