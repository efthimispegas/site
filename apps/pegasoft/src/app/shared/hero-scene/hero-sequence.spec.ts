import { describe, expect, it } from 'vitest';
import type { HeroPageScrollMeasurement } from './hero-contract';
import {
  clampRawProgress,
  clampSceneProgress,
  deriveHeroProgress,
  getDomStepSnapshot,
  getEffectiveHeroHeight,
  getHeroDomPresentation,
  getRawJourneyProgress,
  getScrollYForRawJourneyProgress,
  getScrollYForSceneProgress,
  HERO_DOM_STEP_STARTS,
  isHeroMobileDevice,
  HERO_STEP_NAVIGATION_OFFSETS,
} from './hero-sequence';

const BASE: HeroPageScrollMeasurement = {
  measurementSequence: 1,
  measuredAtMs: 100,
  scrollY: 0,
  viewportWidth: 1508,
  viewportHeight: 761,
  effectiveHeroHeight: 761,
  wrapperHeight: 761,
  flowHeight: 3470.15625,
  flowDocumentTop: 761,
  fieldSectionViewportTop: null,
};

// Encoded independently of implementation helpers from the hashed live source.
function oracle(m: HeroPageScrollMeasurement) {
  const range = Math.max(m.flowHeight - m.wrapperHeight, 1);
  return {
    dom: Math.max(
      0,
      Math.min(1, (m.scrollY - 0.4 * m.effectiveHeroHeight) / range),
    ),
    scene: Math.max(
      0,
      m.scrollY /
        Math.max(0.4 * m.effectiveHeroHeight + (range * 400) / 356, 1),
    ),
  };
}
const geometries = [
  BASE,
  { ...BASE, flowHeight: 3470 },
  {
    ...BASE,
    viewportWidth: 1440,
    viewportHeight: 900,
    effectiveHeroHeight: 900,
    wrapperHeight: 900,
    flowHeight: 4104,
  },
  {
    ...BASE,
    viewportWidth: 1024,
    viewportHeight: 768,
    effectiveHeroHeight: 768,
    wrapperHeight: 768,
    flowHeight: 3502,
  },
  {
    ...BASE,
    viewportWidth: 390,
    viewportHeight: 744,
    effectiveHeroHeight: 844,
    wrapperHeight: 744,
    flowHeight: 4811,
  },
];

