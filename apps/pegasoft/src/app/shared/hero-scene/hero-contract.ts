export const HERO_CAPTURE_SEED = 43117;
export const HERO_RAW_PROGRESS_MAX = 1.25;
export const HERO_SCENE_PROGRESS_MAX = 1.25;

export const HERO_REFERENCE_STATE_KEYS = [
  'loader-mark',
  'world-reveal',
  'landing',
  'landing-idle',
  'activation-route',
  'activation-contact',
  'clearance-travel',
  'clearance-field-preview',
  'field-approach',
  'field-contact',
  'field-pulse-a',
  'field-pulse-b',
  'arrival-travel',
  'arrival-lockup',
  'journey-exit',
] as const;

export type HeroReferenceStateKey = (typeof HERO_REFERENCE_STATE_KEYS)[number];
export type HeroEvidenceClass =
  | 'observed'
  | 'source-confirmed'
  | 'inferred'
  | 'unknown';
export type HeroLifecycle = 'loading' | 'landing' | 'journey' | 'exit';
export type HeroMotionProfile = 'full' | 'reduced' | 'static';
export type HeroInputClass = 'fine-pointer' | 'coarse-pointer' | 'none';
export type HeroViewportProfileId =
  | 'recording-desktop'
  | 'desktop'
  | 'tablet'
  | 'mobile';
export type HeroCopyState =
  | 'none'
  | 'landing'
  | 'step-01-activation'
  | 'step-02-clearance'
  | 'step-03-field-match'
  | 'step-04-arrival'
  | 'step-04-arrival-transitioning-out';
export type HeroLocalPhase =
  | 'loader-mark'
  | 'world-reveal'
  | 'landing-base'
  | 'landing-packet-visible'
  | 'field-pulse-inner'
  | 'field-pulse-outer'
  | 'arrival-readable-lockup'
  | null;

export type HeroTuple3 = readonly [number, number, number];
export type HeroTuple4 = readonly [number, number, number, number];
export type HeroScreenBounds = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
];

export type HeroProgressConstraint =
  | { kind: 'not-applicable' }
  | { kind: 'point'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'unknown' };

export type HeroStructuralFeatureStatus =
  | 'observed'
  | 'blocked'
  | 'not-applicable';

export type HeroPrimaryStructureKind =
  | 'landmark'
  | 'route'
  | 'boundary'
  | 'fieldProfile'
  | 'composition';

export type HeroReferenceState = {
  key: HeroReferenceStateKey;
  phase: 'loader' | 'reveal' | 'landing' | 'journey' | 'exit';
  progress: {
    target: number | null;
    settledCamera: number | null;
    constraint: HeroProgressConstraint;
    constraintEvidence: HeroEvidenceClass;
    captureSelectionEvidence: HeroEvidenceClass;
  };
  copyState: HeroCopyState;
  processStepIndex: 0 | 1 | 2 | 3 | null;
  localPhase: HeroLocalPhase;
  captureClocks: HeroLocalClocks;
  recordingAnchor: {
    decodedFrameIndex: number;
    bestEffortTimestampPts: number;
    timestampSeconds: number;
    capturePath: string;
    captureSha256: string;
  };
  cameraPose: {
    evidence: HeroEvidenceClass;
    position: HeroTuple3 | null;
    quaternion: HeroTuple4 | null;
    visualComposition: string;
  };
  screenComposition: {
    status: 'observed' | 'blocked';
    evidence: HeroEvidenceClass;
    evidenceRef: string | null;
    edgeDensity: number | null;
    edgeCentroidNormalized: readonly [x: number, y: number] | null;
    grid: { columns: 4; rows: 4 } | null;
  };
  focusTarget: {
    evidence: HeroEvidenceClass;
    value: string | null;
  };
  route: {
    segment: string;
    interactionMode: string | null;
    interactionEvidence: HeroEvidenceClass;
  };
  screenBounds: {
    status: 'observed' | 'unknown';
    primaryStructure: {
      kind: HeroPrimaryStructureKind;
      status: 'observed' | 'blocked';
      label: string;
      evidenceRef: string | null;
    };
    landmarkStatus: HeroStructuralFeatureStatus;
    landmark: HeroScreenBounds | null;
    routeStatus: HeroStructuralFeatureStatus;
    routeLabel: string | null;
    routeEvidenceRef: string | null;
    route: HeroScreenBounds | null;
    boundaryStatus: HeroStructuralFeatureStatus;
    boundary: HeroScreenBounds | null;
    copyStatus: HeroStructuralFeatureStatus | 'unknown';
    copyLabel: string | null;
    copyEvidenceRef: string | null;
    copy: HeroScreenBounds | null;
  };
  expectedVisibleContext: readonly string[];
  confidence: 'high' | 'medium' | 'low';
  unresolvedDifferences: readonly string[];
};

/**
 * Runtime state is deliberately smaller than the evidence record. Recording
 * paths, hashes, measurements, and audit prose belong to test/document
 * tooling and must not inflate the production client bundle.
 */
export type HeroRuntimeState = Pick<
  HeroReferenceState,
  | 'key'
  | 'phase'
  | 'copyState'
  | 'processStepIndex'
  | 'localPhase'
  | 'captureClocks'
> & {
  progress: Pick<HeroReferenceState['progress'], 'target' | 'settledCamera'>;
};

export type HeroLocalClocks = {
  loaderMs: number;
  landingIdleMs: number;
  fieldPulseMs: number;
  arrivalMs: number;
};

export type HeroRuntimeProfile = {
  id: HeroViewportProfileId;
  inputClass: HeroInputClass;
  motion: HeroMotionProfile;
  cameraSmoothTimeSeconds: number;
  maxDpr: number;
  pointerTrail: boolean;
  journeyHeightSvh: number;
};

/**
 * The page reports physical scroll geometry once per animation frame. The
 * controller is the only place that turns those measurements into authored
 * hero progress and presentation values.
 */
export type HeroPageScrollMeasurement = {
  scrollY: number;
  viewportHeight: number;
  flowViewportTop: number;
  flowHeight: number;
  fieldSectionViewportTop: number | null;
};

export type HeroDomPresentation = {
  landingExitProgress: number;
  landingFadeProgress: number;
  flowRevealProgress: number;
  fieldVisibility: number;
  landingHidden: boolean;
};

export type HeroJourneySnapshot = {
  rawProgress: number;
  sceneTargetProgress: number;
  lifecycle: HeroLifecycle;
  motion: HeroMotionProfile;
  profile: HeroRuntimeProfile;
  stepIndex: 0 | 1 | 2 | 3;
  stepProgress: number;
  copyState: HeroCopyState;
  referenceState: HeroRuntimeState;
  localClocks: HeroLocalClocks;
  deterministicSeed: number;
  directEntry: boolean;
  dom: HeroDomPresentation;
};

export type HeroControllerInput = {
  rawProgress?: number;
  pageMeasurement?: HeroPageScrollMeasurement;
  lifecycleElapsedMs: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  pointerFine: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
  directStateKey?: HeroReferenceStateKey | null;
  localTimeOverrideMs?: number | null;
  localClocks?: Partial<HeroLocalClocks>;
};
