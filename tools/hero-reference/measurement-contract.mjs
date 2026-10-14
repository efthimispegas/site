import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

const SHA256 = /^[a-f0-9]{64}$/;
const nonempty = (value) => typeof value === 'string' && value.length > 0;
const finite = (value) => Number.isFinite(value);
const positive = (value) => finite(value) && value > 0;
const tuple = (value, length) =>
  Array.isArray(value) && value.length === length && value.every(finite);

/** Recording seeks are not animation ages. Require independently pinned onset evidence. */
export function evaluateLoaderPhaseCorrespondence({ evidence, expected }) {
  const blockers = [];
  if (!evidence || evidence.schemaVersion !== 1 ||
      evidence.reviewerType !== 'independent-reviewer' ||
      !nonempty(evidence.reviewer) || !nonempty(evidence.reviewRef))
    blockers.push('Independent loader phase review is missing.');
  for (const key of ['runId', 'stateId', 'recordingSha256', 'referenceSha256', 'implementationSha256']) {
    const validPin = key.endsWith('Sha256') ? SHA256.test(expected?.[key] ?? '') : nonempty(expected?.[key]);
    if (!validPin || evidence?.[key] !== expected[key])
      blockers.push(`Loader phase ${key} pin is missing or stale.`);
  }
  for (const side of ['source', 'implementation']) {
    const phase = evidence?.[side];
    if (phase?.clockBasis !== 'loader-animation-onset' || !nonempty(phase?.evidenceRef) ||
        !tuple(phase?.ageMs, 2) || phase.ageMs[0] < 0 || phase.ageMs[1] < phase.ageMs[0] ||
        phase.ageMs[1] - phase.ageMs[0] > 1000 / 60)
      blockers.push(`${side} loader onset/age is not pinned to one recording-frame interval.`);
  }
  // The reviewer identifies the loader's animation; a numeric age assertion
  // cannot substitute for the native timeline retained with the compared PNG.
  const local = evidence?.implementation;
  const clock = expected?.implementationCssClock;
  const matches = Number.isInteger(local?.animationId) && local.animationId >= 0 && Array.isArray(clock?.animations)
    ? clock.animations.filter(animation => animation.id === local.animationId)
    : [];
  const animation = matches.length === 1 ? matches[0] : null;
  if (!animation || animation.kind !== 'animation' || !finite(animation.currentTime) || animation.currentTime < 0 ||
      !tuple(local?.ageMs, 2) || animation.currentTime < local.ageMs[0] || animation.currentTime > local.ageMs[1])
    blockers.push('Local loader age is not bound to one independently identified captured native animation.');
  if (!nonempty(animation?.animationName) || !nonempty(animation?.target?.selector) ||
      local?.animationName !== animation.animationName || local?.targetSelector !== animation.target.selector)
    blockers.push('Local loader name/target is not bound to the captured native effect.');
  const source = evidence?.source;
  if (!nonempty(source?.effectRole) || source.effectRole !== local?.effectRole ||
      !nonempty(source?.animationName) || !nonempty(source?.targetSelector))
    blockers.push('Source/local loader ages do not identify the same reviewed semantic effect.');
  if (!blockers.length) {
    const a = evidence.source.ageMs;
    const b = evidence.implementation.ageMs;
    if (Math.max(a[0], b[0]) > Math.min(a[1], b[1]))
      blockers.push('Source/local loader animation ages do not overlap.');
  }
  return { status: blockers.length ? 'blocked' : 'pass', blockers,
    quantity: 'loader-animation-age', navigationAgeMeasured: false,
    localAnimationReadback: animation ? { animationId: animation.id, kind: animation.kind, currentTimeMs: animation.currentTime,
      animationName: animation.animationName ?? null, targetSelector: animation.target?.selector ?? null } : null };
}

/** Never guess the newest packet or reuse an old shared output directory. */
export function resolveCaptureRoot({ argv, env, workspaceRoot }) {
  const flags = argv.flatMap((value, index) => value === '--capture-root' ? [index] : []);
  if (flags.length > 1) throw new Error('Conflicting capture selections');
  const cli = flags.length ? argv[flags[0] + 1] : undefined;
  if (flags.length && (!nonempty(cli) || cli.startsWith('--'))) throw new Error('--capture-root requires an explicit path');
  const environment = env.HERO_CAPTURE_ROOT;
  if (!cli && !nonempty(environment)) throw new Error('An explicit --capture-root or HERO_CAPTURE_ROOT is required');
  if (cli && environment && path.resolve(workspaceRoot, cli) !== path.resolve(workspaceRoot, environment)) throw new Error('Conflicting capture selections');
  return path.resolve(workspaceRoot, cli ?? environment);
}

