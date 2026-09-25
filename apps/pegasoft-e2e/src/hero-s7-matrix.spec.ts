import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  S7_CAPTURE_REPETITIONS,
  S7_EVIDENCE_SCHEMA_VERSION,
  CellAssertionError,
  atomicWriteJson,
  cellAssertion,
  closeShardResources,
  executeShardCells,
  loadEvidenceAttempt,
  loadEvidencePlan,
  sha256File,
  validatePlanInputs,
  workspaceRoot,
} from './s7-evidence-harness.mjs';

const RESTORATION_AMENDMENT_ID = 'restoration-reachability-amendment-v1';
const RESTORATION_ARM_KEY = 'pegasoft-s7-restoration-arm-v1';
const CELL_ASSERTION_TIMEOUT_MS = 10_000;
const RESTORED_FIELD_STATES = new Set([
  'field-contact',
  'field-pulse-a',
  'field-pulse-b',
]);

type MatrixCell = {
  id: string;
  state: string;
  profile: string;
  entryMode: string;
  sceneSelection: number | null;
  status: 'planned' | 'not-applicable';
  reason: string | null;
  historicalClockCandidate?: { clock: string; elapsedMs: number } | null;
};

type CellResult = Omit<MatrixCell, 'status'> & {
  status: 'pass' | 'fail' | 'not-applicable';
  observed?: Awaited<ReturnType<typeof readObservation>>;
  selectedContract?: string | null;
  restorationEvidence?: RestorationEvidence | null;
  rawImages?: Array<{ path: string; sha256: string }>;
  errorKind?: 'cell-assertion';
  error?: string;
};

type RestorationEvidence = {
  navigation: 'genuine-non-hero-away-back';
  awayUrl: string;
  restoredUrl: string;
  expectedScrollY: number;
  preNavigationScrollY: number;
  restoredScrollY: number;
  postBackScrollCorrection: false;
  firstEligible: Awaited<ReturnType<typeof readObservation>> & {
    capturedAtMs: number;
    capturedAtUtc: string;
    expectedScrollY: number;
    expectedTarget: number;
  };
};

let matrix: MatrixCell[] = [];
let evidencePlan: {
  runId: string;
  planHash: string;
  restorationContract: string;
  deterministicInputs: { captureRepetitions: number };
  shards: Array<{
    id: string;
    profile: string;
    state: string;
    expectedCellIds: string[];
  }>;
};
let evidenceAttempt: {
  attemptId: string;
  runId: string;
  planHash: string;
};
const runDirArgument = process.env.S7_MATRIX_RUN_DIR;
const runDir = runDirArgument
  ? resolve(workspaceRoot, runDirArgument)
  : resolve(workspaceRoot, 'docs/hero-reference/repairs/s7/runs/INVALID');
const SHARD_STATES = [
  'loader-mark',
  'world-reveal',
  'landing',
  'landing-idle',
  'activation-route',
  'activation-contact',
  'clearance-travel',
  'clearance-field-preview',
  'field-approach',
  'field-contact',
  'field-pulse-a',
  'field-pulse-b',
  'arrival-travel',
  'arrival-lockup',
  'journey-exit',
] as const;

test.beforeAll(async () => {
  expect(runDirArgument, 'S7_MATRIX_RUN_DIR must select a pinned evidence plan').toBeTruthy();
  const matrixModule = await import(
    pathToFileURL(
      resolve(
        process.cwd(),
        '../../docs/hero-reference/repairs/s0/contracts/repair-matrix.mjs',
      ),
    ).href
  );
  matrix = matrixModule.makeRepairMatrix() as MatrixCell[];
  evidencePlan = await loadEvidencePlan(runDir);
  evidenceAttempt = await loadEvidenceAttempt(runDir);
  expect(evidenceAttempt.runId).toBe(evidencePlan.runId);
  expect(evidenceAttempt.planHash).toBe(evidencePlan.planHash);
  await validatePlanInputs(evidencePlan);
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
});

test.afterEach(async ({ page, context }) => {
  await closeShardResources({ page, context });
});

