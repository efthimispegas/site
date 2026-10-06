import { chromium } from '@playwright/test';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const sourceControls = JSON.parse(
  readFileSync(new URL('./source-controls.json', import.meta.url)),
).controls;
const sourceUrl =
  'https://www.vectrfl.com/_astro/CommonScripts.astro_astro_type_script_index_0_lang.CZTi642d.js';
const output = new URL('./context-runs/' + randomUUID() + '/', import.meta.url);
await mkdir(output, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = execFileSync(
  'git',
  ['ls-files', 'apps/pegasoft/src/app/shared'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(
    (path) =>
      /\.(tsx?|css)$/.test(path) &&
      !path.endsWith('.spec.ts') &&
      !path.endsWith('hero-landing-rail-model.ts'),
  );
for (const name of [
  'hero-route-rendering.ts',
  'hero-frame-state.ts',
  'hero-frame-owner.tsx',
  'hero-frame-driver.ts',
  'hero-ground-coverage.ts',
  'hero-profile.ts',
]) {
  const path = 'apps/pegasoft/src/app/shared/hero-scene/' + name;
  try {
    readFileSync(path);
    files.push(path);
  } catch {}
}
const hashes = () =>
  [...new Set(files)]
    .sort()
    .map((path) => ({ path, sha256: hash(readFileSync(path)) }));
const report = {
  schemaVersion: 1,
  runId: output.pathname.split('/').filter(Boolean).at(-1),
  startedAt: new Date().toISOString(),
  scope:
    'Ordinary source/local landing and activation context, not visual-match qualification',
  implementation: { before: hashes() },
  sourceBundleUrl: sourceUrl,
  states: [],
  artifacts: [],
  errors: [],
  failures: [],
  consoleErrors: [],
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();
try {
  for (const kind of ['source', 'local']) {
    const context = await browser.newContext({
      viewport: { width: 1508, height: 761 },
      deviceScaleFactor: 2,
      recordVideo: { dir: output.pathname, size: { width: 1508, height: 761 } },
    });
    const page = await context.newPage();
    page.on('pageerror', (error) =>
      report.errors.push({ kind, message: error.message }),
    );
    page.on('console', (message) => {
      if (message.type() === 'error')
        report.consoleErrors.push({ kind, message: message.text() });
    });
    await page.goto(
      kind === 'source' ? 'https://www.vectrfl.com/' : 'http://127.0.0.1:4200',
      { waitUntil: 'load' },
    );
    if (kind === 'source') {
      await page.locator('canvas.is-ready').waitFor({ timeout: 60000 });
      const response = await page.request.get(sourceUrl);
      report.sourceBundleSha256 = hash(await response.body());
      if (
        report.sourceBundleSha256 !==
        '352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494'
      )
        throw new Error('Source bundle drifted');
    } else
      await page.waitForFunction(
        () => Boolean(window.__pegasoftHeroFrame),
        null,
        { timeout: 30000 },
      );
    await page.waitForTimeout(8000);
    await page.mouse.move(754, 380);
    for (const [state, p, hold] of [
      ['landing-idle', 0, 5500],
      ['activation-route', 0.12395, 4000],
    ]) {
      await page.evaluate(
        ({ kind, p }) => {
          const flow = document.querySelector(
            kind === 'source' ? '.flow' : '[data-hero-process]',
          );
          const wrapper =
            kind === 'source'
              ? document.querySelector('.flow__wrapper')
              : flow.firstElementChild;
          const d =
            0.4 * innerHeight +
            (Math.max(flow.offsetHeight - wrapper.offsetHeight, 1) * 400) / 356;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, p * d);
        },
        { kind, p },
      );
      await page.waitForTimeout(hold);
      const frame =
        kind === 'source'
          ? await page.evaluate(async () => {
              const { b: p, s: manager } =
                await import('/_astro/CommonScripts.astro_astro_type_script_index_0_lang.CZTi642d.js');
              const owner = manager.children.find(
                (child) => 'cameraProgress' in child,
              );
              const networks = {
                idle: owner.lines.redLinesIdle,
                feeders: owner.lines.redLines,
                blueZero: owner.lines.blueLine0,
                blueOne: owner.lines.blueLine1,
              };
              return {
                target: owner.targetProgress,
                rendered: owner.cameraProgress,
                idle: owner.redIdleState,
                scrollY,
                camera: {
                  position: p.camera.position.toArray(),
                  quaternion: p.camera.quaternion.toArray(),
                  fov: p.camera.fov,
                  aspect: p.camera.aspect,
                },
                networks: Object.fromEntries(
                  Object.entries(networks).map(([key, meshes]) => [
                    key,
                    meshes.map((mesh) => ({
                      radius: mesh.geometry.parameters.radius,
                      tubularSegments: mesh.geometry.parameters.tubularSegments,
                      radialSegments: mesh.geometry.parameters.radialSegments,
                      depthTest: mesh.material.depthTest,
                      depthWrite: mesh.material.depthWrite,
                      renderOrder: mesh.renderOrder,
                      points: mesh.geometry.parameters.path.points.map(
                        (point) => point.toArray(),
                      ),
                    })),
                  ]),
                ),
              };
            })
          : await page.evaluate(() => ({
              record: window.__pegasoftHeroFrame,
              scrollY,
            }));
      const physical = await page.evaluate((kind) => {
        const flow = document.querySelector(
          kind === 'source' ? '.flow' : '[data-hero-process]',
        );
        const wrapper =
          kind === 'source'
            ? document.querySelector('.flow__wrapper')
            : flow.firstElementChild;
        const denominator =
          0.4 * innerHeight +
          (Math.max(flow.offsetHeight - wrapper.offsetHeight, 1) * 400) / 356;
        return { scrollY, denominator, expectedTarget: scrollY / denominator };
      }, kind);
      const target =
        kind === 'source' ? frame.target : frame.record.frame.target;
      const rendered =
        kind === 'source' ? frame.rendered : frame.record.frame.rendered.value;
      const validations = [];
      const check = (condition, label) => {
        validations.push({ label, passed: condition });
        if (!condition) report.failures.push({ kind, state, label });
      };
      check(
        Number.isFinite(target) && Number.isFinite(rendered),
        'finite actual progress',
      );
      check(
        Math.abs(target - physical.expectedTarget) < 1e-6,
        'actual target matches physical input',
      );
      check(
        Math.abs(target - p) <= 1 / physical.denominator,
        'requested target reachable within one CSS pixel',
      );
      check(Math.abs(rendered - target) < 1e-5, 'ordinary frame settled');
      if (kind === 'source') {
        for (const [name, count, radius] of [
          ['idle', 4, 0.075],
          ['feeders', 4, 0.075],
          ['blueZero', 1, 0.125],
          ['blueOne', 1, 0.125],
        ]) {
          const meshes = frame.networks[name];
          check(meshes?.length === count, name + ' count');
          check(
            meshes?.every(
              (mesh) =>
                mesh.radius === radius &&
                mesh.radialSegments === 8 &&
                mesh.depthTest &&
                mesh.depthWrite &&
                mesh.renderOrder === 3,
            ),
            name + ' source geometry/depth',
          );
        }
        check(
          JSON.stringify(frame.networks.idle.map((mesh) => mesh.points)) ===
            JSON.stringify(sourceControls.activationFeeders),
          'idle controls match hashed source',
        );
        check(
          JSON.stringify(frame.networks.feeders.map((mesh) => mesh.points)) ===
            JSON.stringify(sourceControls.activationFeeders),
          'activation controls match hashed source',
        );
        check(
          frame.networks.blueZero[0].points.length === 40,
          'blue-zero resampled40',
        );
        check(
          JSON.stringify(frame.networks.blueOne[0].points) ===
            JSON.stringify(sourceControls.blueOne),
          'blue-one unresampled controls',
        );
      } else {
        const applied = frame.record.appliedConsumers;
        check(
          applied.idle.readback.physicalRadii.every(
            (radius) => radius === 0.075,
          ),
          'local idle physical radii',
        );
        check(
          applied.idle.readback.depthTests.every((value) => value === 1) &&
            applied.idle.readback.depthWrites.every((value) => value === 1),
          'local idle real depth',
        );
        for (const name of [
          'red-feeder-0',
          'red-feeder-1',
          'red-feeder-2',
          'red-feeder-3',
          'blue-zero-core',
          'blue-one-core',
        ])
          check(
            applied[name]?.readback.physicalRadius ===
              (name.startsWith('red') ? 0.075 : 0.125),
            name + ' physical radius',
          );
      }
      const name = kind + '-' + state + '.png',
        bytes = await page.screenshot({ path: new URL(name, output).pathname });
      report.artifacts.push({
        path: name,
        bytes: bytes.length,
        sha256: hash(bytes),
      });
      report.states.push({
        kind,
        state,
        requested: p,
        observedAt: new Date().toISOString(),
        frame,
        physical,
        validations,
        image: name,
      });
    }
    const video = page.video();
    await context.close();
    if (video) {
      const path = new URL(kind + '-ordinary-context.webm', output).pathname;
      await rename(await video.path(), path);
      const bytes = readFileSync(path);
      report.artifacts.push({
        path: kind + '-ordinary-context.webm',
        bytes: bytes.length,
        sha256: hash(bytes),
      });
    }
  }
  report.status =
    report.errors.length ||
    report.failures.length ||
    report.consoleErrors.length
      ? 'failed'
      : 'passed';
} catch (error) {
  report.status = 'blocked';
  report.failure = error.stack;
} finally {
  await browser.close();
  report.implementation.after = hashes();
  report.implementation.unchanged =
    JSON.stringify(report.implementation.before) ===
    JSON.stringify(report.implementation.after);
  if (!report.implementation.unchanged) report.status = 'blocked';
  report.completedAt = new Date().toISOString();
  await writeFile(
    new URL('context-results.json', output),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      status: report.status,
      runId: report.runId,
      output: output.pathname,
      errors: report.errors,
      failures: report.failures,
      consoleErrors: report.consoleErrors,
      failure: report.failure,
    }),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
