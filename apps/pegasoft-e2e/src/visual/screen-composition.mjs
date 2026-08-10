export const SCREEN_COMPOSITION_CONFIG = Object.freeze({
  label: 'screen-space edge-support distribution proxy',
  roi: Object.freeze([0.01, 0.12, 0.98, 0.87]),
  sobelThreshold: 36,
  gridColumns: 4,
  gridRows: 4,
  minimumEdgePixels: 1000,
});

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

export function measureScreenComposition({
  data,
  image,
  dpr,
  config = SCREEN_COMPOSITION_CONFIG,
}) {
  if (
    !data ||
    !Number.isSafeInteger(image?.width) ||
    image.width <= 0 ||
    !Number.isSafeInteger(image?.height) ||
    image.height <= 0 ||
    !Number.isSafeInteger(image?.channels) ||
    image.channels < 3 ||
    !Number.isFinite(dpr) ||
    dpr <= 0
  ) {
    throw new Error(
      'Screen-composition measurement requires valid RGB image data and DPR.',
    );
  }

  const expectedBytes = image.width * image.height * image.channels;
  if (data.byteLength < expectedBytes) {
    throw new Error(
      'Screen-composition image data is shorter than its declared dimensions.',
    );
  }

  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createSobelMask(data, image, roi, config.sobelThreshold);
  const cellCount = config.gridColumns * config.gridRows;
  const cellEdgePixels = Array.from({ length: cellCount }, () => 0);
  const cellPixels = Array.from({ length: cellCount }, () => 0);
  let edgePixelSupport = 0;
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
        edgePixelSupport += 1;
        sumX += x;
        sumY += y;
      }
    }
  }

  if (edgePixelSupport < config.minimumEdgePixels) {
    return {
      measurement: {
        status: 'blocked',
        label: config.label,
        reason: `The deterministic screen-composition quality gate found ${edgePixelSupport} edge-support pixels; at least ${config.minimumEdgePixels} are required.`,
        method: {
          id: 'screen-space-sobel-grid',
          roiNormalized: config.roi,
          roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
          sobelThreshold: config.sobelThreshold,
        },
      },
      debug: { mask, roi },
    };
  }

  const edgeDensity = edgePixelSupport / (roi.width * roi.height);
  const centroidX = sumX / edgePixelSupport;
  const centroidY = sumY / edgePixelSupport;
  return {
    measurement: {
      status: 'observed',
      evidenceClass: 'observed',
      label: config.label,
      edgePixelSupport,
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
          edgeShare: round(edgePixels / edgePixelSupport, 6),
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
    },
    debug: { mask, roi },
  };
}
