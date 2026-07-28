import { referenceStates, type ReferenceState } from './reference-states';

export const HERO_STEP_COUNT = 4;
export const HERO_STEP_STARTS = [0, 0.32, 0.63, 0.86] as const;

export type HeroJourneySnapshot = {
  progress: number;
  stepIndex: number;
  stepProgress: number;
  referenceState: ReferenceState;
};

export function clampJourneyProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function getHeroJourneySnapshot(progress: number): HeroJourneySnapshot {
  const normalizedProgress = clampJourneyProgress(progress);
  const nextStepIndex = HERO_STEP_STARTS.findIndex(
    (start) => start > normalizedProgress,
  );
  const stepIndex =
    nextStepIndex === -1 ? HERO_STEP_COUNT - 1 : Math.max(0, nextStepIndex - 1);
  const stepStart = HERO_STEP_STARTS[stepIndex];
  const stepEnd = HERO_STEP_STARTS[stepIndex + 1] ?? 1;
  const nextStateIndex = referenceStates.findIndex(
    (state) => state.progress > normalizedProgress,
  );
  const referenceState =
    nextStateIndex <= 0
      ? referenceStates[0]
      : referenceStates[
          nextStateIndex === -1
            ? referenceStates.length - 1
            : nextStateIndex - 1
        ];

  return {
    progress: normalizedProgress,
    stepIndex,
    stepProgress: Math.min(
      1,
      Math.max(0, (normalizedProgress - stepStart) / (stepEnd - stepStart)),
    ),
    referenceState,
  };
}
