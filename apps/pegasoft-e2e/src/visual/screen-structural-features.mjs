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

const CYAN_ROUTE = Object.freeze({
  id: 'cyan-route',
  description:
    'b-r >= 70, g-r >= 40, b >= 180, g >= 135, and r <= 205 in 8-bit sRGB',
  test(red, green, blue) {
    return (
      blue - red >= 70 &&
      green - red >= 40 &&
      blue >= 180 &&
      green >= 135 &&
      red <= 205
    );
  },
});

const RED_ROUTE = Object.freeze({
  id: 'red-route',
  description: 'r-g >= 55, r-b >= 35, r >= 180, and g <= 195 in 8-bit sRGB',
  test(red, green, blue) {
    return red - green >= 55 && red - blue >= 35 && red >= 180 && green <= 195;
  },
});

const DEEP_BLUE = Object.freeze({
  id: 'deep-blue',
  description: 'b-r >= 55, b-g >= 25, b >= 120, and r <= 150 in 8-bit sRGB',
  test(red, green, blue) {
    return blue - red >= 55 && blue - green >= 25 && blue >= 120 && red <= 150;
  },
});

export const LANDMARK_CONFIG_BY_STATE = Object.freeze({
  'loader-mark': Object.freeze({
    label: 'central blue loader mark',
    method: 'chroma-component-union',
    predicate: DEEP_BLUE,
    roi: Object.freeze([0.3, 0.28, 0.4, 0.48]),
    minimumComponentPixels: 24,
    minimumSelectedPixels: 300,
    rationale:
      'The manifest identifies the saturated blue loader mark as the central focus. The ROI excludes contour-only margins and the recorded pointer without constraining the resulting box.',
  }),
  'world-reveal': Object.freeze({
    label: 'central blue loader mark during world reveal',
    method: 'chroma-component-union',
    predicate: DEEP_BLUE,
    roi: Object.freeze([0.3, 0.2, 0.4, 0.5]),
    minimumComponentPixels: 24,
    minimumSelectedPixels: 300,
    rationale:
      'The blue loader mark remains the only saturated-blue central landmark while the pale world emerges. The ROI excludes the red rails and peripheral scene objects.',
  }),
  'field-pulse-b': Object.freeze({
    label: 'elevated blue center tile',
    method: 'largest-chroma-component',
    predicate: DEEP_BLUE,
    roi: Object.freeze([0.35, 0.25, 0.3, 0.5]),
    minimumComponentPixels: 120,
    minimumSelectedPixels: 1200,
    rationale:
      'The elevated saturated-blue center tile is the stable primary landmark named by the manifest. The later outer pulse band remains a separate effect and is not included in this silhouette box.',
  }),
  'arrival-lockup': Object.freeze({
    label: 'large frontal arrival arrow',
    method: 'largest-dilated-sobel-component',
    roi: Object.freeze([0.385, 0.24, 0.17, 0.48]),
    sobelThreshold: 72,
    dilationIterations: 4,
    minimumComponentPixels: 1200,
    minimumSelectedPixels: 900,
    rationale:
      'The manifest identifies the frontal arrow as the primary landmark. A narrow semantic ROI excludes process copy, header, most of the incoming feed, and surrounding marks; the layered arrow is the largest connected edge structure inside it.',
  }),
});

export const IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE = Object.freeze(
  {
    'activation-route': Object.freeze({
      status: 'blocked',
      label: 'first-destination building before route contact',
      reason:
        'The authoritative semantic mask is hash-tied to the recording frame and cannot classify implementation pixels. A renderer-independent implementation silhouette measurement is required.',
      method: Object.freeze({
        id: 'implementation-semantic-isolation-required',
        sourceMethod: 'source-semantic-mask',
      }),
    }),
    'activation-contact': Object.freeze({
      status: 'blocked',
      label: 'logo-bearing first-destination building at route contact',
      reason:
        'The authoritative semantic mask is hash-tied to the recording frame and cannot classify implementation pixels. A renderer-independent implementation silhouette measurement is required.',
      method: Object.freeze({
        id: 'implementation-semantic-isolation-required',
        sourceMethod: 'source-semantic-mask',
      }),
    }),
    'field-contact': Object.freeze({
      status: 'blocked',
      label: 'elevated center tile and standing figure at first contact',
      reason:
        'The authoritative semantic mask is hash-tied to the recording frame and cannot classify implementation pixels. A renderer-independent implementation silhouette measurement is required.',
      method: Object.freeze({
        id: 'implementation-semantic-isolation-required',
        sourceMethod: 'source-semantic-mask',
      }),
    }),
  },
);

