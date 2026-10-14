import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForAnyHeroState(page: Page) {
  const referenceState = page.locator('[data-hero-reference-state]');

  await expect(referenceState).toHaveCount(1, { timeout: 10_000 });
  await expect(referenceState).toHaveAttribute(
    'data-hero-render-ready',
    'true',
    { timeout: 10_000 },
  );
  await expect(referenceState.locator('[data-hero-surface]')).toBeVisible();

  return referenceState;
}

async function waitForSettledLandingState(page: Page) {
  const referenceState = page.locator(
    [
      '[data-hero-reference-state="landing"]',
      '[data-hero-reference-state="landing-idle"]',
    ].join(', '),
  );

  await expect(referenceState).toHaveCount(1, { timeout: 12_000 });
  await expect(referenceState).toHaveAttribute(
    'data-hero-render-ready',
    'true',
  );
  await expect(referenceState.locator('[data-hero-surface]')).toBeVisible();
  await expect(page.locator('[data-hero-copy="landing"] h1')).toHaveCSS(
    'opacity',
    '1',
    { timeout: 4_000 },
  );
  await expect(page.locator('[data-hero-copy="landing"] p')).toHaveCSS(
    'opacity',
    '1',
    { timeout: 4_000 },
  );

  return referenceState;
}

type HeroBrowserSignature = {
  activeStep: string | null;
  copyState: string | null;
  lifecycle: string | null;
  profile: string | null;
  rawProgress: number;
  sceneProgress: number;
};

const CONVERGENCE_PROFILE_BY_PROJECT = {
  chromium: {
    expectedProfile: 'desktop',
    initialViewport: { width: 1280, height: 800 },
    resizedViewport: { width: 1440, height: 900 },
  },
  'Mobile Chrome': {
    expectedProfile: 'mobile',
    initialViewport: { width: 390, height: 844 },
    resizedViewport: { width: 430, height: 900 },
  },
} as const;

function getConvergenceProfile(projectName: string) {
  const profile =
    CONVERGENCE_PROFILE_BY_PROJECT[
      projectName as keyof typeof CONVERGENCE_PROFILE_BY_PROJECT
    ];
  if (!profile) {
    throw new Error(
      `No hero convergence profile is configured for ${projectName}`,
    );
  }
  return profile;
}

async function scrollToRawHeroProgress(page: Page, rawProgress: number) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        let previousSample = '';
        let stableFrameCount = 0;
        let frameCount = 0;

        const sampleLayout = () => {
          const flow = document.querySelector<HTMLElement>(
            '[data-hero-process]',
          );

          if (!flow) {
            reject(new Error('Hero process flow is unavailable'));
            return;
          }

          const sample = [
            window.innerWidth,
            window.innerHeight,
            flow.offsetHeight,
            Math.round(
              (flow.getBoundingClientRect().top + window.scrollY) * 1000,
            ),
            document.documentElement.scrollHeight,
          ].join(':');

          stableFrameCount =
            sample === previousSample ? stableFrameCount + 1 : 0;
          previousSample = sample;
          frameCount += 1;

          if (stableFrameCount >= 2) {
            resolve();
            return;
          }

          if (frameCount >= 120) {
            reject(
              new Error(
                `Hero layout did not settle; last geometry was ${sample}`,
              ),
            );
            return;
          }

          requestAnimationFrame(sampleLayout);
        };

        requestAnimationFrame(sampleLayout);
      }),
  );

  const convergence = await page.evaluate(async (targetProgress) => {
    const expectedProgress = Math.round(targetProgress * 1000);
    const deadline = performance.now() + 10_000;
    let matchingFrameCount = 0;
    let lastProbe: Record<string, number | string | null> | null = null;

    while (performance.now() < deadline) {
      const flow = document.querySelector<HTMLElement>('[data-hero-process]');
      const shell = document.querySelector<HTMLElement>('[data-hero-shell]');

      if (!flow || !shell) {
        throw new Error('Hero process flow or shell is unavailable');
      }

      const viewportHeight = window.innerHeight;
      const flowDocumentTop = flow.getBoundingClientRect().top + window.scrollY;
      const scrollRange = Math.max(0, flow.offsetHeight - viewportHeight);
      const progressLead = Math.max(0, flowDocumentTop - viewportHeight * 0.4);
      const targetScrollY = Math.max(
        0,
        flowDocumentTop -
          progressLead +
          Math.min(1.25, Math.max(0, targetProgress)) * scrollRange,
      );

      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, targetScrollY);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const settledFlowDocumentTop =
        flow.getBoundingClientRect().top + window.scrollY;
      const settledScrollRange = Math.max(
        0,
        flow.offsetHeight - window.innerHeight,
      );
      const settledProgressLead = Math.max(
        0,
        settledFlowDocumentTop - window.innerHeight * 0.4,
      );
      const geometryProgress =
        settledScrollRange <= 0
          ? 0
          : Math.min(
              1.25,
              Math.max(
                0,
                (settledProgressLead - flow.getBoundingClientRect().top) /
                  settledScrollRange,
              ),
            );
      const diagnosticValue = shell.getAttribute('data-hero-raw-progress');
      const diagnosticProgress =
        diagnosticValue === null ? Number.NaN : Number(diagnosticValue);
      const rounded = (value: number) =>
        Number.isFinite(value) ? Math.round(value * 1000) : null;

      lastProbe = {
        diagnostic: rounded(diagnosticProgress),
        geometry: rounded(geometryProgress),
        flowHeight: flow.offsetHeight,
        profile:
          document
            .querySelector<HTMLElement>('[data-hero-reference-state]')
            ?.getAttribute('data-hero-profile') ?? null,
        scrollY: Math.round(window.scrollY),
        targetScrollY: Math.round(targetScrollY),
        viewportHeight: window.innerHeight,
      };

      matchingFrameCount =
        lastProbe.diagnostic === expectedProgress &&
        lastProbe.geometry === expectedProgress
          ? matchingFrameCount + 1
          : 0;

      if (matchingFrameCount >= 2) {
        return lastProbe;
      }
    }

    throw new Error(
      `Hero did not converge to raw progress ${targetProgress}; last probe was ${JSON.stringify(lastProbe)}`,
    );
  }, rawProgress);

  expect(convergence).toMatchObject({
    diagnostic: Math.round(rawProgress * 1000),
    geometry: Math.round(rawProgress * 1000),
  });
}

