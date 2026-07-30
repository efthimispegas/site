import type { HeroJourneySnapshot } from './hero-contract';

export type HeroDevelopmentDiagnostics = Record<
  `data-${string}`,
  string | number | boolean
>;

export function getHeroSceneDevelopmentDiagnostics(
  snapshot: HeroJourneySnapshot,
): HeroDevelopmentDiagnostics {
  return {
    'data-hero-reference-state': snapshot.referenceState.key,
    'data-hero-step': snapshot.stepIndex + 1,
    'data-hero-lifecycle': snapshot.lifecycle,
    'data-hero-motion': snapshot.motion,
    'data-hero-profile': snapshot.profile.id,
    'data-hero-scene-progress': snapshot.sceneTargetProgress.toFixed(6),
    'data-hero-direct-entry': snapshot.directEntry,
    'data-hero-pointer-trail': snapshot.profile.pointerTrail,
    'data-hero-seed': snapshot.deterministicSeed,
  };
}

export function getHeroShellDevelopmentDiagnostics(
  snapshot: HeroJourneySnapshot,
): HeroDevelopmentDiagnostics {
  return {
    'data-direct-entry': snapshot.directEntry,
    'data-hero-lifecycle': snapshot.lifecycle,
    'data-hero-copy-state': snapshot.copyState,
    'data-hero-raw-progress': snapshot.rawProgress.toFixed(6),
    'data-hero-scene-progress': snapshot.sceneTargetProgress.toFixed(6),
  };
}
