import {
  HERO_CAPTURE_SEED,
  type HeroControllerInput,
  type HeroCopyState,
  type HeroJourneySnapshot,
  type HeroLifecycle,
  type HeroLocalClocks,
} from './hero-contract';
import { selectHeroRuntimeProfile } from './hero-profile';
import {
  deriveHeroProgress,
  getDomStepSnapshot,
  getHeroDomPresentation,
} from './hero-sequence';
import { getHeroRuntimeState } from './hero-runtime-states';

const LOADER_MARK_END_MS = 3200;
const WORLD_REVEAL_END_MS = 4800;
const LANDING_IDLE_START_MS = 6500;

function lifecycleFor(
  scrollY: number,
  sceneProgress: number,
  lifecycleElapsedMs: number,
): HeroLifecycle {
  if (scrollY <= 0 && lifecycleElapsedMs < WORLD_REVEAL_END_MS)
    return 'loading';
  if (scrollY <= 0) return 'landing';
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

function resolveLocalClocks(input: HeroControllerInput): HeroLocalClocks {
  const elapsedMs = Number.isFinite(input.lifecycleElapsedMs)
    ? Math.max(0, input.lifecycleElapsedMs)
    : 0;
  // S2 replaces coupled local clocks with the shared applied-frame owner.
  // Capture labels/times do not set elapsed effect outputs here.
  return {
    loaderMs: elapsedMs,
    landingIdleMs: Math.max(0, elapsedMs - WORLD_REVEAL_END_MS),
    fieldPulseMs: 0,
    arrivalMs: 0,
  };
}

export function createHeroJourneySnapshot(
  input: HeroControllerInput,
): HeroJourneySnapshot {
  const profile = selectHeroRuntimeProfile(input);
  const directState = input.directStateKey
    ? getHeroRuntimeState(input.directStateKey)
    : null;
  const progress = deriveHeroProgress(input.pageMeasurement);
  const rawProgress = progress.domProgress;
  const sceneTargetProgress = progress.sceneTargetProgress;
  const lifecycle = lifecycleFor(
    progress.valid && input.pageMeasurement ? input.pageMeasurement.scrollY : 0,
    sceneTargetProgress,
    input.lifecycleElapsedMs,
  );
  const { stepIndex, stepProgress } = getDomStepSnapshot(progress.domProgress);
  const localClocks = resolveLocalClocks(input);
  const referenceState = automatedReferenceState(
    lifecycle,
    input.lifecycleElapsedMs,
    sceneTargetProgress,
    localClocks.fieldPulseMs,
  );
  const dom = getHeroDomPresentation(rawProgress, input.pageMeasurement);

  return {
    rawProgress,
    domProgress: progress.domProgress,
    sceneTargetProgress,
    progress,
    physicalInput: input.pageMeasurement ?? null,
    captureRequest: directState
      ? {
          stateKey: directState.key,
          sceneTargetSelection: directState.progress.target ?? 0,
        }
      : null,
    lifecycle,
    motion: profile.motion,
    profile,
    stepIndex,
    stepProgress,
    copyState: copyStateFor(lifecycle, stepIndex),
    referenceState,
    localClocks,
    deterministicSeed: HERO_CAPTURE_SEED,
    directEntry: Boolean(directState),
    dom,
  };
}
