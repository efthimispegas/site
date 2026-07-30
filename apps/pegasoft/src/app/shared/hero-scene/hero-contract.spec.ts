import { describe, expect, it } from 'vitest';
import { HERO_REFERENCE_STATE_KEYS } from './hero-contract';
import { getReferenceState, referenceStates } from './reference-states';
import { getHeroRuntimeState } from './hero-runtime-states';

describe('hero reference-state contract', () => {
  it('contains the 15 locked recording states in canonical order', () => {
    expect(referenceStates.map(({ key }) => key)).toEqual(
      HERO_REFERENCE_STATE_KEYS,
    );
    expect(new Set(referenceStates.map(({ key }) => key)).size).toBe(15);
    expect(
      referenceStates.every(
        ({ recordingAnchor }) => recordingAnchor.captureSha256.length === 64,
      ),
    ).toBe(true);
  });

  it('preserves corrected exact recording anchors', () => {
    expect(getReferenceState('field-contact').recordingAnchor).toMatchObject({
      decodedFrameIndex: 1390,
      bestEffortTimestampPts: 139200,
      timestampSeconds: 23.2,
    });
    expect(getReferenceState('arrival-travel').recordingAnchor).toMatchObject({
      decodedFrameIndex: 1786,
      timestampSeconds: 29.8,
    });
    expect(getReferenceState('arrival-lockup').recordingAnchor).toMatchObject({
      decodedFrameIndex: 1858,
      timestampSeconds: 31,
    });
  });

  it('exposes only the four deterministically measured primary landmarks', () => {
    const measured = referenceStates
      .filter(({ screenBounds }) => screenBounds.landmark !== null)
      .map(({ key, screenBounds }) => ({
        key,
        landmark: screenBounds.landmark,
        evidence: screenBounds.evidence,
      }));

    expect(measured).toEqual([
      {
        key: 'loader-mark',
        landmark: [714, 340, 85, 85.5],
        evidence: 'observed',
      },
      {
        key: 'world-reveal',
        landmark: [714, 341, 84.5, 84],
        evidence: 'observed',
      },
      {
        key: 'field-pulse-b',
        landmark: [682, 326, 85, 87.5],
        evidence: 'observed',
      },
      {
        key: 'arrival-lockup',
        landmark: [597, 235.5, 179, 262.5],
        evidence: 'observed',
      },
    ]);
    expect(
      referenceStates.filter(
        ({ screenBounds }) => screenBounds.landmark === null,
      ),
    ).toHaveLength(11);
  });

  it('keeps same-progress local phases independently addressable', () => {
    expect(getReferenceState('landing').progress.target).toBe(0);
    expect(getReferenceState('landing-idle').progress.target).toBe(0);
    expect(getReferenceState('landing').localPhase).not.toBe(
      getReferenceState('landing-idle').localPhase,
    );

    const fieldKeys = [
      'field-contact',
      'field-pulse-a',
      'field-pulse-b',
    ] as const;
    expect(fieldKeys.map((key) => getReferenceState(key).progress.target)).toEqual(
      [0.74, 0.74, 0.74],
    );
    expect(
      new Set(fieldKeys.map((key) => getReferenceState(key).localPhase)).size,
    ).toBe(3);
  });

  it('round-trips as serializable evidence without Three.js objects', () => {
    expect(JSON.parse(JSON.stringify(referenceStates))).toEqual(
      referenceStates,
    );
  });

  it('keeps the production runtime projection synchronized with evidence', () => {
    for (const evidence of referenceStates) {
      const runtime = getHeroRuntimeState(evidence.key);

      expect(runtime).toEqual({
        key: evidence.key,
        phase: evidence.phase,
        progress: {
          target: evidence.progress.target,
          settledCamera: evidence.progress.settledCamera,
        },
        copyState: evidence.copyState,
        processStepIndex: evidence.processStepIndex,
        localPhase: evidence.localPhase,
        captureClocks: evidence.captureClocks,
      });
    }
  });
});
