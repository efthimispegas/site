import { expect, test } from '@playwright/test';

test('test-enabled production artifact exposes applied-frame evidence after legal direct input', async ({
  page,
}) => {
  await page.goto('/?__heroState=field-pulse-a&__heroTime=300');
  const shell = page.locator('[data-hero-shell]');
  await expect(shell).toHaveAttribute('data-direct-entry', 'true');
  // The authored presentation clock exposes page readiness at 3595 ms before
  // clearing the loader at 4800 ms. Observe that real preceding milestone so
  // the loader assertion keeps Playwright's existing five-second budget
  // instead of racing a 200 ms scheduling margin in the production artifact.
  await expect(shell).toHaveAttribute('data-copy-live', 'true');
  await expect(shell).toHaveAttribute('data-loader-cleared', 'true');
  // The recipe is applied through window.scrollTo, whose physical CSS-pixel
  // position is quantized by the browser. Compare the measured progress rather
  // than requiring the unrepresentable continuous target string exactly.
  await expect
    .poll(async () =>
      Number(await shell.getAttribute('data-hero-scene-progress')),
    )
    .toBeCloseTo(0.74, 3);
  await expect(shell.locator('[data-hero-surface="canvas"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const frame = (
          window as Window & {
            __pegasoftHeroFrame?: {
              renderedAtMs?: number;
              frame: { frameId: number };
            };
          }
        ).__pegasoftHeroFrame;
        return frame?.renderedAtMs && frame.frame.frameId > 0 ? frame : null;
      }),
    )
    .not.toBeNull();
});