/** Identity exclusions concern copy/glyph identity, never scene or box geometry. */
export function validateIdentityExclusions(exclusions) {
  const allowed = new Set(['Title and description text content', 'Title glyph-sequence width', 'Step-number glyph pixels']);
  const blockers = !Array.isArray(exclusions) || exclusions.some(value => !allowed.has(value))
    ? ['Only the agreed copy and glyph identity exclusions are permitted; whole objects and containers remain measured.'] : [];
  return { status: blockers.length ? 'blocked' : 'pass', blockers };
}

/** Independently hashed observations bracket pixels; neither requested targets nor labels pin frames. */
export function validateCaptureBracket({ bracket, observation, runId, stateId, captureFrameId }) {
  const valid = bracket?.schemaVersion === 1 && bracket.runId === runId && bracket.stateId === stateId &&
    Number.isInteger(captureFrameId) && bracket.before?.record?.frame?.frameId === captureFrameId &&
    isDeepStrictEqual(bracket.before.record, bracket.after?.record) &&
    isDeepStrictEqual(bracket.before.cssClock, bracket.after?.cssClock) &&
    isDeepStrictEqual(bracket.before.record, observation?.record) &&
    isDeepStrictEqual(bracket.before.cssClock, observation?.cssClock);
  return { status: valid ? 'pass' : 'blocked', blockers: valid ? [] : [`${stateId}: screenshot bracket differs from the observed frame or CSS clock.`] };
}