async function readObservation(page: Page) {
  return page.locator('[data-hero-shell]').evaluate((shell) => {
    const scene = shell.querySelector('[data-hero-reference-state]');
    const frame = (
      window as Window & {
        __pegasoftHeroFrame?: {
          frame?: unknown;
          appliedConsumers?: unknown;
          renderedAtMs?: number;
        };
      }
    ).__pegasoftHeroFrame;
    const canvas = shell.querySelector(
      '[data-hero-surface="canvas"] canvas',
    ) as HTMLCanvasElement | null;
    const bodyStyle = getComputedStyle(document.body);
    const shellStyle = getComputedStyle(shell);
    return {
      capturedAtUtc: new Date().toISOString(),
      url: location.href,
      scrollY: window.scrollY,
      maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      state: scene?.getAttribute('data-hero-reference-state') ?? null,
      lifecycle: shell.getAttribute('data-hero-lifecycle'),
      sceneProgress: Number(shell.getAttribute('data-hero-scene-progress')),
      attempt: shell.getAttribute('data-hero-attempt-state'),
      canvas: canvas
        ? {
            cssWidth: canvas.clientWidth,
            cssHeight: canvas.clientHeight,
            backingWidth: canvas.width,
            backingHeight: canvas.height,
          }
        : null,
      fonts: {
        status: document.fonts.status,
        bodyFamily: bodyStyle.fontFamily,
        shellFamily: shellStyle.fontFamily,
        faces: [...document.fonts].map((face) => ({
          family: face.family,
          style: face.style,
          weight: face.weight,
          status: face.status,
        })),
      },
      appliedFrame: frame ?? null,
      renderedAtMs: frame?.renderedAtMs ?? null,
    };
  });
}

async function readSettledObservation(page: Page, expectedTarget: number) {
  await cellAssertion(() =>
    page.waitForFunction(
      (expected) => {
        const runtime = window as Window & {
          __pegasoftHeroFrame?: {
            frame?: {
              frameId?: number;
              target?: number;
              rendered?: { value?: number; velocity?: number };
            };
            appliedConsumers?: Record<string, { frameId?: number }>;
            renderedAtMs?: number;
          };
          __s7SettledAppliedFrame?: unknown;
        };
        const record = runtime.__pegasoftHeroFrame;
        const frame = record?.frame;
        const consumers = Object.values(record?.appliedConsumers ?? {});
        if (
          !record?.renderedAtMs ||
          !frame?.frameId ||
          Math.abs((frame.target ?? Number.NaN) - expected) > 0.002 ||
          Math.abs(
            (frame.rendered?.value ?? Number.NaN) - (frame.target ?? Number.NaN),
          ) > 0.002 ||
          Math.abs(frame.rendered?.velocity ?? Number.NaN) > 0.03 ||
          consumers.length === 0 ||
          consumers.some((consumer) => consumer.frameId !== frame.frameId)
        )
          return false;
        runtime.__s7SettledAppliedFrame = structuredClone({
          frame,
          appliedConsumers: record.appliedConsumers,
          renderedAtMs: record.renderedAtMs,
        });
        return true;
      },
      expectedTarget,
      { timeout: CELL_ASSERTION_TIMEOUT_MS },
    ),
  );
  const observed = await readObservation(page);
  const settled = await page.evaluate(() => {
    const runtime = window as Window & {
      __s7SettledAppliedFrame?: unknown;
    };
    return structuredClone(runtime.__s7SettledAppliedFrame ?? null);
  });
  if (!settled) throw new Error('settled frame snapshot was not captured');
  return {
    ...observed,
    appliedFrame: settled,
    renderedAtMs: (settled as { renderedAtMs?: number }).renderedAtMs ?? null,
  };
}

