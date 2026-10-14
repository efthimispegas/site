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

const BRIGHT_CYAN_IMPLEMENTATION_ROUTE = Object.freeze({
  id: 'bright-cyan-implementation-route',
  description:
    'g >= 230, b >= 230, and either g-r >= 5 or b-r >= 5 in 8-bit sRGB',
  test(red, green, blue) {
    return green >= 230 && blue >= 230 && (green - red >= 5 || blue - red >= 5);
  },
});

const DEEP_BLUE = Object.freeze({
  id: 'deep-blue',
  description: 'b-r >= 55, b-g >= 25, b >= 120, and r <= 150 in 8-bit sRGB',
  test(red, green, blue) {
    return blue - red >= 55 && blue - green >= 25 && blue >= 120 && red <= 150;
  },
});

const BLUE_VIOLET_FIELD_CENTER = Object.freeze({
  id: 'blue-violet-field-center',
  description: 'b-r >= 25, b-g >= 35, b >= 150, and g <= 205 in 8-bit sRGB',
  test(red, green, blue) {
    return (
      blue - red >= 25 && blue - green >= 35 && blue >= 150 && green <= 205
    );
  },
});

const BRIGHT_NEUTRAL_TILE_TOP = Object.freeze({
  id: 'bright-neutral-field-tile-top',
  description:
    'r >= 210, g >= 210, b >= 215, b-r <= 24, and max(r,g,b)-min(r,g,b) <= 28 in 8-bit sRGB',
  test(red, green, blue) {
    return (
      red >= 210 &&
      green >= 210 &&
      blue >= 215 &&
      blue - red <= 24 &&
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 28
    );
  },
});

const PALE_NEUTRAL_STRUCTURE = Object.freeze({
  id: 'pale-neutral-structure',
  description:
    'r,g,b >= 125, b-r <= 28, b-g <= 14, and max(r,g,b)-min(r,g,b) <= 28 in 8-bit sRGB',
  test(red, green, blue) {
    return (
      red >= 125 &&
      green >= 125 &&
      blue >= 125 &&
      blue - red <= 28 &&
      blue - green <= 14 &&
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 28
    );
  },
});

const PALE_NEUTRAL_FIGURE = Object.freeze({
  id: 'pale-neutral-contact-figure',
  description:
    '100 <= r <= 245, g >= r-4, b >= g-4, and 4 <= b-r <= 38 in 8-bit sRGB',
  test(red, green, blue) {
    return (
      red >= 100 &&
      red <= 245 &&
      green >= red - 4 &&
      blue >= green - 4 &&
      blue - red >= 4 &&
      blue - red <= 38
    );
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
    label: 'elevated blue-violet center tile',
    method: 'largest-chroma-component',
    predicate: BLUE_VIOLET_FIELD_CENTER,
    roi: Object.freeze([0.35, 0.25, 0.3, 0.5]),
    minimumComponentPixels: 120,
    minimumSelectedPixels: 1200,
    rationale:
      'The elevated saturated blue/violet center tile is the stable primary landmark named by the manifest. The predicate admits the reference blue and implementation violet material while rejecting the cyan pulse band; the later outer pulse remains a separate effect.',
  }),
});

export const IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE = Object.freeze({
  'activation-route': Object.freeze({
    label: 'first-destination building before route contact',
    method: 'largest-neutral-structure-component',
    predicate: PALE_NEUTRAL_STRUCTURE,
    roi: Object.freeze([0.525, 0.55, 0.225, 0.445]),
    minimumComponentPixels: 500,
    maximumComponentPixels: 260000,
    maximumComponentWidth: 700,
    maximumComponentHeight: 650,
    minimumComponentFillRatio: 0.08,
    minimumSelectedPixels: 70000,
    sourceMethod: 'source-semantic-mask',
    rationale:
      'The implementation-only ROI contains the complete destination building in the locked localhost composition while excluding process copy and most surrounding world context. A neutral RGB predicate rejects the pale-blue ground, red route, and blue logo; component support and size gates retain only filled implementation building surfaces. The independently measured result is compared with the source mask without transferring source geometry into this classifier.',
  }),
  'activation-contact': Object.freeze({
    label: 'logo-bearing first-destination building at route contact',
    method: 'largest-neutral-structure-component',
    predicate: PALE_NEUTRAL_STRUCTURE,
    roi: Object.freeze([0.42, 0.25, 0.25, 0.47]),
    minimumComponentPixels: 500,
    maximumComponentPixels: 180000,
    maximumComponentWidth: 700,
    maximumComponentHeight: 650,
    minimumComponentFillRatio: 0.08,
    minimumSelectedPixels: 70000,
    sourceMethod: 'source-semantic-mask',
    rationale:
      'The implementation-only contact ROI follows the complete destination building in the locked localhost composition. The renderer-independent neutral predicate and component gates exclude the red route, blue logo, pale-blue ground, and small workers without reusing source mask geometry.',
  }),
  'field-contact': Object.freeze({
    label: 'elevated center tile and standing figure at first contact',
    method: 'seeded-contact-subject-union',
    predicate: BLUE_VIOLET_FIELD_CENTER,
    figurePredicate: PALE_NEUTRAL_FIGURE,
    roi: Object.freeze([0.4, 0.25, 0.22, 0.45]),
    minimumComponentPixels: 120,
    minimumSelectedPixels: 1200,
    figureRoi: Object.freeze({
      xInsetRatio: 0.25,
      widthRatio: 0.5,
      topExtensionRatio: 0.75,
      bottomRatio: 0.75,
    }),
    minimumFigureComponentPixels: 40,
    maximumFigureComponentPixels: 3000,
    maximumFigureWidthRatio: 0.4,
    maximumFigureHeightRatio: 0.9,
    maximumFigureCenterDeltaRatio: 0.2,
    maximumFigureRootGapPixels: 8,
    minimumFigureSelectedPixels: 80,
    sourceMethod: 'source-semantic-mask',
    rationale:
      'The saturated tile is selected first with the shared blue/violet predicate. A second neutral predicate is evaluated only in a tile-relative center strip; component size, width, height, center, and root-contact gates isolate the standing figure while rejecting adjacent field tiles and glow. The resulting implementation-only union never applies the source mask to localhost pixels.',
  }),
  'arrival-lockup': Object.freeze({
    label: 'large frontal arrival arrow',
    method: 'largest-neutral-structure-component',
    predicate: PALE_NEUTRAL_STRUCTURE,
    roi: Object.freeze([0.396, 0.24, 0.16, 0.48]),
    minimumComponentPixels: 500,
    maximumComponentPixels: 180000,
    maximumComponentWidth: 600,
    maximumComponentHeight: 700,
    minimumComponentFillRatio: 0.08,
    minimumSelectedPixels: 20000,
    sourceMethod: 'source-semantic-mask',
    rationale:
      'The implementation-only ROI contains the complete localhost arrival arrow while excluding the incoming feed and surrounding square/diamond marks. A renderer-independent neutral predicate rejects the pale-blue background and cyan bloom; component support and geometry gates retain the filled arrow without applying the source silhouette to localhost pixels.',
  }),
});

