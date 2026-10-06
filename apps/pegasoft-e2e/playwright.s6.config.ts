import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const port = Number(process.env.S6_PORT ?? 4200);
const baseURL = `http://127.0.0.1:${port}`;
// Explicit diagnostic comparison; the established qualification default stays Chrome.
const browserChannel = process.env.S6_BROWSER_CHANNEL ?? 'chrome';
if (!['chrome', 'chromium'].includes(browserChannel)) {
  throw new Error('S6_BROWSER_CHANNEL must be chrome or chromium');
}

/** Serialized S6 lifecycle run on the user-cleared local test port. */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  testMatch: 'hero-alternatives.spec.ts',
  workers: 1,
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-output/playwright/s6-results.json' }],
  ],
  use: { ...devices['Desktop Chrome'], baseURL, trace: 'on-first-retry' },
  webServer: {
    command: `pnpm --filter @site/pegasoft exec next dev -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
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
  ],
});
