import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

const requestedBaseURL = process.env['BASE_URL'];
const baseURL =
  requestedBaseURL && /^https?:\/\//u.test(requestedBaseURL)
    ? requestedBaseURL
    : 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './src/visual',
  testMatch: '**/*.visual.ts',
  outputDir: 'test-output/playwright/hero-reference',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: {
      width: 1508,
      height: 761,
    },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @site/pegasoft exec next dev -H 127.0.0.1 -p 4200',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
});