const FIELD_TILE_COMPONENT_GATES = Object.freeze({
  minimumComponentPixels: 5000,
  maximumComponentPixels: 26000,
  minimumComponentWidth: 100,
  maximumComponentWidth: 230,
  minimumComponentHeight: 70,
  maximumComponentHeight: 180,
  minimumComponentFillRatio: 0.5,
  maximumComponentFillRatio: 0.78,
});

function fieldTileProfileConfig({ roi, minimumSelectedComponents, rationale }) {
  return Object.freeze({
    label: 'visible bright-neutral field tile-top profile',
    method: 'bright-neutral-tile-component-union',
    predicate: BRIGHT_NEUTRAL_TILE_TOP,
    roi: Object.freeze(roi),
    ...FIELD_TILE_COMPONENT_GATES,
    minimumSelectedComponents,
    rationale,
  });
}

export const FIELD_TILE_PROFILE_CONFIG_BY_STATE = Object.freeze({
  'clearance-field-preview': fieldTileProfileConfig({
    roi: [0.8, 0.02, 0.195, 0.34],
    minimumSelectedComponents: 5,
    rationale:
      'The upper-right ROI follows only the first source-visible field fragment. Full bright-neutral tile tops are counted; viewport-clipped tiles and the header controls are rejected by the component geometry gates.',
  }),
  'field-approach': fieldTileProfileConfig({
    roi: [0.61, 0.02, 0.385, 0.62],
    minimumSelectedComponents: 20,
    rationale:
      'The upper-right ROI isolates the source-visible field from industrial context, process copy, and the incoming route. Only full bright-neutral tile-top components qualify.',
  }),
  'field-contact': fieldTileProfileConfig({
    roi: [0.18, 0.03, 0.815, 0.95],
    minimumSelectedComponents: 50,
    rationale:
      'The broad journey ROI encloses the contact field while excluding most process copy. Component geometry gates reject the route, header controls, and small scene props; the activated center is intentionally absent from the neutral-tile profile.',
  }),
  'field-pulse-a': fieldTileProfileConfig({
    roi: [0.18, 0.03, 0.815, 0.95],
    minimumSelectedComponents: 35,
    rationale:
      'The contact-camera ROI measures neutral tile tops that remain readable during the inner pulse. Tiles recolored or obscured by the pulse are intentionally absent, making selected-component count part of the observed reaction profile.',
  }),
  'field-pulse-b': fieldTileProfileConfig({
    roi: [0.18, 0.03, 0.815, 0.95],
    minimumSelectedComponents: 15,
    rationale:
      'The contact-camera ROI measures neutral tile tops that remain readable during the outer pulse. Recolored outer tiles and the saturated center are intentionally absent, so the surviving component mask records the source pulse profile without inferring hidden tiles.',
  }),
});

export const FIELD_CONTACT_CENTER_CONFIG_BY_STATE = Object.freeze({
  'field-contact': Object.freeze({
    label: 'saturated field contact center tile',
    method: 'largest-chroma-component',
    predicate: BLUE_VIOLET_FIELD_CENTER,
    roi: Object.freeze([0.35, 0.25, 0.3, 0.5]),
    minimumComponentPixels: 120,
    minimumSelectedPixels: 1200,
    rationale:
      'The saturated center tile is independently measurable in both rasters and records the contact center without borrowing the source semantic mask. This tile-only chroma observable does not replace the authoritative tile-plus-standing-figure landmark union.',
  }),
});

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

