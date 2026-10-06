import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { CaptureProvenanceV1 } from './hero-capture-provenance';

export const CAPTURE_RUN_CONTEXT_ENV = 'HERO_CAPTURE_RUN_CONTEXT';
export type CaptureProvenance = { buildId: string; inputTreeSha256: string };
export type CaptureRunContext = CaptureProvenance & {
  runId: string;
  outputRoot: string;
  startedAt: string;
  expectedStates: readonly string[];
  contextPath: string;
};
export type CaptureArtifact = { path: string; bytes: number; sha256: string };
export type CaptureOutcomeInput = {
  state: string;
  status: 'complete' | 'failed';
  artifacts?: readonly string[];
  error?: string;
  captureProvenance?: CaptureProvenanceV1;
};
export type CaptureOutcome = {
  runId: string;
  state: string;
  status: 'complete' | 'failed';
  recordedAt: string;
  artifacts: CaptureArtifact[];
  error?: string;
  captureProvenance?: CaptureProvenanceV1;
};
export type CaptureManifest = CaptureRunContext & {
  schemaVersion: 7;
  status: 'complete' | 'failed';
  completedAt: string;
  expectedStateCount: number;
  capturedStateCount: number;
  states: {
    key: string;
    implementation: CaptureArtifact;
    measurement: CaptureArtifact;
    captureProvenance?: CaptureProvenanceV1;
  }[];
  outcomes: CaptureOutcome[];
  missingStates: string[];
  failures: { state?: string; reason: string }[];
  artifacts: CaptureArtifact[];
};

function validateInputs(
  expectedStates: readonly string[],
  provenance: CaptureProvenance,
) {
  if (
    !Array.isArray(expectedStates) ||
    expectedStates.length === 0 ||
    expectedStates.some(
      (state) =>
        typeof state !== 'string' || !/^[a-z0-9][a-z0-9-]*$/u.test(state),
    ) ||
    new Set(expectedStates).size !== expectedStates.length
  ) {
    throw new Error('Capture requires unique, nonempty state keys');
  }
  if (
    typeof provenance.buildId !== 'string' ||
    !provenance.buildId.trim() ||
    typeof provenance.inputTreeSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(provenance.inputTreeSha256)
  ) {
    throw new Error('Capture requires buildId and inputTreeSha256 provenance');
  }
}

async function writeAtomic(file: string, data: unknown) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    flag: 'wx',
  });
  await rename(temporary, file);
}

export async function initializeCaptureRun(
  root: string,
  expectedStates: readonly string[],
  provenance: CaptureProvenance,
): Promise<CaptureRunContext> {
  validateInputs(expectedStates, provenance);
  const runId = randomUUID();
  const outputRoot = path.resolve(
    root,
    'test-output/hero-reference/runs',
    runId,
  );
  await mkdir(path.dirname(outputRoot), { recursive: true });
  await mkdir(outputRoot);
  await Promise.all(
    ['implementation', 'measurements', 'outcomes'].map((directory) =>
      mkdir(path.join(outputRoot, directory)),
    ),
  );
  const context: CaptureRunContext = {
    runId,
    outputRoot,
    startedAt: new Date().toISOString(),
    buildId: provenance.buildId,
    inputTreeSha256: provenance.inputTreeSha256,
    expectedStates: [...expectedStates],
    contextPath: path.join(outputRoot, 'capture-run.json'),
  };
  await writeAtomic(context.contextPath, context);
  return context;
}

export async function readCaptureRun(
  contextPath = process.env[CAPTURE_RUN_CONTEXT_ENV],
): Promise<CaptureRunContext> {
  if (!contextPath)
    throw new Error(
      `Missing ${CAPTURE_RUN_CONTEXT_ENV}; capture global setup must initialize the run`,
    );
  const context: CaptureRunContext = JSON.parse(
    await readFile(contextPath, 'utf8'),
  );
  validateInputs(context.expectedStates, context);
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(
      context.runId,
    ) ||
    !Number.isFinite(Date.parse(context.startedAt)) ||
    !path.isAbsolute(context.outputRoot) ||
    path.resolve(contextPath) !== context.contextPath ||
    context.contextPath !== path.join(context.outputRoot, 'capture-run.json') ||
    path.basename(context.outputRoot) !== context.runId
  ) {
    throw new Error('Invalid capture run context');
  }
  return context;
}

