import type { CaptureArtifact, CaptureRunContext } from './hero-capture-run';
import { createHash } from 'node:crypto';

export type CaptureProvenanceInput = {
  context: CaptureRunContext;
  state: string;
  measurement: unknown;
  artifacts: readonly CaptureArtifact[];
  sourceIdentity: {
    siteUrl: string;
    bundleSha256: string;
    recordingSha256: string;
  };
  implementationIdentity: {
    gitRevision: string;
    trackedDiffSha256: string;
    untrackedInputFiles: readonly { path: string; sha256: string }[];
  };
  environment: { browserName: string; browserVersion: string; node: string };
  fontEvidence: readonly {
    family: string;
    loaded: boolean;
    assetSha256?: string;
    verifiedVersion?: string;
  }[];
  profile: {
    captureLabel: string;
    pointerClass: string;
    isIos: boolean;
    reducedMotion: boolean;
  };
  physical: {
    scrollY: number;
    effectiveHeroHeight: number;
    measurementSequence: number;
  };
  build: {
    mode: 'development' | 'production' | 'test-enabled-production';
    startupCommand: string;
  };
};
type ConsumerProof = {
  frameId: number;
  renderedProgress: number;
  readback: true;
  actualReadback: Record<string, unknown>;
};
type EffectProof = {
  readback: true;
  ratio: number;
  active: boolean;
  elapsedMs: number;
  resetSequence: number;
  inputDomain: 'local-clock';
  actualReadback: Record<string, unknown>;
};
export type CaptureProvenanceV1 = {
  schemaVersion: 1;
  runId: string;
  stateId: string;
  source: CaptureProvenanceInput['sourceIdentity'];
  implementation: CaptureProvenanceInput['implementationIdentity'];
  environment: CaptureProvenanceInput['environment'];
  fonts: CaptureProvenanceInput['fontEvidence'];
  build: CaptureProvenanceInput['build'] & {
    buildId: string;
    inputTreeSha256: string;
  };
  profile: CaptureProvenanceInput['profile'] & {
    viewportWidth: number;
    viewportHeight: number;
    screenshotDpr: number;
    canvasCssWidth: number;
    canvasCssHeight: number;
    canvasBackingWidth: number;
    canvasBackingHeight: number;
    canvasDprX: number;
    canvasDprY: number;
  };
  input: {
    physical: CaptureProvenanceInput['physical'];
    eventHistorySha256: string;
    freezeAtMs: number;
    seed: number;
    eventHistory: unknown[];
  };
  applied: {
    schemaVersion: 1;
    frameId: number;
    captureFrameId: number;
    measurementSequence: number;
    nowMs: number;
    deltaMs: number;
    sceneTargetProgress: number;
    renderedProgress: number;
    renderedVelocity: number;
    readiness: 'ready';
    camera: {
      position: number[];
      quaternion: number[];
      projectionMatrix: number[];
      matrixWorld: number[];
      fovDegrees: number;
    };
    routes: Record<
      string,
      {
        role: 'feeder' | 'blue-zero' | 'blue-one';
        visibleRange: number[];
        headWorld: number[];
        physicalRadius: number;
        readback: true;
        actualReadback: Record<string, unknown>;
      }
    >;
    effects: {
      fieldPulse: EffectProof;
      arrival: EffectProof;
      idle: EffectProof & {
        channels: Record<string, unknown>[];
        aggregation: Record<string, string>;
      };
    };
    appliedConsumers: Record<string, ConsumerProof>;
    renderedAtMs: number;
  };
  artifacts: {
    relativePath: string;
    bytes: number;
    sha256: string;
    runId: string;
    stateId: string;
    profileId: string;
    frameId: number;
  }[];
};