function implementationRouteConfig(stateKey) {
  const sourceConfig = ROUTE_CONFIG_BY_STATE[stateKey];
  return Object.freeze({
    ...sourceConfig,
    predicate: BRIGHT_CYAN_IMPLEMENTATION_ROUTE,
    sourcePredicate: sourceConfig.predicate.id,
    rationale:
      'The locked localhost route renders as a bright near-white cyan core rather than the source saturated cyan. The authoritative state ROI and component-selection mode identify the visible route role, while this renderer-independent RGB predicate classifies localhost pixels without borrowing source-selected pixels or inferred renderer splines.',
  });
}

export const IMPLEMENTATION_ROUTE_CONFIG_BY_STATE = Object.freeze({
  'clearance-travel': implementationRouteConfig('clearance-travel'),
  'clearance-field-preview': implementationRouteConfig(
    'clearance-field-preview',
  ),
  'field-approach': implementationRouteConfig('field-approach'),
  'field-contact': implementationRouteConfig('field-contact'),
  'field-pulse-a': implementationRouteConfig('field-pulse-a'),
  'field-pulse-b': implementationRouteConfig('field-pulse-b'),
  'arrival-travel': implementationRouteConfig('arrival-travel'),
  'arrival-lockup': implementationRouteConfig('arrival-lockup'),
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

export const ARRIVAL_TRAVEL_COPY_CONFIG = Object.freeze({
  ...PROCESS_COPY_CONFIG,
  label:
    'visible dark process-ladder ink envelope during faded-body arrival travel',
  roi: Object.freeze([0.042, 0.52, 0.39, 0.31]),
  minimumSelectedPixels: 1500,
  rationale:
    'The arrival-travel source frame deliberately fades the active body copy while retaining dark step labels and headings. The fixed left-column ROI measures only dark-neutral ink that is actually visible at this frame; it neither lowers the predicate into similarly valued field geometry nor borrows the later arrival-lockup envelope.',
});

export const JOURNEY_EXIT_COPY_CONFIG = Object.freeze({
  ...PROCESS_COPY_CONFIG,
  label: 'visible lower process-ladder ink below the fixed-header band',
  roi: Object.freeze([0.042, 0.08, 0.39, 0.42]),
  minimumSelectedPixels: 1500,
  rationale:
    'The exiting ladder crosses the fixed header, so the top 8% of the raster is censored from copy classification. The remaining ROI measures only the directly visible lower ladder and body above the section handoff; it does not infer the overlapped upper rows or admit the following-section headline.',
});

export const COPY_CONFIG_BY_STATE = Object.freeze({
  landing: LANDING_COPY_CONFIG,
  'landing-idle': LANDING_COPY_CONFIG,
  'activation-route': PROCESS_COPY_CONFIG,
  'activation-contact': PROCESS_COPY_CONFIG,
  'clearance-travel': PROCESS_COPY_CONFIG,
  'clearance-field-preview': PROCESS_COPY_CONFIG,
  'field-approach': PROCESS_COPY_CONFIG,
  'field-contact': PROCESS_COPY_CONFIG,
  'field-pulse-a': PROCESS_COPY_CONFIG,
  'field-pulse-b': PROCESS_COPY_CONFIG,
  'arrival-travel': ARRIVAL_TRAVEL_COPY_CONFIG,
  'arrival-lockup': PROCESS_COPY_CONFIG,
  'journey-exit': JOURNEY_EXIT_COPY_CONFIG,
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
  const rounded = Math.round(value * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
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

export function deriveRouteCenterlineMask({ mask, width, height, bounds }) {
  if (
    !(mask instanceof Uint8Array) ||
    mask.length !== width * height ||
    !Number.isSafeInteger(width) ||
    width <= 0 ||
    !Number.isSafeInteger(height) ||
    height <= 0 ||
    !Number.isSafeInteger(bounds?.x) ||
    bounds.x < 0 ||
    !Number.isSafeInteger(bounds?.y) ||
    bounds.y < 0 ||
    !Number.isSafeInteger(bounds?.width) ||
    bounds.width <= 0 ||
    !Number.isSafeInteger(bounds?.height) ||
    bounds.height <= 0 ||
    bounds.x + bounds.width > width ||
    bounds.y + bounds.height > height
  ) {
    throw new Error(
      'Route centerline extraction requires a valid binary mask and bounds.',
    );
  }

  const centerline = new Uint8Array(mask);
  const removals = new Int32Array(bounds.width * bounds.height);
  const left = Math.max(bounds.x, 1);
  const top = Math.max(bounds.y, 1);
  const right = Math.min(bounds.x + bounds.width, width - 1);
  const bottom = Math.min(bounds.y + bounds.height, height - 1);

  function collectRemovals(step) {
    let removalCount = 0;

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const index = y * width + x;
        if (!centerline[index]) {
          continue;
        }

        const north = centerline[index - width];
        const northEast = centerline[index - width + 1];
        const east = centerline[index + 1];
        const southEast = centerline[index + width + 1];
        const south = centerline[index + width];
        const southWest = centerline[index + width - 1];
        const west = centerline[index - 1];
        const northWest = centerline[index - width - 1];
        const neighborCount =
          north +
          northEast +
          east +
          southEast +
          south +
          southWest +
          west +
          northWest;
        if (neighborCount < 2 || neighborCount > 6) {
          continue;
        }

        const transitions =
          Number(!north && northEast) +
          Number(!northEast && east) +
          Number(!east && southEast) +
          Number(!southEast && south) +
          Number(!south && southWest) +
          Number(!southWest && west) +
          Number(!west && northWest) +
          Number(!northWest && north);
        if (transitions !== 1) {
          continue;
        }

        const removesRequiredConnection =
          step === 0
            ? (north && east && south) || (east && south && west)
            : (north && east && west) || (north && south && west);
        if (!removesRequiredConnection) {
          removals[removalCount] = index;
          removalCount += 1;
        }
      }
    }

    return removalCount;
  }

  let changed;
  do {
    changed = false;
    for (let step = 0; step < 2; step += 1) {
      const removalCount = collectRemovals(step);
      changed ||= removalCount > 0;
      for (let index = 0; index < removalCount; index += 1) {
        centerline[removals[index]] = 0;
      }
    }
  } while (changed);

  return centerline;
}

export function measureChromaFeature({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const { components, labels } = connectedComponents(
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
    config.method === 'largest-chroma-component' ||
    config.method === 'largest-neutral-structure-component'
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
        if (labels[index] === component.label) {
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
          ...(config.sourcePredicate
            ? { sourcePredicate: config.sourcePredicate }
            : {}),
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
        ...(config.sourcePredicate
          ? { sourcePredicate: config.sourcePredicate }
          : {}),
        rationale: config.rationale,
      },
    },
    debug: {
      mask: selectedMask,
      bounds: selected.bounds,
      quality: assessChromaSelection({
        data,
        image,
        config,
        mask: selectedMask,
        bounds: selected.bounds,
      }),
    },
  };
}

/** Quality concerns do not erase measurements: they prevent uncertain masks accepting a subject. */
export function assessChromaSelection({ data, image, config, mask, bounds }) {
  const reasons = [];
  if (!bounds || !mask?.some(Boolean)) {
    return {
      status: 'blocked',
      reasons: ['Missing selected subject.'],
      quantity: 'selected-color-support',
    };
  }
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  let selected = 0;
  let lowChroma = 0;
  let touchesBoundary = false;
  const horizontal = bounds.width >= bounds.height;
  const crossSections = new Map();
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const index = y * image.width + x;
      if (!mask[index]) continue;
      selected += 1;
      const offset = index * image.channels;
      const channels = [data[offset], data[offset + 1], data[offset + 2]];
      if (Math.max(...channels) - Math.min(...channels) < 40) lowChroma += 1;
      if (
        x <= roi.x ||
        y <= roi.y ||
        x >= roi.x + roi.width - 1 ||
        y >= roi.y + roi.height - 1
      )
        touchesBoundary = true;
      const axis = horizontal ? x : y;
      const cross = horizontal ? y : x;
      const previous = crossSections.get(axis);
      crossSections.set(
        axis,
        previous
          ? [Math.min(previous[0], cross), Math.max(previous[1], cross)]
          : [cross, cross],
      );
    }
  }
  if (touchesBoundary)
    reasons.push(
      'Selected subject reaches the ROI/image boundary; full-subject extent is not established.',
    );
  const widths = [...crossSections.values()]
    .map(([min, max]) => max - min + 1)
    .sort((a, b) => a - b);
  const low = widths[Math.floor(widths.length * 0.1)] ?? 0;
  const high =
    widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.9))] ?? 0;
  const routePredicate = /route/.test(config.predicate.id);
  if (routePredicate && lowChroma / Math.max(selected, 1) > 0.2)
    reasons.push(
      'Near-neutral selected pixels cannot distinguish route core from bright tiles/glow.',
    );
  if (routePredicate && high > Math.max(low * 2.5, low + 4))
    reasons.push(
      'Cross-section variation admits a branch/contact/pulse union; equivalent core thickness is ambiguous.',
    );
  return {
    status: reasons.length ? 'blocked' : 'qualified',
    reasons,
    quantity: 'selected-color-support',
    lowChromaFraction: lowChroma / Math.max(selected, 1),
    crossSectionP10: low,
    crossSectionP90: high,
    touchesBoundary,
    physicalRadiusMeasured: false,
    glowEnvelopeMeasured: false,
  };
}

