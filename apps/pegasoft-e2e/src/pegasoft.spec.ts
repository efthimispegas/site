import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage presents Pegasoft CTA and 3D/fallback surface', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /design that delivers/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /book/i }).first()).toBeVisible();
  await expect(page.locator('.pegasus-engine')).toBeVisible();
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
  await page.waitForFunction(() => {
    const heroActions = document.querySelector('.hero-actions');
    if (!heroActions) {
      return false;
    }

    const styleAttribute = heroActions.getAttribute('style') ?? '';
    return (
      styleAttribute.includes('opacity: 1') &&
      window.getComputedStyle(heroActions).opacity === '1'
    );
  });

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );

  expect(seriousViolations).toEqual([]);
});
