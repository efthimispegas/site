import { dampHeroProgress, type HeroDampedProgress } from './hero-camera-model';
import type { HeroMotionProfile } from './hero-contract';
import { HERO_CAPTURE_SEED } from './hero-contract';
import { approachHeroGateRatio } from './hero-local-clock';

export const HERO_FIELD_PULSE_PERIOD_MS = 3535;
export const HERO_FRAME_GATES = {
  red: [0, 0.17],
  blueZero: [0.17, 0.74],
  field: [0.72, 0.75],
  fieldComposition: [0.72, 0.85],
  blueOne: [0.74, 0.9],
  retreat: [0.9, 1.25],
} as const;

export type HeroIdlePacket = {
  active: boolean;
  phaseSeconds: number;
  spawnSeconds: number;
  start: number;
  end: number;
  completedCycles: number;
};
export type HeroFrameInput = {
  target: number;
  smoothTimeSeconds: number;
  motion: HeroMotionProfile;
  measurementSequence: number;
  /** Spatial frames may settle behind the loader; hidden local effects may not. */
  localEffectsActive?: boolean;
};
export type HeroRenderedFrame = {
  frameId: number;
  measurementSequence: number;
  nowMs: number;
  deltaMs: number;
  target: number;
  smoothTimeSeconds: number;
  rendered: HeroDampedProgress;
  ratios: Record<keyof typeof HERO_FRAME_GATES, number>;
  fieldElapsedMs: number;
  fieldResetSequence: number;
  arrivalElapsedMs: number;
  arrivalRatio: number;
  arrivalResetSequence: number;
  idle: readonly HeroIdlePacket[];
  randomState: number;
};
export type HeroAppliedConsumer = {
  frameId: number;
  renderedProgress: number;
  readback: Record<string, number | boolean | readonly number[]>;
};
export type HeroFrameRef = {
  current: HeroRenderedFrame;
  applied: Record<string, HeroAppliedConsumer>;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export function sampleHeroFrameRatios(
  progress: number,
): HeroRenderedFrame['ratios'] {
  return Object.fromEntries(
    Object.entries(HERO_FRAME_GATES).map(([key, [a, b]]) => [
      key,
      clamp01((progress - a) / (b - a)),
    ]),
  ) as HeroRenderedFrame['ratios'];
}

export function createHeroRenderedFrame(target = 0): HeroRenderedFrame {
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  return {
    frameId: 0,
    measurementSequence: 0,
    nowMs: 0,
    deltaMs: 0,
    target: safeTarget,
    smoothTimeSeconds: 0.15,
    rendered: { value: safeTarget, velocity: 0 },
    ratios: sampleHeroFrameRatios(safeTarget),
    fieldElapsedMs: 0,
    fieldResetSequence: 0,
    arrivalElapsedMs: 0,
    arrivalRatio: 0,
    arrivalResetSequence: 0,
    randomState: HERO_CAPTURE_SEED,
    idle: [0, 1, 2, 3].map((index) => ({
      active: false,
      phaseSeconds: 0,
      spawnSeconds: index * 0.45,
      start: 0,
      end: 0,
      completedCycles: 0,
    })),
  };
}

/** One source-equivalent update. Effect clocks use the original delta, not damping's cap. */
export function advanceHeroRenderedFrame(
  previous: HeroRenderedFrame,
  input: HeroFrameInput,
  deltaSeconds: number,
): HeroRenderedFrame {
  const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const target = Number.isFinite(input.target) ? Math.max(0, input.target) : 0;
  const immediate = input.motion !== 'full';
  const rendered = immediate
    ? { value: target, velocity: 0 }
    : dampHeroProgress(
        previous.rendered,
        target,
        input.smoothTimeSeconds,
        delta,
      );
  const ratios = sampleHeroFrameRatios(rendered.value);
  const localEffectsActive = input.localEffectsActive !== false;
  const fieldActive = localEffectsActive && ratios.field > 0;
  const arrivalActive = localEffectsActive && ratios.blueOne === 1;
  let randomState = previous.randomState;
  const idle = previous.idle.map((packet) => {
    const next = { ...packet };
    if (immediate) return { ...next, active: false, start: 0, end: 0 };
    if (next.active) {
      next.phaseSeconds += delta;
      if (next.phaseSeconds < 1) {
        next.start = 0;
        next.end = next.phaseSeconds;
      } else if (next.phaseSeconds < 1.8) {
        next.start = (next.phaseSeconds - 1) / 0.8;
        next.end = 1;
      } else {
        randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
        next.active = false;
        next.phaseSeconds = 0;
        next.spawnSeconds = 1.4 + (randomState / 0x100000000) * 1.6;
        next.start = 0;
        next.end = 0;
        next.completedCycles++;
      }
    } else {
      next.start = 0;
      next.end = 0;
      if (target === 0) {
        next.spawnSeconds -= delta;
        if (next.spawnSeconds <= 0) {
          next.active = true;
          next.phaseSeconds = 0;
        }
      }
    }
    return next;
  });
  return {
    frameId: previous.frameId + 1,
    measurementSequence: input.measurementSequence,
    nowMs: previous.nowMs + delta * 1000,
    deltaMs: delta * 1000,
    target,
    smoothTimeSeconds: input.smoothTimeSeconds,
    rendered,
    ratios,
    fieldElapsedMs: fieldActive
      ? immediate
        ? 0
        : previous.fieldElapsedMs + delta * 1000
      : 0,
    fieldResetSequence:
      previous.fieldResetSequence +
      (previous.ratios.field > 0 && ratios.field === 0 ? 1 : 0),
    arrivalElapsedMs: arrivalActive
      ? previous.arrivalElapsedMs + delta * 1000
      : 0,
    arrivalRatio: immediate
      ? arrivalActive
        ? 1
        : 0
      : approachHeroGateRatio(previous.arrivalRatio, arrivalActive, delta, 2),
    arrivalResetSequence:
      previous.arrivalResetSequence +
      (previous.ratios.blueOne === 1 && ratios.blueOne < 1 ? 1 : 0),
    idle,
    randomState,
  };
}

/** Called by a consumer only after its own actual objects have been updated/read back. */
export function acknowledgeHeroFrame(
  ref: HeroFrameRef,
  consumer: string,
  readback: HeroAppliedConsumer['readback'],
) {
  ref.applied[consumer] = {
    frameId: ref.current.frameId,
    renderedProgress: ref.current.rendered.value,
    readback,
  };
}

/** Telemetry must never expose the mutable owner/ref objects as output setters. */
export function snapshotHeroFrame(ref: HeroFrameRef) {
  return structuredClone({ frame: ref.current, appliedConsumers: ref.applied });
}
