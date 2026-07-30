import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForHeroReady(page: Page) {
  const referenceState = page.locator(
    [
      '[data-hero-reference-state="landing"][data-hero-step="1"]',
      '[data-hero-reference-state="landing-idle"][data-hero-step="1"]',
    ].join(', '),
  );

  await expect(referenceState).toHaveCount(1, { timeout: 10_000 });
  await expect(referenceState.locator('[data-hero-surface]')).toBeVisible();

  return referenceState;
}

async function waitForAnyHeroState(page: Page) {
  const referenceState = page.locator('[data-hero-reference-state]');

  await expect(referenceState).toHaveCount(1, { timeout: 10_000 });
  await expect(referenceState.locator('[data-hero-surface]')).toBeVisible();

  return referenceState;
}

type HeroBrowserSignature = {
  activeStep: string | null;
  copyState: string | null;
  lifecycle: string | null;
  rawProgress: number;
  sceneProgress: number;
};

async function scrollToRawHeroProgress(page: Page, rawProgress: number) {
  await page.evaluate((targetProgress) => {
    const flow = document.querySelector<HTMLElement>('[data-hero-process]');

    if (!flow) {
      throw new Error('Hero process flow is unavailable');
    }

    const viewportHeight = window.innerHeight;
    const flowDocumentTop = flow.getBoundingClientRect().top + window.scrollY;
    const scrollRange = Math.max(0, flow.offsetHeight - viewportHeight);
    const progressLead = Math.max(
      0,
      flowDocumentTop - viewportHeight * 0.4,
    );
    const targetScrollY = Math.max(
      0,
      flowDocumentTop -
        progressLead +
        Math.min(1, Math.max(0, targetProgress)) * scrollRange,
    );

    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, targetScrollY);
  }, rawProgress);

  await expect
    .poll(
      async () =>
        Number(
          await page
            .locator('[data-hero-shell]')
            .getAttribute('data-hero-raw-progress'),
        ),
      {
        message: `hero should converge to raw progress ${rawProgress}`,
        timeout: 5_000,
      },
    )
    .toBeCloseTo(rawProgress, 3);
}

async function readHeroBrowserSignature(
  page: Page,
): Promise<HeroBrowserSignature> {
  const shell = page.locator('[data-hero-shell]');
  const [activeStep, copyState, lifecycle, rawProgress, sceneProgress] =
    await Promise.all([
      page
        .locator('[data-hero-process-step][data-active="true"]')
        .getAttribute('data-hero-process-step'),
      shell.getAttribute('data-hero-copy-state'),
      shell.getAttribute('data-hero-lifecycle'),
      shell.getAttribute('data-hero-raw-progress'),
      shell.getAttribute('data-hero-scene-progress'),
    ]);

  return {
    activeStep,
    copyState,
    lifecycle,
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
  expect(actual.rawProgress).toBeCloseTo(expected.rawProgress, 3);
  expect(actual.sceneProgress).toBeCloseTo(expected.sceneProgress, 3);
}

test('homepage presents Pegasoft CTA and 3D/fallback surface', async ({
  page,
}) => {
  await page.goto('/');

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

  const referenceState = await waitForHeroReady(page);
  const surface = await referenceState.locator('[data-hero-surface]').evaluate(
    (element) => {
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
    },
  );

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
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await waitForHeroReady(page);

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
  const referenceState = await waitForHeroReady(page);
  expect(
    await referenceState
      .locator('canvas, [data-hero-fallback-shape]')
      .count(),
    'Canvas or fallback content should mount',
  ).toBeGreaterThan(
    0,
  );

  expect(pageErrors, 'uncaught page errors').toEqual([]);
  expect(consoleErrors, 'console and hydration errors').toEqual([]);
});

test('development harness enters a named state without traversal history', async ({
  page,
}) => {
  await page.goto('/?__heroState=field-pulse-b&__heroTime=2800');

  const state = page.locator(
    '[data-hero-reference-state="field-pulse-b"]',
  );
  await expect(state).toHaveAttribute('data-hero-direct-entry', 'true');
  await expect(state).toHaveAttribute('data-hero-scene-progress', '0.740000');
  await expect(state).toHaveAttribute('data-hero-seed', '43117');
  await expect(
    page.locator('[data-hero-process-step="3"][data-active="true"]'),
  ).toHaveCount(1);
});

test('hero state converges across forward, reverse, jump, resize, and restored reload entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await waitForAnyHeroState(page);

  for (const progress of [0.08, 0.42, 0.74]) {
    await scrollToRawHeroProgress(page, progress);
  }
  const forward = await readHeroBrowserSignature(page);

  for (const progress of [0.94, 0.82, 0.74]) {
    await scrollToRawHeroProgress(page, progress);
  }
  expectEquivalentHeroSignature(
    await readHeroBrowserSignature(page),
    forward,
  );

  await scrollToRawHeroProgress(page, 0);
  await scrollToRawHeroProgress(page, 0.74);
  expectEquivalentHeroSignature(
    await readHeroBrowserSignature(page),
    forward,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollToRawHeroProgress(page, 0.74);
  expectEquivalentHeroSignature(
    await readHeroBrowserSignature(page),
    forward,
  );

  await page.reload();
  await waitForAnyHeroState(page);
  await expect
    .poll(
      async () => (await readHeroBrowserSignature(page)).rawProgress,
      {
        message: 'reload should restore and converge to the same journey state',
        timeout: 5_000,
      },
    )
    .toBeCloseTo(0.74, 3);
  expectEquivalentHeroSignature(
    await readHeroBrowserSignature(page),
    forward,
  );
});

test('same named state produces a stable capture', async (
  { page },
  testInfo,
) => {
  await page.setViewportSize({ width: 1508, height: 761 });
  await page.goto('/?__heroState=field-pulse-a&__heroTime=300');
  const state = page.locator(
    '[data-hero-reference-state="field-pulse-a"]',
  );
  await expect(state).toHaveCount(1);
  await expect(state.locator('[data-hero-surface]')).toBeVisible();
  await expect(state).toHaveAttribute('data-hero-render-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
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
    'direct state should not inherit an elapsed scene clock',
  ).toBe(true);
});

test('forced fallback remains useful and state-addressable', async ({ page }) => {
  await page.goto(
    '/?__heroState=arrival-lockup&__heroTime=1200&__heroFallback=1',
  );

  const state = page.locator(
    '[data-hero-reference-state="arrival-lockup"]',
  );
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

  const state = page.locator(
    '[data-hero-reference-state="arrival-lockup"]',
  );
  await expect(state).toHaveAttribute('data-hero-motion', 'reduced');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
});
