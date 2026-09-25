import { expect, test } from '@playwright/test';

test('shipping build renders an ordinary usable hero', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/');
  const shell = page.locator('[data-hero-shell]');
  await expect(shell).toHaveCount(1);
  await expect
    .poll(() => shell.getAttribute('data-hero-attempt-state'))
    .toMatch(/^(ready|fallback)$/u);
  await expect(page.getByRole('heading', { name: /the new standard\s+in product delivery/i })).toBeVisible();
  await expect(page.locator('header.pegasoft-header')).toBeVisible();
  await expect(shell).toHaveAttribute('data-loader-cleared', 'true');
  expect(runtimeErrors).toEqual([]);
});

test('shipping build handles an actual canvas context loss with useful fallback', async ({ page }) => {
  await page.goto('/');
  const shell = page.locator('[data-hero-shell]');
  await expect(shell).toHaveAttribute('data-hero-attempt-state', 'ready');
  const canvas = shell.locator('[data-hero-surface="canvas"] canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) => {
    (element as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(shell).toHaveAttribute('data-hero-attempt-state', 'fallback', { timeout: 1_000 });
  const fallbackShapes = shell.locator('[data-hero-fallback-shape]');
  await expect(fallbackShapes).toHaveCount(4);
  await expect(fallbackShapes.first()).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/pegasoft-locked/u);
});
