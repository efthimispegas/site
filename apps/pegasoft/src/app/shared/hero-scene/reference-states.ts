import type {
  HeroEvidenceClass,
  HeroLocalClocks,
  HeroPrimaryStructureKind,
  HeroProgressConstraint,
  HeroReferenceState,
  HeroReferenceStateKey,
  HeroScreenBounds,
  HeroStructuralFeatureStatus,
} from './hero-contract';

const SETTLED_PAGE_CLOCKS: HeroLocalClocks = {
  loaderMs: 5000,
  landingIdleMs: 0,
  fieldPulseMs: 0,
  arrivalMs: 0,
};

type ReferenceStateInput = Omit<
  HeroReferenceState,
  | 'recordingAnchor'
  | 'cameraPose'
  | 'focusTarget'
  | 'route'
  | 'screenBounds'
  | 'expectedVisibleContext'
  | 'confidence'
  | 'unresolvedDifferences'
> & {
  frame: number;
  pts: number;
  time: number;
  captureSha256: string;
  composition: string;
  focus: string;
  routeSegment: string;
  interactionMode?: string | null;
  interactionEvidence?: HeroEvidenceClass;
  primaryStructureKind?: HeroPrimaryStructureKind;
  primaryStructureLabel?: string;
  primaryStructureEvidenceRef?: string | null;
  landmarkStatus?: HeroStructuralFeatureStatus;
  landmarkBounds?: HeroScreenBounds | null;
  routeStatus?: HeroStructuralFeatureStatus;
  routeBounds?: HeroScreenBounds | null;
  boundaryStatus?: HeroStructuralFeatureStatus;
  boundaryBounds?: HeroScreenBounds | null;
  copyBounds?: HeroScreenBounds | null;
  context: readonly string[];
  unresolvedDifferences?: readonly string[];
};

function state(input: ReferenceStateInput): HeroReferenceState {
  const {
    frame,
    pts,
    time,
    captureSha256,
    composition,
    focus,
    routeSegment,
    interactionMode = 'scroll-driven journey',
    interactionEvidence = 'inferred',
    primaryStructureKind = 'landmark',
    primaryStructureLabel = focus,
    primaryStructureEvidenceRef = null,
    landmarkStatus,
    landmarkBounds = null,
    routeStatus,
    routeBounds = null,
    boundaryStatus,
    boundaryBounds = null,
    copyBounds = null,
    context,
    unresolvedDifferences = [],
    ...contract
  } = input;
  const resolvedLandmarkStatus =
    landmarkStatus ?? (landmarkBounds === null ? 'blocked' : 'observed');
  const resolvedRouteStatus =
    routeStatus ??
    (routeBounds !== null
      ? 'observed'
      : routeSegment === 'none'
        ? 'not-applicable'
        : 'blocked');
  const resolvedBoundaryStatus =
    boundaryStatus ?? (boundaryBounds === null ? 'not-applicable' : 'observed');
  const primaryStatus = {
    landmark: resolvedLandmarkStatus,
    route: resolvedRouteStatus,
    boundary: resolvedBoundaryStatus,
  }[primaryStructureKind];

  if (primaryStatus === 'not-applicable') {
    throw new Error(
      `${contract.key}: primary structure cannot be not applicable`,
    );
  }

  return {
    ...contract,
    recordingAnchor: {
      decodedFrameIndex: frame,
      bestEffortTimestampPts: pts,
      timestampSeconds: time,
      capturePath: `docs/hero-reference/recording/frame-${String(
        frame,
      ).padStart(6, '0')}-${contract.key}.png`,
      captureSha256,
    },
    cameraPose: {
      evidence: 'unknown',
      position: null,
      quaternion: null,
      visualComposition: composition,
    },
    focusTarget: {
      evidence: 'inferred',
      value: focus,
    },
    route: {
      segment: routeSegment,
      interactionMode,
      interactionEvidence,
    },
    screenBounds: {
      status: primaryStatus === 'observed' ? 'observed' : 'unknown',
      primaryStructure: {
        kind: primaryStructureKind,
        status: primaryStatus,
        label: primaryStructureLabel,
        evidenceRef: primaryStructureEvidenceRef,
      },
      landmarkStatus: resolvedLandmarkStatus,
      landmark: landmarkBounds,
      routeStatus: resolvedRouteStatus,
      route: routeBounds,
      boundaryStatus: resolvedBoundaryStatus,
      boundary: boundaryBounds,
      copyStatus:
        copyBounds !== null
          ? 'observed'
          : contract.copyState === 'none'
            ? 'not-applicable'
            : 'unknown',
      copy: copyBounds,
    },
    expectedVisibleContext: context,
    confidence: 'high',
    unresolvedDifferences,
  };
}

