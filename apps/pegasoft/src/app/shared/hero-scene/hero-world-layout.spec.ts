import { describe, expect, it } from 'vitest';
import { HERO_WORLD_LAYOUT } from './hero-world-layout';

import { sampleHeroGroundCoverage } from './hero-ground-coverage';
import { heroRuntimeStates } from './hero-runtime-states';

const zones = Object.values(HERO_WORLD_LAYOUT);
const items = zones.flatMap((zone) => zone.items);

function numericValues(value: unknown): number[] {
  if (typeof value === 'number') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(numericValues);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(numericValues);
  }

  return [];
}

describe('hero world layout', () => {
  it('is serializable, finite, and uses globally stable ids', () => {
    const serialized = JSON.stringify(HERO_WORLD_LAYOUT);
    const ids = items.map((item) => item.id);

    expect(JSON.parse(serialized)).toEqual(HERO_WORLD_LAYOUT);
    expect(new Set(ids).size).toBe(ids.length);
    expect(numericValues(HERO_WORLD_LAYOUT).every(Number.isFinite)).toBe(true);
  });

  it('labels every candidate zone as unaccepted procedural proxy', () => {
    for (const zone of zones) {
      expect(zone.calibration).toBe('provisional-unaccepted-proxy');
      expect(zone.assetPolicy).toBe('original-procedural-only');
    }
  });

  it.each([1508 / 761, 1440 / 900, 1024 / 768, 390 / 844, 390 / 988])(
    'covers actual viewport-plane intersections at aspect %f',
    (aspect) => {
      expect(heroRuntimeStates).toHaveLength(15);
      for (const state of heroRuntimeStates) {
        const progress = state.progress.settledCamera ?? 0;
        const hits = sampleHeroGroundCoverage(progress, aspect);
        expect(
          hits.every((hit) => hit.status === 'covered'),
          state.key,
        ).toBe(true);
      }
      for (let index = 0; index <= 350; index++) {
        expect(
          sampleHeroGroundCoverage(0.9 + index / 1000, aspect).every(
            (hit) => hit.status === 'covered',
          ),
        ).toBe(true);
      }
    },
  );
  it('detects an exposed ground edge instead of accepting any large-size label', () => {
    expect(
      sampleHeroGroundCoverage(0, 1508 / 761, 10).some(
        (hit) => hit.status === 'exposed-ground-edge',
      ),
    ).toBe(true);
  });
});