/** Packet validity precedes visual comparison; invalid inputs cannot be a visual failure. */
export function validateCapturePacket({ manifest, measurements, expected }) {
  const blockers = [];
  const requireValue = (valid, reason) => { if (!valid) blockers.push(reason); };
  const keys = expected?.stateKeys;
  if (!Array.isArray(keys) || keys.length !== 15 || new Set(keys).size !== 15) return { status: 'blocked', blockers: ['Independent fifteen-state coverage is required.'] };
  const sameKeys = values => Array.isArray(values) && isDeepStrictEqual(values, keys);
  requireValue(manifest?.schemaVersion === 7 && manifest.status === 'complete', 'A complete schema-v7 packet is required.');
  requireValue(nonempty(manifest?.runId) && Number.isFinite(Date.parse(manifest?.startedAt)) && Number.isFinite(Date.parse(manifest?.completedAt)) && Date.parse(manifest.startedAt) <= Date.parse(manifest.completedAt), 'Run identity/window is missing or invalid.');
  requireValue(manifest?.expectedStateCount === 15 && manifest?.capturedStateCount === 15 && sameKeys(manifest?.expectedStates) && sameKeys(manifest?.states?.map(state => state.key)), 'State coverage/order differs from the authoritative fifteen states.');
  requireValue(Array.isArray(manifest?.missingStates) && manifest.missingStates.length === 0 && Array.isArray(manifest?.failures) && manifest.failures.length === 0, 'The packet contains missing states or failures.');
  requireValue(Array.isArray(manifest?.outcomes) && manifest.outcomes.length === 15 && keys.every(key => manifest.outcomes.filter(outcome => outcome.state === key && outcome.runId === manifest.runId && outcome.status === 'complete').length === 1), 'Outcomes contain missing, failed, duplicate or mixed-run states.');
  requireValue(nonempty(expected?.buildId) && manifest?.buildId === expected.buildId, 'Build identity differs from independently observed build.');
  requireValue(SHA256.test(expected?.inputTreeSha256 ?? '') && manifest?.inputTreeSha256 === expected.inputTreeSha256, 'Input tree hash is stale or missing.');
  requireValue(Array.isArray(measurements) && measurements.length === 15 && new Set(measurements.map(m => m.stateKey)).size === 15 && keys.every(key => measurements.some(m => m.stateKey === key)), 'Measurement coverage is incomplete or duplicated.');
  for (const measurement of measurements ?? []) {
    const key = measurement.stateKey;
    const o = measurement.captureObservation;
    const f = o?.record?.frame;
    const e = expected.states?.[key];
    const a = o?.attributes;
    requireValue(measurement.schemaVersion === 7 && measurement.runId === manifest?.runId && measurement.buildId === expected.buildId && measurement.inputTreeSha256 === expected.inputTreeSha256, `${key}: mixed run/build/input identity.`);
    requireValue(finite(o?.physical?.scrollY) && o.physical.scrollY >= 0 && positive(o?.physical?.effectiveHeroHeight) && Number.isInteger(o?.physical?.measurementSequence) && o.physical.measurementSequence === f?.measurementSequence, `${key}: physical measurement/frame association is missing.`);
    requireValue(e && o?.requestedKey === key && o.canvasVisible === true && o.fontsReady === true && a?.['data-hero-lifecycle'] === e.lifecycle && a?.['data-hero-profile'] === 'desktop' && a?.['data-hero-motion'] === 'full' && a?.['data-hero-render-ready'] === 'true' && a?.['data-hero-seed'] === '43117', `${key}: actual lifecycle/readiness/profile correspondence is missing.`);
    requireValue(e?.lifecycle === 'loading' || o?.loaderCleared === true, `${key}: entry precedes loader clearance.`);
    requireValue(f && Number.isInteger(f.frameId) && f.frameId > 0 && finite(o.record.renderedAtMs) && [f.nowMs, f.deltaMs, f.target, f.rendered?.value, f.rendered?.velocity, f.fieldElapsedMs].every(finite) && f.deltaMs >= 0 && e && Math.abs(f.target - e.target) <= 0.002 && Math.abs(f.rendered.value - f.target) <= 0.002 && Math.abs(f.rendered.velocity) <= 0.03, `${key}: actual completed frame does not match the selected physical target.`);
    requireValue(o?.record?.appliedConsumers && ['camera','beam','activation','field','arrival'].every(name => { const consumer = o.record.appliedConsumers[name]; return consumer?.frameId === f?.frameId && finite(consumer?.renderedProgress) && Math.abs(consumer.renderedProgress - f.rendered.value) <= 1e-6 && consumer.readback !== undefined; }), `${key}: consumer readbacks are stale or missing.`);
    if (e?.elapsedMs !== undefined) requireValue(finite(o?.lifecycleElapsedMs) && Math.abs(o.lifecycleElapsedMs - e.elapsedMs) <= 50, `${key}: lifecycle age does not match its declared capture input.`);
    if (e?.fieldElapsedMs !== undefined) requireValue(finite(f?.fieldElapsedMs) && Math.abs(f.fieldElapsedMs - e.fieldElapsedMs) <= 50, `${key}: applied pulse age differs from declared capture input.`);
    const profile = expected.profile;
    requireValue(profile && measurement.viewport?.width === profile.viewportWidth && measurement.viewport?.height === profile.viewportHeight && measurement.viewport?.devicePixelRatio === profile.screenshotDpr && isDeepStrictEqual(o?.viewport, measurement.viewport), `${key}: viewport/screenshot DPR correspondence differs.`);
    const canvas = o?.record?.canvas;
    requireValue(profile && canvas?.cssWidth === profile.canvasCssWidth && canvas?.cssHeight === profile.canvasCssHeight && canvas?.backingWidth === profile.canvasBackingWidth && canvas?.backingHeight === profile.canvasBackingHeight, `${key}: CSS/backing geometry differs from independent source profile.`);
    const history = o?.renderedHistory;
    const historyFrame = frame => frame && ({ frameId: frame.frameId, target: frame.target, rendered: frame.rendered, deltaMs: frame.deltaMs, fieldElapsedMs: frame.fieldElapsedMs, nowMs: frame.nowMs });
    let fieldAge = 0;
    const causalHistory = Array.isArray(history) && history.length > 0 && (history[0].frameId === 1 || history[0].rendered?.value <= 0.72 && history[0].fieldElapsedMs === 0) && history.every((frame, index) => {
      if (!finite(frame.nowMs) || !finite(frame.deltaMs) || frame.deltaMs < 0 || !finite(frame.rendered?.value) || index && (frame.frameId !== history[index - 1].frameId + 1 || frame.nowMs < history[index - 1].nowMs)) return false;
      fieldAge = frame.rendered.value > 0.72 ? fieldAge + frame.deltaMs : 0;
      return finite(frame.fieldElapsedMs) && Math.abs(fieldAge - frame.fieldElapsedMs) <= 0.0001;
    });
    requireValue(causalHistory && isDeepStrictEqual(historyFrame(history?.at(-1)), historyFrame(f)), `${key}: rendered history is missing, non-causal or detached from capture frame.`);
    requireValue(Array.isArray(o?.inputLog) && o.inputLog.length > 0 && o.inputLog.every(input => ['clock','scroll'].includes(input.kind) && finite(input.value) && input.value >= 0), `${key}: physical input/clock log is incomplete.`);
    const css = o?.cssClock;
    requireValue(css && finite(css.nowMs) && Math.abs(css.nowMs - (o?.record?.renderedAtMs ?? NaN)) <= 16 && Array.isArray(css.animations) && Array.isArray(css.log) && css.log.every(event => finite(event.atMs) && ['discover','advance'].includes(event.type)) && css.animations.every(animation => [animation.observedAtMs,animation.initialTimeMs,animation.currentTime].every(finite) && Math.abs(animation.currentTime - (animation.initialTimeMs + css.nowMs - animation.observedAtMs)) <= 1), `${key}: CSS animation and rendered clock correspondence is invalid.`);
    if (measurement.identityExclusions !== undefined) blockers.push(...validateIdentityExclusions(measurement.identityExclusions).blockers.map(reason => `${key}: ${reason}`));
  }
  return { status: blockers.length ? 'blocked' : 'pass', blockers };
}
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export function isCaptureInputPath(file) {
  return (
    /^(apps|libs|tools)\//.test(file) &&
    !/(?:^|\/)(?:test-output|test-results|playwright-report|node_modules|\.next|dist|\.cache)(?:\/|$)/.test(
      file,
    )
  );
}

