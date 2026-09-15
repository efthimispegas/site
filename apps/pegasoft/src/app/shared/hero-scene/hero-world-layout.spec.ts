import { describe, expect, it } from 'vitest';
import {
  HERO_PROXY_GROUND_SIZE,
  HERO_WORLD_LAYOUT,
  type HeroWorldLayoutItem,
} from './hero-world-layout';

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

function isStructure(item: HeroWorldLayoutItem) {
  return item.kind !== 'worker' && item.kind !== 'wind-turbine';
}

describe('hero world layout', () => {
  it('is serializable, finite, and uses globally stable ids', () => {
    const serialized = JSON.stringify(HERO_WORLD_LAYOUT);
    const ids = items.map((item) => item.id);

    expect(JSON.parse(serialized)).toEqual(HERO_WORLD_LAYOUT);
    expect(new Set(ids).size).toBe(ids.length);
    expect(numericValues(HERO_WORLD_LAYOUT).every(Number.isFinite)).toBe(true);
  });

  it('keeps the two zones dense and procedurally owned', () => {
    expect(
      HERO_WORLD_LAYOUT.activation.items.filter(isStructure).length,
    ).toBeGreaterThanOrEqual(15);
    expect(
      HERO_WORLD_LAYOUT.clearance.items.filter(isStructure).length,
    ).toBeGreaterThanOrEqual(24);

    for (const zone of zones) {
      expect(zone.calibration).toBe('provisional-unaccepted-proxy');
      expect(zone.assetPolicy).toBe('original-procedural-only');
    }
  });

  it('uses smaller authored building footprints than the retired sparse blocks', () => {
    const sizedStructures = items.filter(
      (
        item,
      ): item is Extract<
        HeroWorldLayoutItem,
        { kind: 'building' | 'stepped-building' | 'warehouse' }
      > =>
        item.kind === 'building' ||
        item.kind === 'stepped-building' ||
        item.kind === 'warehouse',
    );

    expect(
      Math.max(...sizedStructures.map((item) => item.size[0])),
    ).toBeLessThanOrEqual(5.4);
    expect(
      Math.max(...sizedStructures.map((item) => item.size[2])),
    ).toBeLessThanOrEqual(3.8);
  });

  it('keeps the proxy ground beyond every locked route and retreat pose', () => {
    expect(HERO_PROXY_GROUND_SIZE).toBeGreaterThanOrEqual(1000);
  });
});
