import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForHeroReady(page: Page) {
  const referenceState = page.locator(
    '[data-hero-reference-state="landing"][data-hero-step="1"]',
  );

  await expect(referenceState).toHaveCount(1);
  await expect(referenceState.locator('.pegasoft-field')).toBeVisible();

  return referenceState;
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
    page.getByRole('link', { name: 'Book a Call' }).first(),
  ).toBeVisible();

  const referenceState = await waitForHeroReady(page);
  const surface = await referenceState.locator('.pegasoft-field').evaluate(
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
          element.classList.contains('pegasoft-field--fallback') &&
          Boolean(element.querySelector('.pegasoft-field__fallback')),
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
      .locator('canvas, .pegasoft-field__fallback')
      .count(),
    'Canvas or fallback content should mount',
  ).toBeGreaterThan(
    0,
  );

  expect(pageErrors, 'uncaught page errors').toEqual([]);
  expect(consoleErrors, 'console and hydration errors').toEqual([]);
});
