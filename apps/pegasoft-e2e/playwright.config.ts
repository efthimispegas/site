import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const requestedBaseURL = process.env['BASE_URL'];
const baseURL =
  requestedBaseURL && /^https?:\/\//u.test(requestedBaseURL)
    ? requestedBaseURL
    : 'http://127.0.0.1:4200';
// Match the established S6/S7 browser. Bundled headless-shell remains an
// explicit diagnostic run, rather than silently using it as Desktop Chrome.
const browserChannel = process.env['E2E_BROWSER_CHANNEL'] ?? 'chrome';
if (!['chrome', 'chromium'].includes(browserChannel)) {
  throw new Error('E2E_BROWSER_CHANNEL must be chrome or chromium');
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  // These production/evidence suites have dedicated S7 configurations and
  // require their own build artifacts or pinned evidence plan.
  testIgnore: [
    '**/hero-production-smoke.spec.ts',
    '**/hero-s7-diagnostics.spec.ts',
    '**/hero-s7-matrix.spec.ts',
  ],
  // The hero acceptance suite opens GPU-backed canvases and compares exact
  // frames. Serial execution avoids browser WebGL context eviction and keeps
  // capture results deterministic across desktop and mobile profiles.
  workers: 1,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm --filter @site/pegasoft exec next dev -H 127.0.0.1 -p 4200',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel === 'chromium' ? undefined : 'chrome',
        baseURL,
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        channel: browserChannel === 'chromium' ? undefined : 'chrome',
        baseURL,
      },
    },
  ],
});