function requireFact(valid: unknown, name: string): asserts valid {
  if (!valid)
    throw new Error(
      `Capture provenance blocked: ${name} missing, invalid or inconsistent`,
    );
}
function object(value: unknown, name: string): Record<string, unknown> {
  requireFact(
    value && typeof value === 'object' && !Array.isArray(value),
    name,
  );
  return value as Record<string, unknown>;
}
function finite(value: unknown, name: string): number {
  requireFact(typeof value === 'number' && Number.isFinite(value), name);
  return value;
}
function positive(value: unknown, name: string): number {
  const result = finite(value, name);
  requireFact(result > 0, name);
  return result;
}
function integer(value: unknown, name: string): number {
  const result = finite(value, name);
  requireFact(Number.isInteger(result) && result >= 0, name);
  return result;
}
function nonnegative(value: unknown, name: string): number {
  const result = finite(value, name);
  requireFact(result >= 0, name);
  return result;
}
/** Material multiply/divide readbacks can differ from their input by representational roundoff. */
function sameMaterialRatio(actual: number, frameValue: unknown): boolean {
  const source = finite(frameValue, 'completed frame material ratio');
  return (
    Math.abs(actual - source) <=
    Number.EPSILON * 4 * Math.max(1, Math.abs(actual), Math.abs(source))
  );
}
function text(value: unknown, name: string): string {
  requireFact(typeof value === 'string' && value.trim().length > 0, name);
  return value;
}
function boolean(value: unknown, name: string): boolean {
  requireFact(typeof value === 'boolean', name);
  return value;
}
function numbers(value: unknown, name: string, length?: number): number[] {
  requireFact(
    Array.isArray(value) &&
      value.length > 0 &&
      (length === undefined || value.length === length),
    name,
  );
  return value.map((entry) => finite(entry, name));
}
function sha(value: unknown, name: string): string {
  const result = text(value, name);
  requireFact(/^[a-f0-9]{64}$/u.test(result), name);
  return result;
}
function relative(value: unknown, name: string): string {
  const result = text(value, name);
  requireFact(
    !result.startsWith('/') &&
      !result.includes('\\') &&
      !result.split('/').some((part) => ['..', '.', ''].includes(part)),
    name,
  );
  return result;
}

