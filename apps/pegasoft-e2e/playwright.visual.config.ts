import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CAPTURE_EXPECTATIONS } from './src/visual/hero-capture-contract';

const requestedBaseURL = process.env['BASE_URL'];
const baseURL =
  requestedBaseURL && /^https?:\/\//u.test(requestedBaseURL)
    ? requestedBaseURL
    : 'http://127.0.0.1:4317';

const inputFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: workspaceRoot, encoding: 'utf8' })
  .split('\n').filter((file) => /^(apps|libs|tools)\//u.test(file) && !/(?:^|\/)(?:test-output|out-tsc|node_modules|\.next[^/]*|dist|\.cache)(?:\/|$)/u.test(file)).sort();
const inputHash = createHash('sha256');
for (const file of inputFiles) inputHash.update(file).update('\0').update(readFileSync(path.join(workspaceRoot, file))).update('\0');

export default defineConfig({
  testDir: './src/visual',
  testMatch: '**/*.visual.ts',
  globalSetup: './src/visual/hero-capture-global-setup.ts',
  globalTeardown: './src/visual/hero-capture-global-teardown.ts',
  metadata: { heroCapture: {
    root: path.join(workspaceRoot, 'apps/pegasoft-e2e'),
    expectedStates: Object.keys(CAPTURE_EXPECTATIONS),
    provenance: {
      buildId: readFileSync(path.join(workspaceRoot, 'apps/pegasoft/.next-s7-diagnostics/BUILD_ID'), 'utf8').trim(),
      inputTreeSha256: inputHash.digest('hex'),
    },
  } },
  outputDir: 'test-output/playwright/hero-reference',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
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
    command: 'NEXT_DIST_DIR=.next-s7-diagnostics pnpm --filter @site/pegasoft exec next start -H 127.0.0.1 -p 4317',
    url: baseURL,
    reuseExistingServer: false,
    cwd: workspaceRoot,
  },
});