type AppliedFieldFrame = {
  fieldElapsedMs: number;
  frameId: number;
  renderedProgress: number;
  targetProgress: number;
};

async function enterAppliedFieldPhase(
  page: Page,
  minimumFieldElapsedMs: number,
): Promise<AppliedFieldFrame> {
  const sceneProgress = 0.74;
  await page.goto('/');
  await waitForAnyHeroState(page);
  const shell = page.locator('[data-hero-shell]');
  await expect(shell).toHaveAttribute('data-loader-cleared', 'true', {
    timeout: 10_000,
  });
  await expect(page.locator('body')).not.toHaveClass(/pegasoft-locked/u, {
    timeout: 10_000,
  });

  const targetScrollY = await page.evaluate((target) => {
    const flow = document.querySelector<HTMLElement>('[data-hero-process]');
    const wrapper = flow?.querySelector<HTMLElement>('div');
    if (!flow || !wrapper) {
      throw new Error('Hero flow geometry is unavailable');
    }

    const range = Math.max(flow.scrollHeight - wrapper.clientHeight, 1);
    const denominator = window.innerHeight * 0.4 + (range * 400) / 356;
    return Math.round(target * denominator);
  }, sceneProgress);

  await page.mouse.wheel(0, targetScrollY);
  try {
    await page.waitForFunction(
      ({ expectedTarget, minimumFieldMs }) => {
        const record = (
          window as Window & {
            __pegasoftHeroFrame?: {
              renderedAtMs?: number;
              frame?: {
                fieldElapsedMs?: number;
                frameId?: number;
                rendered?: { value?: number; velocity?: number };
                target?: number;
              };
              appliedConsumers?: Record<string, { frameId?: number }>;
            };
          }
        ).__pegasoftHeroFrame;
        const frame = record?.frame;
        const consumers = Object.values(record?.appliedConsumers ?? {});

        return Boolean(
          record?.renderedAtMs &&
          frame?.frameId &&
          Math.abs((frame.target ?? Number.NaN) - expectedTarget) <= 0.002 &&
          Math.abs((frame.rendered?.value ?? Number.NaN) - expectedTarget) <=
            0.002 &&
          Math.abs(frame.rendered?.velocity ?? Number.NaN) <= 0.03 &&
          (frame.fieldElapsedMs ?? 0) >= minimumFieldMs &&
          consumers.length > 0 &&
          consumers.every((consumer) => consumer.frameId === frame.frameId),
        );
      },
      {
        expectedTarget: sceneProgress,
        minimumFieldMs: minimumFieldElapsedMs,
      },
      { timeout: 10_000 },
    );
  } catch (error) {
    const probe = await page.evaluate(() => {
      const record = (
        window as Window & {
          __pegasoftHeroFrame?: {
            appliedConsumers?: Record<string, { frameId?: number }>;
            frame?: {
              fieldElapsedMs?: number;
              frameId?: number;
              rendered?: { value?: number; velocity?: number };
              target?: number;
            };
          };
        }
      ).__pegasoftHeroFrame;
      const frame = record?.frame;
      return {
        appliedConsumers: Object.fromEntries(
          Object.entries(record?.appliedConsumers ?? {}).map(([key, value]) => [
            key,
            value.frameId,
          ]),
        ),
        frame: frame
          ? {
              fieldElapsedMs: frame.fieldElapsedMs,
              frameId: frame.frameId,
              rendered: frame.rendered,
              target: frame.target,
            }
          : null,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        sceneProgress: document
          .querySelector('[data-hero-shell]')
          ?.getAttribute('data-hero-scene-progress'),
        scrollY: window.scrollY,
      };
    });
    throw new Error(
      `Applied field phase did not converge: ${JSON.stringify(probe)}`,
      { cause: error },
    );
  }

  return page.evaluate(() => {
    const record = (
      window as Window & {
        __pegasoftHeroFrame?: {
          frame?: {
            fieldElapsedMs?: number;
            frameId?: number;
            rendered?: { value?: number };
            target?: number;
          };
        };
      }
    ).__pegasoftHeroFrame;
    const frame = record?.frame;
    if (!frame?.frameId) throw new Error('Applied hero frame is unavailable');

    return {
      fieldElapsedMs: frame.fieldElapsedMs ?? 0,
      frameId: frame.frameId,
      renderedProgress: frame.rendered?.value ?? Number.NaN,
      targetProgress: frame.target ?? Number.NaN,
    };
  });
}

