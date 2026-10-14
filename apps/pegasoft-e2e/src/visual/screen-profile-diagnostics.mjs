import {
  JOURNEY_EXIT_BOUNDARY_CONFIG,
  measureHorizontalBoundary,
} from './screen-structural-features.mjs';

const qualification = () => ({
  status: 'blocked',
  reason:
    'Inactive diagnostic; semantic role, edge error and current capture correspondence are unqualified.',
});
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const validImage = ({ data, image, dpr }) =>
  Number.isInteger(image?.width) &&
  image.width > 0 &&
  Number.isInteger(image?.height) &&
  image.height > 0 &&
  Number.isInteger(image?.channels) &&
  image.channels >= 3 &&
  data?.length >= image.width * image.height * image.channels &&
  Number.isFinite(dpr) &&
  dpr > 0;
const interval = (value) =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every(Number.isInteger) &&
  value[0] <= value[1];

/** Evaluate each raster independently. No source masks, splines or area/radius conversion. */
export function measureBeamCrossSectionDiagnostic({
  data,
  image,
  dpr,
  section,
  peakFractions = [0.5, 0.8, 0.9],
  residualThresholds = [3, 5, 10],
  maximumSidebandNoise = 3,
  minimumPeakExcess = 5,
}) {
  const result = {
    status: 'blocked',
    reasons: [],
    samples: [],
    peak: null,
    peakWidths: [],
    residualEnvelopes: [],
    background: null,
    uncertainty: { measuredSidebandNoise: null, certifiedEdgeErrorCss: null },
    qualification: qualification(),
  };
  if (!validImage({ data, image, dpr })) {
    result.reasons.push('Invalid image, data or screenshot DPR.');
    return result;
  }
  const vertical = section?.axis === 'vertical';
  const length = vertical ? image.height : image.width;
  const crossLength = vertical ? image.width : image.height;
  const bands = section?.sidebands;
  const strip = section?.stripWidth;
  if (
    !['vertical', 'horizontal'].includes(section?.axis) ||
    !Number.isInteger(section?.fixedCoordinate) ||
    !Number.isInteger(strip) ||
    strip < 1 ||
    strip % 2 !== 1 ||
    section.fixedCoordinate - (strip - 1) / 2 < 0 ||
    section.fixedCoordinate + (strip - 1) / 2 >= crossLength ||
    !interval(section.range) ||
    section.range[0] < 0 ||
    section.range[1] >= length ||
    !Array.isArray(bands) ||
    bands.length !== 2 ||
    !bands.every(interval) ||
    bands.some(([a, b]) => a < section.range[0] || b > section.range[1]) ||
    bands[0][0] !== section.range[0] ||
    bands[1][1] !== section.range[1] ||
    bands[0][1] >= bands[1][0] - 1 ||
    !Array.isArray(peakFractions) ||
    !peakFractions.length ||
    peakFractions.some((v) => !Number.isFinite(v) || v <= 0 || v > 1) ||
    !Array.isArray(residualThresholds) ||
    !residualThresholds.length ||
    residualThresholds.some((v) => !Number.isFinite(v) || v <= 0) ||
    !Number.isFinite(maximumSidebandNoise) ||
    maximumSidebandNoise < 0 ||
    !Number.isFinite(minimumPeakExcess) ||
    minimumPeakExcess <= 0
  ) {
    result.reasons.push(
      'Section or sidebands are clipped, overlapping, unavailable or invalid.',
    );
    return result;
  }
  for (
    let coordinate = section.range[0];
    coordinate <= section.range[1];
    coordinate++
  ) {
    const pixels = [];
    for (let offset = -(strip - 1) / 2; offset <= (strip - 1) / 2; offset++) {
      const x = vertical ? section.fixedCoordinate + offset : coordinate;
      const y = vertical ? coordinate : section.fixedCoordinate + offset;
      const index = (y * image.width + x) * image.channels;
      const rgb = [data[index], data[index + 1], data[index + 2]];
      if (rgb.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) {
        result.reasons.push('Invalid raw RGB sample.');
        return result;
      }
      pixels.push({ x, y, rgb });
    }
    result.samples.push({
      coordinate,
      pixels,
      rgb: [0, 1, 2].map((c) => median(pixels.map((p) => p.rgb[c]))),
    });
  }
  const sideSamples = bands.map(([a, b]) =>
    result.samples.filter((s) => s.coordinate >= a && s.coordinate <= b),
  );
  const calibration = sideSamples.map((samples) =>
    [0, 1, 2].map((c) => median(samples.map((s) => s.rgb[c]))),
  );
  const centers = bands.map(([a, b]) => (a + b) / 2);
  result.background = {
    sidebands: bands.map((b) => [...b]),
    rgb: calibration,
    centerCoordinates: centers,
    method: 'independent-linear-sideband-fit',
  };
  for (const sample of result.samples) {
    const t = (sample.coordinate - centers[0]) / (centers[1] - centers[0]);
    sample.backgroundRgb = calibration[0].map(
      (v, c) => v + t * (calibration[1][c] - v),
    );
    sample.residualRgb = sample.rgb.map((v, c) => v - sample.backgroundRgb[c]);
    sample.brightExcess = sample.residualRgb.reduce((a, b) => a + b, 0) / 3;
    sample.cyanExcess =
      (sample.residualRgb[1] + sample.residualRgb[2]) / 2 -
      sample.residualRgb[0];
    sample.maxChannelResidual = Math.max(...sample.residualRgb.map(Math.abs));
  }
  const sidebandNoise = Math.max(
    ...sideSamples.flatMap((samples) =>
      samples.flatMap((s) =>
        s.pixels.flatMap((p) =>
          p.rgb.map((value, c) => Math.abs(value - s.backgroundRgb[c])),
        ),
      ),
    ),
  );
  result.uncertainty.measuredSidebandNoise = sidebandNoise;
  if (sidebandNoise > maximumSidebandNoise) {
    result.reasons.push(
      'Sideband noise exceeds the declared limit; background calibration is contaminated.',
    );
    return result;
  }
  const interior = result.samples.filter(
    (s) => s.coordinate > bands[0][1] && s.coordinate < bands[1][0],
  );
  const peak = interior.reduce(
    (best, s) => (s.brightExcess > best.brightExcess ? s : best),
    interior[0],
  );
  result.peak = {
    coordinate: peak.coordinate,
    rgb: [...peak.rgb],
    brightExcess: peak.brightExcess,
  };
  if (peak.brightExcess <= Math.max(minimumPeakExcess, sidebandNoise)) {
    result.reasons.push(
      'No bright beam peak above the declared background/noise limit.',
    );
    return result;
  }
  const groups = [];
  // A dim bridge above the detection floor must not merge significant peaks.
  const significantPeakThreshold = Math.max(
    minimumPeakExcess,
    peak.brightExcess / 2,
  );
  let group = null;
  for (const sample of interior) {
    if (sample.brightExcess >= significantPeakThreshold) {
      if (!group) {
        group = [];
        groups.push(group);
      }
      group.push(sample);
    } else group = null;
  }
  const competing = groups.filter(
    (g) => Math.max(...g.map((s) => s.brightExcess)) >= peak.brightExcess / 2,
  );
  if (competing.length !== 1) {
    result.reasons.push(
      'Competing bright peaks make beam assignment ambiguous.',
    );
    return result;
  }
  const peakIndex = result.samples.findIndex(
    (s) => s.coordinate === peak.coordinate,
  );
  result.peakWidths = peakFractions.map((fraction) => {
    let a = peakIndex,
      b = peakIndex;
    while (
      a > 0 &&
      result.samples[a - 1].brightExcess >= peak.brightExcess * fraction
    )
      a--;
    while (
      b < result.samples.length - 1 &&
      result.samples[b + 1].brightExcess >= peak.brightExcess * fraction
    )
      b++;
    return {
      fraction,
      rasterBounds: [
        result.samples[a].coordinate,
        result.samples[b].coordinate,
      ],
      cssSpan: (b - a + 1) / dpr,
      quantity: 'apparent-composited-bright-profile',
    };
  });
  result.residualEnvelopes = residualThresholds.map((threshold) => {
    const support = result.samples.filter(
      (s) => s.maxChannelResidual >= threshold,
    );
    const a = support[0]?.coordinate,
      b = support.at(-1)?.coordinate;
    return {
      threshold,
      rasterBounds: a === undefined ? null : [a, b],
      cssSpan: a === undefined ? null : (b - a + 1) / dpr,
      endpointsClosed:
        result.samples[0].maxChannelResidual < threshold &&
        result.samples.at(-1).maxChannelResidual < threshold,
      thresholdAboveMeasuredNoise: threshold > sidebandNoise,
      quantity: 'diagnostic-residual-visibility-envelope',
    };
  });
  if (
    result.residualEnvelopes.some(
      (e) => !e.endpointsClosed || !e.thresholdAboveMeasuredNoise,
    )
  ) {
    result.reasons.push(
      'Residual envelope is clipped or its threshold overlaps measured background noise.',
    );
    return result;
  }
  result.status = 'observed-diagnostic';
  return result;
}

