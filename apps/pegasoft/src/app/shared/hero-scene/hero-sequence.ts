import {
  HERO_RAW_PROGRESS_MAX,
  HERO_SCENE_PROGRESS_MAX,
  type HeroDomPresentation,
  type HeroPageScrollMeasurement,
  type HeroProgressSnapshot,
} from './hero-contract';

export const HERO_STEP_COUNT = 4;
export const HERO_DOM_STEP_STARTS = [0, 0.191, 0.697, 0.876] as const;
export const HERO_STEP_STARTS = HERO_DOM_STEP_STARTS;
export const HERO_STEP_NAVIGATION_OFFSETS = [0.11, 0.01, 0.1, 0.13] as const;
export const HERO_FLOW_START_VIEWPORT_FRACTION = 0.4;
export const HERO_LANDING_EXIT_VIEWPORT_FRACTION = 0.24;
export const HERO_LANDING_HIDDEN_VIEWPORT_FRACTION = 0.16;
export const HERO_LANDING_FADE_START = 0.28;
export const HERO_FLOW_REVEAL_END_VIEWPORT_FRACTION = 0.71;
export const HERO_FIELD_FADE_START_VIEWPORT_FRACTION = 0.78;
export const HERO_FIELD_FADE_END_VIEWPORT_FRACTION = 0.18;

export function clampRawProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(HERO_RAW_PROGRESS_MAX, Math.max(0, progress));
}

function clampUnitProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function clampSceneProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(HERO_SCENE_PROGRESS_MAX, Math.max(0, progress));
}

export const clampJourneyProgress = clampSceneProgress;

/** Source Lt(): mobile UA preserves the largest innerHeight until orientation reset. */
export function getEffectiveHeroHeight(
  currentHeight: number,
  previousHeight: number,
  mobileDevice: boolean,
  orientationReset = false,
) {
  if (!Number.isFinite(currentHeight) || currentHeight <= 0) return 0;
  return mobileDevice && !orientationReset
    ? Math.max(
        currentHeight,
        Number.isFinite(previousHeight) ? previousHeight : 0,
      )
    : currentHeight;
}

/** Matches source Qt; intentionally unrelated to CSS/pointer profiles. */
export function isHeroMobileDevice(
  userAgent: string,
  touchEndAvailable: boolean,
  msStreamAvailable = false,
) {
  const ipadOs = /Macintosh/.test(userAgent) && touchEndAvailable;
  return (
    (!msStreamAvailable && /iPad|iPhone|iPod/.test(userAgent)) ||
    /android/i.test(userAgent) ||
    ipadOs
  );
}

function measurementFailure(measurement: HeroPageScrollMeasurement) {
  const required = [
    measurement.measurementSequence,
    measurement.measuredAtMs,
    measurement.scrollY,
    measurement.viewportWidth,
    measurement.viewportHeight,
    measurement.effectiveHeroHeight,
    measurement.wrapperHeight,
    measurement.flowDocumentTop,
    measurement.flowHeight,
  ];
  if (
    required.some((value) => !Number.isFinite(value)) ||
    (measurement.fieldSectionViewportTop !== null &&
      !Number.isFinite(measurement.fieldSectionViewportTop))
  ) {
    return 'non-finite-physical-measurement';
  }
  if (
    measurement.viewportWidth <= 0 ||
    measurement.viewportHeight <= 0 ||
    measurement.effectiveHeroHeight <= 0 ||
    measurement.wrapperHeight <= 0 ||
    measurement.flowHeight <= measurement.wrapperHeight
  ) {
    return 'invalid-flow-layout';
  }
  return null;
}

function flowDenominators(measurement: HeroPageScrollMeasurement) {
  const range = Math.max(measurement.flowHeight - measurement.wrapperHeight, 1);
  return {
    dom: range,
    lead: measurement.effectiveHeroHeight * HERO_FLOW_START_VIEWPORT_FRACTION,
    scene: Math.max(
      measurement.effectiveHeroHeight * HERO_FLOW_START_VIEWPORT_FRACTION +
        (range * 400) / 356,
      1,
    ),
  };
}