async function readHeroProgressProbe(page: Page) {
  return page.evaluate(() => {
    const flow = document.querySelector<HTMLElement>('[data-hero-process]');
    const shell = document.querySelector<HTMLElement>('[data-hero-shell]');
    const state = document.querySelector<HTMLElement>(
      '[data-hero-reference-state]',
    );

    if (!flow || !shell || !state) {
      throw new Error('Hero progress probe is unavailable');
    }

    const flowDocumentTop = flow.getBoundingClientRect().top + window.scrollY;
    const scrollRange = Math.max(0, flow.offsetHeight - window.innerHeight);
    const progressLead = Math.max(
      0,
      flowDocumentTop - window.innerHeight * 0.4,
    );
    const geometryProgress =
      scrollRange <= 0
        ? 0
        : Math.min(
            1.25,
            Math.max(
              0,
              (progressLead - flow.getBoundingClientRect().top) / scrollRange,
            ),
          );
    const diagnosticValue = shell.getAttribute('data-hero-raw-progress');
    const round = (value: number) =>
      Number.isFinite(value) ? Math.round(value * 1000) : null;

    return {
      diagnostic: round(
        diagnosticValue === null ? Number.NaN : Number(diagnosticValue),
      ),
      flowHeight: flow.offsetHeight,
      geometry: round(geometryProgress),
      profile: state.getAttribute('data-hero-profile'),
      scrollY: Math.round(window.scrollY),
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    };
  });
}

async function readHeroBrowserSignature(
  page: Page,
): Promise<HeroBrowserSignature> {
  const shell = page.locator('[data-hero-shell]');
  const [
    activeStep,
    copyState,
    lifecycle,
    profile,
    rawProgress,
    sceneProgress,
  ] = await Promise.all([
    page
      .locator('[data-hero-process-step][data-active="true"]')
      .getAttribute('data-hero-process-step'),
    shell.getAttribute('data-hero-copy-state'),
    shell.getAttribute('data-hero-lifecycle'),
    page
      .locator('[data-hero-reference-state]')
      .getAttribute('data-hero-profile'),
    shell.getAttribute('data-hero-raw-progress'),
    shell.getAttribute('data-hero-scene-progress'),
  ]);

  return {
    activeStep,
    copyState,
    lifecycle,
    profile,
    rawProgress: Number(rawProgress),
    sceneProgress: Number(sceneProgress),
  };
}