async function installFirstEligibleRestorationRecorder(page: Page) {
  await page.addInitScript(
    ({ armKey }) => {
      const runtime = window as Window & {
        __pegasoftHeroFrame?: {
          frame?: {
            frameId?: number;
            target?: number;
            rendered?: { value?: number };
            fieldElapsedMs?: number;
          };
          appliedConsumers?: Record<string, { frameId?: number }>;
          renderedAtMs?: number;
        };
        __s7FirstEligibleRestoredFrame?: unknown;
      };
      const poll = () => {
        const rawArm = sessionStorage.getItem(armKey);
        if (!rawArm || runtime.__s7FirstEligibleRestoredFrame) {
          requestAnimationFrame(poll);
          return;
        }
        try {
          const arm = JSON.parse(rawArm) as {
            expectedScrollY: number;
            expectedTarget: number;
          };
          const shell = document.querySelector('[data-hero-shell]');
          const surface = shell?.querySelector('[data-hero-surface]');
          const surfaceRect = surface?.getBoundingClientRect();
          const surfaceStyle = surface ? getComputedStyle(surface) : null;
          const frameRecord = runtime.__pegasoftHeroFrame;
          const frame = frameRecord?.frame;
          const consumers = Object.values(frameRecord?.appliedConsumers ?? {});
          const eligible =
            !!shell &&
            /^(ready|fallback)$/u.test(
              shell.getAttribute('data-hero-attempt-state') ?? '',
            ) &&
            shell.getAttribute('data-copy-live') === 'true' &&
            shell.getAttribute('data-loader-cleared') === 'true' &&
            !!surface &&
            !!surfaceRect &&
            surfaceRect.width > 0 &&
            surfaceRect.height > 0 &&
            surfaceStyle?.display !== 'none' &&
            surfaceStyle?.visibility !== 'hidden' &&
            !!frameRecord?.renderedAtMs &&
            !!frame?.frameId &&
            Math.abs((frame.target ?? Number.NaN) - arm.expectedTarget) <=
              0.002 &&
            Math.abs(
              (frame.rendered?.value ?? Number.NaN) - arm.expectedTarget,
            ) <= 0.002 &&
            Math.abs(scrollY - arm.expectedScrollY) <= 1 &&
            consumers.length > 0 &&
            consumers.every((consumer) => consumer.frameId === frame.frameId) &&
            Number.isFinite(frame.fieldElapsedMs) &&
            (frame.fieldElapsedMs ?? -1) >= 0;
          if (eligible) {
            const scene = shell.querySelector('[data-hero-reference-state]');
            const canvas = shell.querySelector(
              '[data-hero-surface="canvas"] canvas',
            ) as HTMLCanvasElement | null;
            runtime.__s7FirstEligibleRestoredFrame = {
              capturedAtMs: performance.now(),
              capturedAtUtc: new Date().toISOString(),
              expectedScrollY: arm.expectedScrollY,
              expectedTarget: arm.expectedTarget,
              scrollY,
              maxScrollY:
                document.documentElement.scrollHeight - window.innerHeight,
              viewport: { width: innerWidth, height: innerHeight },
              state: scene?.getAttribute('data-hero-reference-state') ?? null,
              lifecycle: shell.getAttribute('data-hero-lifecycle'),
              sceneProgress: Number(
                shell.getAttribute('data-hero-scene-progress'),
              ),
              attempt: shell.getAttribute('data-hero-attempt-state'),
              canvas: canvas
                ? {
                    cssWidth: canvas.clientWidth,
                    cssHeight: canvas.clientHeight,
                    backingWidth: canvas.width,
                    backingHeight: canvas.height,
                  }
                : null,
              fonts: {
                status: document.fonts.status,
                bodyFamily: getComputedStyle(document.body).fontFamily,
                shellFamily: getComputedStyle(shell).fontFamily,
                faces: [...document.fonts].map((face) => ({
                  family: face.family,
                  style: face.style,
                  weight: face.weight,
                  status: face.status,
                })),
              },
              url: location.href,
              appliedFrame: structuredClone(frameRecord),
              renderedAtMs: frameRecord.renderedAtMs ?? null,
            };
            sessionStorage.removeItem(armKey);
          }
        } catch {
          // An invalid arm record is evidence failure; leave it armed so the
          // Playwright wait times out instead of silently accepting a frame.
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    },
    { armKey: RESTORATION_ARM_KEY },
  );
}

async function waitReady(page: Page) {
  const shell = page.locator('[data-hero-shell]');
  await cellAssertion(() => expect(shell).toHaveCount(1));
  await cellAssertion(() =>
    expect
      .poll(() => shell.getAttribute('data-hero-attempt-state'))
      .toMatch(/^(ready|fallback)$/u),
  );
  await cellAssertion(() =>
    expect(shell).toHaveAttribute('data-copy-live', 'true'),
  );
  await cellAssertion(() =>
    expect(shell).toHaveAttribute('data-loader-cleared', 'true'),
  );
  await cellAssertion(() =>
    expect(shell.locator('[data-hero-surface]')).toBeVisible(),
  );
  return shell;
}

async function targetScrollY(page: Page, sceneProgress: number) {
  return page.evaluate((target) => {
    const flow = document.querySelector('[data-hero-process]');
    const wrapper = flow?.querySelector('div');
    if (!flow || !wrapper) throw new Error('hero flow geometry is unavailable');
    const range = Math.max(flow.scrollHeight - wrapper.clientHeight, 1);
    const denominator = window.innerHeight * 0.4 + (range * 400) / 356;
    const y = target * denominator;
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    if (y > maximum)
      throw new Error(
        `target ${target} requires ${y}px but page maximum is ${maximum}px`,
      );
    return Math.round(y);
  }, sceneProgress);
}

async function waitForCommittedFrame(
  page: Page,
  targetProgress: number,
  options: { settle?: boolean; minimumFieldElapsedMs?: number } = {},
) {
  const { settle = true, minimumFieldElapsedMs = 0 } = options;
  await cellAssertion(() =>
    page.waitForFunction(
      ({ expectedTarget, requireSettled, minimumFieldMs }) => {
      const record = (
        window as Window & {
          __pegasoftHeroFrame?: {
            renderedAtMs?: number;
            frame?: {
              frameId?: number;
              target?: number;
              rendered?: { value?: number; velocity?: number };
              fieldElapsedMs?: number;
            };
            appliedConsumers?: Record<string, { frameId?: number }>;
          };
        }
      ).__pegasoftHeroFrame;
      const frame = record?.frame;
      if (
        !record?.renderedAtMs ||
        !frame?.frameId ||
        Math.abs((frame.target ?? Number.NaN) - expectedTarget) > 0.002 ||
        (frame.fieldElapsedMs ?? 0) < minimumFieldMs
      )
        return false;
      const consumers = Object.values(record.appliedConsumers ?? {});
      if (
        consumers.length === 0 ||
        consumers.some((consumer) => consumer.frameId !== frame.frameId)
      )
        return false;
      return (
        !requireSettled ||
        (Math.abs((frame.rendered?.value ?? Number.NaN) - expectedTarget) <=
          0.002 &&
          Math.abs(frame.rendered?.velocity ?? Number.NaN) <= 0.03)
      );
      },
      {
        expectedTarget: targetProgress,
        requireSettled: settle,
        minimumFieldMs: minimumFieldElapsedMs,
      },
      { timeout: CELL_ASSERTION_TIMEOUT_MS },
    ),
  );
}

async function applyPhysicalEntry(
  page: Page,
  mode: string,
  target: number,
  sceneSelection: number,
): Promise<RestorationEvidence | null> {
  // Landing is reached by legal startup time at scroll zero. A forward recipe
  // cannot approach zero from below, so it must not manufacture a positive
  // scroll and relabel the resulting activation state as landing.
  if (sceneSelection === 0 && mode === 'forward') return null;
  if (mode === 'forward') {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 80)), target);
    await page.mouse.wheel(0, 80);
  } else if (mode === 'reverse') {
    // Reverse must approach from larger physical input, but an arbitrary 80px
    // lead makes the source-owned >.72 field clock age before slower mobile
    // captures can observe the exact <300ms contact phase. Twenty pixels still
    // establishes a genuine descending wheel history without manufacturing a
    // clock reset, widening the classifier, or changing the target.
    await page.evaluate((y) => window.scrollTo(0, y + 20), target);
    await page.mouse.wheel(0, -20);
  } else if (mode === 'direct-input') {
    await page.mouse.wheel(0, target);
  } else if (mode === 'jump') {
    await page.evaluate((y) => window.scrollTo(0, y), target);
  } else if (mode === 'resize') {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('viewport unavailable');
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height + 1,
    });
    await page.setViewportSize(viewport);
  } else if (mode === 'native-restored') {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await cellAssertion(() =>
      page.waitForFunction(
        (expected) => Math.abs(window.scrollY - expected) <= 1,
        target,
        { timeout: CELL_ASSERTION_TIMEOUT_MS },
      ),
    );
    const preNavigationScrollY = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => {
      delete (
        window as Window & {
          __s7FirstEligibleRestoredFrame?: unknown;
        }
      ).__s7FirstEligibleRestoredFrame;
    });
    // Use a genuine non-hero document. A query-only reload mounts another hero
    // at the restored scroll position and advances its field clock for the
    // entire loader interval, which is not an away/back restoration history.
    await page.goto('/privacy?s7-away=1');
    // Arm only after the away navigation has committed. Arming on the origin
    // page can capture its already-ready frame before unload and falsely label
    // that pre-navigation frame as restored evidence.
    await page.evaluate(
      ({ armKey, expectedScrollY, expectedTarget }) => {
        sessionStorage.setItem(
          armKey,
          JSON.stringify({ expectedScrollY, expectedTarget }),
        );
      },
      {
        armKey: RESTORATION_ARM_KEY,
        expectedScrollY: target,
        expectedTarget: sceneSelection,
      },
    );
    await page.goBack();
    await cellAssertion(() =>
      page.waitForFunction(
        () =>
          !!(
            window as Window & {
              __s7FirstEligibleRestoredFrame?: unknown;
            }
          ).__s7FirstEligibleRestoredFrame,
        undefined,
        { timeout: CELL_ASSERTION_TIMEOUT_MS },
      ),
    );
    const firstEligible = await page.evaluate(() =>
      structuredClone(
        (
          window as Window & {
            __s7FirstEligibleRestoredFrame?: RestorationEvidence['firstEligible'];
          }
        ).__s7FirstEligibleRestoredFrame,
      ),
    );
    if (!firstEligible) {
      throw new CellAssertionError(
        'first eligible restored frame was not recorded',
      );
    }
    await waitReady(page);
    await cellAssertion(() =>
      page.waitForFunction(
        (expected) => Math.abs(window.scrollY - expected) <= 1,
        target,
        { timeout: CELL_ASSERTION_TIMEOUT_MS },
      ),
    );
    const restoredScrollY = await page.evaluate(() => window.scrollY);
    return {
      navigation: 'genuine-non-hero-away-back',
      awayUrl: '/privacy?s7-away=1',
      restoredUrl: page.url(),
      expectedScrollY: target,
      preNavigationScrollY,
      restoredScrollY,
      postBackScrollCorrection: false,
      firstEligible,
    };
  } else {
    throw new Error(`unknown entry mode ${mode}`);
  }
  await cellAssertion(() =>
    page.waitForFunction(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
      undefined,
      { timeout: CELL_ASSERTION_TIMEOUT_MS },
    ),
  );
  return null;
}