/** Serialize observed renderer values only. Expected comparison pins belong to the validator. */
export function buildCaptureProvenance(
  input: CaptureProvenanceInput,
): CaptureProvenanceV1 {
  const m = object(input.measurement, 'measurement');
  const observation = object(m.captureObservation, 'captureObservation');
  const attrs = object(observation.attributes, 'attributes');
  const record = object(observation.record, 'completed frame record');
  const frame = object(record.frame, 'frame');
  const rendered = object(frame.rendered, 'frame.rendered');
  const actualConsumers = object(record.appliedConsumers, 'appliedConsumers');
  const frameId = integer(frame.frameId, 'frameId');
  requireFact(frameId > 0, 'completed frameId');
  const renderedProgress = finite(rendered.value, 'renderedProgress');
  requireFact(
    record.schemaVersion === 1 &&
      m.runId === input.context.runId &&
      m.stateKey === input.state &&
      observation.requestedKey === input.state &&
      input.context.expectedStates.includes(input.state),
    'run/state linkage',
  );
  requireFact(
    observation.canvasVisible === true &&
      observation.fontsReady === true &&
      attrs['data-hero-render-ready'] === 'true',
    'capture readiness',
  );
  const measurementSequence = integer(
    frame.measurementSequence,
    'measurementSequence',
  );
  positive(input.physical.effectiveHeroHeight, 'physical.effectiveHeroHeight');
  requireFact(
    integer(
      input.physical.measurementSequence,
      'physical.measurementSequence',
    ) === measurementSequence,
    'physical/frame measurementSequence',
  );
  requireFact(
    finite(input.physical.scrollY, 'physical.scrollY') ===
      finite(object(m.scroll, 'scroll').y, 'actual scrollY'),
    'physical scrollY',
  );
  const consumers: Record<string, ConsumerProof> = {};
  function consumer(name: string) {
    const applied = object(actualConsumers[name], `${name} consumer`);
    requireFact(applied.frameId === frameId, `${name} frame association`);
    requireFact(
      Math.abs(
        finite(applied.renderedProgress, `${name} renderedProgress`) -
          renderedProgress,
      ) <= 1e-6,
      `${name} renderedProgress association`,
    );
    const readback = object(applied.readback, `${name} actual readback`);
    requireFact(
      Object.keys(readback).length > 0,
      `${name} actual object readback`,
    );
    consumers[name] = {
      frameId,
      renderedProgress: applied.renderedProgress as number,
      readback: true,
      actualReadback: structuredClone(readback),
    };
    return readback;
  }
  const camera = consumer('camera');
  const actualCamera = {
    position: numbers(camera.position, 'camera.position', 3),
    quaternion: numbers(camera.quaternion, 'camera.quaternion', 4),
    projectionMatrix: numbers(
      camera.projectionMatrix,
      'camera.projectionMatrix',
      16,
    ),
    matrixWorld: numbers(camera.matrixWorld, 'camera.matrixWorld', 16),
    fovDegrees: positive(camera.fovDegrees, 'camera.fovDegrees'),
  };
  const beam = consumer('beam');
  numbers(beam.tipPosition, 'beam.tipPosition', 3);
  numbers(beam.lightPosition, 'beam.lightPosition', 3);
  boolean(beam.tipVisible, 'beam.tipVisible');
  const activation = consumer('activation');
  for (const key of ['accentEmissive', 'contactOpacity', 'lightIntensity'])
    finite(activation[key], `activation.${key}`);
  const routes: CaptureProvenanceV1['applied']['routes'] = {};
  const routeRoles = {
    'red-feeder-0': 'feeder',
    'red-feeder-1': 'feeder',
    'red-feeder-2': 'feeder',
    'red-feeder-3': 'feeder',
    'blue-zero-core': 'blue-zero',
    'blue-one-core': 'blue-one',
  } as const;
  for (const [name, role] of Object.entries(routeRoles)) {
    const readback = consumer(name);
    integer(readback.drawStart, `${name}.drawStart`);
    integer(readback.drawCount, `${name}.drawCount`);
    boolean(readback.visible, `${name}.visible`);
    routes[name] = {
      role,
      visibleRange: numbers(readback.visibleRange, `${name}.visibleRange`, 2),
      headWorld: numbers(readback.headWorld, `${name}.headWorld`, 3),
      physicalRadius: positive(
        readback.physicalRadius,
        `${name}.physicalRadius`,
      ),
      readback: true,
      actualReadback: structuredClone(readback),
    };
  }
  const field = consumer('field');
  const fieldRatio = finite(field.gridRatio, 'field.gridRatio');
  const fieldElapsedMs = finite(field.clockElapsedMs, 'field.clockElapsedMs');
  const fieldResetSequence = integer(
    field.resetSequence,
    'field.resetSequence',
  );
  const opacities = numbers(field.opacities, 'field.opacities');
  numbers(field.emissiveIntensities, 'field.emissiveIntensities');
  numbers(field.scalesY, 'field.scalesY');
  finite(field.contactLightIntensity, 'field.contactLightIntensity');
  requireFact(
    fieldElapsedMs >= 0 && fieldElapsedMs === frame.fieldElapsedMs,
    'field clock linkage',
  );
  requireFact(
    fieldResetSequence === frame.fieldResetSequence &&
      sameMaterialRatio(fieldRatio, object(frame.ratios, 'frame.ratios').field),
    'field reset/ratio linkage',
  );
  const arrival = consumer('arrival');
  const arrivalRatio = finite(
    arrival.activationRatio,
    'arrival.activationRatio',
  );
  const arrivalElapsedMs = finite(
    arrival.clockElapsedMs,
    'arrival.clockElapsedMs',
  );
  const arrivalResetSequence = integer(
    arrival.resetSequence,
    'arrival.resetSequence',
  );
  const arrivalVisible = boolean(arrival.visible, 'arrival.visible');
  for (const key of [
    'baseEmissiveIntensities',
    'topEmissiveIntensities',
    'baseColors',
    'topColors',
  ])
    numbers(arrival[key], `arrival.${key}`);
  requireFact(
    arrivalElapsedMs >= 0 &&
      arrivalElapsedMs === frame.arrivalElapsedMs &&
      arrivalResetSequence === frame.arrivalResetSequence &&
      sameMaterialRatio(arrivalRatio, frame.arrivalRatio),
    'arrival clock/reset/ratio linkage',
  );
  const idle = consumer('idle');
  const drawCounts = numbers(idle.drawCounts, 'idle.drawCounts', 4);
  requireFact(
    drawCounts.every((count) => Number.isInteger(count) && count >= 0),
    'idle drawCounts',
  );
  numbers(idle.drawStarts, 'idle.drawStarts', 4);
  numbers(idle.physicalRadii, 'idle.physicalRadii', 4);
  const idleVisible = boolean(idle.visible, 'idle.visible');
  requireFact(
    Array.isArray(frame.idle) && frame.idle.length === 4,
    'idle actual frame clocks',
  );
  const channels = frame.idle.map((value, index) => {
    const channel = object(value, `idle channel ${index}`);
    boolean(channel.active, `idle ${index}.active`);
    requireFact(
      finite(channel.phaseSeconds, `idle ${index}.phaseSeconds`) >= 0,
      'idle phase elapsed',
    );
    for (const key of ['spawnSeconds', 'start', 'end'])
      finite(channel[key], `idle ${index}.${key}`);
    integer(channel.completedCycles, `idle ${index}.completedCycles`);
    return structuredClone(channel);
  });
  const viewport = object(observation.viewport, 'actual viewport');
  const canvas = object(record.canvas, 'actual canvas');
  const profile = {
    captureLabel: text(input.profile.captureLabel, 'profile.captureLabel'),
    pointerClass: text(input.profile.pointerClass, 'profile.pointerClass'),
    isIos: boolean(input.profile.isIos, 'profile.isIos'),
    reducedMotion: boolean(
      input.profile.reducedMotion,
      'profile.reducedMotion',
    ),
    viewportWidth: positive(viewport.width, 'viewport.width'),
    viewportHeight: positive(viewport.height, 'viewport.height'),
    screenshotDpr: positive(
      viewport.devicePixelRatio,
      'viewport.devicePixelRatio',
    ),
    canvasCssWidth: positive(canvas.cssWidth, 'canvas.cssWidth'),
    canvasCssHeight: positive(canvas.cssHeight, 'canvas.cssHeight'),
    canvasBackingWidth: positive(canvas.backingWidth, 'canvas.backingWidth'),
    canvasBackingHeight: positive(canvas.backingHeight, 'canvas.backingHeight'),
    canvasDprX:
      positive(canvas.backingWidth, 'canvas.backingWidth') /
      positive(canvas.cssWidth, 'canvas.cssWidth'),
    canvasDprY:
      positive(canvas.backingHeight, 'canvas.backingHeight') /
      positive(canvas.cssHeight, 'canvas.cssHeight'),
  };
  const measuredViewport = object(m.viewport, 'measurement viewport');
  requireFact(
    measuredViewport.width === profile.viewportWidth &&
      measuredViewport.height === profile.viewportHeight &&
      measuredViewport.devicePixelRatio === profile.screenshotDpr,
    'measurement/observation viewport linkage',
  );
  requireFact(
    Array.isArray(observation.inputLog) && observation.inputLog.length > 0,
    'actual input history',
  );
  for (const event of observation.inputLog) {
    const e = object(event, 'input event');
    requireFact(
      ['clock', 'scroll'].includes(e.kind as string),
      'input event kind',
    );
    finite(e.value, 'input event value');
  }
  const eventHistory = structuredClone(observation.inputLog);
  const freezeAtMs = finite(
    object(observation.cssClock, 'CSS clock').nowMs,
    'actual freezeAtMs',
  );
  const seedText = text(attrs['data-hero-seed'], 'actual seed');
  requireFact(/^\d+$/u.test(seedText), 'actual seed');
  for (const key of ['siteUrl', 'bundleSha256', 'recordingSha256'])
    (key === 'siteUrl' ? text : sha)(
      input.sourceIdentity[key as keyof typeof input.sourceIdentity],
      `source.${key}`,
    );
  text(input.implementationIdentity.gitRevision, 'implementation.gitRevision');
  sha(
    input.implementationIdentity.trackedDiffSha256,
    'implementation.trackedDiffSha256',
  );
  requireFact(
    Array.isArray(input.implementationIdentity.untrackedInputFiles),
    'implementation.untrackedInputFiles',
  );
  const inputPaths = new Set<string>();
  for (const file of input.implementationIdentity.untrackedInputFiles) {
    const p = relative(file.path, 'untracked path');
    sha(file.sha256, 'untracked sha256');
    requireFact(!inputPaths.has(p), 'duplicate untracked path');
    inputPaths.add(p);
  }
  for (const key of ['browserName', 'browserVersion', 'node'])
    text(
      input.environment[key as keyof typeof input.environment],
      `environment.${key}`,
    );
  requireFact(
    Array.isArray(input.fontEvidence) && input.fontEvidence.length > 0,
    'fontEvidence',
  );
  for (const font of input.fontEvidence) {
    requireFact(font.loaded === true, 'font loaded');
    text(font.family, 'font family');
    if (font.assetSha256 !== undefined)
      sha(font.assetSha256, 'font assetSha256');
    else text(font.verifiedVersion, 'font verifiedVersion');
  }
  requireFact(
    ['development', 'production', 'test-enabled-production'].includes(
      input.build.mode,
    ),
    'build.mode',
  );
  text(input.build.startupCommand, 'build.startupCommand');
  text(input.context.buildId, 'buildId');
  sha(input.context.inputTreeSha256, 'inputTreeSha256');
  const artifactPaths = new Set<string>();
  const artifacts = input.artifacts.map((artifact) => {
    const relativePath = relative(artifact.path, 'artifact path');
    requireFact(!artifactPaths.has(relativePath), 'duplicate artifact');
    artifactPaths.add(relativePath);
    requireFact(
      integer(artifact.bytes, 'artifact bytes') > 0,
      'artifact bytes',
    );
    sha(artifact.sha256, 'artifact sha256');
    return {
      relativePath,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
      runId: input.context.runId,
      stateId: input.state,
      profileId: profile.captureLabel,
      frameId,
    };
  });
  requireFact(
    artifactPaths.has(`implementation/${input.state}.png`) &&
      artifactPaths.has(`measurements/${input.state}.json`),
    'canonical PNG/measurement artifact pair',
  );
  const effect = (
    actualReadback: Record<string, unknown>,
    ratio: number,
    active: boolean,
    elapsedMs: number,
    resetSequence: number,
  ): EffectProof => ({
    readback: true,
    ratio,
    active,
    elapsedMs,
    resetSequence,
    inputDomain: 'local-clock',
    actualReadback: structuredClone(actualReadback),
  });
  return {
    schemaVersion: 1,
    runId: input.context.runId,
    stateId: input.state,
    source: structuredClone(input.sourceIdentity),
    implementation: structuredClone(input.implementationIdentity),
    environment: structuredClone(input.environment),
    fonts: structuredClone(input.fontEvidence),
    build: {
      ...input.build,
      buildId: input.context.buildId,
      inputTreeSha256: input.context.inputTreeSha256,
    },
    profile,
    input: {
      physical: { ...input.physical },
      eventHistorySha256: createHash('sha256')
        .update(JSON.stringify(eventHistory))
        .digest('hex'),
      freezeAtMs,
      seed: integer(Number(seedText), 'seed'),
      eventHistory,
    },
    applied: {
      schemaVersion: 1,
      frameId,
      captureFrameId: frameId,
      measurementSequence,
      nowMs: finite(frame.nowMs, 'frame.nowMs'),
      deltaMs: nonnegative(frame.deltaMs, 'frame.deltaMs'),
      sceneTargetProgress: finite(frame.target, 'frame.target'),
      renderedProgress,
      renderedVelocity: finite(rendered.velocity, 'frame.renderedVelocity'),
      readiness: 'ready',
      camera: actualCamera,
      routes,
      appliedConsumers: consumers,
      renderedAtMs: finite(record.renderedAtMs, 'renderedAtMs'),
      effects: {
        fieldPulse: effect(
          field,
          fieldRatio,
          fieldRatio > 0 && opacities.some((opacity) => opacity > 0),
          fieldElapsedMs,
          fieldResetSequence,
        ),
        arrival: effect(
          arrival,
          arrivalRatio,
          arrivalVisible,
          arrivalElapsedMs,
          arrivalResetSequence,
        ),
        idle: {
          ...effect(
            idle,
            drawCounts.filter((count) => count > 0).length / drawCounts.length,
            idleVisible && drawCounts.some((count) => count > 0),
            Math.max(
              ...channels.map((channel) => channel.phaseSeconds as number),
            ) * 1000,
            channels.reduce(
              (sum, channel) => sum + (channel.completedCycles as number),
              0,
            ),
          ),
          channels,
          aggregation: {
            ratio: 'fraction of channels with actual positive draw count',
            elapsedMs: 'maximum actual channel phaseSeconds multiplied by 1000',
            resetSequence:
              'sum of actual completedCycles; each completed cycle resets its channel phase',
          },
        },
      },
    },
    artifacts,
  };
}