/** Expose chronological row scores while retaining the original boundary classifier gates. */
export function measureExitBoundaryDiagnostic({
  data,
  image,
  dpr,
  expectedFrameId,
  appliedReadback,
}) {
  const config = JOURNEY_EXIT_BOUNDARY_CONFIG;
  const classified = measureHorizontalBoundary({ data, image, dpr, config });
  const x0 = Math.floor(config.roi[0] * image.width);
  const x1 = Math.ceil((config.roi[0] + config.roi[2]) * image.width);
  const y0 = Math.floor(config.roi[1] * image.height);
  const y1 = Math.ceil((config.roi[1] + config.roi[3]) * image.height);
  const delta = (x, y) => {
    const i = (y * image.width + x) * image.channels;
    const previous = i - image.width * image.channels;
    return (
      [0, 1, 2].reduce(
        (sum, c) => sum + Math.abs(data[i + c] - data[previous + c]),
        0,
      ) / 3
    );
  };
  const rows = [];
  for (let y = y0 + 1; y < y1; y++) {
    let total = 0,
      supported = 0;
    for (let x = x0; x < x1; x++) {
      const value = delta(x, y);
      total += value;
      if (value >= config.minimumPixelDelta) supported++;
    }
    const meanDelta = total / (x1 - x0),
      rowSupportRatio = supported / (x1 - x0);
    rows.push({
      y,
      meanDelta,
      rowSupportRatio,
      score: meanDelta * rowSupportRatio,
    });
  }
  const ranked = [...rows].sort((a, b) => b.score - a.score || a.y - b.y);
  const peak = ranked[0];
  const runnerUp =
    ranked.find(
      (r) => Math.abs(r.y - peak.y) > config.verticalExclusionRadius,
    ) ?? null;
  const localRows = [];
  for (let x = x0; x < x1; x++) {
    let bestY = peak.y,
      bestDelta = -1;
    for (
      let y = Math.max(y0 + 1, peak.y - config.localSearchRadius);
      y <= Math.min(y1 - 1, peak.y + config.localSearchRadius);
      y++
    ) {
      const value = delta(x, y);
      if (value > bestDelta) {
        bestDelta = value;
        bestY = y;
      }
    }
    if (bestDelta >= config.minimumPixelDelta) localRows.push(bestY);
  }
  const meanY = localRows.length
    ? localRows.reduce((a, b) => a + b, 0) / localRows.length
    : null;
  const unavailable = () => ({
    status: 'unavailable',
    value: null,
    reason: 'Explicit same-frame applied consumer readback is unavailable.',
  });
  const sameFrame =
    Number.isInteger(expectedFrameId) &&
    expectedFrameId >= 0 &&
    appliedReadback?.frameId === expectedFrameId;
  const readback = (value, valid) =>
    sameFrame && valid
      ? {
          status: 'observed-readback',
          value,
          frameId: expectedFrameId,
          evidenceClass: 'caller-supplied-applied-consumer-readback',
        }
      : unavailable();
  return {
    status: 'diagnostic-only',
    measurement: classified.measurement,
    rows,
    peak,
    runnerUp,
    dominanceRatio:
      runnerUp && runnerUp.score > 0 ? peak.score / runnerUp.score : null,
    diagnosticMeanRasterY: meanY,
    diagnosticMeanCssY: meanY === null ? null : meanY / dpr,
    localColumnSupportRatio: localRows.length / (x1 - x0),
    unchangedGates: { ...config, roi: [...config.roi] },
    applied: {
      cropPlane: readback(
        appliedReadback?.cropPlaneCssY,
        Number.isFinite(appliedReadback?.cropPlaneCssY),
      ),
      effectiveWorldOpacity: readback(
        appliedReadback?.effectiveWorldOpacity,
        Number.isFinite(appliedReadback?.effectiveWorldOpacity) &&
          appliedReadback.effectiveWorldOpacity >= 0 &&
          appliedReadback.effectiveWorldOpacity <= 1,
      ),
    },
    qualification: qualification(),
  };
}
