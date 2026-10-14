import type { HeroReferenceStateKey } from './hero-contract';
import { HERO_REFERENCE_STATE_KEYS } from './hero-contract';
import { HERO_TEST_DIAGNOSTICS } from './hero-test-diagnostics';

export type HeroDevelopmentControl = {
  stateKey: HeroReferenceStateKey | null;
  localTimeMs: number | null;
  forceFallback: boolean;
};

export function parseHeroDevelopmentControl(
  search: string,
  environment = process.env.NODE_ENV,
): HeroDevelopmentControl {
  if (environment === 'production' && !HERO_TEST_DIAGNOSTICS) {
    return {
      stateKey: null,
      localTimeMs: null,
      forceFallback: false,
    };
  }

  const params = new URLSearchParams(search);
  const requestedKey = params.get('__heroState');
  const stateKey = HERO_REFERENCE_STATE_KEYS.includes(
    requestedKey as HeroReferenceStateKey,
  )
    ? (requestedKey as HeroReferenceStateKey)
    : null;
  const requestedTimeValue = params.get('__heroTime');
  const requestedTime =
    requestedTimeValue === null ? null : Number(requestedTimeValue);

  return {
    stateKey,
    localTimeMs:
      requestedTime !== null && Number.isFinite(requestedTime)
        ? requestedTime
        : null,
    forceFallback: params.get('__heroFallback') === '1',
  };
}