/** Opt-in, reviewed source measurement overlay. Never mutates historical manifests. */
export function applySourceMeasurementOverlay({
  manifest,
  overlay,
  expected,
  sourceArtifacts,
}) {
  if (!overlay) return structuredClone(manifest);
  const reject = (reason) => {
    throw new Error(`Source measurement overlay rejected: ${reason}`);
  };
  if (
    overlay.schemaVersion !== 1 ||
    overlay.status !== 'reviewed' ||
    overlay.algorithmRevision !== 'connected-component-membership-v2' ||
    !nonempty(overlay.review?.reviewer) ||
    !nonempty(overlay.review?.reviewRef)
  )
    reject('explicit independent review/version missing');
  for (const key of [
    'baseManifestSha256',
    'recordingSha256',
    'classifierSha256',
  ]) {
    if (!SHA256.test(expected?.[key] ?? '') || overlay[key] !== expected[key])
      reject(`${key} does not match immutable inputs`);
  }
  if (overlay.baseManifestPath !== expected.baseManifestPath)
    reject('wrong base manifest path');
  if (manifest.authority?.sourceSha256 !== overlay.recordingSha256)
    reject('wrong recording authority');
  if (!Array.isArray(overlay.amendments) || !overlay.amendments.length)
    reject('no reviewed amendments');
  const result = structuredClone(manifest);
  const seen = new Set();
  for (const amendment of overlay.amendments) {
    const index = manifest.states.findIndex(
      (state) => state.key === amendment.stateId,
    );
    if (index < 0) reject(`unknown state ${amendment.stateId}`);
    const state = manifest.states[index];
    if (
      amendment.inputImage?.path !== state.anchor.capturePath ||
      amendment.inputImage?.sha256 !== state.anchor.captureSha256
    )
      reject(`wrong source image for ${amendment.stateId}`);
    const actualSource = sourceArtifacts?.find(
      (entry) => entry.path === state.anchor.capturePath,
    );
    if (
      !actualSource ||
      sha256(actualSource.bytes) !== state.anchor.captureSha256
    )
      reject(`unverified source bytes for ${amendment.stateId}`);
    if (!Array.isArray(amendment.changes) || !amendment.changes.length)
      reject('empty amendment');
    for (const change of amendment.changes) {
      const pointer = change.jsonPointer;
      const allowed = new RegExp(
        `^/states/${index}/screenBounds/(?:routeGeometry/(?:rasterPixels/(?:direction/[01]|principalSpan|equivalentSelectedCoreThickness)|cssPixels/(?:principalSpan|equivalentSelectedCoreThickness))|fieldProfileComponentProfile/selectedPixelOccupancy)$`,
      );
      if (
        typeof pointer !== 'string' ||
        !allowed.test(pointer) ||
        /(?:^|\/)(?:__proto__|prototype|constructor)(?:\/|$)/.test(pointer) ||
        seen.has(pointer)
      )
        reject(`unsafe/duplicate/non-measurement pointer ${pointer}`);
      seen.add(pointer);
      const keys = pointer.slice(1).split('/');
      let owner = result;
      for (const key of keys.slice(0, -1)) {
        if (!owner || !Object.hasOwn(owner, key))
          reject(`missing pointer ${pointer}`);
        owner = owner[key];
      }
      const key = keys.at(-1);
      if (
        !owner ||
        !Object.hasOwn(owner, key) ||
        !isDeepStrictEqual(owner[key], change.recorded)
      )
        reject(`recorded-before mismatch at ${pointer}`);
      if (typeof owner[key] !== 'number' || !Number.isFinite(change.recomputed))
        reject(
          `only finite existing numerical measurement leaves can change at ${pointer}`,
        );
      owner[key] = change.recomputed;
    }
  }
  return result;
}
export function resolveSourceBundleSha256(sourceEvidence) {
  const pins = [
    ...new Set(
      (sourceEvidence?.sources ?? [])
        .filter(
          (source) =>
            source.url?.includes('/CommonScripts.') &&
            SHA256.test(source.sha256 ?? ''),
        )
        .map((source) => source.sha256),
    ),
  ];
  return pins.length === 1 ? pins[0] : null;
}

export function reviewedSupplementalGate(record, expected, kind) {
  if (
    !record ||
    record.kind !== kind ||
    record.status !== 'pass' ||
    !nonempty(record.reviewRef) ||
    !nonempty(record.reviewer) ||
    record.reviewerType !==
      (kind === 'final-review' ? 'user' : 'independent-reviewer')
  ) {
    return {
      status: 'blocked',
      reason: `${kind} requires a separately recorded review, not an inferred screenshot pass.`,
    };
  }
  if (
    ![
      'runId',
      'gitRevision',
      'trackedDiffSha256',
      'recordingSha256',
      'captureLabel',
    ].every((key) => nonempty(expected?.[key]) && record[key] === expected[key])
  ) {
    return {
      status: 'blocked',
      reason: `${kind} review is stale or linked to a different evidence set.`,
    };
  }
  return {
    ...record,
    reason:
      'Explicit review record matched to this run/revision/source; automated measurements did not create this approval.',
  };
}

