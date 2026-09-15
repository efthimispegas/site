import * as THREE from 'three';
import { HERO_CAPTURE_SEED } from './hero-contract';
import { HERO_LANDING_RAIL_PATHS } from './hero-route';

export const HERO_WORLD_REVEAL_START_MS = 3200;
const WORLD_REVEAL_DRAW_SECONDS = 0.32;
const WORLD_REVEAL_RAIL_STAGGER_SECONDS = 0.06;
const LANDING_DRAW_SECONDS = 1;
const LANDING_RETRACT_SECONDS = 0.8;
const LANDING_RAIL_STAGGER_SECONDS = 0.45;
const LANDING_IDLE_MIN_SECONDS = 1.4;
const LANDING_IDLE_MAX_SECONDS = 3;
const SEEDED_CADENCE_CYCLES = 64;

function seededUnit(railIndex: number, cycleIndex: number) {
  let state =
    (HERO_CAPTURE_SEED ^
      Math.imul(railIndex + 1, 0x9e3779b1) ^
      Math.imul(cycleIndex + 1, 0x85ebca6b)) >>>
    0;
  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d);
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b);
  state ^= state >>> 16;
  return (state >>> 0) / 0xffffffff;
}

const landingIdleDurations = Array.from(
  { length: HERO_LANDING_RAIL_PATHS.length },
  (_, railIndex) =>
    Array.from({ length: SEEDED_CADENCE_CYCLES }, (_, cycleIndex) =>
      THREE.MathUtils.lerp(
        LANDING_IDLE_MIN_SECONDS,
        LANDING_IDLE_MAX_SECONDS,
        seededUnit(railIndex, cycleIndex),
      ),
    ),
);

export function sampleLandingRailRange(
  elapsedSeconds: number,
  railIndex: number,
) {
  let phaseSeconds =
    Math.max(0, elapsedSeconds) - railIndex * LANDING_RAIL_STAGGER_SECONDS;

  if (phaseSeconds < 0) {
    return null;
  }

  const cycleDurations = landingIdleDurations[railIndex];
  const cadenceDuration = cycleDurations.reduce(
    (total, idleDuration) =>
      total + LANDING_DRAW_SECONDS + LANDING_RETRACT_SECONDS + idleDuration,
    0,
  );
  phaseSeconds %= cadenceDuration;

  for (const idleDuration of cycleDurations) {
    if (phaseSeconds <= LANDING_DRAW_SECONDS) {
      return {
        start: 0,
        end: phaseSeconds / LANDING_DRAW_SECONDS,
      };
    }

    phaseSeconds -= LANDING_DRAW_SECONDS;
    if (phaseSeconds <= LANDING_RETRACT_SECONDS) {
      return {
        start: phaseSeconds / LANDING_RETRACT_SECONDS,
        end: 1,
      };
    }

    phaseSeconds -= LANDING_RETRACT_SECONDS;
    if (phaseSeconds < idleDuration) {
      return null;
    }
    phaseSeconds -= idleDuration;
  }

  return null;
}

export function sampleWorldRevealRailRange(
  elapsedSeconds: number,
  railIndex: number,
) {
  const localSeconds =
    elapsedSeconds - railIndex * WORLD_REVEAL_RAIL_STAGGER_SECONDS;

  if (localSeconds <= 0) {
    return null;
  }

  return {
    start: 0,
    end: THREE.MathUtils.clamp(localSeconds / WORLD_REVEAL_DRAW_SECONDS, 0, 1),
  };
}