/** Independent source formulas consume the same original physical measurement. */
export function deriveHeroProgress(
  measurement?: HeroPageScrollMeasurement,
): HeroProgressSnapshot {
  const invalidReason = measurement
    ? measurementFailure(measurement)
    : 'missing-physical-measurement';
  if (!measurement || invalidReason === 'non-finite-physical-measurement') {
    return {
      measurementSequence:
        measurement && Number.isFinite(measurement.measurementSequence)
          ? measurement.measurementSequence
          : 0,
      valid: false,
      invalidReason,
      domProgress: 0,
      sceneTargetProgress: 0,
    };
  }
  const denominator = flowDenominators(measurement);
  return {
    measurementSequence: measurement.measurementSequence,
    valid: invalidReason === null,
    invalidReason,
    domProgress: clampUnitProgress(
      (measurement.scrollY - denominator.lead) / denominator.dom,
    ),
    sceneTargetProgress: Math.max(0, measurement.scrollY / denominator.scene),
  };
}

export function getRawJourneyProgress(measurement: HeroPageScrollMeasurement) {
  return deriveHeroProgress(measurement).domProgress;
}

/** DOM-zero is ambiguous; this chooses the flow lead, not the landing recipe. */
export function getScrollYForRawJourneyProgress(
  domProgress: number,
  measurement: HeroPageScrollMeasurement,
) {
  if (
    !Number.isFinite(domProgress) ||
    measurementFailure(measurement) === 'non-finite-physical-measurement'
  )
    return 0;
  const denominator = flowDenominators(measurement);
  return Math.max(
    0,
    denominator.lead + Math.max(0, domProgress) * denominator.dom,
  );
}

export function getScrollYForSceneProgress(
  sceneProgress: number,
  measurement: HeroPageScrollMeasurement,
) {
  if (
    !Number.isFinite(sceneProgress) ||
    measurementFailure(measurement) === 'non-finite-physical-measurement'
  )
    return 0;
  return Math.max(0, sceneProgress * flowDenominators(measurement).scene);
}

export function getHeroDomPresentation(
  rawProgress: number,
  measurement?: HeroPageScrollMeasurement,
): HeroDomPresentation {
  const safeRawProgress = clampUnitProgress(rawProgress);

  if (
    !measurement ||
    measurementFailure(measurement) === 'non-finite-physical-measurement'
  ) {
    const journeyHasStarted = safeRawProgress > 0;

    return {
      landingExitProgress: journeyHasStarted ? 1 : 0,
      landingFadeProgress: journeyHasStarted ? 1 : 0,
      flowRevealProgress: journeyHasStarted ? 1 : 0,
      fieldVisibility: 1,
      landingHidden: journeyHasStarted,
    };
  }

  const viewportHeight = Math.max(1, measurement.viewportHeight);
  const scrollY = Math.max(0, measurement.scrollY);
  const landingExitProgress = clampUnitProgress(
    scrollY / (viewportHeight * HERO_LANDING_EXIT_VIEWPORT_FRACTION),
  );
  const landingFadeProgress = clampUnitProgress(
    (landingExitProgress - HERO_LANDING_FADE_START) /
      (1 - HERO_LANDING_FADE_START),
  );
  const flowRevealProgress = clampUnitProgress(
    scrollY / (viewportHeight * HERO_FLOW_REVEAL_END_VIEWPORT_FRACTION),
  );
  const fieldFadeStart =
    viewportHeight * HERO_FIELD_FADE_START_VIEWPORT_FRACTION;
  const fieldFadeEnd = viewportHeight * HERO_FIELD_FADE_END_VIEWPORT_FRACTION;
  const fieldTop = measurement.fieldSectionViewportTop;
  const fieldVisibility =
    fieldTop === null
      ? 1
      : clampUnitProgress(
          (fieldTop - fieldFadeEnd) / (fieldFadeStart - fieldFadeEnd),
        );

  return {
    landingExitProgress,
    landingFadeProgress,
    flowRevealProgress,
    fieldVisibility,
    landingHidden:
      scrollY > viewportHeight * HERO_LANDING_HIDDEN_VIEWPORT_FRACTION,
  };
}

export function getDomStepSnapshot(rawProgress: number) {
  const progress = clampUnitProgress(rawProgress);
  const nextStepIndex = HERO_DOM_STEP_STARTS.findIndex(
    (start) => start > progress,
  );
  const stepIndex = (
    nextStepIndex === -1 ? HERO_STEP_COUNT - 1 : Math.max(0, nextStepIndex - 1)
  ) as 0 | 1 | 2 | 3;
  const stepStart = HERO_DOM_STEP_STARTS[stepIndex];
  const stepEnd = HERO_DOM_STEP_STARTS[stepIndex + 1] ?? 1;

  return {
    stepIndex,
    stepProgress: Math.min(
      1,
      Math.max(0, (progress - stepStart) / (stepEnd - stepStart)),
    ),
  };
}