function usesRestorationAmendment(cell: MatrixCell) {
  return cell.state === 'field-contact' && cell.entryMode === 'native-restored';
}

function classifyObservedState(
  observed: Awaited<ReturnType<typeof readObservation>>,
) {
  const frame = observed.appliedFrame?.frame as
    | { target?: number; fieldElapsedMs?: number }
    | undefined;
  if (frame && (frame.target ?? 0) >= 0.72 && (frame.target ?? 0) < 0.82) {
    const elapsed = frame.fieldElapsedMs ?? 0;
    if (elapsed < 300) return 'field-contact';
    return elapsed < 1_600 ? 'field-pulse-a' : 'field-pulse-b';
  }
  return observed.state;
}

for (const shardState of SHARD_STATES) {
  test(`records bounded S7 shard: ${shardState}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const profile = testInfo.project.name;
    const shardId = `${profile}--${shardState}`;
    const shardPlan = evidencePlan.shards.find(({ id }) => id === shardId);
    expect(shardPlan, `${shardId}: missing shard plan`).toBeTruthy();
    const shardCells = matrix.filter(
      (item) => item.profile === profile && item.state === shardState,
    );
    expect(
      shardCells.map(({ id }) => id),
      `${shardId}: generated cells differ from plan`,
    ).toEqual(shardPlan?.expectedCellIds);
    expect(evidencePlan.restorationContract).toBe(RESTORATION_AMENDMENT_ID);
    expect(evidencePlan.deterministicInputs.captureRepetitions).toBe(
      S7_CAPTURE_REPETITIONS,
    );
    await installFirstEligibleRestorationRecorder(page);
    const startedAtUtc = new Date().toISOString();
    const reportPath = resolve(runDir, 'shards', `${shardId}.json`);
    const imageDir = resolve(runDir, 'images', shardId);
    await mkdir(imageDir, { recursive: true });

    const persist = async ({
      results,
      fatal,
    }: {
      results: CellResult[];
      fatal: null | { cellId: string; errorKind: string; error: string };
    }) => {
      await atomicWriteJson(reportPath, {
        schemaVersion: S7_EVIDENCE_SCHEMA_VERSION,
        runId: evidencePlan.runId,
        planHash: evidencePlan.planHash,
        attemptId: evidenceAttempt.attemptId,
        shardId,
        profile,
        state: shardState,
        startedAtUtc,
        updatedAtUtc: new Date().toISOString(),
        expectedCellIds: shardPlan?.expectedCellIds,
        execution: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          workerIndex: testInfo.workerIndex,
          parallelIndex: testInfo.parallelIndex,
        },
        results,
        fatal,
      });
    };

    const results = (await executeShardCells({
      cells: shardCells,
      fatalContext: () => ({ pageClosed: page.isClosed() }),
      persist,
      executeCell: async (cell: MatrixCell): Promise<CellResult> => {
        if (cell.status === 'not-applicable') {
          return { ...cell, status: 'not-applicable' };
        }
        let observed: Awaited<ReturnType<typeof readObservation>> | undefined;
        let restorationEvidence: RestorationEvidence | null = null;
        await page.goto('/');
        if (cell.sceneSelection === null) {
          // Startup recipes remain normal timed navigation; no state/time control is used.
          await page.waitForTimeout(cell.state === 'loader-mark' ? 2_000 : 3_500);
        } else {
          await waitReady(page);
          const target = await targetScrollY(page, cell.sceneSelection);
          restorationEvidence = await applyPhysicalEntry(
            page,
            cell.entryMode,
            target,
            cell.sceneSelection,
          );
          if (cell.state === 'landing-idle') {
            await cellAssertion(() =>
              expect
                .poll(() =>
                  page
                    .locator('[data-hero-reference-state]')
                    .getAttribute('data-hero-reference-state'),
                )
                .toBe('landing-idle'),
            );
          } else if (usesRestorationAmendment(cell)) {
            observed = restorationEvidence?.firstEligible;
            if (!observed) {
              throw new Error(
                `${cell.id}: missing first eligible restoration evidence`,
              );
            }
          } else if (cell.state === 'field-contact') {
            await waitForCommittedFrame(page, cell.sceneSelection, {
              settle: false,
            });
          } else if (cell.state === 'field-pulse-a') {
            await waitForCommittedFrame(page, cell.sceneSelection, {
              minimumFieldElapsedMs: 300,
            });
          } else if (cell.state === 'field-pulse-b') {
            await waitForCommittedFrame(page, cell.sceneSelection, {
              minimumFieldElapsedMs: 2_800,
            });
          } else {
            await waitForCommittedFrame(page, cell.sceneSelection);
          }
        }
        observed ??= await readObservation(page);
        const observedState = classifyObservedState(observed);
        if (usesRestorationAmendment(cell)) {
          await cellAssertion(() =>
            expect(
              RESTORED_FIELD_STATES.has(observedState ?? ''),
              `${cell.id}: first eligible restored frame left the field family`,
            ).toBe(true),
          );
          const frame = observed.appliedFrame?.frame as
            | { fieldElapsedMs?: number }
            | undefined;
          await cellAssertion(() =>
            expect(
              Number.isFinite(frame?.fieldElapsedMs) &&
                (frame?.fieldElapsedMs ?? -1) >= 0,
              `${cell.id}: restored field clock is invalid`,
            ).toBe(true),
          );
        } else {
          await cellAssertion(() =>
            expect(
              observedState,
              `${cell.id}: normal history selected a different state`,
            ).toBe(cell.state),
          );
        }
        if (
          cell.sceneSelection !== null &&
          cell.state !== 'field-contact' &&
          !usesRestorationAmendment(cell)
        ) {
          observed = await readSettledObservation(page, cell.sceneSelection);
        }
        await cellAssertion(() =>
          expect(
            observed.appliedFrame,
            `${cell.id}: missing applied frame`,
          ).not.toBeNull(),
        );
        await cellAssertion(() =>
          expect(
            observed.renderedAtMs,
            `${cell.id}: frame was not rendered`,
          ).not.toBeNull(),
        );
        const rawImages = [];
        for (let repetition = 1; repetition <= S7_CAPTURE_REPETITIONS; repetition += 1) {
          const imagePath = resolve(
            imageDir,
            `${cell.id.replaceAll('/', '--')}--repeat-${repetition}.png`,
          );
          await page.screenshot({ path: imagePath });
          rawImages.push({
            path: relative(workspaceRoot, imagePath),
            sha256: await sha256File(imagePath),
          });
        }
        return {
          ...cell,
          status: 'pass',
          observed,
          selectedContract: evidencePlan.restorationContract,
          restorationEvidence,
          rawImages,
        };
      },
    })) as CellResult[];

    expect(
      results.filter((result) => result.status === 'fail'),
      `${shardId}: every applicable cell must pass`,
    ).toEqual([]);
  });
}