/** Full success requires each independent gate. Diagnostic raster never gates. */
export function evaluateAcceptanceGates({
  scene,
  visibleText,
  motion,
  finalReview,
  provenance,
  raster,
}) {
  const normalize = (gate, name) => {
    if (!gate || !['pass', 'fail', 'blocked'].includes(gate.status)) {
      return {
        status: 'blocked',
        reason: `${name} has no qualified evidence.`,
      };
    }
    return gate;
  };
  const gates = Object.fromEntries(
    Object.entries({ scene, visibleText, motion, finalReview, provenance }).map(
      ([key, value]) => [key, normalize(value, key)],
    ),
  );
  return {
    gates,
    diagnosticRaster: {
      ...raster,
      gating: false,
      reason:
        'Unmasked identity-sensitive raster is diagnostic; scene and visible text remain mandatory.',
    },
    repairEvidenceGateSatisfied: [
      'scene',
      'visibleText',
      'motion',
      'provenance',
    ].every((key) => gates[key].status === 'pass'),
    gateSatisfied: Object.values(gates).every((gate) => gate.status === 'pass'),
  };
}

/** Geometry from a container alone cannot prove visible ink is not clipped. */
export function assembleComparisonAcceptance({
  states,
  provenance,
  rasterSummary,
  motionReview,
  finalReview,
  reviewPins,
}) {
  const aggregate = (values) => ({
    status: !values.length
      ? 'blocked'
      : values.some((value) => value?.status === 'fail')
        ? 'fail'
        : values.some((value) => value?.status !== 'pass')
          ? 'blocked'
          : 'pass',
  });
  return evaluateAcceptanceGates({
    scene: aggregate(states.map((state) => state.structuralAccuracy)),
    visibleText: aggregate(states.map((state) => state.visibleText)),
    provenance,
    motion: reviewedSupplementalGate(motionReview, reviewPins, 'normal-motion'),
    finalReview: reviewedSupplementalGate(
      finalReview,
      reviewPins,
      'final-review',
    ),
    raster: { status: rasterSummary.fail > 0 ? 'fail' : 'pass' },
  });
}

/** Geometry from a container alone cannot prove visible ink is not clipped. */
export function evaluateVisibleText(evidence, trustedSubjects) {
  if (
    !evidence ||
    evidence.kind !== 'ordinary-visible-ink' ||
    !Array.isArray(evidence.subjects) ||
    evidence.subjects.length === 0
  ) {
    return {
      status: 'blocked',
      reason:
        'Ordinary-entry visible glyph/line and clipping evidence is missing; DOM envelope passes are insufficient.',
    };
  }
  const failures = [];
  const blockers = [];
  if (!trustedSubjects || !Object.keys(trustedSubjects).length)
    return {
      status: 'blocked',
      reason: 'Trusted subject/line-layout contract is missing.',
    };
  const ids = evidence.subjects.map((subject) => subject.id);
  if (
    new Set(ids).size !== ids.length ||
    JSON.stringify([...ids].sort()) !==
      JSON.stringify(Object.keys(trustedSubjects).sort())
  ) {
    failures.push(
      'Visible text subject coverage differs from the independently specified contract.',
    );
  }
  for (const subject of evidence.subjects) {
    if (
      !nonempty(subject.id) ||
      !Array.isArray(subject.glyphRects) ||
      !subject.glyphRects.length ||
      !subject.glyphRects.every((rect) => tuple(rect, 4)) ||
      !Array.isArray(subject.clippingRects) ||
      !subject.clippingRects.every((rect) => tuple(rect, 4)) ||
      !Number.isInteger(subject.expectedLineCount) ||
      !Number.isInteger(subject.lineCount) ||
      subject.fontsLoaded !== true ||
      subject.clippingAncestorsInspected !== true ||
      !nonempty(subject.clippingInspectionEvidence)
    ) {
      blockers.push(`${subject.id ?? 'unknown'}: incomplete ink/font evidence`);
      continue;
    }
    if (
      subject.expectedLineCount !== trustedSubjects[subject.id] ||
      subject.lineCount !== trustedSubjects[subject.id]
    )
      failures.push(
        `${subject.id}: wrong line count or changed expected output`,
      );
    for (const glyph of subject.glyphRects)
      for (const clip of subject.clippingRects) {
        if (
          glyph[0] < clip[0] - 0.5 ||
          glyph[1] < clip[1] - 0.5 ||
          glyph[0] + glyph[2] > clip[0] + clip[2] + 0.5 ||
          glyph[1] + glyph[3] > clip[1] + clip[3] + 0.5
        ) {
          failures.push(
            `${subject.id}: visible glyph overflows clipping ancestor`,
          );
        }
      }
  }
  return {
    status: failures.length ? 'fail' : blockers.length ? 'blocked' : 'pass',
    failures,
    blockers,
  };
}

