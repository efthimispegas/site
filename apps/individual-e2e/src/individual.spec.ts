import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage presents the provisional individual brand', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /iris vale/i })).toBeVisible();
  await expect(page.getByText(/invented v1 persona/i)).toBeVisible();
  await expect(
    page.getByRole('link', { name: /start a collaboration/i }),
  ).toBeVisible();
});

test('work pages use concept portfolio language', async ({ page }) => {
  await page.goto('/work');

  await expect(
    page.getByText(/concept portfolio pieces/i).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: /signal room/i }).click();
  await expect(
    page.getByRole('heading', { name: /signal room/i }),
  ).toBeVisible();
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

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );

  expect(seriousViolations).toEqual([]);
});