async function validateContext(context: CaptureRunContext) {
  const saved = await readCaptureRun(context.contextPath);
  if (JSON.stringify(saved) !== JSON.stringify(context))
    throw new Error('Capture run context differs from saved run ownership');
}

function artifactPath(context: CaptureRunContext, file: string) {
  const absolute = path.resolve(context.outputRoot, file);
  const relative = path.relative(context.outputRoot, absolute);
  if (
    !relative ||
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Artifact escapes capture run: ${file}`);
  }
  return relative.split(path.sep).join('/');
}

async function evidence(
  context: CaptureRunContext,
  file: string,
  allowEmpty = false,
): Promise<CaptureArtifact> {
  const relative = artifactPath(context, file);
  // Reject links at every level: evidence must belong physically to this run.
  let current = context.outputRoot;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error(`Artifact is a symbolic link: ${relative}`);
  }
  if (!(await lstat(current)).isFile())
    throw new Error(`Artifact is not a file: ${relative}`);
  const bytes = await readFile(current);
  if (bytes.length === 0 && !allowEmpty)
    throw new Error(`Artifact is empty: ${relative}`);
  return {
    path: relative,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function recordCaptureOutcome(
  context: CaptureRunContext,
  input: CaptureOutcomeInput,
): Promise<void> {
  await validateContext(context);
  if (!context.expectedStates.includes(input.state))
    throw new Error(`Unexpected capture state: ${input.state}`);
  if (input.status !== 'complete' && input.status !== 'failed')
    throw new Error('Invalid capture outcome status');
  const files = [
    ...new Set([
      ...(input.status === 'complete'
        ? [
            `implementation/${input.state}.png`,
            `measurements/${input.state}.json`,
          ]
        : []),
      ...(input.artifacts ?? []),
    ]),
  ];
  const artifacts: CaptureArtifact[] = [];
  const errors = input.error ? [input.error] : [];
  for (const file of files) {
    try {
      artifacts.push(await evidence(context, file));
    } catch (error) {
      errors.push(
        `missing or invalid artifact ${file}: ${errorMessage(error)}`,
      );
    }
  }
  const status = errors.length > 0 ? 'failed' : input.status;
  const outcome: CaptureOutcome = {
    runId: context.runId,
    state: input.state,
    status,
    recordedAt: new Date().toISOString(),
    artifacts,
    ...(input.captureProvenance
      ? { captureProvenance: structuredClone(input.captureProvenance) }
      : {}),
    ...(status === 'failed'
      ? {
          error:
            errors.join('; ') || 'Capture failed without an error description',
        }
      : {}),
  };
  // Each attempt owns a new file; restarting a worker cannot overwrite a failure.
  await writeAtomic(
    path.join(
      context.outputRoot,
      'outcomes',
      `${input.state}-${randomUUID()}.json`,
    ),
    outcome,
  );
}

export async function finalizeCaptureRun(
  context: CaptureRunContext,
): Promise<CaptureManifest> {
  await validateContext(context);
  const failures: CaptureManifest['failures'] = [];
  const outcomes: CaptureOutcome[] = [];
  for (const file of (
    await readdir(path.join(context.outputRoot, 'outcomes'))
  ).sort()) {
    try {
      const outcome: CaptureOutcome = JSON.parse(
        await readFile(path.join(context.outputRoot, 'outcomes', file), 'utf8'),
      );
      if (
        outcome.runId !== context.runId ||
        !context.expectedStates.includes(outcome.state) ||
        !['complete', 'failed'].includes(outcome.status) ||
        !Array.isArray(outcome.artifacts)
      ) {
        throw new Error('Outcome has invalid runId, state or status');
      }
      outcomes.push(outcome);
      if (outcome.status === 'failed')
        failures.push({
          state: outcome.state,
          reason: outcome.error || 'Capture failed',
        });
      for (const artifact of outcome.artifacts) {
        try {
          const actual = await evidence(context, artifact.path);
          if (
            actual.bytes !== artifact.bytes ||
            actual.sha256 !== artifact.sha256
          ) {
            failures.push({
              state: outcome.state,
              reason: `Artifact changed after outcome: ${artifact.path}`,
            });
          }
        } catch (error) {
          failures.push({
            state: outcome.state,
            reason: `Artifact missing or invalid: ${artifact.path}: ${errorMessage(error)}`,
          });
        }
      }
    } catch (error) {
      failures.push({
        reason: `Invalid outcome ${file}: ${errorMessage(error)}`,
      });
    }
  }
  const missingStates = context.expectedStates.filter(
    (state) => !outcomes.some((outcome) => outcome.state === state),
  );
  for (const state of missingStates)
    failures.push({ state, reason: 'Missing state outcome' });
  const states: CaptureManifest['states'] = [];
  for (const state of context.expectedStates) {
    const complete = outcomes.filter(
      (outcome) => outcome.state === state && outcome.status === 'complete',
    );
    if (complete.length === 0) continue;
    if (complete.length !== 1)
      failures.push({ state, reason: 'Multiple complete outcomes for state' });
    try {
      const implementation = await evidence(
        context,
        `implementation/${state}.png`,
      );
      const measurement = await evidence(context, `measurements/${state}.json`);
      if (
        ![implementation, measurement].every((artifact) =>
          complete[0].artifacts.some(
            (saved) =>
              saved.path === artifact.path &&
              saved.sha256 === artifact.sha256 &&
              saved.bytes === artifact.bytes,
          ),
        )
      ) {
        throw new Error(
          'Canonical artifacts are missing from matching outcome evidence',
        );
      }
      const metadata = JSON.parse(
        await readFile(path.join(context.outputRoot, measurement.path), 'utf8'),
      );
      if (metadata.runId !== context.runId || metadata.stateKey !== state)
        throw new Error(
          'Measurement runId or stateKey differs from capture run',
        );
      states.push({
        key: state,
        implementation,
        measurement,
        ...(complete[0].captureProvenance
          ? {
              captureProvenance: structuredClone(complete[0].captureProvenance),
            }
          : {}),
      });
    } catch (error) {
      failures.push({ state, reason: errorMessage(error) });
    }
  }
  const artifacts: CaptureArtifact[] = [];
  async function hashDirectory(directory: string) {
    for (const entry of (
      await readdir(directory, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (file === path.join(context.outputRoot, 'capture-manifest.json'))
        continue;
      if (entry.isDirectory()) await hashDirectory(file);
      else {
        try {
          artifacts.push(await evidence(context, file, true));
        } catch (error) {
          failures.push({ reason: errorMessage(error) });
        }
        if (entry.name.endsWith('.tmp'))
          failures.push({
            reason: `Interrupted atomic artifact write: ${artifactPath(context, file)}`,
          });
      }
    }
  }
  await hashDirectory(context.outputRoot);
  const manifest: CaptureManifest = {
    ...context,
    schemaVersion: 7,
    status:
      failures.length === 0 && states.length === context.expectedStates.length
        ? 'complete'
        : 'failed',
    completedAt: new Date().toISOString(),
    expectedStateCount: context.expectedStates.length,
    capturedStateCount: states.length,
    states,
    outcomes,
    missingStates,
    failures,
    artifacts,
  };
  await writeAtomic(
    path.join(context.outputRoot, 'capture-manifest.json'),
    manifest,
  );
  return manifest;
}
