import { describe, expect, it } from 'vitest';
import {
  HERO_REFERENCE_STATE_KEYS,
  type HeroControllerInput,
} from './hero-contract';
import { createHeroJourneySnapshot } from './hero-controller';
import { parseHeroDevelopmentControl } from './hero-development-control';
import { selectHeroRuntimeProfile } from './hero-profile';

const BASE_INPUT: HeroControllerInput = {
  rawProgress: 0,
  lifecycleElapsedMs: 8000,
  viewportWidth: 1440,
  viewportHeight: 900,
  devicePixelRatio: 1,
  pointerFine: true,
  reducedMotion: false,
  webglAvailable: true,
};

describe('hero controller', () => {
  it('does not reinterpret an absent direct-capture clock as zero', () => {
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
        'development',
      ),
    ).toEqual({
      stateKey: 'field-contact',
      localTimeMs: 0,
      forceFallback: false,
    });
  });

  it('creates one deterministic DOM and scene snapshot', () => {
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      rawProgress: 0.697,
    });

    expect(snapshot.stepIndex).toBe(1);
    expect(snapshot.copyState).toBe('step-02-clearance');
    expect(snapshot.sceneTargetProgress).toBeCloseTo(0.654847541873, 9);
    expect(snapshot.deterministicSeed).toBe(43117);
  });

  it('directly enters every named state without traversal history', () => {
    for (const key of HERO_REFERENCE_STATE_KEYS) {
      const forward = createHeroJourneySnapshot({
        ...BASE_INPUT,
        rawProgress: 1,
        directStateKey: key,
      });
      const reverse = createHeroJourneySnapshot({
        ...BASE_INPUT,
        rawProgress: 0,
        directStateKey: key,
      });

      expect(reverse).toEqual(forward);
      expect(forward.referenceState.key).toBe(key);
    }

    const pulse = createHeroJourneySnapshot({
      ...BASE_INPUT,
      directStateKey: 'field-pulse-b',
    });
    expect(pulse.sceneTargetProgress).toBe(0.74);
    expect(pulse.localClocks.fieldPulseMs).toBe(2800);
  });

  it('routes journey-exit time to arrival without reopening the loader', () => {
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      directStateKey: 'journey-exit',
      localTimeOverrideMs: 1000,
    });

    expect(snapshot.localClocks.loaderMs).toBe(5000);
    expect(snapshot.localClocks.arrivalMs).toBe(1000);
    expect(snapshot.lifecycle).toBe('exit');
  });

  it('keeps the controller declarative and leaves settled pose to the camera', () => {
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      rawProgress: 0.5,
    });

    expect(snapshot.sceneTargetProgress).toBeGreaterThan(0.25);
    expect(snapshot).not.toHaveProperty('settledCameraProgress');
  });

  it('owns raw, DOM, scene, and lifecycle outputs from one page measurement', () => {
    const scrollY = 360 + (4104 - 900) * 0.697;
    const snapshot = createHeroJourneySnapshot({
      ...BASE_INPUT,
      rawProgress: 0.01,
      pageMeasurement: {
        scrollY,
        viewportHeight: 900,
        flowViewportTop: 420 - scrollY,
        flowHeight: 4104,
        fieldSectionViewportTop: 702,
      },
    });

    expect(snapshot.rawProgress).toBeCloseTo(0.697, 9);
    expect(snapshot.stepIndex).toBe(1);
    expect(snapshot.lifecycle).toBe('journey');
    expect(snapshot.sceneTargetProgress).toBeCloseTo(0.654847541873, 9);
    expect(snapshot.dom).toEqual({
      landingExitProgress: 1,
      landingFadeProgress: 1,
      flowRevealProgress: 1,
      fieldVisibility: 1,
      landingHidden: true,
    });
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
      journeyHeightSvh: 456,
    });
    expect(mobile).toMatchObject({
      id: 'mobile',
      cameraSmoothTimeSeconds: 0.1,
      pointerTrail: false,
      journeyHeightSvh: 570,
    });
    expect(reduced.motion).toBe('reduced');
    expect(coarseTablet).toMatchObject({
      id: 'tablet',
      inputClass: 'coarse-pointer',
      pointerTrail: false,
      journeyHeightSvh: 500,
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
      }).maxDpr,
    ).toBe(1.5);
    expect(
      selectHeroRuntimeProfile({
        ...BASE_INPUT,
        devicePixelRatio: 3,
        isIosDevice: true,
      }).maxDpr,
    ).toBe(1.25);
  });
});
