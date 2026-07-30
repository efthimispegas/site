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

  it('exposes the four deterministically measured primary landmarks', () => {
    const measured = referenceStates
      .filter(
        ({ screenBounds }) =>
          screenBounds.primaryStructure.kind === 'landmark' &&
          screenBounds.primaryStructure.status === 'observed',
      )
      .map(({ key, screenBounds }) => ({
        key,
        landmark: screenBounds.landmark,
        landmarkStatus: screenBounds.landmarkStatus,
        primaryStructure: {
          kind: screenBounds.primaryStructure.kind,
          status: screenBounds.primaryStructure.status,
          label: screenBounds.primaryStructure.label,
          evidenceRef: screenBounds.primaryStructure.evidenceRef,
        },
      }));

    expect(measured).toEqual([
      {
        key: 'loader-mark',
        landmark: [714, 340, 85, 85.5],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'central blue loader mark',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/0/landmark',
        },
      },
      {
        key: 'world-reveal',
        landmark: [714, 341, 84.5, 84],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'central blue loader mark during world reveal',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/1/landmark',
        },
      },
      {
        key: 'field-pulse-b',
        landmark: [682, 326, 85, 87.5],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'elevated blue center tile',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/11/landmark',
        },
      },
      {
        key: 'arrival-lockup',
        landmark: [597, 235.5, 179, 262.5],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'large frontal arrival arrow',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/13/landmark',
        },
      },
    ]);
  });

  it('treats route-primary anchors as observed without requiring a landmark', () => {
    const expected = [
      {
        key: 'clearance-travel',
        route: [88, 123, 474, 264],
        label: 'high-chroma core of connected cyan clearance route',
        evidenceRef:
          'docs/hero-reference/recording-structural-bounds.json#/states/6/route',
      },
      {
        key: 'clearance-field-preview',
        route: [242, 556, 116, 54],
        label: 'high-chroma core of cyan route approaching the field preview',
        evidenceRef:
          'docs/hero-reference/recording-structural-bounds.json#/states/7/route',
      },
      {
        key: 'arrival-travel',
        route: [714, 352, 118, 9],
        label: 'high-chroma core of second horizontal cyan route',
        evidenceRef:
          'docs/hero-reference/recording-structural-bounds.json#/states/12/route',
      },
    ] as const;

    for (const { key, route, label, evidenceRef } of expected) {
      expect(getReferenceState(key).screenBounds).toMatchObject({
        status: 'observed',
        landmark: null,
        landmarkStatus: 'not-applicable',
        route,
        routeStatus: 'observed',
        boundary: null,
        boundaryStatus: 'not-applicable',
        primaryStructure: {
          kind: 'route',
          status: 'observed',
          label,
          evidenceRef,
        },
      });
    }
  });

  it('uses the observed section boundary as the journey-exit primary structure', () => {
    const { screenBounds } = getReferenceState('journey-exit');

    expect(screenBounds).toMatchObject({
      status: 'observed',
      landmark: null,
      landmarkStatus: 'not-applicable',
      route: null,
      routeStatus: 'not-applicable',
      boundary: [0, 367.5, 1508, 1],
      boundaryStatus: 'observed',
      primaryStructure: {
        kind: 'boundary',
        status: 'observed',
        label: 'hero-to-following-section boundary at journey exit',
        evidenceRef:
          'docs/hero-reference/recording-structural-bounds.json#/states/14/boundary',
      },
    });
  });

  it('keeps only unresolved landmark-primary anchors blocked', () => {
    const blocked = referenceStates
      .filter(
        ({ screenBounds }) =>
          screenBounds.primaryStructure.kind === 'landmark' &&
          screenBounds.primaryStructure.status === 'blocked',
      )
      .map(({ key }) => key);
    const notApplicable = referenceStates
      .filter(
        ({ screenBounds }) => screenBounds.landmarkStatus === 'not-applicable',
      )
      .map(({ key }) => key);

    expect(blocked).toEqual([
      'landing',
      'landing-idle',
      'activation-route',
      'activation-contact',
      'field-approach',
      'field-contact',
      'field-pulse-a',
    ]);
    expect(notApplicable).toEqual([
      'clearance-travel',
      'clearance-field-preview',
      'arrival-travel',
      'journey-exit',
    ]);
    expect(
      referenceStates.filter(
        ({ screenBounds }) =>
          screenBounds.primaryStructure.kind === 'landmark' &&
          screenBounds.primaryStructure.status === 'blocked',
      ),
    ).toHaveLength(7);
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
    expect(
      fieldKeys.map((key) => getReferenceState(key).progress.target),
    ).toEqual([0.74, 0.74, 0.74]);
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