function progress(
  target: number | null,
  constraint: HeroProgressConstraint,
  constraintEvidence: HeroEvidenceClass,
  captureSelectionEvidence: HeroEvidenceClass,
) {
  return {
    target,
    settledCamera: target,
    constraint,
    constraintEvidence,
    captureSelectionEvidence,
  };
}

export const referenceStates = [
  state({
    key: 'loader-mark',
    phase: 'loader',
    progress: progress(
      null,
      { kind: 'not-applicable' },
      'observed',
      'observed',
    ),
    copyState: 'none',
    processStepIndex: null,
    localPhase: 'loader-mark',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, loaderMs: 2000 },
    frame: 118,
    pts: 12000,
    time: 2,
    captureSha256:
      'c019c823b6c21544db0ce32d5e26481148326f721845b34a707b1bbe1bf9933f',
    composition: 'flat pale field centered on the resolved blue loader mark',
    focus: 'central loader mark',
    routeSegment: 'none',
    interactionMode: 'elapsed-time reveal',
    primaryStructureLabel: 'central blue loader mark',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/0/landmark',
    landmarkBounds: [714, 340, 85, 85.5],
    context: [
      'blue arrow loader mark',
      'oversized thin elliptical contours',
      'pale field',
      'no header',
      'no hero copy',
      'no composed world',
    ],
  }),
  state({
    key: 'world-reveal',
    phase: 'reveal',
    progress: progress(
      null,
      { kind: 'not-applicable' },
      'observed',
      'observed',
    ),
    copyState: 'none',
    processStepIndex: null,
    localPhase: 'world-reveal',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, loaderMs: 3500 },
    frame: 208,
    pts: 21000,
    time: 3.5,
    captureSha256:
      '87c9b513db35d2fc13c2a26e11ed54f06060e2eb034cbff0f10fc6eb47c9e690',
    composition:
      'industrial world composing upward beneath the central loader mark',
    focus: 'loader mark and emerging landing city',
    routeSegment: 'emerging red landing rails',
    interactionMode: 'elapsed-time reveal',
    primaryStructureLabel: 'central blue loader mark during world reveal',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/1/landmark',
    landmarkBounds: [714, 341, 84.5, 84],
    context: [
      'central blue loader mark',
      'elliptical contours',
      'partially composed city',
      'red rails',
      'figures and turbines beginning to appear',
      'no settled hero copy',
    ],
  }),
  state({
    key: 'landing',
    phase: 'landing',
    progress: progress(0, { kind: 'point', value: 0 }, 'observed', 'observed'),
    copyState: 'landing',
    processStepIndex: null,
    localPhase: 'landing-base',
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 298,
    pts: 30000,
    time: 5,
    captureSha256:
      '6ff1d23779f76059f7ba4ba437cfb712886a78516bc9e2f317964949e7a565d5',
    composition:
      'centered two-line hero copy above an oblique city cluster filling the lower viewport',
    focus: 'landing city cluster below centered copy',
    routeSegment: 'landing red rails',
    interactionMode: 'local landing clock',
    interactionEvidence: 'source-confirmed',
    primaryStructureLabel: 'landing industrial context aggregate',
    context: [
      'fixed desktop header',
      'centered hero copy',
      'bottom-center scroll cue',
      'city buildings',
      'figures',
      'turbines',
      'red rails',
    ],
  }),
  state({
    key: 'landing-idle',
    phase: 'landing',
    progress: progress(
      0,
      { kind: 'point', value: 0 },
      'source-confirmed',
      'source-confirmed',
    ),
    copyState: 'landing',
    processStepIndex: null,
    localPhase: 'landing-packet-visible',
    captureClocks: {
      ...SETTLED_PAGE_CLOCKS,
      loaderMs: 7500,
      landingIdleMs: 2500,
    },
    frame: 448,
    pts: 45000,
    time: 7.5,
    captureSha256:
      '0718c8673e4099495397b9a3e3e19737a2013a59d288b9d3acd29bfd4f69fd1b',
    composition:
      'same resolved landing composition with a materially different red-packet phase',
    focus: 'landing city cluster',
    routeSegment: 'active red landing packet',
    interactionMode: 'local landing clock',
    interactionEvidence: 'source-confirmed',
    primaryStructureLabel: 'landing industrial context aggregate at route idle',
    context: [
      'fixed desktop header',
      'settled landing copy',
      'city cluster',
      'visible bright red route packet',
    ],
  }),
  state({
    key: 'activation-route',
    phase: 'journey',
    progress: progress(
      0.12395,
      { kind: 'range', min: 0.1224, max: 0.1255 },
      'inferred',
      'observed',
    ),
    copyState: 'step-01-activation',
    processStepIndex: 0,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 598,
    pts: 60000,
    time: 10,
    captureSha256:
      '0ab59bbdebf3fd0067658841a7b443c8d27375bd5429fc778752019538900180',
    composition:
      'left process copy with converging red rails traversing toward the first destination',
    focus: 'first destination building',
    routeSegment: 'parallel red activation rails',
    primaryStructureLabel: 'first-destination building before route contact',
    context: [
      'Step 01 process copy',
      'thin parallel red rails',
      'activation city',
      'first destination ahead',
    ],
  }),
  state({
    key: 'activation-contact',
    phase: 'journey',
    progress: progress(
      0.16128,
      { kind: 'range', min: 0.1597, max: 0.1628 },
      'inferred',
      'observed',
    ),
    copyState: 'step-01-activation',
    processStepIndex: 0,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 748,
    pts: 75000,
    time: 12.5,
    captureSha256:
      '8975a69102da5583678abd435df6244ffba93008406420a0ac768e9d5a226ce6',
    composition:
      'red rails terminate at the logo-bearing destination while Step 01 remains active',
    focus: 'logo-bearing first destination',
    routeSegment: 'red activation contact',
    primaryStructureLabel:
      'logo-bearing first-destination building at route contact',
    context: [
      'Step 01 process copy',
      'red contact point',
      'first destination',
      'blue handoff cue',
    ],
  }),
  state({
    key: 'clearance-travel',
    phase: 'journey',
    progress: progress(
      0.32704,
      { kind: 'range', min: 0.3255, max: 0.3286 },
      'inferred',
      'observed',
    ),
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 1078,
    pts: 108000,
    time: 18,
    captureSha256:
      '621c0d2d39a3ddc4f8cc8e7fd1a3a3053122c7b20b0dd46a211066698e8556c9',
    composition: 'wide blue-route transit through open industrial context',
    focus: 'cyan route direction across the landscape',
    routeSegment: 'first cyan/blue travel route',
    primaryStructureKind: 'route',
    primaryStructureLabel: 'high-chroma core of connected cyan clearance route',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/6/route',
    landmarkStatus: 'not-applicable',
    routeStatus: 'observed',
    routeBounds: [88, 123, 474, 264],
    context: [
      'Step 02 process copy',
      'open industrial travel space',
      'blue route and bright tip',
      'secondary buildings and workers',
    ],
  }),
  state({
    key: 'clearance-field-preview',
    phase: 'journey',
    progress: progress(
      0.54059,
      { kind: 'range', min: 0.539, max: 0.5421 },
      'inferred',
      'observed',
    ),
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 1228,
    pts: 123000,
    time: 20.5,
    captureSha256:
      '42a8b8da9bed387e5aab1e767a0e6290aff44189d11b8e7653d7180936866268',
    composition:
      'Step 02 transit with the rounded-tile field first entering at the upper-right edge',
    focus: 'route direction toward the previewing field',
    routeSegment: 'cyan clearance route approaching field',
    primaryStructureKind: 'route',
    primaryStructureLabel:
      'high-chroma core of cyan route approaching the field preview',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/7/route',
    landmarkStatus: 'not-applicable',
    routeStatus: 'observed',
    routeBounds: [242, 556, 116, 54],
    context: [
      'Step 02 process copy',
      'cyan route',
      'industrial context',
      'first field tiles at frame edge',
    ],
  }),
  state({
    key: 'field-approach',
    phase: 'journey',
    progress: progress(
      0.60928,
      { kind: 'range', min: 0.6077, max: 0.6108 },
      'inferred',
      'observed',
    ),
    copyState: 'step-02-clearance',
    processStepIndex: 1,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 1288,
    pts: 129000,
    time: 21.5,
    captureSha256:
      'df0381011892710f879b805b2f149adfb95dbe8e95c2a7097d7d716a181faf35',
    composition:
      'rounded-tile field dominates the upper/right frame as the camera becomes strongly top-down',
    focus: 'elevated field center',
    routeSegment: 'cyan field-approach route',
    primaryStructureLabel: 'elevated field-center tile and figure',
    context: [
      'Step 02 process copy in the recording',
      'dominant irregular tile field',
      'route entering the field',
      'strong top-down camera cue',
    ],
  }),
  state({
    key: 'field-contact',
    phase: 'journey',
    progress: progress(
      0.74,
      { kind: 'point', value: 0.74 },
      'inferred',
      'inferred',
    ),
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 1390,
    pts: 139200,
    time: 23.2,
    captureSha256:
      'f14b7ffe780fcdb2ee6a9a90211efd592267291017974340c0228a822832cfdc',
    composition:
      'top-angle field composition at the first clear saturated-center reaction',
    focus: 'elevated center tile and figure',
    routeSegment: 'cyan route contacting field center',
    primaryStructureLabel:
      'elevated center tile and standing figure at first contact',
    context: [
      'Step 03 process copy',
      'elevated center tile and figure',
      'connected cyan route',
      'first contact reaction',
    ],
  }),
  state({
    key: 'field-pulse-a',
    phase: 'journey',
    progress: progress(0.74, { kind: 'unknown' }, 'unknown', 'inferred'),
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: 'field-pulse-inner',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, fieldPulseMs: 300 },
    frame: 1408,
    pts: 141000,
    time: 23.5,
    captureSha256:
      '156123978b207b9a46c266d35aaec5627567cf8055750baa6a3e3bb0ed793404',
    composition: 'stable top-angle contact with bright inner square/ring band',
    focus: 'elevated center tile and inner luminous band',
    routeSegment: 'connected cyan route plus inner field pulse',
    interactionMode: 'progress-gated local field clock',
    interactionEvidence: 'inferred',
    primaryStructureLabel: 'field center during inner pulse',
    context: [
      'Step 03 process copy',
      'connected cyan route',
      'bright inner field band',
      'stable contact camera',
    ],
  }),
  state({
    key: 'field-pulse-b',
    phase: 'journey',
    progress: progress(0.74, { kind: 'unknown' }, 'unknown', 'inferred'),
    copyState: 'step-03-field-match',
    processStepIndex: 2,
    localPhase: 'field-pulse-outer',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, fieldPulseMs: 2800 },
    frame: 1558,
    pts: 156000,
    time: 26,
    captureSha256:
      'e5a6fc292809185e8a83be83db0e94fc2db2a2cfffbd9f72a933b2e1168160a4',
    composition:
      'stable top-angle center with illumination displaced to outer edge bands',
    focus: 'center tile with materially later outer pulse band',
    routeSegment: 'connected cyan route plus outer field pulse',
    interactionMode: 'progress-gated local field clock',
    interactionEvidence: 'inferred',
    primaryStructureLabel: 'elevated blue center tile',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/11/landmark',
    landmarkBounds: [682, 326, 85, 87.5],
    context: [
      'Step 03 process copy',
      'connected cyan route',
      'outer field band',
      'stable contact camera',
    ],
  }),
  state({
    key: 'arrival-travel',
    phase: 'journey',
    progress: progress(
      0.89301,
      { kind: 'range', min: 0.8915, max: 0.8946 },
      'inferred',
      'observed',
    ),
    copyState: 'step-04-arrival',
    processStepIndex: 3,
    localPhase: null,
    captureClocks: SETTLED_PAGE_CLOCKS,
    frame: 1786,
    pts: 178800,
    time: 29.8,
    captureSha256:
      '45c268491236fdd992f9184e4657b4a315527a654d36a34dac3dab72415f310f',
    composition:
      'field recedes left while a horizontal cyan feed carries travel toward the arrow destination',
    focus: 'arrival arrow direction beyond the right edge',
    routeSegment: 'second horizontal cyan route',
    primaryStructureKind: 'route',
    primaryStructureLabel: 'high-chroma core of second horizontal cyan route',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/12/route',
    landmarkStatus: 'not-applicable',
    routeStatus: 'observed',
    routeBounds: [714, 352, 118, 9],
    context: [
      'Step 04 process copy',
      'field receding left',
      'horizontal cyan route',
      'arrival destination entering',
    ],
  }),
  state({
    key: 'arrival-lockup',
    phase: 'journey',
    progress: progress(
      0.9,
      { kind: 'point', value: 0.9 },
      'source-confirmed',
      'inferred',
    ),
    copyState: 'step-04-arrival',
    processStepIndex: 3,
    localPhase: 'arrival-readable-lockup',
    captureClocks: { ...SETTLED_PAGE_CLOCKS, arrivalMs: 0 },
    frame: 1858,
    pts: 186000,
    time: 31,
    captureSha256:
      'f3b6e215067ab8986e81b064221b2142c30d229728c1d15dfedf216f1cb57d96',
    composition:
      'large centered frontal arrow with horizontal cyan feed and surrounding square/diamond marks',
    focus: 'large frontal arrival arrow',
    routeSegment: 'horizontal cyan feed into arrival arrow',
    interactionMode: 'progress-gated local arrival clock',
    interactionEvidence: 'inferred',
    primaryStructureLabel: 'large frontal arrival arrow',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/13/landmark',
    landmarkBounds: [597, 235.5, 179, 262.5],
    context: [
      'Step 04 process copy',
      'large centered arrow',
      'horizontal cyan feed',
      'surrounding square and diamond marks',
    ],
  }),
  state({
    key: 'journey-exit',
    phase: 'exit',
    progress: progress(
      1.0513,
      { kind: 'range', min: 1.0498, max: 1.0529 },
      'inferred',
      'observed',
    ),
    copyState: 'step-04-arrival-transitioning-out',
    processStepIndex: 3,
    localPhase: null,
    captureClocks: { ...SETTLED_PAGE_CLOCKS, arrivalMs: 1000 },
    frame: 1918,
    pts: 192000,
    time: 32,
    captureSha256:
      '5f8fec7f851c47455e39f424d5b27548d104203f1303aaf4afd51e33e3ce2b5b',
    composition:
      'pale journey recedes above while the next white page section occupies the lower viewport',
    focus: 'handoff from arrival composition to following content',
    routeSegment: 'arrival route leaving visible journey area',
    interactionMode: 'scroll-driven section exit',
    primaryStructureKind: 'boundary',
    primaryStructureLabel: 'hero-to-following-section boundary at journey exit',
    primaryStructureEvidenceRef:
      'docs/hero-reference/recording-structural-bounds.json#/states/14/boundary',
    landmarkStatus: 'not-applicable',
    routeStatus: 'not-applicable',
    boundaryStatus: 'observed',
    boundaryBounds: [0, 367.5, 1508, 1],
    context: [
      'receding arrival composition',
      'pale world coverage',
      'following white section entering',
      'no dark world edge',
    ],
  }),
] as const satisfies readonly HeroReferenceState[];

const referenceStateByKey = new Map<HeroReferenceStateKey, HeroReferenceState>(
  referenceStates.map((referenceState) => [referenceState.key, referenceState]),
);

export function getReferenceState(
  key: HeroReferenceStateKey,
): HeroReferenceState {
  const referenceState = referenceStateByKey.get(key);

  if (!referenceState) {
    throw new Error(`Unknown hero reference state: ${key}`);
  }

  return referenceState;
}
