import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve('package.json'));
const ts = require('typescript');
require.extensions['.ts'] = (module, path) =>
  module._compile(
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    path,
  );
const { sampleHeroCameraPose } = require(
  resolve('apps/pegasoft/src/app/shared/hero-scene/hero-camera-model.ts'),
);
const files = execFileSync(
  'git',
  [
    'ls-files',
    'apps/pegasoft/src/app/shared/hero-scene',
    'apps/pegasoft/src/app/shared/pegasoft-home.tsx',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter((path) => !path.endsWith('.spec.ts'));
files.push(
  ...[
    'hero-frame-state.ts',
    'hero-frame-owner.tsx',
    'hero-frame-driver.ts',
  ].map((name) => 'apps/pegasoft/src/app/shared/hero-scene/' + name),
);
const hashes = () =>
  [...new Set(files)].sort().map((path) => ({
    path,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }));
const report = {
  schemaVersion: 1,
  runId: randomUUID(),
  startedAt: new Date().toISOString(),
  scope:
    'S2 development controlled frame-time integration; no visual fidelity or readiness acceptance',
  implementation: {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    before: hashes(),
  },
  errors: [],
  consoleErrors: [],
  sequences: [],
  rawFrames: [],
  ordinaryFrames: [],
  failures: [],
  inputs: [],
};
const output = new URL('./runs/' + report.runId + '/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();
const page = await browser.newPage({
  viewport: { width: 1508, height: 761 },
  deviceScaleFactor: 2,
});
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});
const near = (actual, expected, label) => {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-6)
    report.failures.push({ label, actual, expected });
};
let total = 0;
let expectedPhysicalTarget = null;
function validate(record, tag) {
  const frame = record.frame,
    a = record.appliedConsumers,
    p = frame.rendered.value;
  for (const name of [
    'camera',
    'beam',
    'activation',
    'field',
    'arrival',
    'idle',
  ]) {
    if (!a[name]) {
      report.failures.push({ tag, missing: name });
      continue;
    }
    near(a[name].frameId, frame.frameId, tag + ':' + name + ' frame');
    near(a[name].renderedProgress, p, tag + ':' + name + ' p');
  }
  const pose = sampleHeroCameraPose(p, 1508 / 761);
  pose.position.forEach((v, i) =>
    near(a.camera.readback.position[i], v, tag + ':camera position'),
  );
  pose.quaternion.forEach((v, i) =>
    near(a.camera.readback.quaternion[i], v, tag + ':camera quaternion'),
  );
  near(a.camera.readback.fovDegrees, pose.fov, tag + ':camera fov');
  for (const [name, key, segments] of [
    ['red-feeder-0', 'red', 150],
    ['red-feeder-1', 'red', 150],
    ['red-feeder-2', 'red', 150],
    ['red-feeder-3', 'red', 150],
    ['blue-zero-core', 'blueZero', 100],
    ['blue-one-core', 'blueOne', 100],
  ]) {
    const actual = a[name];
    if (!actual) {
      report.failures.push({ tag, missing: name });
      continue;
    }
    near(actual.frameId, frame.frameId, tag + ':' + name + ' frame');
    near(
      actual.readback.visibleRange[1],
      Math.ceil(frame.ratios[key] * segments) / segments,
      tag + ':' + name + ' actual draw range',
    );
    if (!actual.readback.headWorld.every(Number.isFinite))
      report.failures.push({ tag, name, reason: 'invalid head' });
  }
  near(
    a.field.readback.gridRatio,
    frame.ratios.field,
    tag + ':field material ratio',
  );
  near(
    a.arrival.readback.activationRatio,
    frame.arrivalRatio,
    tag + ':arrival material ratio',
  );
  if (a.field.readback.opacities.some((value) => value !== 1))
    report.failures.push({ tag, reason: 'static field hidden' });
  const t = Math.min(1, Math.max(0, (p - 0.13) / 0.04)),
    activation = t * t * (3 - 2 * t);
  near(
    a.activation.readback.lightIntensity,
    activation * 2.2,
    tag + ':activation light',
  );
  for (let i = 0; i < 4; i++) {
    const expectedStart = Math.floor(frame.idle[i].start * 90) * 48;
    const expectedCount =
      (Math.ceil(frame.idle[i].end * 90) -
        Math.floor(frame.idle[i].start * 90)) *
      48;
    // Existing radial geometry has eight segments; geometry/depth are S3 debt.
    near(a.idle.readback.drawStarts[i], expectedStart, tag + ':idle start');
    near(a.idle.readback.drawCounts[i], expectedCount, tag + ':idle count');
  }
  if (total++ % 30 === 0) report.rawFrames.push({ tag, record });
}
async function scroll(p, tag) {
  const physical = await page.evaluate(async (p) => {
    const flow = document.querySelector('[data-hero-process]'),
      wrapper = flow.firstElementChild;
    const denominator = Math.max(
      0.4 * innerHeight +
        (Math.max(flow.offsetHeight - wrapper.offsetHeight, 1) * 400) / 356,
      1,
    );
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, p * denominator);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return {
      requestedScene: p,
      scrollY,
      denominator,
      expectedScene: scrollY / denominator,
    };
  }, p);
  report.inputs.push({ kind: 'scroll', tag, ...physical });
  expectedPhysicalTarget = physical.expectedScene;
  return physical;
}
async function frames(count, dt, tag) {
  const records = await page.evaluate(
    ({ count, dt }) => {
      const output = [];
      for (let i = 0; i < count; i++)
        output.push(window.__pegasoftHeroFrameDriver.advance(dt));
      return output;
    },
    { count, dt },
  );
  records.forEach((record) => {
    near(
      record.frame.target,
      expectedPhysicalTarget,
      tag + ':physical scene target',
    );
    near(record.frame.deltaMs, dt * 1000, tag + ':input delta');
    validate(record, tag);
  });
  return records.at(-1);
}
try {
  await page.goto('http://127.0.0.1:4200', { waitUntil: 'load' });
  await page.waitForFunction(
    () => Boolean(window.__pegasoftHeroFrameDriver),
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(8000);
  await scroll(0.9, 'ordinary-jump');
  await page.waitForTimeout(1000);
  report.ordinaryFrames = await page.evaluate(() =>
    window.__pegasoftHeroFrames.slice(-60),
  );
  report.ordinaryFrames.forEach((record) => validate(record, 'ordinary'));
  await page.evaluate(() => window.__pegasoftHeroFrameDriver.pause());
  for (const hz of [30, 60, 120]) {
    const start = total;
    await scroll(0, 'prepare-' + hz);
    await frames(hz * 2, 1 / hz, 'prepare-' + hz);
    for (const direction of ['forward', 'reverse']) {
      for (let step = 0; step <= 12; step++) {
        const p = ((direction === 'forward' ? step : 12 - step) / 12) * 1.25;
        await scroll(p, direction + '-' + hz);
        await frames(Math.max(1, hz / 10), 1 / hz, direction + '-' + hz);
      }
    }
    await scroll(0.9, 'jump-up-' + hz);
    await frames(hz, 1 / hz, 'jump-up-' + hz);
    await scroll(0, 'jump-down-' + hz);
    await frames(hz, 1 / hz, 'jump-down-' + hz);
    for (const gate of [0, 0.17, 0.72, 0.74, 0.75, 0.85, 0.9, 1, 1.25]) {
      for (const delta of [-0.001, 0, 0.001]) {
        await scroll(Math.max(0, gate + delta), 'stop-' + hz);
        await frames(hz / 2, 1 / hz, 'stop-' + hz);
      }
    }
    await scroll(0.8, 'pulse-' + hz);
    await frames(hz * 2, 1 / hz, 'pulse-settle-' + hz);
    const pulseStart = await frames(1, 1 / hz, 'pulse-start-' + hz);
    const pulseEnd = await frames(
      Math.ceil(hz * 10.605),
      1 / hz,
      'three-pulse-cycles-' + hz,
    );
    if (
      pulseEnd.frame.fieldElapsedMs - pulseStart.frame.fieldElapsedMs <
      10605 - 1e-6
    )
      report.failures.push({ hz, reason: 'three pulse cycles missing' });
    await scroll(0, 'idle-' + hz);
    await frames(hz * 2, 1 / hz, 'idle-settle-' + hz);
    const idleStart = await frames(1, 1 / hz, 'idle-start-' + hz);
    const idleEnd = await frames(hz * 18, 1 / hz, 'three-idle-cycles-' + hz);
    if (
      !idleEnd.frame.idle.every(
        (packet, i) =>
          packet.completedCycles - idleStart.frame.idle[i].completedCycles >= 3,
      )
    )
      report.failures.push({ hz, reason: 'three idle cycles missing' });
    await scroll(1, 'long-frame-' + hz);
    await frames(hz * 2, 1 / hz, 'long-frame-settle-' + hz);
    const longBefore = await frames(1, 1 / hz, 'long-frame-before-' + hz);
    const longAfter = await frames(1, 0.5, 'long-frame-after-' + hz);
    near(
      longAfter.frame.fieldElapsedMs - longBefore.frame.fieldElapsedMs,
      500,
      'raw long field delta',
    );
    report.rawFrames.push(
      { tag: 'long-frame-' + hz, before: longBefore, after: longAfter },
      { tag: 'cycles-' + hz, pulseStart, pulseEnd, idleStart, idleEnd },
    );
    report.sequences.push({
      hz,
      validatedFrames: total - start,
      fieldThreeCycles: true,
      idleThreeCycles: true,
    });
  }
  report.driverInputs = await page.evaluate(
    () => window.__pegasoftHeroFrameDriver.inputs,
  );
  await page.screenshot({
    path: new URL('./candidate-after-s2.png', output).pathname,
  });
  await page.evaluate(() => window.__pegasoftHeroFrameDriver.resume());
  const beforeResume = await page.evaluate(
    () => window.__pegasoftHeroFrame.frame.frameId,
  );
  await page.waitForTimeout(100);
  report.resumeAdvances = await page.evaluate(
    (id) => window.__pegasoftHeroFrame.frame.frameId > id,
    beforeResume,
  );
  if (!report.resumeAdvances)
    report.failures.push({ reason: 'ordinary loop did not resume' });
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
  await browser.close();
  report.validatedFrames = total;
  report.implementation.after = hashes();
  report.implementation.unchanged =
    JSON.stringify(report.implementation.before) ===
    JSON.stringify(report.implementation.after);
  if (!report.implementation.unchanged) report.status = 'blocked';
  report.completedAt = new Date().toISOString();
  await writeFile(
    new URL('./browser-frames.json', output),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      runId: report.runId,
      status: report.status,
      validatedFrames: total,
      failures: report.failures.slice(0, 10),
      errors: report.errors,
      consoleErrors: report.consoleErrors,
      failure: report.failure,
      output: output.pathname,
    }),
  );
}