function expectEquivalentHeroSignature(
  actual: HeroBrowserSignature,
  expected: HeroBrowserSignature,
) {
  expect(actual.activeStep).toBe(expected.activeStep);
  expect(actual.copyState).toBe(expected.copyState);
  expect(actual.lifecycle).toBe(expected.lifecycle);
  expect(actual.profile).toBe(expected.profile);
  expect(actual.rawProgress).toBeCloseTo(expected.rawProgress, 3);
  expect(actual.sceneProgress).toBeCloseTo(expected.sceneProgress, 3);
}

test('homepage presents Pegasoft CTA and 3D/fallback surface', async ({
  page,
}) => {
  await page.goto('/?__heroState=landing-idle');
  const referenceState = await waitForSettledLandingState(page);

  await expect(
    page.getByRole('heading', {
      name: /the new standard\s+in product delivery/i,
    }),
  ).toBeVisible();
  await expect(page.locator('header.pegasoft-header')).toBeVisible();
  await expect(
    page.locator(
      '.menu-btn:visible, .pegasoft-header__ctas a:has-text("Book a Call"):visible',
    ),
  ).toHaveCount(1);

  const surface = await referenceState
    .locator('[data-hero-surface]')
    .evaluate((element) => {
      const canvas = element.querySelector('canvas');

      if (canvas) {
        const context =
          canvas.getContext('webgl2') ?? canvas.getContext('webgl');

        return {
          kind: 'canvas',
          ready: Boolean(context && canvas.width > 0 && canvas.height > 0),
        };
      }

      return {
        kind: 'fallback',
        ready:
          element.getAttribute('data-hero-surface') === 'fallback' &&
          Boolean(element.querySelector('[data-hero-fallback-shape]')),
      };
    });

  expect(surface.ready, `${surface.kind} hero surface should be useful`).toBe(
    true,
  );
});

test('work taxonomy keeps Concept Lab separate from client portfolio', async ({
  page,
}) => {
  await page.goto('/work');

  await expect(page.getByText('Concept Lab').first()).toBeVisible();
  await expect(page.getByText('Awaiting approved entries')).toBeVisible();
  await page.goto('/work/portfolio');
  await expect(
    page.getByText('No approved portfolio entries yet.'),
  ).toBeVisible();
});

test('seo and geo utility routes respond', async ({ page }) => {
  await page.goto('/llms.txt');
  await expect(page.getByText('# Pegasoft')).toBeVisible();

  const robotsResponse = await page.goto('/robots.txt');
  expect(robotsResponse?.status()).toBe(200);

  const sitemapResponse = await page.goto('/sitemap.xml');
  expect(sitemapResponse?.status()).toBe(200);
});

test('mobile layout avoids horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
});

test('homepage has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/?__heroState=landing-idle');
  await expect(page.getByRole('main')).toBeVisible();
  await waitForSettledLandingState(page);

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );

  expect(seriousViolations).toEqual([]);
});

test('homepage hydrates without runtime errors and mounts WebGL or fallback', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');
  const referenceState = await waitForAnyHeroState(page);
  expect(
    await referenceState.locator('canvas, [data-hero-fallback-shape]').count(),
    'Canvas or fallback content should mount',
  ).toBeGreaterThan(0);

  expect(pageErrors, 'uncaught page errors').toEqual([]);
  expect(consoleErrors, 'console and hydration errors').toEqual([]);
});

test('development harness observes field-pulse-b from physical input and applied time', async ({
  page,
}) => {
  const frame = await enterAppliedFieldPhase(page, 2_800);

  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute('data-hero-direct-entry', 'false');
  const diagnosticProgress = Number(
    await state.getAttribute('data-hero-scene-progress'),
  );
  await expect(state).toHaveAttribute('data-hero-seed', '43117');
  await expect(
    page.locator('[data-hero-process-step="3"][data-active="true"]'),
  ).toHaveCount(1);
  expect(frame.targetProgress).toBeCloseTo(0.74, 3);
  expect(frame.renderedProgress).toBeCloseTo(0.74, 3);
  expect(diagnosticProgress).toBeCloseTo(frame.targetProgress, 3);
  expect(frame.fieldElapsedMs).toBeGreaterThanOrEqual(2_800);
});

