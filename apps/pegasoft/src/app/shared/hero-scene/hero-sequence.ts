import {
  HERO_RAW_PROGRESS_MAX,
  HERO_SCENE_PROGRESS_MAX,
  type HeroDomPresentation,
  type HeroPageScrollMeasurement,
  type HeroViewportProfileId,
} from './hero-contract';

export const HERO_STEP_COUNT = 4;
export const HERO_DOM_STEP_STARTS = [0, 0.191, 0.697, 0.876] as const;
export const HERO_STEP_STARTS = HERO_DOM_STEP_STARTS;
export const HERO_FLOW_START_VIEWPORT_FRACTION = 0.4;
export const HERO_LANDING_EXIT_VIEWPORT_FRACTION = 0.24;
export const HERO_LANDING_HIDDEN_VIEWPORT_FRACTION = 0.16;
export const HERO_LANDING_FADE_START = 0.28;
export const HERO_FLOW_REVEAL_END_VIEWPORT_FRACTION = 0.71;
export const HERO_FIELD_FADE_START_VIEWPORT_FRACTION = 0.78;
export const HERO_FIELD_FADE_END_VIEWPORT_FRACTION = 0.18;
const HERO_PROGRESS_BOUNDARY_EPSILON = 1e-9;

type ProgressKnot = readonly [rawProgress: number, sceneProgress: number];

/**
 * Recording-desktop curve fitted to the authoritative live scroll selections.
 *
 * Raw progress uses the sticky-flow range and intentionally extends past 1
 * while the following section enters. This preserves the readable arrival
 * lockup before the measured retreat/exit instead of compressing both poses
 * into the final sticky pixel.
 */
const DESKTOP_SCENE_PROGRESS_KNOTS = [
  [0, 0],
  [0.04082451795, 0.12395],
  [0.086964343844, 0.16128],
  [0.291825170811, 0.32704],
  [0.555744974921, 0.54059],
  [0.640642254565, 0.60928],
  [0.802316204495, 0.74],
  [0.991304931354, 0.89301],
  [0.999794659319, 0.9],
  [1.186937793142, 1.0513],
  [HERO_RAW_PROGRESS_MAX, HERO_SCENE_PROGRESS_MAX],
] as const satisfies readonly ProgressKnot[];

const MOBILE_SCENE_PROGRESS_KNOTS = [
  [0, 0],
  [0.191, 0.228576034853],
  [0.697, 0.64714547094],
  [0.876, 0.795219362132],
  [1, HERO_SCENE_PROGRESS_MAX],
] as const satisfies readonly ProgressKnot[];

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

function getFlowMeasurementMetrics(measurement: HeroPageScrollMeasurement) {
  const viewportHeight = Math.max(1, measurement.viewportHeight);
  const scrollY = Number.isFinite(measurement.scrollY)
    ? Math.max(0, measurement.scrollY)
    : 0;
  const flowViewportTop = Number.isFinite(measurement.flowViewportTop)
    ? measurement.flowViewportTop
    : 0;
  const flowDocumentTop = flowViewportTop + scrollY;
  const scrollRange = Math.max(0, measurement.flowHeight - viewportHeight);
  const progressLead = Math.max(
    0,
    flowDocumentTop - viewportHeight * HERO_FLOW_START_VIEWPORT_FRACTION,
  );

  return {
    flowDocumentTop,
    flowViewportTop,
    progressLead,
    scrollRange,
  };
}

export function getRawJourneyProgress(measurement: HeroPageScrollMeasurement) {
  const { flowViewportTop, progressLead, scrollRange } =
    getFlowMeasurementMetrics(measurement);

  if (scrollRange <= 0) {
    return 0;
  }

  return clampRawProgress((progressLead - flowViewportTop) / scrollRange);
}

export function getScrollYForRawJourneyProgress(
  rawProgress: number,
  measurement: HeroPageScrollMeasurement,
) {
  const { flowDocumentTop, progressLead, scrollRange } =
    getFlowMeasurementMetrics(measurement);

  return Math.max(
    0,
    flowDocumentTop -
      progressLead +
      clampRawProgress(rawProgress) * scrollRange,
  );
}

export function getHeroDomPresentation(
  rawProgress: number,
  measurement?: HeroPageScrollMeasurement,
): HeroDomPresentation {
  const safeRawProgress = clampUnitProgress(rawProgress);

  if (!measurement) {
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

export function interpolateProgressKnots(
  value: number,
  knots: readonly ProgressKnot[],
) {
  const safeValue = clampRawProgress(value);
  const nextIndex = knots.findIndex(([input]) => input >= safeValue);

  if (nextIndex <= 0) {
    return knots[0][1];
  }

  if (nextIndex === -1) {
    return knots[knots.length - 1][1];
  }

  const [fromInput, fromOutput] = knots[nextIndex - 1];
  const [toInput, toOutput] = knots[nextIndex];
  const localProgress = (safeValue - fromInput) / (toInput - fromInput);

  return (
    fromOutput +
    (toOutput - fromOutput) * Math.min(1, Math.max(0, localProgress))
  );
}

export function mapRawProgressToScene(
  rawProgress: number,
  profileId: HeroViewportProfileId,
) {
  const knots =
    profileId === 'mobile' || profileId === 'tablet'
      ? MOBILE_SCENE_PROGRESS_KNOTS
      : DESKTOP_SCENE_PROGRESS_KNOTS;

  return clampSceneProgress(interpolateProgressKnots(rawProgress, knots));
}

export function mapSceneProgressToRaw(
  sceneProgress: number,
  profileId: HeroViewportProfileId,
) {
  const knots =
    profileId === 'mobile' || profileId === 'tablet'
      ? MOBILE_SCENE_PROGRESS_KNOTS
      : DESKTOP_SCENE_PROGRESS_KNOTS;
  const progress = clampSceneProgress(sceneProgress);
  const nextIndex = knots.findIndex(([, sceneStop]) => sceneStop >= progress);

  if (nextIndex <= 0) {
    return knots[0][0];
  }

  if (nextIndex === -1) {
    return knots[knots.length - 1][0];
  }

  const [fromRaw, fromScene] = knots[nextIndex - 1];
  const [toRaw, toScene] = knots[nextIndex];
  const amount = (progress - fromScene) / (toScene - fromScene);

  return clampRawProgress(fromRaw + (toRaw - fromRaw) * amount);
}

export function getDomStepSnapshot(rawProgress: number) {
  const progress = clampUnitProgress(rawProgress);
  const nextStepIndex = HERO_DOM_STEP_STARTS.findIndex(
    (start) => start - HERO_PROGRESS_BOUNDARY_EPSILON > progress,
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