export const ROUTE_CONFIG_BY_STATE = Object.freeze({
  'world-reveal': Object.freeze({
    label: 'visible high-chroma core of emerging red landing rails',
    method: 'chroma-component-union',
    predicate: RED_ROUTE,
    roi: Object.freeze([0.34, 0.58, 0.34, 0.42]),
    minimumComponentPixels: 20,
    minimumSelectedPixels: 180,
    rationale:
      'The lower-center ROI contains the source-visible emerging red rails while excluding the blue loader mark and unrelated pale world geometry. Only visible saturated route pixels are reported; the bottom-clipped continuation remains outside the measurement.',
  }),
  'landing-idle': Object.freeze({
    label: 'visible high-chroma core of landing-idle red route',
    method: 'chroma-component-union',
    predicate: RED_ROUTE,
    roi: Object.freeze([0.2, 0.54, 0.52, 0.46]),
    minimumComponentPixels: 20,
    minimumSelectedPixels: 120,
    rationale:
      'The same lower journey band captures the saturated landing route at the later local-clock phase. It remains route evidence and is not substituted for the blocked industrial aggregate landmark.',
  }),
  'activation-route': Object.freeze({
    label: 'visible high-chroma core of parallel red activation rails',
    method: 'chroma-component-union',
    predicate: RED_ROUTE,
    roi: Object.freeze([0.24, 0, 0.5, 0.76]),
    minimumComponentPixels: 80,
    minimumSelectedPixels: 1500,
    rationale:
      'The source-visible activation network is a separated bundle of saturated red rails. Unioning qualifying components preserves the parallel structure and branch handoffs without using the destination mask or ground shadows.',
  }),
  'activation-contact': Object.freeze({
    label: 'visible high-chroma core of red activation contact rails',
    method: 'chroma-component-union',
    predicate: RED_ROUTE,
    roi: Object.freeze([0.08, 0, 0.44, 0.53]),
    minimumComponentPixels: 80,
    minimumSelectedPixels: 1200,
    rationale:
      'The upper-left-to-contact ROI isolates the saturated parallel rail bundle as it reaches the destination. The building silhouette and blue logo are excluded by the red predicate.',
  }),
  'clearance-travel': Object.freeze({
    label: 'high-chroma core of connected cyan clearance route',
    method: 'largest-chroma-component',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.1, 0.66, 0.52]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The source record defines route direction as the observable focus. The saturated cyan route is connected, while the ambient dotted wake is split into smaller components.',
  }),
  'clearance-field-preview': Object.freeze({
    label: 'high-chroma core of cyan route approaching the field preview',
    method: 'chroma-component-union',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0.12, 0.4, 0.58, 0.5]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The ROI follows the lower transit band named by the manifest and excludes the top-right field tiles. Qualifying-component support preserves source-visible beam segments split by copy/white core while rejecting the smaller dotted wake.',
  }),
  'field-approach': Object.freeze({
    label: 'visible high-chroma core of cyan field-approach feed',
    method: 'chroma-component-union',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.44, 0.72, 0.46]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The lower transit band isolates the cyan approach feed from the top-right field tiles. Unioning only supported components preserves beam sections split by copy/white core while rejecting the dotted wake and small tile reactions.',
  }),
  'field-contact': Object.freeze({
    label: 'visible high-chroma core of cyan route before field contact',
    method: 'chroma-component-union',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.44, 0.48, 0.42]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The ROI ends before the elevated center so supported incoming-feed components remain measurable without merging contact glow or adjacent reacting tiles into the route core.',
  }),
  'field-pulse-a': Object.freeze({
    label: 'visible high-chroma core of incoming cyan feed during inner pulse',
    method: 'chroma-component-union',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.43, 0.45, 0.3]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The left-side ROI unions supported sections of the still-readable incoming feed before it merges with the inner bloom. The occluded center, smaller dotted wake, and luminous pulse remain outside route evidence.',
  }),
  'field-pulse-b': Object.freeze({
    label: 'visible high-chroma core of incoming cyan feed during outer pulse',
    method: 'chroma-component-union',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.43, 0.45, 0.3]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The same left-side transit ROI unions supported incoming-feed sections while excluding the outer tile reaction, smaller dotted wake, and elevated blue center landmark.',
  }),
  'arrival-travel': Object.freeze({
    label: 'high-chroma core of second horizontal cyan route',
    method: 'largest-chroma-component',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.36, 0.62, 0.28]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The destination is beyond the right edge in this anchor, so the horizontal feed is the only measurable source-confirmed travel structure. The ROI excludes header and process copy.',
  }),
  'arrival-lockup': Object.freeze({
    label: 'visible high-chroma core of cyan arrival feed before the arrow',
    method: 'largest-chroma-component',
    predicate: CYAN_ROUTE,
    roi: Object.freeze([0, 0.37, 0.4, 0.2]),
    minimumComponentPixels: 180,
    minimumSelectedPixels: 180,
    rationale:
      'The left horizontal band isolates the saturated arrival feed before it reaches the layered arrow. Arrow edges, surrounding marks, copy, and the glow field lie outside the selected core.',
  }),
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

