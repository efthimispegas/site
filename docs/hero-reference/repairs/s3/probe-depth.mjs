import { chromium } from '@playwright/test';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const runId = randomUUID(),
  output = new URL('./runs/' + runId + '/', import.meta.url);
await mkdir(output, { recursive: true });
const files = [
  'hero-route.ts',
  'hero-route-rendering.ts',
  'hero-camera-model.ts',
  'hero-frame-state.ts',
  'hero-world-layout.ts',
  'hero-landing-rails.tsx',
  'hero-beam.tsx',
  'hero-materials.ts',
].map((name) => 'apps/pegasoft/src/app/shared/hero-scene/' + name);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashes = () =>
  files.map((path) => ({ path, sha256: hash(readFileSync(path)) }));
const report = {
  schemaVersion: 1,
  runId,
  startedAt: new Date().toISOString(),
  scope:
    'Production route-factory isolated depth regression, not source appearance acceptance',
  implementation: {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    before: hashes(),
  },
  cases: [],
  failures: [],
  errors: [],
  consoleErrors: [],
  artifacts: [],
};
const bundle = await build({
  configFile: false,
  root: process.cwd(),
  logLevel: 'error',
  build: {
    write: false,
    minify: false,
    lib: {
      entry: resolve('docs/hero-reference/repairs/s3/depth-fixture.mjs'),
      formats: ['iife'],
      name: 'HeroDepthFixture',
    },
  },
});
const code = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
  (item) => item.type === 'chunk',
).code;
report.fixtureBundleSha256 = hash(code);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();
const context = await browser.newContext({
  viewport: { width: 1508, height: 761 },
  deviceScaleFactor: 2,
  recordVideo: { dir: output.pathname, size: { width: 1508, height: 761 } },
});
const page = await context.newPage();
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});
try {
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: code });
  for (const phase of ['landing', 'activation']) {
    for (const disabledDepth of [true, false]) {
      for (const cover of ['clear', 'partial', 'full']) {
        const value = await page.evaluate(
          (options) => window.__heroDepthChallenge(options),
          { phase, cover, disabledDepth },
        );
        const file =
          phase +
          '-' +
          (disabledDepth ? 'depth-disabled' : 'production-depth') +
          '-' +
          cover +
          '.png';
        const bytes = await page.screenshot({
          path: new URL(file, output).pathname,
        });
        report.cases.push({ ...value, artifact: file });
        report.artifacts.push({
          path: file,
          bytes: bytes.length,
          sha256: hash(bytes),
        });
        await page.waitForTimeout(300);
      }
    }
    const select = (disabledDepth, cover) =>
      report.cases.find(
        (item) =>
          item.phase === phase &&
          item.disabledDepth === disabledDepth &&
          item.cover === cover,
      );
    const clear = select(false, 'clear').redPixels,
      partial = select(false, 'partial').redPixels,
      hidden = select(false, 'full').redPixels;
    if (clear < 20)
      report.failures.push({
        phase,
        reason: 'unobstructed production control has insufficient red support',
        clear,
      });
    if (hidden !== 0)
      report.failures.push({
        phase,
        reason: 'fully occluded production tube leaked',
        hidden,
      });
    if (partial <= clear * 0.05 || partial >= clear * 0.95)
      report.failures.push({
        phase,
        reason: 'partial control not partial',
        clear,
        partial,
      });
    for (const cover of ['partial', 'full']) {
      if (
        select(true, cover).redPixels <
        select(true, 'clear').redPixels * 0.99
      )
        report.failures.push({
          phase,
          reason: 'negative depth-disabled control did not leak',
          cover,
        });
    }
  }
  report.status =
    report.failures.length ||
    report.errors.length ||
    report.consoleErrors.length
      ? 'failed'
      : 'passed';
} catch (error) {
  report.status = 'blocked';
  report.failure = error.stack;
} finally {
  const video = page.video();
  await context.close();
  if (video) {
    const videoPath = await video.path();
    const destination = new URL('depth-challenges.webm', output).pathname;
    await rename(videoPath, destination);
    const bytes = readFileSync(destination);
    report.artifacts.push({
      path: 'depth-challenges.webm',
      bytes: bytes.length,
      sha256: hash(bytes),
    });
  }
  await browser.close();
  report.implementation.after = hashes();
  report.implementation.unchanged =
    JSON.stringify(report.implementation.before) ===
    JSON.stringify(report.implementation.after);
  if (!report.implementation.unchanged) report.status = 'blocked';
  report.completedAt = new Date().toISOString();
  await writeFile(
    new URL('depth-results.json', output),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      runId,
      status: report.status,
      failures: report.failures,
      errors: report.errors,
      consoleErrors: report.consoleErrors,
      failure: report.failure,
      cases: report.cases.map(({ phase, cover, disabledDepth, redPixels }) => ({
        phase,
        cover,
        disabledDepth,
        redPixels,
      })),
      output: output.pathname,
    }),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