describe('source physical progress mapping', () => {
  it('reproduces all four A01 samples without early-scroll freeze or wrong DOM steps', () => {
    const cases = [
      [100, 0.029865047735, 0],
      [304, 0.090789745114, 0],
      [700, 0.209055334145, 0],
      [2250, 0.671963574038, 2],
    ];
    for (const [scrollY, expectedScene, expectedStep] of cases) {
      const result = deriveHeroProgress({ ...BASE, scrollY });
      expect(result.valid).toBe(true);
      expect(Math.abs(result.sceneTargetProgress - expectedScene)).toBeLessThan(
        1e-6,
      );
      expect(getDomStepSnapshot(result.domProgress).stepIndex).toBe(
        expectedStep,
      );
      expect(result.sceneTargetProgress).toBeGreaterThan(0);
    }
  });

  it('matches every source gate triplet across offset/rect/resize geometries', () => {
    for (const geometry of geometries) {
      const range = Math.max(geometry.flowHeight - geometry.wrapperHeight, 1);
      const denominator = Math.max(
        0.4 * geometry.effectiveHeroHeight + (range * 400) / 356,
        1,
      );
      const scrolls = [
        -100,
        0,
        100,
        304,
        700,
        2250,
        denominator * 1.5,
        ...[0, 0.17, 0.72, 0.74, 0.75, 0.85, 0.9, 1, 1.25].flatMap((gate) =>
          [-0.001, 0, 0.001].map((offset) => (gate + offset) * denominator),
        ),
        ...HERO_DOM_STEP_STARTS.flatMap((gate) =>
          [-0.001, 0, 0.001].map(
            (offset) =>
              0.4 * geometry.effectiveHeroHeight + (gate + offset) * range,
          ),
        ),
      ];
      for (const scrollY of scrolls) {
        const measurement = { ...geometry, scrollY };
        const result = deriveHeroProgress(measurement);
        const expected = oracle(measurement);
        expect(Math.abs(result.domProgress - expected.dom)).toBeLessThanOrEqual(
          1e-6,
        );
        expect(
          Math.abs(result.sceneTargetProgress - expected.scene),
        ).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('uses source domains at DOM boundaries; navigation uses DOM not scene inverse', () => {
    expect(HERO_DOM_STEP_STARTS).toEqual([0, 0.191, 0.697, 0.876]);
    for (const [index, gate] of HERO_DOM_STEP_STARTS.entries()) {
      expect(getDomStepSnapshot(gate).stepIndex).toBe(index);
      const scrollY = getScrollYForRawJourneyProgress(gate, BASE);
      expect(getRawJourneyProgress({ ...BASE, scrollY })).toBeCloseTo(gate, 12);
    }
    expect(getDomStepSnapshot(0.191 - 0.001).stepIndex).toBe(0);
    expect(getDomStepSnapshot(0.191 - 1e-10).stepIndex).toBe(0);
    expect(getDomStepSnapshot(0.697 - 0.001).stepIndex).toBe(1);
    expect(getDomStepSnapshot(0.876 - 0.001).stepIndex).toBe(2);
    expect(getScrollYForSceneProgress(0, BASE)).toBe(0);
    expect(getScrollYForRawJourneyProgress(0, BASE)).toBe(
      0.4 * BASE.effectiveHeroHeight,
    );
  });

  it('preserves exit/overscroll inputs instead of limiting them to camera sampler bounds', () => {
    const scrollY = getScrollYForSceneProgress(1.6, BASE);
    const result = deriveHeroProgress({ ...BASE, scrollY });
    expect(result.sceneTargetProgress).toBeCloseTo(1.6, 12);
    expect(result.domProgress).toBe(1);
    expect(clampSceneProgress(result.sceneTargetProgress)).toBe(1.25);
    expect(clampRawProgress(NaN)).toBe(0);
    expect(clampSceneProgress(Infinity)).toBe(0);
  });

  it('uses source step-header destinations including the fourth overscroll selection', () => {
    expect(HERO_STEP_NAVIGATION_OFFSETS).toEqual([0.11, 0.01, 0.1, 0.13]);
    for (const [index, start] of HERO_DOM_STEP_STARTS.entries()) {
      const selection = start + HERO_STEP_NAVIGATION_OFFSETS[index];
      const expected =
        0.4 * BASE.effectiveHeroHeight +
        selection * Math.max(BASE.flowHeight - BASE.wrapperHeight, 1);
      expect(getScrollYForRawJourneyProgress(selection, BASE)).toBeCloseTo(
        expected,
        12,
      );
    }
    expect(HERO_DOM_STEP_STARTS[3] + HERO_STEP_NAVIGATION_OFFSETS[3]).toBe(
      1.006,
    );
  });

  it('uses wrapper/effective heights independently and does not relocate global source scroll', () => {
    const m = {
      ...BASE,
      scrollY: 700,
      viewportHeight: 600,
      effectiveHeroHeight: 844,
      wrapperHeight: 580,
      flowDocumentTop: 1250,
    };
    expect(deriveHeroProgress(m).sceneTargetProgress).toBeCloseTo(
      oracle(m).scene,
      12,
    );
    expect(
      deriveHeroProgress({ ...m, flowDocumentTop: 900 }).sceneTargetProgress,
    ).toBe(deriveHeroProgress(m).sceneTargetProgress);
    expect(
      deriveHeroProgress({ ...m, wrapperHeight: 600 }).sceneTargetProgress,
    ).not.toBe(deriveHeroProgress(m).sceneTargetProgress);
  });

  it('flags invalid measurements while preserving finite source guards', () => {
    for (const m of [
      { ...BASE, flowHeight: BASE.wrapperHeight },
      { ...BASE, flowHeight: BASE.wrapperHeight - 10 },
    ]) {
      const result = deriveHeroProgress({ ...m, scrollY: 100 });
      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('invalid-flow-layout');
      expect(result.sceneTargetProgress).toBeCloseTo(
        oracle({ ...m, scrollY: 100 }).scene,
        12,
      );
    }
    for (const key of [
      'scrollY',
      'viewportWidth',
      'viewportHeight',
      'effectiveHeroHeight',
      'wrapperHeight',
      'flowHeight',
      'flowDocumentTop',
      'fieldSectionViewportTop',
      'measuredAtMs',
      'measurementSequence',
    ] as const) {
      for (const value of [NaN, Infinity, -Infinity]) {
        const result = deriveHeroProgress({ ...BASE, [key]: value });
        expect(result.valid).toBe(false);
        expect(result.domProgress).toBe(0);
        expect(result.sceneTargetProgress).toBe(0);
        for (const output of Object.values(
          getHeroDomPresentation(0, { ...BASE, [key]: value }),
        )) {
          if (typeof output === 'number')
            expect(Number.isFinite(output)).toBe(true);
        }
      }
    }
    expect(deriveHeroProgress().invalidReason).toBe(
      'missing-physical-measurement',
    );
  });

  it('maintains source UA-specific height history and resets on orientation', () => {
    expect(isHeroMobileDevice('Android 14', false)).toBe(true);
    expect(isHeroMobileDevice('iPhone', false)).toBe(true);
    expect(isHeroMobileDevice('Macintosh', true)).toBe(true);
    expect(isHeroMobileDevice('Macintosh', false)).toBe(false);
    expect(isHeroMobileDevice('Linux desktop', true)).toBe(false);
    expect(isHeroMobileDevice('iPhone', false, true)).toBe(false);
    expect(getEffectiveHeroHeight(744, 844, true)).toBe(844);
    expect(getEffectiveHeroHeight(744, 844, false)).toBe(744);
    expect(getEffectiveHeroHeight(744, 844, true, true)).toBe(744);
    expect(getEffectiveHeroHeight(900, 844, true)).toBe(900);
  });

  it('keeps normal measured DOM presentation independent of scene/capture labels', () => {
    const start = getHeroDomPresentation(0, BASE);
    expect(start).toEqual({
      landingExitProgress: 0,
      landingFadeProgress: 0,
      flowRevealProgress: 0,
      fieldVisibility: 1,
      landingHidden: false,
    });
    const m = {
      ...BASE,
      viewportHeight: 900,
      scrollY: 216,
      fieldSectionViewportTop: 162,
    };
    expect(getHeroDomPresentation(0, m)).toEqual({
      landingExitProgress: 1,
      landingFadeProgress: 1,
      flowRevealProgress: 0.3380281690140845,
      fieldVisibility: 0,
      landingHidden: true,
    });
  });
});
