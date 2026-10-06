/** Fill enclosed support only; exterior concavities remain open. */
function fillCandidateInterior(mask, image, bounds) {
  const exterior = new Uint8Array(mask.length);
  const queue = new Int32Array(bounds.width * bounds.height);
  let head = 0;
  let tail = 0;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const visit = (x, y) => {
    const i = y * image.width + x;
    if (!mask[i] && !exterior[i]) {
      exterior[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = bounds.x; x < right; x += 1) {
    visit(x, bounds.y);
    visit(x, bottom - 1);
  }
  for (let y = bounds.y; y < bottom; y += 1) {
    visit(bounds.x, y);
    visit(right - 1, y);
  }
  while (head < tail) {
    const i = queue[head++];
    const y = Math.floor(i / image.width);
    const x = i - y * image.width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= bounds.x && nx < right && ny >= bounds.y && ny < bottom) visit(nx, ny);
      }
    }
  }
  let filled = 0;
  for (let y = bounds.y; y < bottom; y += 1) {
    for (let x = bounds.x; x < right; x += 1) {
      const i = y * image.width + x;
      if (!mask[i] && !exterior[i]) {
        mask[i] = 1;
        filled += 1;
      }
    }
  }
  return filled;
}

/** Candidate measurement only: foreground support never self-qualifies a role. */
export function measureBackgroundSeparatedLandmark({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const samples = [];
  const bins = new Map();
  const sample = (x, y, side) => {
    const offset = (y * image.width + x) * image.channels;
    const rgb = [data[offset], data[offset + 1], data[offset + 2]];
    const key = rgb.map((value) => Math.floor(value / 4)).join(',');
    const entry = { rgb, side };
    samples.push(entry);
    const bin = bins.get(key) ?? [];
    bin.push(entry);
    bins.set(key, bin);
  };
  for (let x = roi.x; x < roi.x + roi.width; x += 1) {
    sample(x, roi.y, 'top');
    sample(x, roi.y + roi.height - 1, 'bottom');
  }
  for (let y = roi.y + 1; y < roi.y + roi.height - 1; y += 1) {
    sample(roi.x, y, 'left');
    sample(roi.x + roi.width - 1, y, 'right');
  }
  const seed = [...bins.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
  const seedColor = [0, 1, 2].map((channel) => median(seed.map((v) => v.rgb[channel])));
  // Adjacent code values must not change the evidence merely by crossing a bin.
  const dominant = samples.filter((v) => v.rgb.every((value, c) => Math.abs(value - seedColor[c]) <= 4));
  const background = [0, 1, 2].map((channel) => median(dominant.map((v) => v.rgb[channel])));
  const backgroundModel = {
    method: 'dominant-border-color-cluster-4-level-seed',
    color: background,
    sampleCount: samples.length,
    dominantSampleCount: dominant.length,
    dominantFraction: dominant.length / Math.max(samples.length, 1),
    sides: [...new Set(dominant.map((v) => v.side))].sort(),
    minimum: [0, 1, 2].map((c) => Math.min(...dominant.map((v) => v.rgb[c]))),
    maximum: [0, 1, 2].map((c) => Math.max(...dominant.map((v) => v.rgb[c]))),
    uncertaintyDistanceRgb: 4,
    scope: 'candidate pale-blue-background frames only; not independently qualified',
  };
  const blocked = (reason) => ({
    measurement: { status: 'blocked', label: config.label, reason },
    debug: { mask: new Uint8Array(image.width * image.height), bounds: roi },
    backgroundModel,
    qualification: { status: 'blocked', reason: 'Independent subject/background qualification is missing.' },
  });
  // A foreground-dominated border cannot be used as a background oracle.
  // This bounded candidate applies only to the audited pale-blue background.
  if (
    backgroundModel.dominantFraction < 0.5 ||
    backgroundModel.sides.length !== 4 ||
    background[2] - background[0] < 16 ||
    background[2] - background[1] < 2
  ) return blocked('A dominant pale-blue background is not established on all ROI sides.');
  let uncertainPixels = 0;
  const distance = (rgb) => Math.sqrt(rgb.reduce((sum, value, c) => {
    const delta = Math.max(backgroundModel.minimum[c] - value, 0, value - backgroundModel.maximum[c]);
    return sum + delta * delta;
  }, 0));
  const foregroundPredicate = {
    id: 'background-separated-' + config.predicate.id,
    description: config.predicate.description + '; outside measured border-color interval plus a 4-RGB-unit uncertainty band',
    test(red, green, blue) {
      return config.predicate.test(red, green, blue) && distance([red, green, blue]) > 4;
    },
  };
  for (let y = roi.y; y < roi.y + roi.height; y += 1) {
    for (let x = roi.x; x < roi.x + roi.width; x += 1) {
      const offset = (y * image.width + x) * image.channels;
      const rgb = [data[offset], data[offset + 1], data[offset + 2]];
      const delta = distance(rgb);
      if (config.predicate.test(...rgb) && delta > 0 && delta <= 4) uncertainPixels += 1;
    }
  }
  const candidateConfig = { ...config, predicate: foregroundPredicate };
  const mask = createPredicateMask(data, image, roi, foregroundPredicate);
  const { components } = connectedComponents(mask, image.width, image.height, roi);
  const eligible = components.filter((c) =>
    c.pixels >= config.minimumComponentPixels && c.pixels >= config.minimumSelectedPixels &&
    c.pixels <= config.maximumComponentPixels && c.bounds.width <= config.maximumComponentWidth &&
    c.bounds.height <= config.maximumComponentHeight &&
    c.pixels / (c.bounds.width * c.bounds.height) >= config.minimumComponentFillRatio);
  const result = measureLandmarkFeature({ data, image, dpr, config: candidateConfig });
  const filledInteriorPixels = result.measurement.status === 'observed'
    ? fillCandidateInterior(result.debug.mask, image, result.debug.bounds) : 0;
  if (result.measurement.status === 'observed') {
    const support = boundsFromMask(result.debug.mask, image.width, image.height);
    result.measurement.pixelSupport = support.pixels;
    result.measurement.method = {
      ...result.measurement.method,
      candidateInteriorFill: 'enclosed-zero-support-8-neighbor',
    };
    if (support.pixels > config.maximumComponentPixels) {
      result.measurement.status = 'blocked';
      result.measurement.reason = 'Filled candidate subject exceeds the unchanged maximum support gate.';
    }
  }
  const quality = assessChromaSelection({ data, image, config: candidateConfig, mask: result.debug.mask, bounds: result.debug.bounds });
  if (eligible.length > 1) {
    result.measurement = {
      ...result.measurement, status: 'blocked',
      reason: 'Several eligible foreground components make the landmark role ambiguous.',
    };
  }
  return {
    ...result,
    debug: { ...result.debug, quality },
    backgroundModel,
    foregroundEvidence: { uncertaintyBandPixels: uncertainPixels, eligibleSubjectCount: eligible.length, filledInteriorPixels },
    qualification: {
      status: 'blocked',
      reason: 'Candidate color support is not an independently qualified complete semantic silhouette.',
    },
  };
}
