import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const port = Number(process.env.S7_DIAGNOSTICS_PORT ?? 4307);
const baseURL = `http://127.0.0.1:${port}`;

/** Isolated test-enabled production artifact; never substitute for shipping. */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  testMatch: 'hero-s7-diagnostics.spec.ts',
  workers: 1,
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-output/playwright/s7-diagnostics-results.json' }],
  ],
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: `NEXT_DIST_DIR=.next-s7-diagnostics pnpm --filter @site/pegasoft exec next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    cwd: workspaceRoot,
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'], channel: 'chrome', baseURL } },
  ],
});
