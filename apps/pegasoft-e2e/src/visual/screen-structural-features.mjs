const DARK_COPY = Object.freeze({
  id: 'dark-neutral-copy-ink',
  description:
    'max(r,g,b) <= 150 and max(r,g,b)-min(r,g,b) <= 40 in 8-bit sRGB',
  test(red, green, blue) {
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    return maximum <= 150 && maximum - minimum <= 40;
  },
});

export const LANDING_COPY_CONFIG = Object.freeze({
  label: 'visible centered landing headline and supporting-copy ink envelope',
  method: 'predicate-component-union',
  predicate: DARK_COPY,
  roi: Object.freeze([0.24, 0.15, 0.52, 0.44]),
  minimumComponentPixels: 8,
  maximumComponentPixels: 25000,
  maximumComponentWidth: 260,
  maximumComponentHeight: 220,
  minimumComponentFillRatio: 0.1,
  minimumSelectedPixels: 12000,
  rationale:
    'The center-only ROI contains the complete landing headline and supporting copy while excluding the fixed header and scroll cue. Dark-neutral glyph components are bounded by glyph-scale size and fill gates so pale world geometry cannot substitute for copy ink.',
});

export const PROCESS_COPY_CONFIG = Object.freeze({
  label: 'visible four-row process-ladder copy ink envelope',
  method: 'predicate-component-union',
  predicate: DARK_COPY,
  roi: Object.freeze([0.042, 0.52, 0.39, 0.43]),
  minimumComponentPixels: 8,
  maximumComponentPixels: 8000,
  maximumComponentWidth: 150,
  maximumComponentHeight: 110,
  minimumComponentFillRatio: 0.1,
  minimumSelectedPixels: 2500,
  rationale:
    'The state-specific left-column ROI contains the complete readable four-row process ladder and excludes the fixed header. Dark-neutral components must satisfy glyph-scale area, dimensions, and fill gates; large scene structures and decorative geometry are not admitted as copy ink.',
});

export const JOURNEY_EXIT_BOUNDARY_CONFIG = Object.freeze({
  label: 'hero-to-following-section boundary at journey exit',
  method: 'dominant-horizontal-boundary',
  roi: Object.freeze([0, 0.32, 1, 0.5]),
  minimumPixelDelta: 8,
  minimumMeanDelta: 20,
  minimumRowSupportRatio: 0.8,
  minimumDominanceRatio: 3,
  verticalExclusionRadius: 3,
  localSearchRadius: 3,
  maximumVerticalStandardDeviation: 1,
  rationale:
    'The compositional focus is the nearly full-width horizontal discontinuity between the pale hero and the following white section. Row support, peak dominance, and per-column vertical variance reject text and arrow edges.',
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

  return { x, y, width: right - x, height: bottom - y };
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

  return components;
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

  return pixels === 0
    ? null
    : {
        pixels,
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
      };
}

function validateImageInput(data, image, dpr) {
  if (
    !data ||
    !Number.isSafeInteger(image?.width) ||
    image.width <= 0 ||
    !Number.isSafeInteger(image?.height) ||
    image.height <= 0 ||
    !Number.isSafeInteger(image?.channels) ||
    image.channels < 3 ||
    !Number.isFinite(dpr) ||
    dpr <= 0 ||
    data.byteLength < image.width * image.height * image.channels
  ) {
    throw new Error(
      'Structural screen measurement requires valid RGB image data and DPR.',
    );
  }
}

export function measureCopyInk({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const components = connectedComponents(mask, image.width, image.height, roi);
  const selectedComponents = components.filter(
    (component) =>
      component.pixels >= config.minimumComponentPixels &&
      component.pixels <= config.maximumComponentPixels &&
      component.bounds.width <= config.maximumComponentWidth &&
      component.bounds.height <= config.maximumComponentHeight &&
      component.pixels / (component.bounds.width * component.bounds.height) >=
        config.minimumComponentFillRatio,
  );
  const selectedMask = new Uint8Array(mask.length);

  for (const component of selectedComponents) {
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

  const selected = boundsFromMask(selectedMask, image.width, image.height);
  if (!selected || selected.pixels < config.minimumSelectedPixels) {
    return {
      measurement: {
        status: 'blocked',
        label: config.label,
        reason: `The deterministic ${config.method} quality gate found ${selected?.pixels ?? 0} selected pixels; at least ${config.minimumSelectedPixels} are required.`,
        method: {
          id: config.method,
          roiNormalized: config.roi,
          roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
          semanticMask: null,
        },
      },
      debug: { mask: selectedMask, bounds: selected?.bounds ?? roi },
    };
  }

  return {
    measurement: {
      status: 'observed',
      evidenceClass: 'observed',
      label: config.label,
      bounds: serializeBounds(selected.bounds, image, dpr),
      geometry: null,
      pixelSupport: selected.pixels,
      method: {
        id: config.method,
        roiNormalized: config.roi,
        roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
        predicate: {
          id: config.predicate.id,
          description: config.predicate.description,
        },
        sobelThreshold: null,
        dilationIterations: 0,
        connectivity: 8,
        minimumComponentPixels: config.minimumComponentPixels,
        maximumComponentPixels: config.maximumComponentPixels,
        maximumComponentWidth: config.maximumComponentWidth,
        maximumComponentHeight: config.maximumComponentHeight,
        minimumComponentFillRatio: config.minimumComponentFillRatio,
        minimumSelectedPixels: config.minimumSelectedPixels,
        totalComponentCount: components.length,
        eligibleComponentCount: selectedComponents.length,
        selectedComponentCount: selectedComponents.length,
        semanticMask: null,
        rationale: config.rationale,
      },
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
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

export function measureHorizontalBoundary({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
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
      measurement: {
        status: 'blocked',
        label: config.label,
        reason: `The deterministic ${config.method} quality gate failed: ${qualityFailures.join('; ')}.`,
        method: {
          id: config.method,
          roiNormalized: config.roi,
          roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
        },
      },
      debug: { mask: selectedMask, bounds: selected?.bounds ?? roi },
    };
  }

  return {
    measurement: {
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
        maximumVerticalStandardDeviation:
          config.maximumVerticalStandardDeviation,
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
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
  };
}
