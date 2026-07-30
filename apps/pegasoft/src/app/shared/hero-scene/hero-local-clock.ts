export type HeroGateClockState = {
  active: boolean;
  startedAtMs: number | null;
  elapsedMs: number;
};

export const INACTIVE_HERO_GATE_CLOCK: HeroGateClockState = {
  active: false,
  startedAtMs: null,
  elapsedMs: 0,
};

export function updateHeroGateClock(
  state: HeroGateClockState,
  active: boolean,
  nowMs: number,
  injectedElapsedMs?: number | null,
): HeroGateClockState {
  if (!active) {
    return INACTIVE_HERO_GATE_CLOCK;
  }

  if (injectedElapsedMs !== undefined && injectedElapsedMs !== null) {
    return {
      active: true,
      startedAtMs: nowMs - Math.max(0, injectedElapsedMs),
      elapsedMs: Math.max(0, injectedElapsedMs),
    };
  }

  if (!state.active || state.startedAtMs === null) {
    return {
      active: true,
      startedAtMs: nowMs,
      elapsedMs: 0,
    };
  }

  return {
    active: true,
    startedAtMs: state.startedAtMs,
    elapsedMs: Math.max(0, nowMs - state.startedAtMs),
  };
}

export function sampleLoopPhase(elapsedMs: number, periodMs: number) {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(periodMs) || periodMs <= 0) {
    return 0;
  }

  return ((Math.max(0, elapsedMs) % periodMs) + periodMs) % periodMs / periodMs;
}

export function approachHeroGateRatio(
  current: number,
  active: boolean,
  deltaSeconds: number,
  ratePerSecond = 2,
) {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeDelta = Number.isFinite(deltaSeconds)
    ? Math.max(0, deltaSeconds)
    : 0;
  const safeRate = Number.isFinite(ratePerSecond)
    ? Math.max(0, ratePerSecond)
    : 0;
  const direction = active ? 1 : -1;

  return Math.min(
    1,
    Math.max(0, safeCurrent + direction * safeDelta * safeRate),
  );
}
