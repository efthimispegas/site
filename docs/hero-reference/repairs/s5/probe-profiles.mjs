import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = 'apps/pegasoft/src/app/shared/';
const files = () =>
  execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', root],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter((p) => !p.endsWith('.spec.ts'));
const hashes = () =>
  [...new Set(files())]
    .sort()
    .map((path) =>
      existsSync(path)
        ? { path, sha256: sha(readFileSync(path)) }
        : { path, deleted: true },
    );
const appUrl =
  'https://www.vectrfl.com/_astro/CommonScripts.astro_astro_type_script_index_0_lang.CZTi642d.js';
const report = {
  schemaVersion: 1,
  runId: randomUUID(),
  startedAt: new Date().toISOString(),
  scope:
    'S5 development profile/backing/resize repair, not visual fidelity, readiness, production or physical-device qualification',
  implementation: {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    before: hashes(),
  },
  rows: [],
  resize: [],
  failures: [],
  errors: [],
  artifacts: [],
};
const correctionOnly = process.argv.includes('--correction-only');
report.correctionOf = correctionOnly
  ? 'd57a6900-b9bd-4d36-9668-4817c0012e59'
  : null;
const out = new URL('./runs/' + report.runId + '/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();
const check = (condition, label, details) => {
  if (!condition) report.failures.push({ label, ...details });
};
const devices = [
  {
    name: 'desktop',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    qt: false,
    ios: false,
  },
  {
    name: 'android',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36',
    qt: true,
    ios: false,
  },
  {
    name: 'ios',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    qt: true,
    ios: true,
  },
  {
    name: 'ipados',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    qt: true,
    ios: true,
    touchEnd: true,
  },
  {
    name: 'mac-no-touchend',
    ua: 'Macintosh',
    qt: false,
    ios: false,
    touchEnd: false,
  },
  { name: 'ios-msstream', ua: 'iPhone', qt: false, ios: true, msStream: true },
  {
    name: 'ipados-msstream',
    ua: 'Macintosh',
    qt: true,
    ios: true,
    touchEnd: true,
    msStream: true,
  },
];
async function pageFor(device, coarse, width, height, source = false, dpr = 2) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    hasTouch: device.touchEnd === false ? false : coarse,
    userAgent: device.ua,
  });
  await context.addInitScript(
    ({ touchEnd, msStream, coarse }) => {
      // Chromium couples hasTouch and ontouchend. For this one impossible native
      // combination, supply an explicitly synthetic pointer capability input.
      if (touchEnd === false && coarse) {
        const native = window.matchMedia.bind(window);
        window.matchMedia = (query) => {
          const list = native(query);
          if (!/pointer\s*:\s*(fine|coarse)/.test(query)) return list;
          return new Proxy(list, {
            get: (target, key) =>
              key === 'matches'
                ? /pointer\s*:\s*coarse/.test(query)
                : typeof target[key] === 'function'
                  ? target[key].bind(target)
                  : Reflect.get(target, key, target),
          });
        };
      }
      if (touchEnd === true)
        Object.defineProperty(document, 'ontouchend', {
          value: null,
          configurable: true,
        });
      if (touchEnd === false) {
        let p = document;
        while (p) {
          if (Object.hasOwn(p, 'ontouchend')) delete p.ontouchend;
          p = Object.getPrototypeOf(p);
        }
      }
      if (msStream) window.MSStream = {};
      window.__s5Nodes = new WeakMap();
      window.__s5NodeSequence = 0;
      window.__s5Listeners = new Map();
      const add = window.addEventListener.bind(window),
        remove = window.removeEventListener.bind(window);
      window.addEventListener = (type, listener, options) => {
        const set = window.__s5Listeners.get(type) ?? new Set();
        set.add(listener);
        window.__s5Listeners.set(type, set);
        return add(type, listener, options);
      };
      window.removeEventListener = (type, listener, options) => {
        window.__s5Listeners.get(type)?.delete(listener);
        return remove(type, listener, options);
      };
    },
    { ...device, coarse },
  );
  const page = await context.newPage();
  page.on('pageerror', (e) =>
    report.errors.push({ device: device.name, source, error: e.message }),
  );
  await page.goto(
    source ? 'https://www.vectrfl.com/?trace=1' : 'http://127.0.0.1:4200',
    { waitUntil: 'load' },
  );
  if (source) await page.locator('canvas.is-ready').waitFor({ timeout: 60000 });
  else
    await page.waitForFunction(
      () => window.__pegasoftHeroFrame?.appliedConsumers.camera,
      { timeout: 60000 },
    );
  await page.waitForTimeout(source ? 1500 : 8000);
  return { page, context };
}
async function read(page, source = false) {
  return page.evaluate(
    async ({ source, appUrl }) => {
      const c = document.querySelector(
        source ? 'canvas.is-ready' : '[data-hero-surface="canvas"] canvas',
      );
      if (!window.__s5Nodes.has(c))
        window.__s5Nodes.set(c, ++window.__s5NodeSequence);
      const rect = c.getBoundingClientRect();
      const flow = document.querySelector(
        source ? '.flow' : '[data-hero-process]',
      );
      const wrapper = source
        ? document.querySelector('.flow__wrapper')
        : flow.firstElementChild;
      const large = document.createElement('div');
      large.style.cssText =
        'position:fixed;height:100lvh;width:0;visibility:hidden';
      document.documentElement.append(large);
      const lvh = large.offsetHeight;
      large.remove();
      const state = source ? (await import(appUrl)).b : null;
      const frame = window.__pegasoftHeroFrame;
      return {
        at: new Date().toISOString(),
        innerWidth,
        innerHeight,
        lvh,
        deviceDpr: devicePixelRatio,
        scrollY,
        sceneTarget: source
          ? (window.__heroTrace?.main?.at(-1)?.target ??
            state.heroTrace?.at(-1)?.target)
          : frame.frame.target,
        sourceTrace: source
          ? {
              main: window.__heroTrace?.main?.slice(-3),
              applied: state.heroTrace?.slice(-3),
            }
          : null,
        sourceCamera: source
          ? {
              aspect: state.camera?.aspect,
              fov: state.camera?.fov,
              projection: state.camera?.projectionMatrix?.toArray(),
            }
          : null,
        listeners: Object.fromEntries(
          ['resize', 'orientationchange'].map((k) => [
            k,
            window.__s5Listeners.get(k)?.size ?? 0,
          ]),
        ),
        pointerFine: matchMedia('(pointer:fine)').matches,
        touchEnd: 'ontouchend' in document,
        msStream: Boolean(window.MSStream),
        canvasCount: document.querySelectorAll(
          source ? 'canvas.is-ready' : '[data-hero-surface="canvas"] canvas',
        ).length,
        nodeId: window.__s5Nodes.get(c),
        backing: [c.width, c.height],
        display: [rect.width, rect.height],
        logical: source ? state.canvasSize : frame.canvas,
        flowHeight: flow.offsetHeight,
        wrapperHeight: wrapper.offsetHeight,
        pageBackground: getComputedStyle(
          document.querySelector(source ? 'body' : '.pegasoft-vectr-page'),
        )
          .getPropertyValue('--color-bg')
          .trim(),
        profile: document
          .querySelector('[data-hero-profile]')
          ?.getAttribute('data-hero-profile'),
        pointerTrail: document
          .querySelector('[data-hero-pointer-trail]')
          ?.getAttribute('data-hero-pointer-trail'),
        flags: state ? { ios: state.isIOS, qt: state.isMobileOrTablet } : null,
        frame: source
          ? null
          : {
              id: frame.frame.frameId,
              target: frame.frame.target,
              measurementSequence: frame.frame.measurementSequence,
              camera: frame.appliedConsumers.camera.readback,
            },
      };
    },
    { source, appUrl },
  );
}
async function screenshot(page, name) {
  const path = new URL(name + '.png', out);
  await page.screenshot({ path: path.pathname });
  const b = readFileSync(path);
  report.artifacts.push({
    path: path.pathname.replace(process.cwd() + '/', ''),
    sha256: sha(b),
    bytes: b.length,
  });
}
try {
  for (const device of devices.filter(
    (d) => !correctionOnly || d.name === 'mac-no-touchend',
  ))
    for (const coarse of correctionOnly ? [true] : [false, true]) {
      const height = 900;
      const { page, context } = await pageFor(device, coarse, 1440, height);
      let baselineId;
      for (const [width, h] of [
        [1440, 900],
        [1507, 761],
        [1508, 761],
        [1509, 761],
        [1508, 760],
        [1508, 762],
        [1024, 768],
        [390, 844],
        ...[819, 820, 821, 899, 900, 901].map((w) => [w, 844]),
      ]) {
        await page.setViewportSize({ width, height: h });
        await page.waitForTimeout(300);
        const actual = await read(page);
        check(
          device.touchEnd === undefined || actual.touchEnd === device.touchEnd,
          'declared touch capability precondition',
          { device: device.name, coarse, actual: actual.touchEnd },
        );
        check(
          actual.pointerFine === !coarse,
          'declared pointer capability precondition',
          { device: device.name, coarse, actual: actual.pointerFine },
        );
        const cap = device.ios ? 1.25 : device.qt && width < 900 ? 1.5 : 1.75;
        // All <=900 cases enter after a width>=900 measurement; later narrow rows
        // stay at844 high, so the source cached height is844 in this matrix.
        const expectedBacking = [Math.floor(width * cap), Math.floor(h * cap)];
        baselineId ??= actual.nodeId;
        check(
          JSON.stringify(actual.backing) === JSON.stringify(expectedBacking),
          'backing',
          {
            device: device.name,
            coarse,
            width,
            h,
            actual: actual.backing,
            expected: expectedBacking,
          },
        );
        check(
          actual.canvasCount === 1 && actual.nodeId === baselineId,
          'one stable Canvas',
          { device: device.name, coarse, width, actual },
        );
        check(actual.pointerTrail === String(!device.qt), 'pointer authority', {
          device: device.name,
          coarse,
          width,
          actual: actual.pointerTrail,
        });
        check(
          Math.abs(actual.flowHeight - (width <= 820 ? 5.7 : 4.56) * h) <= 1,
          'flow geometry',
          { device: device.name, width, h, actual: actual.flowHeight },
        );
        check(actual.pageBackground === '#d0e1eb', 'no recording style', {
          device: device.name,
          width,
          h,
          actual: actual.pageBackground,
        });
        report.rows.push({
          device: device.name,
          coarse,
          kind: 'local',
          width,
          h,
          expectedBacking,
          actual,
        });
        if (
          device.name === 'desktop' &&
          !coarse &&
          ((width === 1440 && h === 900) || (width === 1508 && h === 761))
        )
          await screenshot(page, `local-${width}-${h}`);
        if (
          device.name === 'android' &&
          coarse &&
          (width === 1024 || width === 390)
        )
          await screenshot(page, `local-android-${width}`);
        if (device.name === 'ios' && coarse && width === 390)
          await screenshot(page, 'local-ios-390');
      }
      await context.close();
      console.log(
        `local matrix ${device.name}/${coarse ? 'coarse' : 'fine'} complete`,
      );
    }
  for (const [name, width, height] of correctionOnly
    ? []
    : [
        ['desktop', 1508, 761],
        ['desktop', 1440, 900],
        ['android', 1024, 768],
        ['android', 390, 844],
        ['ios', 390, 844],
      ]) {
    const device = devices.find((d) => d.name === name);
    const { page, context } = await pageFor(
      device,
      name !== 'desktop',
      width,
      height,
      true,
    );
    const actual = await read(page, true);
    report.rows.push({
      kind: 'source',
      device: name,
      width,
      h: height,
      actual,
    });
    const local = report.rows.find(
      (r) =>
        r.kind === 'local' &&
        r.device === name &&
        r.coarse === (name !== 'desktop') &&
        r.width === width &&
        r.h === height,
    );
    check(
      JSON.stringify(actual.backing) === JSON.stringify(local.actual.backing),
      'source/local backing',
      {
        name,
        width,
        height,
        source: actual.backing,
        local: local.actual.backing,
      },
    );
    await screenshot(page, `source-${name}-${width}-${height}`);
    await context.close();
    console.log(`source ${name}/${width} complete`);
  }
  for (const source of [true, false]) {
    const device = devices.find((d) => d.name === 'android');
    const { page, context } = await pageFor(device, true, 390, 844, source);
    let expectedHeight = 844,
      domHeight = 844,
      wasNarrow = true,
      baseline,
      listenerBaseline;
    for (const [width, height, orientation] of [
      [390, 844, false],
      [390, 700, false],
      [390, 900, false],
      [390, 650, false],
      [390, 650, true],
      [900, 650, false],
      [899, 650, false],
    ]) {
      await page.setViewportSize({ width, height });
      if (orientation)
        await page.evaluate(() =>
          window.dispatchEvent(new Event('orientationchange')),
        );
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(300);
      const actual = await read(page, source);
      const narrow = width < 900;
      if (orientation) expectedHeight = height;
      if (narrow && !wasNarrow) expectedHeight = Math.max(height, actual.lvh);
      expectedHeight = narrow ? Math.max(expectedHeight, height) : height;
      wasNarrow = narrow;
      baseline ??= actual.nodeId;
      domHeight = orientation ? height : Math.max(domHeight, height);
      listenerBaseline ??= actual.listeners;
      const expectedTarget =
        actual.scrollY /
        Math.max(
          0.4 * domHeight +
            (Math.max(actual.flowHeight - actual.wrapperHeight, 1) * 400) / 356,
          1,
        );
      check(
        Math.abs(actual.sceneTarget - expectedTarget) < 1e-6,
        'resize physical mapping',
        {
          source,
          width,
          height,
          orientation,
          domHeight,
          expectedTarget,
          actual: actual.sceneTarget,
        },
      );
      check(
        JSON.stringify(listenerBaseline) === JSON.stringify(actual.listeners),
        'stable resize listener ownership',
        { source, width, height, actual: actual.listeners, listenerBaseline },
      );
      const cap = narrow ? 1.5 : 1.75;
      const logicalWidth = source
        ? actual.logical?.width
        : actual.logical.cssWidth;
      const logicalHeight = source
        ? actual.logical?.height
        : actual.logical.cssHeight;
      check(
        logicalWidth === width && logicalHeight === expectedHeight,
        'logical buffer dimensions',
        { source, width, height, expectedHeight, logicalWidth, logicalHeight },
      );
      const aspect = source
        ? actual.sourceCamera.aspect
        : actual.frame.camera.projectionMatrix[5] /
          actual.frame.camera.projectionMatrix[0];
      const expectedAspect = width / expectedHeight;
      const baseFov = 14.42629256144392;
      const expectedFov = Math.min(
        baseFov * 1.6,
        expectedAspect >= 1.5
          ? baseFov
          : (2 *
              Math.atan(
                (Math.tan((baseFov * Math.PI) / 360) * 1.5) / expectedAspect,
              ) *
              180) /
              Math.PI,
      );
      check(Math.abs(aspect - expectedAspect) < 1e-6, 'camera buffer aspect', {
        source,
        width,
        height,
        expectedAspect,
        aspect,
      });
      const fov = source
        ? actual.sourceCamera.fov
        : actual.frame.camera.fovDegrees;
      check(Math.abs(fov - expectedFov) < 1e-6, 'camera responsive FOV', {
        source,
        width,
        height,
        expectedFov,
        fov,
      });
      check(
        actual.backing[1] === Math.floor(expectedHeight * cap),
        'resize cache',
        { source, width, height, orientation, expectedHeight, actual },
      );
      check(
        actual.nodeId === baseline && actual.canvasCount === 1,
        'resize stable Canvas',
        { source, width, height, actual },
      );
      report.resize.push({
        source,
        width,
        height,
        orientation,
        expectedHeight,
        actual,
      });
      if (height === 700)
        await screenshot(
          page,
          `${source ? 'source' : 'local'}-canvas-cache-vs-display`,
        );
    }
    await context.close();
  }
  const { page, context } = await pageFor(
    devices[0],
    false,
    1440,
    900,
    false,
    0.75,
  );
  const actual = await read(page);
  check(
    actual.backing[0] === 1080 && actual.backing[1] === 675,
    'sub-one actual DPR',
    { actual },
  );
  report.rows.push({ kind: 'local-sub-one', actual });
  await context.close();
  const bytes = Buffer.from(await (await fetch(appUrl)).arrayBuffer());
  report.source = { url: appUrl, sha256: sha(bytes) };
  check(
    report.source.sha256 ===
      '352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494',
    'source pin',
    { actual: report.source },
  );
} catch (error) {
  report.failures.push({ uncaught: error.stack });
} finally {
  await browser.close();
  report.implementation.after = hashes();
  check(
    JSON.stringify(report.implementation.before) ===
      JSON.stringify(report.implementation.after),
    'runtime unchanged during capture',
    {},
  );
  report.completedAt = new Date().toISOString();
  await writeFile(
    new URL('profiles.json', out),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      runId: report.runId,
      rows: report.rows.length,
      resize: report.resize.length,
      failures: report.failures.length,
      errors: report.errors.length,
    }),
  );
  if (report.failures.length || report.errors.length) process.exitCode = 1;
}
