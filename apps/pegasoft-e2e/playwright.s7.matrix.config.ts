import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { resolve } from 'node:path';

const port = Number(process.env.S7_MATRIX_PORT ?? 4308);
const baseURL = `http://127.0.0.1:${port}`;
const runDir = resolve(
  workspaceRoot,
  process.env.S7_MATRIX_RUN_DIR ??
    'docs/hero-reference/repairs/s7/runs/INVALID',
);

/**
 * Serial, test-enabled production matrix. The diagnostics artifact is used
 * solely to record applied-frame evidence; shipping proof stays in the
 * separate production-smoke target.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  testMatch: 'hero-s7-matrix.spec.ts',
  globalSetup: './s7-matrix-global-setup.mjs',
  workers: 1,
  fullyParallel: false,
  maxFailures: 1,
  outputDir: resolve(runDir, 'playwright-output'),
  reporter: [
    ['line'],
    ['json', { outputFile: resolve(runDir, 'playwright-results.json') }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
  },
  webServer: {
    command: `NEXT_DIST_DIR=.next-s7-diagnostics pnpm --filter @site/pegasoft exec next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    cwd: workspaceRoot,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        channel: 'chrome',
        baseURL,
      },
    },
    {
      name: 'recording-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1508, height: 761 },
        channel: 'chrome',
        baseURL,
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        channel: 'chrome',
        baseURL,
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
        channel: 'chrome',
        baseURL,
      },
    },
  ],
});