/** Source/local extractors select independently. Unlike physical radius, pixel support depends on shading. */
export function evaluateFeaturePair({
  source,
  implementation,
  sourceQuality,
  implementationQuality,
  tolerances = {},
}) {
  const blockers = [];
  const failures = [];
  if (source?.status !== 'observed' || implementation?.status !== 'observed')
    blockers.push('A selected subject is missing or unmeasurable.');
  for (const [name, quality] of [
    ['source', sourceQuality],
    ['implementation', implementationQuality],
  ]) {
    if (quality?.status !== 'qualified')
      blockers.push(
        `${name} classification is uncertain: ${quality?.reasons?.join('; ') ?? 'quality evidence missing'}`,
      );
  }
  if (source?.status === 'observed' && implementation?.status === 'observed') {
    const a = source.bounds?.cssPixels;
    const b = implementation.bounds?.cssPixels;
    if (!tuple(a, 4) || !tuple(b, 4))
      blockers.push('Comparable feature bounds missing.');
    else {
      const maxPositionError = tolerances.positionCssPixels ?? 2;
      if (
        Math.hypot(
          a[0] + a[2] / 2 - b[0] - b[2] / 2,
          a[1] + a[3] / 2 - b[1] - b[3] / 2,
        ) > maxPositionError
      )
        failures.push('Subject moved.');
      if (
        Math.abs(a[2] - b[2]) > (tolerances.sizeCssPixels ?? 2) ||
        Math.abs(a[3] - b[3]) > (tolerances.sizeCssPixels ?? 2)
      )
        failures.push('Selected core/subject size changed.');
    }
    if (source.method?.predicate?.id !== implementation.method?.predicate?.id)
      blockers.push(
        'Different color-support predicates do not establish equivalent core thickness.',
      );
  }
  return {
    status: failures.length ? 'fail' : blockers.length ? 'blocked' : 'pass',
    blockers,
    failures,
    physicalRadius: {
      status: 'not-measured',
      reason: 'Screen pixel support is not world-space tube radius.',
    },
    glowEnvelope: {
      status: 'not-measured',
      reason: 'Core predicate does not measure glow.',
    },
  };
}

/** Independently supplied hue-band measurements, never a core area mislabeled glow. */
export function evaluateRouteAppearance(
  source,
  implementation,
  maxPixelDelta = 0,
) {
  if (
    source?.status !== 'qualified' ||
    implementation?.status !== 'qualified'
  ) {
    return {
      status: 'blocked',
      reason: 'Core/glow bands are ambiguous; review full-image overlays.',
    };
  }
  const failures = [];
  for (const band of ['corePixels', 'glowPixels']) {
    if (
      !Number.isInteger(source[band]) ||
      !Number.isInteger(implementation[band])
    )
      return { status: 'blocked', reason: `${band} is unmeasured.` };
    if (Math.abs(source[band] - implementation[band]) > maxPixelDelta)
      failures.push(`${band} changed`);
  }
  return {
    status: failures.length ? 'fail' : 'pass',
    failures,
    physicalRadiusMeasured: false,
  };
}