/** Core/glow challenge diagnostic. Hue-band ambiguity must not be accepted as a physical-width measurement. */
export function measureRouteAppearanceBands({ data, image, config }) {
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  let corePixels = 0;
  let glowPixels = 0;
  let boundarySupport = 0;
  let neutralCore = 0;
  const redRoute = config.predicate.id.includes('red');
  for (let y = roi.y; y < roi.y + roi.height; y += 1)
    for (let x = roi.x; x < roi.x + roi.width; x += 1) {
      const offset = (y * image.width + x) * image.channels;
      const [r, g, b] = [data[offset], data[offset + 1], data[offset + 2]];
      const core = config.predicate.test(r, g, b);
      const hue = redRoute
        ? r - g >= 10 && r - b >= 10
        : b - r >= 10 && g - r >= 5;
      if (core) {
        corePixels += 1;
        if (Math.max(r, g, b) - Math.min(r, g, b) < 40) neutralCore += 1;
      } else if (hue) glowPixels += 1;
      if (
        (core || hue) &&
        (x === roi.x ||
          y === roi.y ||
          x === roi.x + roi.width - 1 ||
          y === roi.y + roi.height - 1)
      )
        boundarySupport += 1;
    }
  return {
    status:
      corePixels > 0 && boundarySupport === 0 && neutralCore / corePixels <= 0.2
        ? 'qualified'
        : 'blocked',
    corePixels,
    glowPixels,
    boundarySupport,
    neutralCore,
    interpretation:
      'Independent hue support outside the strict core; background/pulse/contact overlap can make it ambiguous. Neither quantity is world-space radius.',
  };
}