test('hero state converges across forward, reverse, jump, resize, and restored reload entry', async ({
  page,
}, testInfo) => {
  test.slow();

  const { expectedProfile, initialViewport, resizedViewport } =
    getConvergenceProfile(testInfo.project.name);

  await page.setViewportSize(initialViewport);
  await page.goto('/');
  await waitForAnyHeroState(page);

  for (const progress of [0.08, 0.42, 0.74]) {
    await scrollToRawHeroProgress(page, progress);
  }
  const forward = await readHeroBrowserSignature(page);
  expect(forward.profile).toBe(expectedProfile);

  for (const progress of [0.94, 0.82, 0.74]) {
    await scrollToRawHeroProgress(page, progress);
  }
  expectEquivalentHeroSignature(await readHeroBrowserSignature(page), forward);

  await scrollToRawHeroProgress(page, 0);
  await scrollToRawHeroProgress(page, 0.74);
  expectEquivalentHeroSignature(await readHeroBrowserSignature(page), forward);

  await page.setViewportSize(resizedViewport);
  await scrollToRawHeroProgress(page, 0.74);
  expectEquivalentHeroSignature(await readHeroBrowserSignature(page), forward);

  const restoredScrollY = await page.evaluate(() => window.scrollY);
  await page.reload();
  await waitForAnyHeroState(page);
  await page.evaluate((scrollY) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
  }, restoredScrollY);
  await expect
    .poll(async () => readHeroProgressProbe(page), {
      message: 'reload should restore and converge to the same journey state',
      timeout: 10_000,
    })
    .toMatchObject({
      diagnostic: 740,
      geometry: 740,
      profile: expectedProfile,
      viewport: resizedViewport,
    });
  expectEquivalentHeroSignature(await readHeroBrowserSignature(page), forward);
});

