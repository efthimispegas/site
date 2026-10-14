import { HERO_FIELD_PULSE_PERIOD_MS } from './hero-frame-state';
import { sampleLoopPhase } from './hero-local-clock';

export const HERO_FIELD_STATIC_VISIBILITY = 1;

/** Static tile visibility is independent of the source grid activation ratio. */
export function sampleHeroFieldPulse(
  distance: number,
  center: boolean,
  ratio: number,
  elapsedMs: number,
) {
  if (center) return 0;
  const radius = sampleLoopPhase(elapsedMs, HERO_FIELD_PULSE_PERIOD_MS) * 7.07;
  return (
    Math.min(1, Math.max(0, 1 - Math.abs(distance - radius) / 1.2)) * ratio
  );
}
