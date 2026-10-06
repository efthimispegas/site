import { defineConfig } from '@playwright/test';

/** Standalone browser fixtures only; never starts Pegasoft or a capture run. */
export default defineConfig({
  testDir: './src/visual',
  testMatch: 'hero-capture-clock.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'line',
  outputDir: 'test-output/playwright/capture-clock',
  use: { channel: 'chrome', viewport: { width: 320, height: 240 } },
});