/* eslint-disable playwright/no-conditional-expect, playwright/no-conditional-in-test -- direction-specific journey invariants share one bounded desktop gate */
test('desktop journeys complete at normal, slow, fast, and reverse rates', async ({
  page,
}, testInfo) => {
  // eslint-disable-next-line playwright/no-skipped-test -- Phase 15 is the desktop integration gate
  test.skip(
    testInfo.project.name !== 'chromium',
    'Phase 15 rate coverage runs in the desktop Chromium profile.',
  );
  test.setTimeout(60_000);

  await page.goto('/');
  await waitForAnyHeroState(page);
  const shell = page.locator('[data-hero-shell]');
  await expect(shell).toHaveAttribute('data-loader-cleared', 'true', {
    timeout: 10_000,
  });

  const runLeg = async (
    direction: 'forward' | 'reverse',
    durationMs: number,
  ) => {
    const result = await page.evaluate(
      async ({ duration, journeyDirection }) => {
        const flow = document.querySelector<HTMLElement>('[data-hero-process]');
        const shellElement =
          document.querySelector<HTMLElement>('[data-hero-shell]');
        if (!flow || !shellElement) {
          throw new Error('Hero journey geometry is unavailable');
        }

        const flowTop = flow.getBoundingClientRect().top + window.scrollY;
        const range = Math.max(0, flow.offsetHeight - window.innerHeight);
        const lead = Math.max(0, flowTop - window.innerHeight * 0.4);
        const startY =
          journeyDirection === 'forward' ? 0 : flowTop - lead + range;
        const endY =
          journeyDirection === 'forward' ? flowTop - lead + range : 0;
        const samples: Array<{
          rawProgress: number;
          sceneProgress: number;
          scrollY: number;
        }> = [];
        const startedAt = performance.now();
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, startY);

        await new Promise<void>((resolve) => {
          const step = (timestamp: number) => {
            const ratio = Math.min(1, (timestamp - startedAt) / duration);
            const eased = ratio * ratio * (3 - 2 * ratio);
            window.scrollTo(0, startY + (endY - startY) * eased);
            samples.push({
              rawProgress: Number(shellElement.dataset.heroRawProgress),
              sceneProgress: Number(shellElement.dataset.heroSceneProgress),
              scrollY: window.scrollY,
            });
            if (ratio < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return {
          endY,
          finalRawProgress: Number(shellElement.dataset.heroRawProgress),
          finalSceneProgress: Number(shellElement.dataset.heroSceneProgress),
          finalScrollY: window.scrollY,
          samples,
        };
      },
      { duration: durationMs, journeyDirection: direction },
    );

    const expectedRawProgress = direction === 'forward' ? 1 : 0;
    await page.waitForFunction(
      () => {
        const record = (
          window as Window & {
            __pegasoftHeroFrame?: {
              appliedConsumers?: Record<string, { frameId?: number }>;
              frame?: {
                frameId?: number;
                rendered: { value: number; velocity: number };
                target: number;
              };
              renderedAtMs?: number;
            };
          }
        ).__pegasoftHeroFrame;
        const frame = record?.frame;
        const consumers = Object.values(record?.appliedConsumers ?? {});
        const diagnosticTarget = Number(
          document.querySelector<HTMLElement>('[data-hero-shell]')?.dataset
            .heroSceneProgress,
        );
        return Boolean(
          record?.renderedAtMs &&
          frame?.frameId &&
          Math.abs(frame.target - diagnosticTarget) <= 0.002 &&
          Math.abs(frame.rendered.value - frame.target) <= 0.002 &&
          Math.abs(frame.rendered.velocity) <= 0.03 &&
          consumers.length > 0 &&
          consumers.every((consumer) => consumer.frameId === frame.frameId),
        );
      },
      undefined,
      { timeout: 10_000 },
    );

    expect(Math.abs(result.finalScrollY - result.endY)).toBeLessThanOrEqual(1);
    expect(result.finalRawProgress).toBeCloseTo(expectedRawProgress, 3);
    if (direction === 'forward') {
      expect(result.finalSceneProgress).toBeGreaterThan(0.8);
    } else {
      expect(result.finalSceneProgress).toBeCloseTo(0, 3);
    }
    const orderedSamples = result.samples.filter(
      (sample) =>
        Number.isFinite(sample.rawProgress) &&
        Number.isFinite(sample.sceneProgress),
    );
    expect(orderedSamples.length).toBeGreaterThan(2);
    for (let index = 1; index < orderedSamples.length; index += 1) {
      const previous = orderedSamples[index - 1];
      const current = orderedSamples[index];
      if (direction === 'forward') {
        expect(current.scrollY).toBeGreaterThanOrEqual(previous.scrollY);
        expect(current.rawProgress + 0.002).toBeGreaterThanOrEqual(
          previous.rawProgress,
        );
      } else {
        expect(current.scrollY).toBeLessThanOrEqual(previous.scrollY);
        expect(current.rawProgress - 0.002).toBeLessThanOrEqual(
          previous.rawProgress,
        );
      }
    }
  };

  await runLeg('forward', 3_600);
  await runLeg('reverse', 600);
  await runLeg('forward', 7_200);
  await runLeg('reverse', 600);
  await runLeg('forward', 900);
  await runLeg('reverse', 3_600);

  await expect(shell).toHaveAttribute('data-hero-attempt-state', 'ready');
  await expect(shell).toHaveAttribute('data-loader-cleared', 'true');
});
/* eslint-enable playwright/no-conditional-expect, playwright/no-conditional-in-test */

test('the same physically reached applied field frame produces a stable capture', async ({
  page,
}, testInfo) => {
  // eslint-disable-next-line playwright/no-skipped-test -- fixed-viewport coverage belongs to one browser profile
  test.skip(
    testInfo.project.name !== 'chromium',
    'Fixed-viewport byte stability is covered by desktop Chromium.',
  );

  await page.setViewportSize({ width: 1508, height: 761 });
  const appliedFrame = await enterAppliedFieldPhase(page, 300);
  expect(appliedFrame.fieldElapsedMs).toBeLessThan(1_600);
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveCount(1);
  await expect(state.locator('[data-hero-surface]')).toBeVisible();
  await expect(state).toHaveAttribute('data-hero-render-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const driver = (
      window as Window & {
        __pegasoftHeroFrameDriver?: { pause: () => void };
      }
    ).__pegasoftHeroFrameDriver;
    if (!driver) throw new Error('Hero frame driver is unavailable');
    driver.pause();
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  const first = await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('capture-a.png'),
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const second = await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('capture-b.png'),
  });

  expect(
    first.equals(second),
    'a paused applied frame should remain byte-stable',
  ).toBe(true);
});

test('forced fallback remains useful and state-addressable', async ({
  page,
}) => {
  await page.goto(
    '/?__heroState=arrival-lockup&__heroTime=1200&__heroFallback=1',
  );

  const state = page.locator('[data-hero-reference-state="arrival-lockup"]');
  await expect(state).toHaveAttribute('data-hero-motion', 'static');
  await expect(
    state.locator(
      '[data-hero-surface="fallback"][data-hero-fallback-state="arrival-lockup"]',
    ),
  ).toBeVisible();
  await expect(
    state.locator('[data-hero-fallback-composition="arrival"]'),
  ).toHaveCount(1);
  await expect(state.locator('[data-hero-fallback-shape]')).toHaveCount(4);
});

test('reduced motion selects discrete poses without desktop trail', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?__heroState=arrival-lockup');

  const state = page.locator('[data-hero-reference-state="arrival-lockup"]');
  await expect(state).toHaveAttribute('data-hero-motion', 'reduced');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
});
