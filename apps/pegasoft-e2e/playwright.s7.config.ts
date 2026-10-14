import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { resolve } from 'node:path';

const port = Number(process.env.S7_PORT ?? 4306);
const baseURL = `http://127.0.0.1:${port}`;
const appRoot = resolve(workspaceRoot, 'apps/pegasoft');
const distDir = process.env.NEXT_DIST_DIR ?? '.next';

/**
 * S7 shipping-build smoke only. Full S7 matrix qualification remains a
 * separate, explicitly recorded operation; this suite never starts Next dev.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  testMatch: 'hero-production-smoke.spec.ts',
  workers: 1,
  reporter: [
    ['line'],
    [
      'json',
      { outputFile: 'test-output/playwright/s7-production-results.json' },
    ],
  ],
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: `NEXT_DIST_DIR=${distDir} pnpm exec next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    cwd: appRoot,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], channel: 'chrome', baseURL },
    },
  ],
});
