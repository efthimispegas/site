import { describe, expect, it } from 'vitest';
import {
  HERO_RAW_PROGRESS_MAX,
  HERO_SCENE_PROGRESS_MAX,
} from './hero-contract';
import {
  clampRawProgress,
  clampSceneProgress,
  getDomStepSnapshot,
  getHeroDomPresentation,
  getRawJourneyProgress,
  getScrollYForRawJourneyProgress,
  HERO_DOM_STEP_STARTS,
  mapRawProgressToScene,
  mapSceneProgressToRaw,
} from './hero-sequence';

describe('hero sequence mapping', () => {
  it('keeps the DOM and scene domains independent', () => {
    expect(HERO_DOM_STEP_STARTS).toEqual([0, 0.191, 0.697, 0.876]);
    expect(getDomStepSnapshot(0.190999).stepIndex).toBe(0);
    expect(getDomStepSnapshot(0.191).stepIndex).toBe(1);
    expect(getDomStepSnapshot(0.697).stepIndex).toBe(2);
    expect(getDomStepSnapshot(0.876).stepIndex).toBe(3);

    expect(mapRawProgressToScene(0.191, 'desktop')).toBeCloseTo(
      0.245458857519,
      9,
    );
    expect(mapRawProgressToScene(0.191, 'mobile')).toBeCloseTo(
      0.228576034853,
      9,
    );
  });

  it('supports the source-confirmed retreat domain through 1.25', () => {
    expect(clampRawProgress(2)).toBe(HERO_RAW_PROGRESS_MAX);
    expect(clampSceneProgress(1.2)).toBe(1.2);
    expect(clampSceneProgress(2)).toBe(HERO_SCENE_PROGRESS_MAX);
    expect(mapRawProgressToScene(1, 'recording-desktop')).toBeCloseTo(
      0.900166,
      5,
    );
    expect(
      mapRawProgressToScene(1.186937793142, 'recording-desktop'),
    ).toBeCloseTo(1.0513, 9);
  });

  it('normalizes non-finite progress safely', () => {
    expect(clampRawProgress(Number.NaN)).toBe(0);
    expect(clampSceneProgress(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('normalizes the sticky flow from one physical page measurement', () => {
    const viewportHeight = 900;
    const flowHeight = 4104;
    const scrollRange = flowHeight - viewportHeight;
    const scrollY = 360 + scrollRange * 0.697;

    expect(
      getRawJourneyProgress({
        scrollY,
        viewportHeight,
        flowViewportTop: 420 - scrollY,
        flowHeight,
        fieldSectionViewportTop: 1200,
      }),
    ).toBeCloseTo(0.697, 9);
  });

  it('selects identical DOM state for forward, reverse, jump, and restore', () => {
    const samples = [0, 0.190999, 0.191, 0.696999, 0.697, 0.875999, 0.876, 1];
    const forward = samples.map(
      (progress) => getDomStepSnapshot(progress).stepIndex,
    );
    const reverse = [...samples]
      .reverse()
      .map((progress) => getDomStepSnapshot(progress).stepIndex)
      .reverse();
    const jumped = getDomStepSnapshot(HERO_DOM_STEP_STARTS[2]);
    const restoredScrollY = 360 + (4104 - 900) * HERO_DOM_STEP_STARTS[2];
    const restoredRaw = getRawJourneyProgress({
      scrollY: restoredScrollY,
      viewportHeight: 900,
      flowViewportTop: 420 - restoredScrollY,
      flowHeight: 4104,
      fieldSectionViewportTop: 1200,
    });

    expect(forward).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(reverse).toEqual(forward);
    expect(jumped.stepIndex).toBe(2);
    expect(getDomStepSnapshot(restoredRaw).stepIndex).toBe(2);
  });

  it('reproduces the observed recording-profile DOM handoffs', () => {
    const recordingMeasurement = {
      scrollY: 0,
      viewportHeight: 761,
      flowViewportTop: 420,
      flowHeight: 3470.1563,
      fieldSectionViewportTop: null,
    };
    const roundedHandoffs = HERO_DOM_STEP_STARTS.slice(1).map((sceneProgress) =>
      Math.ceil(
        getScrollYForRawJourneyProgress(
          mapSceneProgressToRaw(sceneProgress, 'recording-desktop'),
          recordingMeasurement,
        ),
      ),
    );

    expect(roundedHandoffs).toEqual([640, 2334, 2934]);
  });

  it('derives landing and field presentation without a second threshold owner', () => {
    const atStart = getHeroDomPresentation(0, {
      scrollY: 0,
      viewportHeight: 900,
      flowViewportTop: 420,
      flowHeight: 4104,
      fieldSectionViewportTop: 702,
    });
    const afterLanding = getHeroDomPresentation(0, {
      scrollY: 216,
      viewportHeight: 900,
      flowViewportTop: 204,
      flowHeight: 4104,
      fieldSectionViewportTop: 162,
    });

    expect(atStart).toEqual({
      landingExitProgress: 0,
      landingFadeProgress: 0,
      flowRevealProgress: 0,
      fieldVisibility: 1,
      landingHidden: false,
    });
    expect(afterLanding).toEqual({
      landingExitProgress: 1,
      landingFadeProgress: 1,
      flowRevealProgress: 0.3380281690140845,
      fieldVisibility: 0,
      landingHidden: true,
    });
  });
});
