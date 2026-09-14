import * as THREE from 'three';
import { HERO_CAPTURE_SEED, type HeroTuple3 } from './hero-contract';

const ROUTE_Y = 0.15;
export const HERO_WORLD_REVEAL_START_MS = 3200;
const WORLD_REVEAL_DRAW_SECONDS = 0.32;
const WORLD_REVEAL_RAIL_STAGGER_SECONDS = 0.06;
const LANDING_DRAW_SECONDS = 1;
const LANDING_RETRACT_SECONDS = 0.8;
const LANDING_RAIL_STAGGER_SECONDS = 0.45;
const LANDING_IDLE_MIN_SECONDS = 1.4;
const LANDING_IDLE_MAX_SECONDS = 3;
const SEEDED_CADENCE_CYCLES = 64;

/**
 * Landing-camera packet geometry. These paths are intentionally independent
 * from the activation feeder network: the locked source shows the packet in
 * the lower-center landing composition before the journey camera follows the
 * later activation rails.
 *
 * The world-space controls are implementation candidates derived from the
 * observed recording-desktop route envelope, not recovered source geometry.
 */
export const HERO_LANDING_RAIL_PATHS = [
  [
    [-59.225, ROUTE_Y, -24.943],
    [-58.9, ROUTE_Y, -25.7],
    [-58.6, ROUTE_Y, -26.2],
    [-58.6, ROUTE_Y, -27.2],
    [-57.8, ROUTE_Y, -28.4],
    [-57.538, ROUTE_Y, -30.127],
  ],
  [
    [-58.097, ROUTE_Y, -24.266],
    [-57.8, ROUTE_Y, -25.25],
    [-57.45, ROUTE_Y, -26.15],
    [-56.9, ROUTE_Y, -27],
    [-56.701, ROUTE_Y, -28.825],
  ],
  [
    [-56.969, ROUTE_Y, -23.589],
    [-56.7, ROUTE_Y, -24.8],
    [-55.75, ROUTE_Y, -25.65],
    [-55.1, ROUTE_Y, -26.7],
    [-54.946, ROUTE_Y, -28.572],
  ],
  [
    [-55.841, ROUTE_Y, -22.912],
    [-55.55, ROUTE_Y, -24],
    [-54.65, ROUTE_Y, -24.8],
    [-53.9, ROUTE_Y, -25.65],
    [-53.654, ROUTE_Y, -26.997],
  ],
] as const satisfies readonly (readonly HeroTuple3[])[];

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