/** Caller supplies trusted expected run identity and actual artifact bytes, never manifest-reported hashes alone. */
export function validateCaptureProvenance({
  provenance,
  expected,
  artifacts = [],
  inputArtifacts = [],
}) {
  const failures = [];
  const blockers = [];
  if (!provenance || provenance.schemaVersion !== 1)
    return {
      status: 'blocked',
      failures,
      blockers: [
        'Capture provenance v1 missing; legacy schema-v7 captures remain historical diagnostics, not qualified current evidence.',
      ],
    };
  const p = provenance;
  const requireValue = (valid, name) => {
    if (!valid) blockers.push(`${name} missing/invalid`);
  };
  requireValue(nonempty(p.runId), 'runId');
  requireValue(nonempty(p.stateId), 'stateId');
  requireValue(
    nonempty(p.implementation?.gitRevision),
    'implementation.gitRevision',
  );
  requireValue(
    SHA256.test(p.implementation?.trackedDiffSha256 ?? ''),
    'implementation.trackedDiffSha256',
  );
  requireValue(
    Array.isArray(p.implementation?.untrackedInputFiles),
    'implementation.untrackedInputFiles',
  );
  requireValue(
    Array.isArray(expected?.untrackedInputFiles),
    'trusted untracked input inventory',
  );
  if (
    Array.isArray(p.implementation?.untrackedInputFiles) &&
    Array.isArray(expected?.untrackedInputFiles)
  ) {
    const serialize = (entries) =>
      JSON.stringify(
        entries
          .map(({ path, sha256 }) => ({ path, sha256 }))
          .sort((a, b) => a.path.localeCompare(b.path)),
      );
    if (
      serialize(p.implementation.untrackedInputFiles) !==
      serialize(expected.untrackedInputFiles)
    )
      failures.push(
        'Untracked input inventory differs from independently observed inputs.',
      );
    const inputPaths = new Set();
    for (const input of p.implementation.untrackedInputFiles) {
      if (
        !nonempty(input.path) ||
        input.path.startsWith('/') ||
        input.path.split(/[\\/]/).includes('..') ||
        inputPaths.has(input.path) ||
        !SHA256.test(input.sha256 ?? '')
      )
        failures.push('Invalid or duplicate untracked input.');
      inputPaths.add(input.path);
      const actual = inputArtifacts.find((entry) => entry.path === input.path);
      if (!actual)
        blockers.push(`Current untracked input bytes missing: ${input.path}`);
      else if (sha256(actual.bytes) !== input.sha256)
        failures.push(`Untracked input hash mismatch: ${input.path}`);
    }
  }
  requireValue(
    nonempty(p.source?.siteUrl) &&
      SHA256.test(p.source?.bundleSha256 ?? '') &&
      SHA256.test(p.source?.recordingSha256 ?? ''),
    'source identity',
  );
  requireValue(
    ['development', 'production', 'test-enabled-production'].includes(
      p.build?.mode,
    ) &&
      nonempty(p.build?.buildId) &&
      nonempty(p.build?.startupCommand),
    'build identity',
  );
  requireValue(
    nonempty(p.environment?.browserName) &&
      nonempty(p.environment?.browserVersion) &&
      nonempty(p.environment?.node),
    'runtime/browser identity',
  );
  const profile = p.profile;
  requireValue(
    nonempty(profile?.captureLabel) &&
      [
        'viewportWidth',
        'viewportHeight',
        'screenshotDpr',
        'canvasCssWidth',
        'canvasCssHeight',
        'canvasBackingWidth',
        'canvasBackingHeight',
      ].every((key) => positive(profile?.[key])),
    'profile/backing geometry',
  );
  if (
    profile &&
    positive(profile.canvasCssWidth) &&
    positive(profile.canvasCssHeight)
  ) {
    requireValue(
      Math.abs(
        profile.canvasDprX -
          profile.canvasBackingWidth / profile.canvasCssWidth,
      ) < 1e-6 &&
        Math.abs(
          profile.canvasDprY -
            profile.canvasBackingHeight / profile.canvasCssHeight,
        ) < 1e-6,
      'actual backing scale',
    );
  }
  for (const key of [
    'viewportWidth',
    'viewportHeight',
    'screenshotDpr',
    'canvasCssWidth',
    'canvasCssHeight',
    'canvasBackingWidth',
    'canvasBackingHeight',
    'canvasDprX',
    'canvasDprY',
    'pointerClass',
    'isIos',
    'reducedMotion',
  ]) {
    requireValue(
      expected?.profile?.[key] !== undefined,
      `trusted expected.profile.${key}`,
    );
    if (
      expected?.profile?.[key] !== undefined &&
      expected.profile[key] !== profile?.[key]
    )
      failures.push(
        `Actual profile ${key} differs from independently specified capture.`,
      );
  }
  requireValue(
    Array.isArray(p.fonts) &&
      p.fonts.length > 0 &&
      p.fonts.every(
        (font) =>
          font.loaded === true &&
          nonempty(font.family) &&
          nonempty(font.assetSha256 ?? font.verifiedVersion),
      ),
    'font load/version',
  );
  requireValue(
    finite(p.input?.physical?.scrollY) &&
      positive(p.input?.physical?.effectiveHeroHeight) &&
      SHA256.test(p.input?.eventHistorySha256 ?? '') &&
      finite(p.input?.freezeAtMs) &&
      finite(p.input?.seed),
    'physical input/history',
  );
  const frame = p.applied;
  requireValue(
    frame?.schemaVersion === 1 &&
      Number.isInteger(frame.frameId) &&
      finite(frame.renderedProgress) &&
      tuple(frame.camera?.position, 3) &&
      tuple(frame.camera?.quaternion, 4) &&
      tuple(frame.camera?.projectionMatrix, 16) &&
      tuple(frame.camera?.matrixWorld, 16),
    'actual applied frame',
  );
  requireValue(
    Number.isInteger(frame?.measurementSequence) &&
      frame.measurementSequence === p.input?.physical?.measurementSequence &&
      finite(frame.nowMs) &&
      finite(frame.deltaMs) &&
      frame.deltaMs >= 0 &&
      finite(frame.sceneTargetProgress) &&
      finite(frame.renderedVelocity),
    'frame/input/time linkage',
  );
  const routeValues = Object.values(frame?.routes ?? {});
  requireValue(
    routeValues.length === 6 &&
      routeValues.filter((route) => route.role === 'feeder').length === 4 &&
      routeValues.filter((route) => route.role === 'blue-zero').length === 1 &&
      routeValues.filter((route) => route.role === 'blue-one').length === 1 &&
      routeValues.every(
        (route) =>
          tuple(route.visibleRange, 2) &&
          tuple(route.headWorld, 3) &&
          positive(route.physicalRadius) &&
          route.readback === true,
      ),
    'applied route/contact payload',
  );
  requireValue(
    ['fieldPulse', 'arrival', 'idle'].every((name) => {
      const effect = frame?.effects?.[name];
      return (
        effect?.readback === true &&
        finite(effect.ratio) &&
        typeof effect.active === 'boolean' &&
        finite(effect.elapsedMs) &&
        effect.elapsedMs >= 0 &&
        Number.isInteger(effect.resetSequence) &&
        ['rendered-progress', 'scene-target', 'local-clock'].includes(
          effect.inputDomain,
        )
      );
    }),
    'applied effects/clocks payload',
  );
  requireValue(
    frame?.captureFrameId === frame?.frameId && frame?.readiness === 'ready',
    'capture/readiness frame association',
  );
  requireValue(
    Number.isInteger(expected?.captureFrameId),
    'trusted expected.captureFrameId',
  );
  if (
    Number.isInteger(expected?.captureFrameId) &&
    expected.captureFrameId !== frame?.frameId
  )
    failures.push(
      'Applied frame differs from independently pinned capture frame.',
    );
  requireValue(
    frame?.appliedConsumers &&
      ['camera', 'beam', 'activation', 'field', 'arrival'].every((name) => {
        const consumer = frame.appliedConsumers[name];
        return (
          consumer?.frameId === frame.frameId &&
          Math.abs(consumer.renderedProgress - frame.renderedProgress) <=
            1e-6 &&
          consumer.readback === true
        );
      }),
    'consumer-applied readbacks',
  );
  requireValue(
    Array.isArray(p.artifacts) && p.artifacts.length > 0,
    'artifacts',
  );
  for (const [key, actual] of Object.entries({
    runId: p.runId,
    stateId: p.stateId,
    gitRevision: p.implementation?.gitRevision,
    trackedDiffSha256: p.implementation?.trackedDiffSha256,
    bundleSha256: p.source?.bundleSha256,
    recordingSha256: p.source?.recordingSha256,
    captureLabel: p.profile?.captureLabel,
  })) {
    if (!nonempty(expected?.[key]))
      blockers.push(`trusted expected.${key} missing`);
    else if (expected[key] !== actual)
      failures.push(`${key} does not match the trusted capture input`);
  }
  const paths = new Set();
  requireValue(
    Array.isArray(expected?.artifacts) && expected.artifacts.length >= 2,
    'trusted compared PNG/measurement artifact pins',
  );
  for (const required of expected?.artifacts ?? []) {
    const declared = p.artifacts?.find(
      (artifact) => artifact.relativePath === required.relativePath,
    );
    if (
      !declared ||
      declared.sha256 !== required.sha256 ||
      declared.bytes !== required.bytes
    ) {
      failures.push(
        `Compared input is absent or substituted in frame provenance: ${required.relativePath}`,
      );
    }
  }
  for (const artifact of p.artifacts ?? []) {
    if (
      !nonempty(artifact.relativePath) ||
      artifact.relativePath.startsWith('/') ||
      artifact.relativePath.split(/[\\/]/).includes('..') ||
      paths.has(artifact.relativePath)
    )
      failures.push('Unsafe or duplicated artifact path');
    paths.add(artifact.relativePath);
    const actual = artifacts.find(
      (entry) => entry.relativePath === artifact.relativePath,
    );
    if (
      !SHA256.test(artifact.sha256 ?? '') ||
      !Number.isSafeInteger(artifact.bytes) ||
      artifact.bytes <= 0
    )
      failures.push(`Invalid artifact size/hash: ${artifact.relativePath}`);
    if (!actual)
      blockers.push(`Actual artifact bytes missing: ${artifact.relativePath}`);
    else if (
      actual.bytes.byteLength !== artifact.bytes ||
      sha256(actual.bytes) !== artifact.sha256
    )
      failures.push(`Artifact bytes/hash mismatch: ${artifact.relativePath}`);
    if (
      artifact.profileId !== p.profile?.captureLabel ||
      artifact.frameId !== frame?.frameId ||
      artifact.runId !== p.runId ||
      artifact.stateId !== p.stateId
    )
      failures.push(
        `Mixed artifact run/state/profile/frame: ${artifact.relativePath}`,
      );
  }
  return {
    status: failures.length ? 'fail' : blockers.length ? 'blocked' : 'pass',
    failures,
    blockers,
  };
}
