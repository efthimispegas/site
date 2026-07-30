import {
  HERO_CAPTURE_SEED,
  type HeroControllerInput,
  type HeroCopyState,
  type HeroJourneySnapshot,
  type HeroLifecycle,
  type HeroLocalClocks,
  type HeroRuntimeState,
} from './hero-contract';
import { selectHeroRuntimeProfile } from './hero-profile';
import {
  clampRawProgress,
  clampSceneProgress,
  getDomStepSnapshot,
  getHeroDomPresentation,
  getRawJourneyProgress,
  mapRawProgressToScene,
  mapSceneProgressToRaw,
} from './hero-sequence';
import { getHeroRuntimeState } from './hero-runtime-states';

const LOADER_MARK_END_MS = 3200;
const WORLD_REVEAL_END_MS = 4800;
const LANDING_IDLE_START_MS = 6500;

function lifecycleFor(
  directState: HeroRuntimeState | null,
  rawProgress: number,
  sceneProgress: number,
  lifecycleElapsedMs: number,
): HeroLifecycle {
  if (directState) {
    if (directState.phase === 'loader' || directState.phase === 'reveal') {
      return 'loading';
    }

    if (directState.phase === 'landing') {
      return 'landing';
    }

    return directState.phase === 'exit' ? 'exit' : 'journey';
  }

  if (rawProgress <= 0 && lifecycleElapsedMs < WORLD_REVEAL_END_MS) {
    return 'loading';
  }

  if (rawProgress <= 0) {
    return 'landing';
  }

  return sceneProgress >= 1 ? 'exit' : 'journey';
}

function copyStateFor(
  lifecycle: HeroLifecycle,
  stepIndex: 0 | 1 | 2 | 3,
): HeroCopyState {
  if (lifecycle === 'loading') {
    return 'none';
  }

  if (lifecycle === 'landing') {
    return 'landing';
  }

  if (lifecycle === 'exit') {
    return 'step-04-arrival-transitioning-out';
  }

  return (
    [
      'step-01-activation',
      'step-02-clearance',
      'step-03-field-match',
      'step-04-arrival',
    ] as const
  )[stepIndex];
}

function automatedReferenceState(
  lifecycle: HeroLifecycle,
  lifecycleElapsedMs: number,
  sceneProgress: number,
  fieldPulseMs: number,
) {
  if (lifecycle === 'loading') {
    return getHeroRuntimeState(
      lifecycleElapsedMs < LOADER_MARK_END_MS ? 'loader-mark' : 'world-reveal',
    );
  }

  if (lifecycle === 'landing') {
    return getHeroRuntimeState(
      lifecycleElapsedMs < LANDING_IDLE_START_MS ? 'landing' : 'landing-idle',
    );
  }

  if (sceneProgress < 0.1426) {
    return getHeroRuntimeState('activation-route');
  }

  if (sceneProgress < 0.17) {
    return getHeroRuntimeState('activation-contact');
  }

  if (sceneProgress < 0.4338) {
    return getHeroRuntimeState('clearance-travel');
  }

  if (sceneProgress < 0.5749) {
    return getHeroRuntimeState('clearance-field-preview');
  }

  if (sceneProgress < 0.6746) {
    return getHeroRuntimeState('field-approach');
  }

  if (sceneProgress < 0.755 && fieldPulseMs <= 0) {
    return getHeroRuntimeState('field-contact');
  }

  if (sceneProgress < 0.82) {
    return getHeroRuntimeState(
      fieldPulseMs > 1600 ? 'field-pulse-b' : 'field-pulse-a',
    );
  }

  if (sceneProgress < 0.8965) {
    return getHeroRuntimeState('arrival-travel');
  }

  if (sceneProgress < 1) {
    return getHeroRuntimeState('arrival-lockup');
  }

  return getHeroRuntimeState('journey-exit');
}

function resolveLocalClocks(
  input: HeroControllerInput,
  directState: HeroRuntimeState | null,
): HeroLocalClocks {
  const clocks = directState
    ? { ...directState.captureClocks }
    : {
        loaderMs: Math.max(0, input.lifecycleElapsedMs),
        landingIdleMs: Math.max(
          0,
          input.lifecycleElapsedMs - WORLD_REVEAL_END_MS,
        ),
        fieldPulseMs: 0,
        arrivalMs: 0,
      };

  Object.assign(clocks, input.localClocks);

  if (
    input.localTimeOverrideMs !== undefined &&
    input.localTimeOverrideMs !== null
  ) {
    const localTime = Math.max(0, input.localTimeOverrideMs);

    if (
      directState?.key === 'field-contact' ||
      directState?.key === 'field-pulse-a' ||
      directState?.key === 'field-pulse-b'
    ) {
      clocks.fieldPulseMs = localTime;
    } else if (
      directState?.key === 'arrival-travel' ||
      directState?.key === 'arrival-lockup' ||
      directState?.key === 'journey-exit'
    ) {
      clocks.arrivalMs = localTime;
    } else if (
      directState?.key === 'landing' ||
      directState?.key === 'landing-idle'
    ) {
      clocks.landingIdleMs = localTime;
    } else {
      clocks.loaderMs = localTime;
    }
  }

  return clocks;
}

export function createHeroJourneySnapshot(
  input: HeroControllerInput,
): HeroJourneySnapshot {
  const profile = selectHeroRuntimeProfile(input);
  const directState = input.directStateKey
    ? getHeroRuntimeState(input.directStateKey)
    : null;
  const measuredRawProgress = input.pageMeasurement
    ? getRawJourneyProgress(input.pageMeasurement)
    : clampRawProgress(input.rawProgress ?? 0);
  const rawProgress = directState
    ? directState.progress.target === null
      ? 0
      : mapSceneProgressToRaw(directState.progress.target, profile.id)
    : measuredRawProgress;
  const mappedSceneProgress = mapRawProgressToScene(rawProgress, profile.id);
  const sceneTargetProgress = clampSceneProgress(
    directState?.progress.target ?? mappedSceneProgress,
  );
  const lifecycle = lifecycleFor(
    directState,
    rawProgress,
    sceneTargetProgress,
    input.lifecycleElapsedMs,
  );
  const { stepIndex: mappedStepIndex, stepProgress } =
    getDomStepSnapshot(sceneTargetProgress);
  const stepIndex = directState?.processStepIndex ?? mappedStepIndex;
  const localClocks = resolveLocalClocks(input, directState);
  const referenceState =
    directState ??
    automatedReferenceState(
      lifecycle,
      input.lifecycleElapsedMs,
      sceneTargetProgress,
      localClocks.fieldPulseMs,
    );
  const dom = getHeroDomPresentation(
    rawProgress,
    directState ? undefined : input.pageMeasurement,
  );

  return {
    rawProgress,
    sceneTargetProgress,
    lifecycle,
    motion: profile.motion,
    profile,
    stepIndex,
    stepProgress: directState ? 1 : stepProgress,
    copyState: directState?.copyState ?? copyStateFor(lifecycle, stepIndex),
    referenceState,
    localClocks,
    deterministicSeed: HERO_CAPTURE_SEED,
    directEntry: Boolean(directState),
    dom,
  };
}
