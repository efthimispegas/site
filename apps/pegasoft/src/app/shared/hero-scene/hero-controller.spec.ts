import { describe, expect, it } from 'vitest';
import {
  HERO_REFERENCE_STATE_KEYS,
  type HeroControllerInput,
} from './hero-contract';
import { createHeroJourneySnapshot } from './hero-controller';
import { parseHeroDevelopmentControl } from './hero-development-control';
import { selectHeroRuntimeProfile } from './hero-profile';
import { getScrollYForSceneProgress } from './hero-sequence';

const BASE_INPUT = {
  lifecycleElapsedMs: 8000,
  viewportWidth: 1440,
  viewportHeight: 900,
  devicePixelRatio: 1,
  pointerFine: true,
  reducedMotion: false,
  webglAvailable: true,
  pageMeasurement: {
    measurementSequence: 1,
    measuredAtMs: 100,
    scrollY: 0,
    viewportWidth: 1440,
    viewportHeight: 900,
    effectiveHeroHeight: 900,
    wrapperHeight: 900,
    flowHeight: 4104,
    flowDocumentTop: 900,
    fieldSectionViewportTop: null,
  },
} satisfies HeroControllerInput;

describe('hero controller', () => {
  it('parses development labels without supplying desired DOM answers', () => {
    expect(
      parseHeroDevelopmentControl('?__heroState=field-contact', 'development'),
    ).toEqual({
      stateKey: 'field-contact',
      localTimeMs: null,
      forceFallback: false,
    });
    expect(
      parseHeroDevelopmentControl(
        '?__heroState=field-contact&__heroTime=0',
        'production',
      ),
    ).toEqual({
      stateKey: null,
      localTimeMs: null,
      forceFallback: false,
    });
  });

  it('derives copy and within-step progress from DOM, not the scene domain', () => {
    const m = BASE_INPUT.pageMeasurement;
    const scrollY = Math.ceil(360 + 3204 * 0.697);
    const expectedDom = (scrollY - 360) / 3204;
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: { ...m, scrollY },
    });
    expect(snapshot.domProgress).toBeCloseTo(expectedDom, 12);
    expect(snapshot.rawProgress).toBe(snapshot.domProgress);
    expect(snapshot.stepIndex).toBe(2);
    expect(snapshot.stepProgress).toBeCloseTo(
      (expectedDom - 0.697) / (0.876 - 0.697),
      12,
    );
    expect(snapshot.copyState).toBe('step-03-field-match');
    expect(snapshot.sceneTargetProgress).toBeCloseTo(
      scrollY / (360 + (3204 * 400) / 356),
      12,
    );
    expect(snapshot.deterministicSeed).toBe(43117);
  });

  it('a state label alone cannot alter DOM, lifecycle, progress, or local clocks', () => {
    const m = BASE_INPUT.pageMeasurement;
    for (const scrollY of [0, 100, 304, 700, 2250, 5000]) {
      const input = { ...BASE_INPUT, pageMeasurement: { ...m, scrollY } };
      const normal = createHeroJourneySnapshot(input);
      for (const key of HERO_REFERENCE_STATE_KEYS) {
        const direct = createHeroJourneySnapshot({
          ...input,
          directStateKey: key,
          localTimeOverrideMs: 9876,
        });
        const {
          captureRequest: _request,
          directEntry: _entry,
          ...actual
        } = direct;
        const {
          captureRequest: _normalRequest,
          directEntry: _normalEntry,
          ...expected
        } = normal;
        expect(actual).toEqual(expected);
        expect(direct.captureRequest?.stateKey).toBe(key);
        expect(direct.directEntry).toBe(true);
      }
    }
  });

  it('direct physical input recipes resolve through the ordinary mapping', () => {
    for (const key of HERO_REFERENCE_STATE_KEYS) {
      const request = createHeroJourneySnapshot({
        ...BASE_INPUT,
        directStateKey: key,
      }).captureRequest;
      if (!request) throw new Error('Expected a capture input recipe');
      const m = BASE_INPUT.pageMeasurement;
      const scrollY = getScrollYForSceneProgress(
        request.sceneTargetSelection,
        m,
      );
      const physical = { ...m, scrollY };
      const direct = createHeroJourneySnapshot({
        ...BASE_INPUT,
        pageMeasurement: physical,
        directStateKey: key,
      });
      const normal = createHeroJourneySnapshot({
        ...BASE_INPUT,
        pageMeasurement: physical,
      });
      expect(direct.stepIndex).toBe(normal.stepIndex);
      expect(direct.stepProgress).toBe(normal.stepProgress);
      expect(direct.copyState).toBe(normal.copyState);
      expect(direct.lifecycle).toBe(normal.lifecycle);
      expect(direct.dom).toEqual(normal.dom);
      expect(direct.sceneTargetProgress).toBeCloseTo(
        request.sceneTargetSelection,
        12,
      );
    }
  });

  it('keeps early physical scrolling instead of clamping it away at the DOM lead', () => {
    const m = BASE_INPUT.pageMeasurement;
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: { ...m, scrollY: 100 },
    });
    expect(snapshot.domProgress).toBe(0);
    expect(snapshot.sceneTargetProgress).toBeGreaterThan(0);
    expect(snapshot.lifecycle).toBe('journey');
    expect(snapshot.copyState).toBe('step-01-activation');
    expect(snapshot.physicalInput?.scrollY).toBe(100);
    expect(snapshot.progress.measurementSequence).toBe(m.measurementSequence);
  });

  it('missing/non-finite physical geometry is neutral and invalid, not fitted from a raw number', () => {
    const missing = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: undefined,
      rawProgress: 0.7,
    });
    expect(missing.progress.valid).toBe(false);
    expect(missing.sceneTargetProgress).toBe(0);
    expect(missing.rawProgress).toBe(0);
    const bad = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: { ...BASE_INPUT.pageMeasurement, scrollY: NaN },
    });
    expect(bad.progress.invalidReason).toBe('non-finite-physical-measurement');
    expect(bad.sceneTargetProgress).toBe(0);
  });

  it('retains physical negative scroll and deep exit while derived DOM remains clamped', () => {
    const m = BASE_INPUT.pageMeasurement;
    const negative = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: { ...m, scrollY: -20 },
    });
    expect(negative.physicalInput?.scrollY).toBe(-20);
    expect(negative.sceneTargetProgress).toBe(0);
    const exit = createHeroJourneySnapshot({
      ...BASE_INPUT,
      pageMeasurement: { ...m, scrollY: 8000 },
    });
    expect(exit.sceneTargetProgress).toBeGreaterThan(1.25);
    expect(exit.domProgress).toBe(1);
    expect(exit.lifecycle).toBe('exit');
    expect(exit.stepIndex).toBe(3);
  });

  it('selects authored runtime profiles and desktop-only interaction', () => {
    const desktop = selectHeroRuntimeProfile(BASE_INPUT);
    const mobile = selectHeroRuntimeProfile({
      ...BASE_INPUT,
      viewportWidth: 390,
      viewportHeight: 844,
      pointerFine: false,
    });
    const reduced = selectHeroRuntimeProfile({
      ...BASE_INPUT,
      reducedMotion: true,
    });
    const coarseTablet = selectHeroRuntimeProfile({
      ...BASE_INPUT,
      viewportWidth: 960,
      viewportHeight: 768,
      pointerFine: false,
    });
    const fallback = selectHeroRuntimeProfile({
      ...BASE_INPUT,
      webglAvailable: false,
    });

    expect(desktop).toMatchObject({
      id: 'desktop',
      cameraSmoothTimeSeconds: 0.15,
      pointerTrail: true,
    });
    expect(mobile).toMatchObject({
      id: 'mobile',
      cameraSmoothTimeSeconds: 0.15,
      pointerTrail: true,
    });
    expect(reduced.motion).toBe('reduced');
    expect(coarseTablet).toMatchObject({
      id: 'tablet',
      inputClass: 'coarse-pointer',
      pointerTrail: true,
    });
    expect(fallback.motion).toBe('static');
  });

  it('caps renderer density to the source desktop, mobile, and iOS budgets', () => {
    expect(
      selectHeroRuntimeProfile({
        ...BASE_INPUT,
        devicePixelRatio: 3,
      }).maxDpr,
    ).toBe(1.75);
    expect(
      selectHeroRuntimeProfile({
        ...BASE_INPUT,
        viewportWidth: 390,
        viewportHeight: 844,
        devicePixelRatio: 3,
        pointerFine: false,
        userAgent: 'Android',
      }).maxDpr,
    ).toBe(1.5);
    expect(
      selectHeroRuntimeProfile({
        ...BASE_INPUT,
        devicePixelRatio: 3,
        userAgent: 'iPhone',
      }).maxDpr,
    ).toBe(1.25);
  });
});
