import { defineConfig } from '@playwright/test';

/** Contract tests never start a server or initialize a visual capture run. */
export default defineConfig({
  testDir: './src/visual',
  testMatch: ['hero-capture-contract.spec.ts', 'hero-capture-run.spec.ts', 'hero-capture-provenance.spec.ts', 'hero-presentation-readback.spec.ts'],
  workers: 1,
  retries: 0,
  reporter: 'line',
  outputDir: 'test-output/playwright/capture-contract',
});
