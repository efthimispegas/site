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

  it('uses observed screen composition without inventing 3D camera transforms', () => {
    expect(
      referenceStates.map(
        ({ screenComposition }) => screenComposition.edgeDensity,
      ),
    ).toEqual([
      0.005413, 0.015766, 0.053274, 0.050906, 0.048061, 0.043121, 0.058774,
      0.051105, 0.060785, 0.072332, 0.059856, 0.061892, 0.043544, 0.040068,
      0.041301,
    ]);
    expect(
      referenceStates.map(
        ({ screenComposition }) => screenComposition.edgeCentroidNormalized,
      ),
    ).toEqual([
      [0.599798, 0.663796],
      [0.519851, 0.680921],
      [0.525995, 0.586713],
      [0.527173, 0.607513],
      [0.402921, 0.571181],
      [0.389836, 0.540079],
      [0.40239, 0.483194],
      [0.324725, 0.565828],
      [0.439477, 0.542102],
      [0.430387, 0.591739],
      [0.398184, 0.617764],
      [0.393562, 0.608693],
      [0.236686, 0.627488],
      [0.34332, 0.650004],
      [0.300249, 0.499447],
    ]);

    for (const [index, referenceState] of referenceStates.entries()) {
      expect(referenceState.screenComposition).toMatchObject({
        status: 'observed',
        evidence: 'observed',
        evidenceRef: `docs/hero-reference/recording-structural-bounds.json#/states/${index}/composition`,
        grid: { columns: 4, rows: 4 },
      });
      expect(referenceState.cameraPose).toMatchObject({
        evidence: 'unknown',
        position: null,
        quaternion: null,
      });
    }
  });

  it('exposes the seven deterministically measured primary landmarks', () => {
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
        key: 'activation-route',
        landmark: [815.5, 501, 247.5, 230.5],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'first-destination building before route contact',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/4/landmark',
        },
      },
      {
        key: 'activation-contact',
        landmark: [682.5, 301, 234, 211],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'logo-bearing first-destination building at route contact',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/5/landmark',
        },
      },
      {
        key: 'field-contact',
        landmark: [754.5, 291, 90, 104.5],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'elevated center tile and standing figure at first contact',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/9/landmark',
        },
      },
      {
        key: 'field-pulse-b',
        landmark: [685, 326, 83, 88],
        landmarkStatus: 'observed',
        primaryStructure: {
          kind: 'landmark',
          status: 'observed',
          label: 'elevated blue-violet center tile',
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
        route: [217, 429, 441, 193],
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

  it('retains source-tied route evidence for every applicable route state', () => {
    const expected = [
      {
        key: 'world-reveal',
        route: [660, 556, 224, 204.5],
        label: 'visible high-chroma core of emerging red landing rails',
      },
      {
        key: 'landing-idle',
        route: [610, 599, 208, 162],
        label: 'visible high-chroma core of landing-idle red route',
      },
      {
        key: 'activation-route',
        route: [430, 4, 374, 471],
        label: 'visible high-chroma core of parallel red activation rails',
      },
      {
        key: 'activation-contact',
        route: [342, 1, 399, 377],
        label: 'visible high-chroma core of red activation contact rails',
      },
      {
        key: 'clearance-travel',
        route: [88, 123, 474, 264],
        label: 'high-chroma core of connected cyan clearance route',
      },
      {
        key: 'clearance-field-preview',
        route: [217, 429, 441, 193],
        label: 'high-chroma core of cyan route approaching the field preview',
      },
      {
        key: 'field-approach',
        route: [53, 387, 697, 298],
        label: 'visible high-chroma core of cyan field-approach feed',
      },
      {
        key: 'field-contact',
        route: [0, 345, 724, 298],
        label: 'visible high-chroma core of cyan route before field contact',
      },
      {
        key: 'field-pulse-a',
        route: [1, 361, 622, 155],
        label:
          'visible high-chroma core of incoming cyan feed during inner pulse',
      },
      {
        key: 'field-pulse-b',
        route: [1, 394, 605, 80],
        label:
          'visible high-chroma core of incoming cyan feed during outer pulse',
      },
      {
        key: 'arrival-travel',
        route: [714, 352, 118, 9],
        label: 'high-chroma core of second horizontal cyan route',
      },
      {
        key: 'arrival-lockup',
        route: [1, 352, 479, 10],
        label: 'visible high-chroma core of cyan arrival feed before the arrow',
      },
    ] as const;

    expect(
      referenceStates
        .filter(({ screenBounds }) => screenBounds.routeStatus === 'observed')
        .map(({ key }) => key),
    ).toEqual(expected.map(({ key }) => key));

    for (const { key, route, label } of expected) {
      expect(getReferenceState(key).screenBounds).toMatchObject({
        routeStatus: 'observed',
        route,
        routeLabel: label,
        routeEvidenceRef: `docs/hero-reference/recording-structural-bounds.json#/states/${HERO_REFERENCE_STATE_KEYS.indexOf(
          key,
        )}/route`,
      });
    }

    expect(
      referenceStates
        .filter(
          ({ screenBounds }) => screenBounds.routeStatus === 'not-applicable',
        )
        .map(({ key }) => key),
    ).toEqual(['loader-mark', 'landing', 'journey-exit']);
  });

  it('retains measured copy ink without inferring faded or clipped states', () => {
    const landingLabel =
      'visible centered landing headline and supporting-copy ink envelope';
    const processLabel = 'visible four-row process-ladder copy ink envelope';
    const expected = [
      { key: 'landing', copy: [409, 132.5, 696, 306], label: landingLabel },
      {
        key: 'landing-idle',
        copy: [409, 132, 696, 303],
        label: landingLabel,
      },
      {
        key: 'activation-route',
        copy: [64.5, 419.5, 545.5, 284],
        label: processLabel,
      },
      {
        key: 'activation-contact',
        copy: [64.5, 413, 545.5, 284],
        label: processLabel,
      },
      {
        key: 'clearance-travel',
        copy: [64.5, 417, 541, 280],
        label: processLabel,
      },
      {
        key: 'clearance-field-preview',
        copy: [64.5, 417, 541.5, 280],
        label: processLabel,
      },
      {
        key: 'field-approach',
        copy: [64.5, 417, 541, 280],
        label: processLabel,
      },
      {
        key: 'field-contact',
        copy: [64.5, 417, 541, 280],
        label: processLabel,
      },
      {
        key: 'field-pulse-a',
        copy: [64.5, 417, 541, 280],
        label: processLabel,
      },
      {
        key: 'field-pulse-b',
        copy: [64.5, 417, 541, 280],
        label: processLabel,
      },
      {
        key: 'arrival-lockup',
        copy: [64.5, 405, 549, 294.5],
        label: processLabel,
      },
    ] as const;

    expect(
      referenceStates
        .filter(({ screenBounds }) => screenBounds.copyStatus === 'observed')
        .map(({ key }) => key),
    ).toEqual(expected.map(({ key }) => key));

    for (const { key, copy, label } of expected) {
      expect(getReferenceState(key).screenBounds).toMatchObject({
        copyStatus: 'observed',
        copy,
        copyLabel: label,
        copyEvidenceRef: `docs/hero-reference/recording-structural-bounds.json#/states/${HERO_REFERENCE_STATE_KEYS.indexOf(
          key,
        )}/copy`,
      });
    }

    expect(
      referenceStates
        .filter(({ screenBounds }) => screenBounds.copyStatus === 'blocked')
        .map(({ key, screenBounds }) => ({
          key,
          label: screenBounds.copyLabel,
          copy: screenBounds.copy,
          evidenceRef: screenBounds.copyEvidenceRef,
        })),
    ).toEqual([
      {
        key: 'arrival-travel',
        label: 'transitioning four-row process-ladder copy',
        copy: null,
        evidenceRef: null,
      },
      {
        key: 'journey-exit',
        label: 'clipped exiting process-ladder copy',
        copy: null,
        evidenceRef: null,
      },
    ]);

    expect(
      referenceStates
        .filter(
          ({ screenBounds }) => screenBounds.copyStatus === 'not-applicable',
        )
        .map(({ key }) => key),
    ).toEqual(['loader-mark', 'world-reveal']);
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

  it('keeps unisolatable landmarks blocked without making them primary', () => {
    const blockedLandmarks = referenceStates
      .filter(({ screenBounds }) => screenBounds.landmarkStatus === 'blocked')
      .map(({ key }) => key);
    const reclassified = (
      ['landing', 'landing-idle', 'field-approach', 'field-pulse-a'] as const
    ).map((key) => {
      const { screenBounds } = getReferenceState(key);
      return {
        key,
        primaryStructure: screenBounds.primaryStructure,
      };
    });
    const notApplicable = referenceStates
      .filter(
        ({ screenBounds }) => screenBounds.landmarkStatus === 'not-applicable',
      )
      .map(({ key }) => key);

    expect(blockedLandmarks).toEqual([
      'landing',
      'landing-idle',
      'field-approach',
      'field-pulse-a',
    ]);
    expect(reclassified).toEqual([
      {
        key: 'landing',
        primaryStructure: {
          kind: 'composition',
          status: 'observed',
          label: 'resolved landing screen-space composition',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/2/composition',
        },
      },
      {
        key: 'landing-idle',
        primaryStructure: {
          kind: 'composition',
          status: 'observed',
          label: 'resolved landing screen-space composition during route idle',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/3/composition',
        },
      },
      {
        key: 'field-approach',
        primaryStructure: {
          kind: 'fieldProfile',
          status: 'observed',
          label: 'visible bright-neutral field tile-top profile',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/8/fieldProfile',
        },
      },
      {
        key: 'field-pulse-a',
        primaryStructure: {
          kind: 'fieldProfile',
          status: 'observed',
          label:
            'visible bright-neutral field tile-top profile during inner pulse',
          evidenceRef:
            'docs/hero-reference/recording-structural-bounds.json#/states/10/fieldProfile',
        },
      },
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
          screenBounds.primaryStructure.status === 'blocked',
      ),
    ).toHaveLength(0);
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
