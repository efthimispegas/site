export function sampleLoopPhase(elapsedMs: number, periodMs: number) {
  if (
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(periodMs) ||
    periodMs <= 0
  ) {
    return 0;
  }

  return (
    (((Math.max(0, elapsedMs) % periodMs) + periodMs) % periodMs) / periodMs
  );
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