function dilate(mask, width, roi, iterations) {
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

  const angle = 0.5 * Math.atan2(2 * covarianceXY, covarianceXX - covarianceYY);
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

export function measureChromaFeature({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const { components } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
  const eligibleComponents = components.filter(
    (component) =>
      component.pixels >= config.minimumComponentPixels &&
      component.pixels <=
        (config.maximumComponentPixels ?? Number.POSITIVE_INFINITY) &&
      component.bounds.width <=
        (config.maximumComponentWidth ?? Number.POSITIVE_INFINITY) &&
      component.bounds.height <=
        (config.maximumComponentHeight ?? Number.POSITIVE_INFINITY) &&
      component.pixels / (component.bounds.width * component.bounds.height) >=
        (config.minimumComponentFillRatio ?? 0),
  );
  const selectedComponents =
    config.method === 'largest-chroma-component'
      ? eligibleComponents
          .slice()
          .sort(
            (left, right) =>
              right.pixels - left.pixels ||
              left.bounds.y - right.bounds.y ||
              left.bounds.x - right.bounds.x,
          )
          .slice(0, 1)
      : eligibleComponents;
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
      geometry: deriveRouteCoreGeometry(
        selectedMask,
        image.width,
        image.height,
        dpr,
      ),
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
        maximumComponentPixels: config.maximumComponentPixels ?? null,
        maximumComponentWidth: config.maximumComponentWidth ?? null,
        maximumComponentHeight: config.maximumComponentHeight ?? null,
        minimumComponentFillRatio: config.minimumComponentFillRatio ?? null,
        minimumSelectedPixels: config.minimumSelectedPixels,
        totalComponentCount: components.length,
        eligibleComponentCount: eligibleComponents.length,
        selectedComponentCount: selectedComponents.length,
        semanticMask: null,
        rationale: config.rationale,
      },
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
  };
}

export function measureLandmarkFeature({ data, image, dpr, config }) {
  if (
    config.method === 'chroma-component-union' ||
    config.method === 'largest-chroma-component'
  ) {
    const result = measureChromaFeature({ data, image, dpr, config });
    return {
      ...result,
      measurement:
        result.measurement.status === 'observed'
          ? { ...result.measurement, geometry: null }
          : result.measurement,
    };
  }

  if (config.method !== 'largest-dilated-sobel-component') {
    throw new Error(
      `Unsupported landmark measurement method: ${config.method}`,
    );
  }

  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const originalMask = createSobelMask(data, image, roi, config.sobelThreshold);
  const dilatedMask = dilate(
    originalMask,
    image.width,
    roi,
    config.dilationIterations,
  );
  const { components, labels } = connectedComponents(
    dilatedMask,
    image.width,
    image.height,
    roi,
  );
  const eligibleComponents = components
    .filter((component) => component.pixels >= config.minimumComponentPixels)
    .sort(
      (left, right) =>
        right.pixels - left.pixels ||
        left.bounds.y - right.bounds.y ||
        left.bounds.x - right.bounds.x,
    );
  const selectedComponent = eligibleComponents[0] ?? null;
  const selectedMask = new Uint8Array(originalMask.length);

  if (selectedComponent) {
    for (let index = 0; index < originalMask.length; index += 1) {
      if (originalMask[index] && labels[index] === selectedComponent.label) {
        selectedMask[index] = 1;
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
        predicate: null,
        sobelThreshold: config.sobelThreshold,
        dilationIterations: config.dilationIterations,
        connectivity: 8,
        minimumComponentPixels: config.minimumComponentPixels,
        maximumComponentPixels: null,
        maximumComponentWidth: null,
        maximumComponentHeight: null,
        minimumComponentFillRatio: null,
        minimumSelectedPixels: config.minimumSelectedPixels,
        totalComponentCount: components.length,
        eligibleComponentCount: eligibleComponents.length,
        selectedComponentCount: selectedComponent ? 1 : 0,
        semanticMask: null,
        rationale: config.rationale,
      },
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
  };
}

export function measureCopyInk({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const { components } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
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