export function measureFieldTileProfile({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const { components, labels } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
  const selectedComponents = components.filter((component) => {
    const fillRatio =
      component.pixels / (component.bounds.width * component.bounds.height);
    return (
      component.pixels >= config.minimumComponentPixels &&
      component.pixels <= config.maximumComponentPixels &&
      component.bounds.width >= config.minimumComponentWidth &&
      component.bounds.width <= config.maximumComponentWidth &&
      component.bounds.height >= config.minimumComponentHeight &&
      component.bounds.height <= config.maximumComponentHeight &&
      fillRatio >= config.minimumComponentFillRatio &&
      fillRatio <= config.maximumComponentFillRatio
    );
  });
  const selectedMask = new Uint8Array(mask.length);

  for (const component of selectedComponents) {
    const componentRight = component.bounds.x + component.bounds.width;
    const componentBottom = component.bounds.y + component.bounds.height;
    for (let y = component.bounds.y; y < componentBottom; y += 1) {
      for (let x = component.bounds.x; x < componentRight; x += 1) {
        const index = y * image.width + x;
        if (labels[index] === component.label) {
          selectedMask[index] = 1;
        }
      }
    }
  }

  const selected = boundsFromMask(selectedMask, image.width, image.height);
  const method = {
    id: config.method,
    roiNormalized: config.roi,
    roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
    predicate: {
      id: config.predicate.id,
      description: config.predicate.description,
    },
    connectivity: 8,
    minimumComponentPixels: config.minimumComponentPixels,
    maximumComponentPixels: config.maximumComponentPixels,
    minimumComponentWidth: config.minimumComponentWidth,
    maximumComponentWidth: config.maximumComponentWidth,
    minimumComponentHeight: config.minimumComponentHeight,
    maximumComponentHeight: config.maximumComponentHeight,
    minimumComponentFillRatio: config.minimumComponentFillRatio,
    maximumComponentFillRatio: config.maximumComponentFillRatio,
    minimumSelectedComponents: config.minimumSelectedComponents,
    totalComponentCount: components.length,
    selectedComponentCount: selectedComponents.length,
    semanticMask: null,
    rationale: config.rationale,
  };

  if (
    !selected ||
    selectedComponents.length < config.minimumSelectedComponents
  ) {
    return {
      measurement: {
        status: 'blocked',
        label: config.label,
        reason: `The deterministic ${config.method} quality gate found ${selectedComponents.length} selected tile-top components; at least ${config.minimumSelectedComponents} are required.`,
        method,
      },
      debug: { mask: selectedMask, bounds: selected?.bounds ?? roi },
    };
  }

  const median = (values) => {
    const sorted = values.slice().sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  };
  const meanCenter = selectedComponents.reduce(
    (sum, component) => {
      sum.x += component.bounds.x + (component.bounds.width - 1) / 2;
      sum.y += component.bounds.y + (component.bounds.height - 1) / 2;
      return sum;
    },
    { x: 0, y: 0 },
  );
  meanCenter.x /= selectedComponents.length;
  meanCenter.y /= selectedComponents.length;
  const medianWidth = median(
    selectedComponents.map((component) => component.bounds.width),
  );
  const medianHeight = median(
    selectedComponents.map((component) => component.bounds.height),
  );
  const medianPixels = median(
    selectedComponents.map((component) => component.pixels),
  );

  return {
    measurement: {
      status: 'observed',
      evidenceClass: 'observed',
      label: config.label,
      bounds: serializeBounds(selected.bounds, image, dpr),
      pixelSupport: selected.pixels,
      componentProfile: {
        count: selectedComponents.length,
        center: {
          rasterPixels: [round(meanCenter.x), round(meanCenter.y)],
          cssPixels: [round(meanCenter.x / dpr), round(meanCenter.y / dpr)],
          normalized: [
            round(meanCenter.x / image.width, 6),
            round(meanCenter.y / image.height, 6),
          ],
        },
        medianTileTop: {
          rasterPixels: {
            width: round(medianWidth),
            height: round(medianHeight),
            selectedPixels: round(medianPixels),
          },
          cssPixels: {
            width: round(medianWidth / dpr),
            height: round(medianHeight / dpr),
            selectedPixels: round(medianPixels / (dpr * dpr)),
          },
        },
        selectedPixelOccupancy: round(
          selected.pixels / (selected.bounds.width * selected.bounds.height),
          6,
        ),
        interpretation:
          'Count and geometry describe only full bright-neutral tile-top components surviving the fixed predicate and shape gates. Viewport-clipped, activated, pulse-recolored, or bloom-obscured tiles are not inferred.',
      },
      method,
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
  };
}

function measureSeededContactSubject({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const tileResult = measureChromaFeature({
    data,
    image,
    dpr,
    config: {
      ...config,
      method: 'largest-chroma-component',
    },
  });
  const tileMeasurement = tileResult.measurement;
  const tileBounds = tileResult.debug.bounds;
  const figureX = Math.max(
    0,
    Math.floor(tileBounds.x + tileBounds.width * config.figureRoi.xInsetRatio),
  );
  const figureY = Math.max(
    0,
    Math.floor(
      tileBounds.y - tileBounds.height * config.figureRoi.topExtensionRatio,
    ),
  );
  const figureRoi = {
    x: figureX,
    y: figureY,
    width: Math.min(
      image.width - figureX,
      Math.ceil(tileBounds.width * config.figureRoi.widthRatio),
    ),
    height: 0,
  };
  figureRoi.height =
    Math.min(
      image.height,
      Math.ceil(
        tileBounds.y + tileBounds.height * config.figureRoi.bottomRatio,
      ),
    ) - figureY;
  const figureMask = createPredicateMask(
    data,
    image,
    figureRoi,
    config.figurePredicate,
  );
  const { components: figureComponents, labels: figureLabels } =
    connectedComponents(figureMask, image.width, image.height, figureRoi);
  const tileCenterX = tileBounds.x + tileBounds.width / 2;
  const maximumFigureCenterDelta =
    tileBounds.width * config.maximumFigureCenterDeltaRatio;
  const eligibleFigureComponents = figureComponents.filter((component) => {
    const centerX = component.bounds.x + component.bounds.width / 2;
    const bottom = component.bounds.y + component.bounds.height;
    return (
      component.pixels >= config.minimumFigureComponentPixels &&
      component.pixels <= config.maximumFigureComponentPixels &&
      component.bounds.width <=
        tileBounds.width * config.maximumFigureWidthRatio &&
      component.bounds.height <=
        tileBounds.height * config.maximumFigureHeightRatio &&
      Math.abs(centerX - tileCenterX) <= maximumFigureCenterDelta &&
      bottom >= tileBounds.y - config.maximumFigureRootGapPixels
    );
  });
  const selectedMask = tileResult.debug.mask.slice();
  const eligibleFigureLabels = new Set(
    eligibleFigureComponents.map((component) => component.label),
  );

  for (let index = 0; index < figureMask.length; index += 1) {
    if (figureMask[index] && eligibleFigureLabels.has(figureLabels[index])) {
      selectedMask[index] = 1;
    }
  }

  const selected = boundsFromMask(selectedMask, image.width, image.height);
  const figurePixelSupport = eligibleFigureComponents.reduce(
    (total, component) => total + component.pixels,
    0,
  );
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const method = {
    id: config.method,
    roiNormalized: config.roi,
    roiRasterPixels: [roi.x, roi.y, roi.width, roi.height],
    predicate: {
      id: config.predicate.id,
      description: config.predicate.description,
    },
    figurePredicate: {
      id: config.figurePredicate.id,
      description: config.figurePredicate.description,
    },
    figureRoi: config.figureRoi,
    figureRoiRasterPixels: [
      figureRoi.x,
      figureRoi.y,
      figureRoi.width,
      figureRoi.height,
    ],
    connectivity: 8,
    minimumComponentPixels: config.minimumComponentPixels,
    minimumSelectedPixels: config.minimumSelectedPixels,
    minimumFigureComponentPixels: config.minimumFigureComponentPixels,
    maximumFigureComponentPixels: config.maximumFigureComponentPixels,
    maximumFigureWidthRatio: config.maximumFigureWidthRatio,
    maximumFigureHeightRatio: config.maximumFigureHeightRatio,
    maximumFigureCenterDeltaRatio: config.maximumFigureCenterDeltaRatio,
    maximumFigureRootGapPixels: config.maximumFigureRootGapPixels,
    minimumFigureSelectedPixels: config.minimumFigureSelectedPixels,
    totalFigureComponentCount: figureComponents.length,
    selectedFigureComponentCount: eligibleFigureComponents.length,
    semanticMask: null,
    sourceMethod: config.sourceMethod,
    rationale: config.rationale,
  };

  if (
    tileMeasurement.status !== 'observed' ||
    !selected ||
    figurePixelSupport < config.minimumFigureSelectedPixels
  ) {
    return {
      measurement: {
        status: 'blocked',
        label: config.label,
        reason:
          tileMeasurement.status !== 'observed'
            ? `The deterministic ${config.method} tile seed is blocked: ${tileMeasurement.reason}`
            : `The deterministic ${config.method} figure gate found ${figurePixelSupport} selected pixels; at least ${config.minimumFigureSelectedPixels} are required.`,
        method,
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
      method,
    },
    debug: { mask: selectedMask, bounds: selected.bounds },
  };
}

export function measureLandmarkFeature({ data, image, dpr, config }) {
  if (
    config.method === 'chroma-component-union' ||
    config.method === 'largest-chroma-component' ||
    config.method === 'largest-neutral-structure-component'
  ) {
    const result = measureChromaFeature({ data, image, dpr, config });
    return {
      ...result,
      measurement: {
        ...result.measurement,
        ...(result.measurement.status === 'observed' ? { geometry: null } : {}),
        method: {
          ...result.measurement.method,
          ...(config.sourceMethod ? { sourceMethod: config.sourceMethod } : {}),
        },
      },
    };
  }

  if (config.method === 'seeded-contact-subject-union') {
    return measureSeededContactSubject({ data, image, dpr, config });
  }

  throw new Error(`Unsupported landmark measurement method: ${config.method}`);
}

export function measureCopyInk({ data, image, dpr, config }) {
  validateImageInput(data, image, dpr);
  const roi = normalizedRoiToPixels(config.roi, image.width, image.height);
  const mask = createPredicateMask(data, image, roi, config.predicate);
  const { components, labels } = connectedComponents(
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
        if (labels[index] === component.label) {
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
        if (nx >= bounds.x && nx < right && ny >= bounds.y && ny < bottom)
          visit(nx, ny);
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

/** Candidate veto only. Adjacency cannot assign rail/subject or feed/shaft roles. */
function assessCandidateContourAmbiguity({
  data,
  image,
  roi,
  mask,
  predicate,
}) {
  const redContourPixels = new Set();
  const redNeighborPixels = new Set();
  const externalContinuation = new Set();
  const redWitnesses = [];
  const boundaryWitnesses = [];
  let boundarySupportPixels = 0;
  let imageBoundarySupportPixels = 0;
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;
  const rgb = (index) => {
    const offset = index * image.channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  for (let y = roi.y; y < bottom; y += 1) {
    for (let x = roi.x; x < right; x += 1) {
      const index = y * image.width + x;
      if (!mask[index]) continue;
      const boundary =
        x === roi.x || x === right - 1 || y === roi.y || y === bottom - 1;
      if (boundary) boundarySupportPixels += 1;
      if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1)
        imageBoundarySupportPixels += 1;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= image.width || ny < 0 || ny >= image.height)
            continue;
          const neighbor = ny * image.width + nx;
          if (mask[neighbor]) continue;
          const color = rgb(neighbor);
          // Red dominance exceeding the existing neutral predicate's 28-unit
          // spread cap supplies an excluded-color witness, not a rail classifier
          // or a calibrated contour-error bound. Reject ambiguity; never trim.
          if (
            color[0] - Math.max(color[1], color[2]) > 28 &&
            !predicate.test(...color)
          ) {
            redContourPixels.add(index);
            redNeighborPixels.add(neighbor);
            if (redWitnesses.length < 16)
              redWitnesses.push({
                selectedPixel: [x, y],
                selectedRgb: rgb(index),
                excludedPixel: [nx, ny],
                excludedRgb: color,
              });
          }
          if (
            boundary &&
            (nx < roi.x || nx >= right || ny < roi.y || ny >= bottom) &&
            predicate.test(...color)
          ) {
            externalContinuation.add(neighbor);
            if (boundaryWitnesses.length < 16)
              boundaryWitnesses.push({
                selectedPixel: [x, y],
                selectedRgb: rgb(index),
                outsideRoiPixel: [nx, ny],
                outsideRoiRgb: color,
              });
          }
        }
      }
    }
  }
  return {
    contourAmbiguity: {
      status: redContourPixels.size ? 'blocked' : 'no-red-adjacency-observed',
      redAdjacentContourPixels: redContourPixels.size,
      excludedRedNeighborPixels: redNeighborPixels.size,
      witnesses: redWitnesses,
      policy:
        '8-neighbor excluded red-dominance >28 beside filled selected contour; conservative ambiguity veto only',
      semanticRoleAssigned: false,
      contourErrorCalibrated: false,
    },
    boundarySeparation: {
      status: boundarySupportPixels ? 'blocked' : 'not-required',
      boundarySupportPixels,
      externalContinuationPixels: externalContinuation.size,
      imageBoundarySupportPixels,
      witnesses: boundaryWitnesses,
      reason: boundarySupportPixels
        ? 'Selected support reaches the unchanged ROI boundary; attached feature and subject roles cannot be separated by this candidate.'
        : null,
      selectedOutsideRoiPixels: 0,
      semanticRoleAssigned: false,
    },
  };
}

/** Candidate measurement only: foreground support never self-qualifies a role. */
export function measureBackgroundSeparatedLandmark({
  data,
  image,
  dpr,
  config,
}) {
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
  const median = (values) =>
    values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
  const seedColor = [0, 1, 2].map((channel) =>
    median(seed.map((v) => v.rgb[channel])),
  );
  // Adjacent code values must not change the evidence merely by crossing a bin.
  const dominant = samples.filter((v) =>
    v.rgb.every((value, c) => Math.abs(value - seedColor[c]) <= 4),
  );
  const background = [0, 1, 2].map((channel) =>
    median(dominant.map((v) => v.rgb[channel])),
  );
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
    scope:
      'candidate pale-blue-background frames only; not independently qualified',
  };
  const blocked = (reason) => ({
    measurement: { status: 'blocked', label: config.label, reason },
    debug: { mask: new Uint8Array(image.width * image.height), bounds: roi },
    backgroundModel,
    qualification: {
      status: 'blocked',
      reason: 'Independent subject/background qualification is missing.',
    },
  });
  // A foreground-dominated border cannot be used as a background oracle.
  // This bounded candidate applies only to the audited pale-blue background.
  if (
    backgroundModel.dominantFraction < 0.5 ||
    backgroundModel.sides.length !== 4 ||
    background[2] - background[0] < 16 ||
    background[2] - background[1] < 2
  )
    return blocked(
      'A dominant pale-blue background is not established on all ROI sides.',
    );
  let uncertainPixels = 0;
  const distance = (rgb) =>
    Math.sqrt(
      rgb.reduce((sum, value, c) => {
        const delta = Math.max(
          backgroundModel.minimum[c] - value,
          0,
          value - backgroundModel.maximum[c],
        );
        return sum + delta * delta;
      }, 0),
    );
  const foregroundPredicate = {
    id: 'background-separated-' + config.predicate.id,
    description:
      config.predicate.description +
      '; outside measured border-color interval plus a 4-RGB-unit uncertainty band',
    test(red, green, blue) {
      return (
        config.predicate.test(red, green, blue) &&
        distance([red, green, blue]) > 4
      );
    },
  };
  for (let y = roi.y; y < roi.y + roi.height; y += 1) {
    for (let x = roi.x; x < roi.x + roi.width; x += 1) {
      const offset = (y * image.width + x) * image.channels;
      const rgb = [data[offset], data[offset + 1], data[offset + 2]];
      const delta = distance(rgb);
      if (config.predicate.test(...rgb) && delta > 0 && delta <= 4)
        uncertainPixels += 1;
    }
  }
  const candidateConfig = { ...config, predicate: foregroundPredicate };
  const mask = createPredicateMask(data, image, roi, foregroundPredicate);
  const { components } = connectedComponents(
    mask,
    image.width,
    image.height,
    roi,
  );
  const eligible = components.filter(
    (c) =>
      c.pixels >= config.minimumComponentPixels &&
      c.pixels >= config.minimumSelectedPixels &&
      c.pixels <= config.maximumComponentPixels &&
      c.bounds.width <= config.maximumComponentWidth &&
      c.bounds.height <= config.maximumComponentHeight &&
      c.pixels / (c.bounds.width * c.bounds.height) >=
        config.minimumComponentFillRatio,
  );
  const result = measureLandmarkFeature({
    data,
    image,
    dpr,
    config: candidateConfig,
  });
  const filledInteriorPixels =
    result.measurement.status === 'observed'
      ? fillCandidateInterior(result.debug.mask, image, result.debug.bounds)
      : 0;
  if (result.measurement.status === 'observed') {
    const support = boundsFromMask(
      result.debug.mask,
      image.width,
      image.height,
    );
    result.measurement.pixelSupport = support.pixels;
    result.measurement.method = {
      ...result.measurement.method,
      candidateInteriorFill: 'enclosed-zero-support-8-neighbor',
    };
    if (support.pixels > config.maximumComponentPixels) {
      result.measurement.status = 'blocked';
      result.measurement.reason =
        'Filled candidate subject exceeds the unchanged maximum support gate.';
    }
  }
  const colorQuality = assessChromaSelection({
    data,
    image,
    config: candidateConfig,
    mask: result.debug.mask,
    bounds: result.debug.bounds,
  });
  const ambiguity = assessCandidateContourAmbiguity({
    data,
    image,
    roi,
    mask: result.debug.mask,
    predicate: foregroundPredicate,
  });
  const ambiguityReasons = [];
  if (ambiguity.contourAmbiguity.status === 'blocked')
    ambiguityReasons.push(
      'Selected contour adjoins excluded red support; connected rail/subject ambiguity prevents measurement.',
    );
  if (ambiguity.boundarySeparation.status === 'blocked')
    ambiguityReasons.push(ambiguity.boundarySeparation.reason);
  const quality = {
    ...colorQuality,
    status: ambiguityReasons.length ? 'blocked' : colorQuality.status,
    reasons: [...colorQuality.reasons, ...ambiguityReasons],
  };
  if (result.measurement.status === 'observed' && ambiguityReasons.length) {
    result.measurement = {
      ...result.measurement,
      status: 'blocked',
      reason: ambiguityReasons.join(' '),
    };
  }
  if (eligible.length > 1) {
    result.measurement = {
      ...result.measurement,
      status: 'blocked',
      reason:
        'Several eligible foreground components make the landmark role ambiguous.',
    };
  }
  return {
    ...result,
    debug: { ...result.debug, quality },
    backgroundModel,
    foregroundEvidence: {
      uncertaintyBandPixels: uncertainPixels,
      eligibleSubjectCount: eligible.length,
      filledInteriorPixels,
      ...ambiguity,
    },
    qualification: {
      status: 'blocked',
      reason:
        'Candidate color support is not an independently qualified complete semantic silhouette.',
    },
  };
}
