import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const REFERENCE_STATE = 'landing-idle';
const HERO_URL = `/?__heroState=${REFERENCE_STATE}&__heroTime=2500`;

type RuntimeErrors = {
  console: string[];
  page: string[];
};

function captureRuntimeErrors(page: Page): RuntimeErrors {
  const errors: RuntimeErrors = {
    console: [],
    page: [],
  };

  page.on('pageerror', (error) => {
    errors.page.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.console.push(message.text());
    }
  });

  return errors;
}

async function waitForNamedHeroState(page: Page) {
  const state = page.locator(
    `[data-hero-reference-state="${REFERENCE_STATE}"]`,
  );

  await expect(state).toHaveCount(1, { timeout: 10_000 });
  await expect(state).toHaveAttribute('data-hero-direct-entry', 'true');
  await expect
    .poll(() => state.getAttribute('data-hero-attempt-state'))
    .toMatch(/^(ready|fallback)$/u);
  await expect(state.locator('[data-hero-surface]')).toBeVisible();

  return state;
}

async function expectUsefulLanding(page: Page, state: Locator) {
  await expect(
    page.getByRole('heading', {
      name: /the new standard\s+in product delivery/i,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.locator('header.pegasoft-header')).toBeVisible();
  await expect(state.locator('[data-hero-surface]')).toBeVisible();
}

async function expectLoaderDoesNotBlock(page: Page) {
  const shell = page.locator('[data-hero-shell]');
  const loader = page.locator(
    '[aria-hidden="true"][data-direct][data-hidden][data-revealing]',
  );

  await expect(shell).toHaveAttribute('data-loader-cleared', 'true');
  await expect(loader).toHaveCount(1);
  await expect(loader).toHaveAttribute('data-hidden', 'true');
  await expect(loader).toBeHidden();
  await expect(loader).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('body')).not.toHaveClass(/pegasoft-locked/u);
}

async function tabTo(page: Page, target: Locator, maximumPresses = 8) {
  for (let attempt = 0; attempt < maximumPresses; attempt += 1) {
    await page.keyboard.press('Tab');

    if (
      await target.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      )
    ) {
      return;
    }
  }

  await expect(
    target,
    `Expected keyboard focus within ${maximumPresses} Tab presses`,
  ).toBeFocused();
}

async function expectKeyboardNavigation(page: Page) {
  const isMobile = (page.viewportSize()?.width ?? 1280) <= 820;

  if (!isMobile) {
    const servicesLink = page
      .getByRole('navigation', { name: 'Primary links' })
      .getByRole('link', { name: 'Services', exact: true });

    await expect(servicesLink).toBeVisible();
    await tabTo(page, servicesLink);
    await expect(servicesLink).toBeFocused();
    return;
  }

  const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menuButton).toBeVisible();
  await tabTo(page, menuButton);
  await expect(menuButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  const mobileNavigation = page.getByRole('navigation', {
    name: 'Mobile navigation',
  });
  const servicesLink = mobileNavigation.getByRole('link', {
    name: 'Services',
    exact: true,
  });

  await expect(mobileNavigation).toHaveClass(/\bis-open\b/u);
  await expect(servicesLink).toBeVisible();
  await tabTo(page, servicesLink);
  await expect(servicesLink).toBeFocused();
}

async function readStateSignature(state: Locator) {
  return state.evaluate((element) => ({
    directEntry: element.getAttribute('data-hero-direct-entry'),
    motion: element.getAttribute('data-hero-motion'),
    pointerTrail: element.getAttribute('data-hero-pointer-trail'),
    profile: element.getAttribute('data-hero-profile'),
    referenceState: element.getAttribute('data-hero-reference-state'),
    sceneProgress: element.getAttribute('data-hero-scene-progress'),
    seed: element.getAttribute('data-hero-seed'),
    step: element.getAttribute('data-hero-step'),
    surface: element
      .querySelector('[data-hero-surface]')
      ?.getAttribute('data-hero-surface'),
  }));
}

function expectNoRuntimeErrors(errors: RuntimeErrors) {
  expect(errors.page, 'uncaught page errors').toEqual([]);
  expect(errors.console, 'console and hydration errors').toEqual([]);
}

async function retainFallbackTiming(
  state: Locator,
  info: TestInfo,
  observedAt?: number,
) {
  const timing = await state.evaluate((el) => ({
    startedAtMs: Number(el.getAttribute('data-hero-attempt-started-at')),
    fallbackAtMs: Number(el.getAttribute('data-hero-fallback-at')),
    elapsedMs: Number(el.getAttribute('data-hero-attempt-elapsed-ms')),
  }));
  const responseMs =
    observedAt === undefined
      ? timing.elapsedMs
      : timing.fallbackAtMs - observedAt;
  expect(responseMs).toBeGreaterThanOrEqual(0);
  expect(responseMs).toBeLessThanOrEqual(
    observedAt === undefined ? 16_000 : 1_000,
  );
  await info.attach('fallback-timing', {
    body: JSON.stringify({ ...timing, observedAt, responseMs }),
    contentType: 'application/json',
  });
}

test('reduced motion is useful, non-blocking, deterministic, and keyboard reachable', async ({
  page,
}) => {
  const errors = captureRuntimeErrors(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HERO_URL);

  const state = await waitForNamedHeroState(page);
  await expect(state).toHaveAttribute('data-hero-motion', 'reduced');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);

  const firstSignature = await readStateSignature(state);
  await page.reload();
  const reloadedState = await waitForNamedHeroState(page);
  const secondSignature = await readStateSignature(reloadedState);

  expect(secondSignature).toEqual(firstSignature);
  await expectKeyboardNavigation(page);
  expectNoRuntimeErrors(errors);
});

test('forced WebGL fallback is useful, non-blocking, deterministic, and keyboard reachable', async ({
  page,
}) => {
  const errors = captureRuntimeErrors(page);

  await page.goto(`${HERO_URL}&__heroFallback=1`);

  const state = await waitForNamedHeroState(page);
  await expect(state).toHaveAttribute('data-hero-motion', 'static');
  await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  await expect(
    state.locator(
      `[data-hero-surface="fallback"][data-hero-fallback-state="${REFERENCE_STATE}"]`,
    ),
  ).toBeVisible();
  await expect(state.locator('[data-hero-fallback-shape]')).toHaveCount(4);
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);

  const firstSignature = await readStateSignature(state);
  await page.reload();
  const reloadedState = await waitForNamedHeroState(page);
  const secondSignature = await readStateSignature(reloadedState);

  expect(secondSignature).toEqual(firstSignature);
  await expectKeyboardNavigation(page);
  expectNoRuntimeErrors(errors);
});

test('active Canvas context loss latches useful fallback and unlocks the page', async ({
  page,
}, testInfo) => {
  const errors = captureRuntimeErrors(page);
  await page.goto(HERO_URL);

  const state = await waitForNamedHeroState(page);
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  const canvas = state.locator('canvas');
  await expect(canvas).toBeVisible();
  const observedAt = await canvas.evaluate(
    (element) =>
      new Promise<number>((resolve) => {
        element.addEventListener(
          'webglcontextlost',
          () => resolve(performance.now()),
          { once: true, capture: true },
        );
        (element as HTMLCanvasElement)
          .getContext('webgl2')!
          .getExtension('WEBGL_lose_context')!
          .loseContext();
      }),
  );

  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
    timeout: 1_000,
  });
  await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);
  await retainFallbackTiming(state, testInfo, observedAt);
  expectNoRuntimeErrors(errors);
});

test('active Canvas context loss mid-journey latches fallback without a retry', async ({
  page,
}, testInfo) => {
  const errors = captureRuntimeErrors(page);
  await page.goto('/');

  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  await page.evaluate(() => window.scrollTo({ top: 1_200 }));
  await expect
    .poll(() => state.getAttribute('data-hero-reference-state'))
    .not.toMatch(/^(loader-mark|world-reveal|landing|landing-idle)$/u);

  const canvas = state.locator('canvas');
  const observedAt = await canvas.evaluate(
    (element) =>
      new Promise<number>((resolve) => {
        element.addEventListener(
          'webglcontextlost',
          () => resolve(performance.now()),
          { once: true, capture: true },
        );
        (element as HTMLCanvasElement)
          .getContext('webgl2')!
          .getExtension('WEBGL_lose_context')!
          .loseContext();
      }),
  );
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
    timeout: 1_000,
  });
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback');
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);
  await retainFallbackTiming(state, testInfo, observedAt);
  expectNoRuntimeErrors(errors);
});

test('delayed essential resources require a completed post-resource render', async ({
  page,
}, testInfo) => {
  const errors = captureRuntimeErrors(page);
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    let paused = false;
    const waiting: FrameRequestCallback[] = [];
    window.requestAnimationFrame = (callback) =>
      request((time) => {
        if (paused) waiting.push(callback);
        else callback(time);
      });
    Object.assign(window, {
      __s6PauseFrames: () => {
        paused = true;
      },
      __s6ResumeFrames: () => {
        paused = false;
        waiting.splice(0).forEach((callback) => request(callback));
      },
    });
  });
  await page.goto('/?__heroResourceDelayMs=5000');
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __s6PauseFrames(): void;
      }
    ).__s6PauseFrames(),
  );
  await page.waitForTimeout(4_500);
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'frame-pending',
    { timeout: 2_000 },
  );
  await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  await expect(state).toHaveAttribute('data-hero-first-applied-frame', '0');
  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __s6ResumeFrames(): void;
      }
    ).__s6ResumeFrames(),
  );
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready', {
    timeout: 2_000,
  });
  const timings = await state.evaluate((el) => ({
    resourcesStartedAtMs: Number(
      el.getAttribute('data-hero-resources-started-at'),
    ),
    resourcesReadyAtMs: Number(el.getAttribute('data-hero-resources-ready-at')),
    readyAtMs: Number(el.getAttribute('data-hero-ready-at')),
    firstAppliedFrameId: Number(
      el.getAttribute('data-hero-first-applied-frame'),
    ),
  }));
  expect(timings.readyAtMs).toBeGreaterThan(timings.resourcesReadyAtMs);
  expect(
    timings.resourcesReadyAtMs - timings.resourcesStartedAtMs,
  ).toBeGreaterThanOrEqual(5_000);
  expect(timings.firstAppliedFrameId).toBeGreaterThan(0);
  await testInfo.attach('resource-render-timeline', {
    body: JSON.stringify(timings),
    contentType: 'application/json',
  });
  expectNoRuntimeErrors(errors);
});

test('never-resolving essential resources reach useful fallback at the finite deadline', async ({
  page,
}, testInfo) => {
  const errors = captureRuntimeErrors(page);
  await page.goto('/?__heroNeverResolveResources=1');

  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
    timeout: 16_000,
  });
  await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);
  await retainFallbackTiming(state, testInfo);
  expectNoRuntimeErrors(errors);
});

test('closed mobile navigation is hidden from assistive technology and keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HERO_URL);

  const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  const mobileNavigation = page.locator('#pegasoft-mobile-navigation');
  const mobileControls = mobileNavigation.locator('a, button');

  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(mobileNavigation).toHaveAttribute('inert', '');
  await expect(mobileControls).toHaveCount(7);
  await expect
    .poll(() =>
      mobileControls.evaluateAll((elements) =>
        elements.every((element) => element.getAttribute('tabindex') === '-1'),
      ),
    )
    .toBe(true);

  await menuButton.click();
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');
  await expect(mobileNavigation).not.toHaveAttribute('inert', '');
  await expect(
    mobileNavigation.getByRole('button', { name: 'Close menu' }),
  ).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
});

test('static fallback is deterministic during ordinary initial loading', async ({
  page,
}) => {
  await page.goto('/?__heroFallback=1');
  const fallback = page.locator(
    '[data-hero-surface="fallback"][data-hero-fallback-state="loader-mark"]',
  );
  await expect(fallback).toHaveAttribute(
    'data-hero-fallback-composition',
    'loader',
  );
  await expect(fallback.locator('[data-hero-fallback-shape]')).toHaveCount(4);

  const firstMarkup = await fallback.locator('svg').innerHTML();
  await page.reload();
  const secondMarkup = await page
    .locator(
      '[data-hero-surface="fallback"][data-hero-fallback-state="loader-mark"] svg',
    )
    .innerHTML();

  expect(secondMarkup).toBe(firstMarkup);
});

test('expired loading deadline is checked on resume when its timer was throttled', async ({
  page,
}, testInfo) => {
  // Suppress only the deadline timer to model a backgrounded/throttled page.
  await page.addInitScript(() => {
    const original = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) =>
      original(
        delay !== undefined && delay > 14_000 ? () => undefined : handler,
        delay,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page.goto('/?__heroNeverResolveResources=1');
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  await page.waitForTimeout(15_100);
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  const observedAt = await page.evaluate(() => {
    const now = performance.now();
    document.dispatchEvent(new Event('visibilitychange'));
    return now;
  });
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
    timeout: 1_000,
  });
  await retainFallbackTiming(state, testInfo, observedAt);
  await expectLoaderDoesNotBlock(page);
});

test('ready scene survives the loading deadline and settles reduced motion', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  await page.waitForTimeout(15_100);
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  await page.evaluate(() =>
    window.scrollTo({ top: 1200, behavior: 'instant' }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __pegasoftHeroFrame: { frame: { target: number } };
            }
          ).__pegasoftHeroFrame.frame.target,
      ),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener(
        'change',
        () => Object.assign(window, { __s6MotionChangedAt: performance.now() }),
        { once: true },
      );
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const settlement = await page.waitForFunction(
    () => {
      const w = window as unknown as {
        __s6MotionChangedAt?: number;
        __pegasoftHeroFrame?: {
          renderedAtMs?: number;
          frame: {
            frameId: number;
            target: number;
            rendered: { value: number };
          };
          appliedConsumers: Record<string, { frameId: number }>;
        };
      };
      const r = w.__pegasoftHeroFrame;
      if (
        !r?.renderedAtMs ||
        !w.__s6MotionChangedAt ||
        r.renderedAtMs < w.__s6MotionChangedAt ||
        Math.abs(r.frame.target - r.frame.rendered.value) > 1e-6
      )
        return false;
      if (
        !Object.values(r.appliedConsumers).length ||
        !Object.values(r.appliedConsumers).every(
          (c) => c.frameId === r.frame.frameId,
        )
      )
        return false;
      return {
        changedAtMs: w.__s6MotionChangedAt,
        renderedAtMs: r.renderedAtMs,
        elapsedMs: r.renderedAtMs - w.__s6MotionChangedAt,
        frameId: r.frame.frameId,
        target: r.frame.target,
        rendered: r.frame.rendered.value,
      };
    },
    undefined,
    // Retrieval may cross process boundaries; the measured product budget below stays 100ms.
    { polling: 10, timeout: 2_000 },
  );
  const settled = await settlement.jsonValue();
  if (!settled)
    throw new Error('No completed reduced-motion frame was observed');
  expect(settled.elapsedMs).toBeLessThanOrEqual(100);
  await testInfo.attach('reduced-motion-settlement', {
    body: JSON.stringify(settled),
    contentType: 'application/json',
  });
  await expect(state).toHaveAttribute('data-hero-motion', 'reduced', {
    timeout: 100,
  });
  await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  await expect(state.locator('canvas')).toHaveCount(1);
});

test('route remount rejects abandoned resource and context callbacks', async ({
  page,
}) => {
  const errors = captureRuntimeErrors(page);
  await page.goto('/?__heroResourceDelayMs=5000');
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  const oldId = await state.getAttribute('data-hero-attempt-id');
  const oldCanvas = await state.locator('canvas').elementHandle();
  // Exercise client navigation while the old attempt still owns a pending timer.
  await page
    .locator('a[href="/services"]')
    .first()
    .evaluate((el) => (el as HTMLElement).click());
  await expect(page).toHaveURL(/\/services$/);
  await expect(state).toHaveCount(0);
  await page.goBack();
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  expect(await state.getAttribute('data-hero-attempt-id')).not.toBe(oldId);
  await oldCanvas!.evaluate((el) => {
    el.dispatchEvent(new Event('webglcontextrestored'));
    el.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(state).toHaveAttribute(
    'data-hero-attempt-state',
    'loading-resources',
  );
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready', {
    timeout: 7_000,
  });
  await expect(state.locator('canvas')).toHaveCount(1);
  await oldCanvas!.dispose();
  expectNoRuntimeErrors(errors);
});

test('successful capability probe with failed actual Canvas selects fallback', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    let reject = true;
    Object.assign(window, {
      __s6AllowContext: () => {
        reject = false;
      },
    });
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (reject && this.isConnected && String(args[0]).startsWith('webgl'))
        return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  const state = page.locator('[data-hero-reference-state]');
  await expect(state).toHaveAttribute('data-hero-motion', 'full');
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
    timeout: 1_000,
  });
  const timing = await state.evaluate((el) => ({
    start: Number(el.getAttribute('data-hero-attempt-started-at')),
    fallback: Number(el.getAttribute('data-hero-fallback-at')),
    elapsed: Number(el.getAttribute('data-hero-attempt-elapsed-ms')),
  }));
  expect(timing.start).toBeGreaterThan(0);
  expect(timing.fallback).toBeGreaterThanOrEqual(timing.start);
  expect(timing.elapsed).toBeCloseTo(timing.fallback - timing.start, 0);
  expect(timing.elapsed).toBeLessThanOrEqual(1_000);
  await testInfo.attach('init-failure-timing', {
    body: JSON.stringify(timing),
    contentType: 'application/json',
  });
  await expectUsefulLanding(page, state);
  await expectLoaderDoesNotBlock(page);
  const oldId = await state.getAttribute('data-hero-attempt-id');
  await page.evaluate(() =>
    (window as unknown as { __s6AllowContext(): void }).__s6AllowContext(),
  );
  await page.locator('a[href="/services"]').first().click();
  await expect(page).toHaveURL(/\/services$/);
  await page.goBack();
  await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  expect(await state.getAttribute('data-hero-attempt-id')).not.toBe(oldId);
  await expect(state.locator('canvas')).toHaveCount(1);
});

for (const profile of [
  { name: 'recording-desktop', width: 1508, height: 761 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`ordinary entry visible ink, cue, CTA and accessibility: ${profile.name}`, async ({
    page,
  }, testInfo) => {
    const errors = captureRuntimeErrors(page);
    await page.setViewportSize({
      width: profile.width,
      height: profile.height,
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const state = page.locator('[data-hero-reference-state]');
    await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
    await expect(state).toHaveAttribute('data-hero-direct-entry', 'false');
    await expectLoaderDoesNotBlock(page);
    const title = page.locator('[data-hero-copy="landing"] h1');
    const cue = page.getByRole('button', {
      name: 'scroll to discover our process',
    });
    await expect(title).toBeVisible();
    await expect(cue).toBeVisible();
    // Allow the ordinary presentation's existing entry animation to settle.
    await expect
      .poll(() =>
        cue.locator('span span').evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe('1');
    const measure = async (locator: Locator) =>
      locator.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = [...range.getClientRects()].filter(
          (r) => r.width > 0 && r.height > 0,
        );
        const lines = [...new Set(rects.map((r) => Math.round(r.top)))];
        const clips: string[] = [];
        for (
          let ancestor: Element | null = element;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (style.visibility === 'hidden' || Number(style.opacity) === 0)
            clips.push('invisible ancestor');
          if (/(hidden|clip)/.test(style.overflowX + style.overflowY)) {
            const box = ancestor.getBoundingClientRect();
            if (
              rects.some(
                (r) =>
                  r.left < box.left - 1 ||
                  r.right > box.right + 1 ||
                  r.top < box.top - 1 ||
                  r.bottom > box.bottom + 1,
              )
            )
              clips.push(ancestor.tagName);
          }
        }
        return {
          text: element.textContent,
          lines: lines.length,
          clips,
          rects: rects.map((r) => ({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          })),
        };
      });
    await expect
      .poll(() =>
        cue
          .locator('span span')
          .evaluate((el) =>
            Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42),
          ),
      )
      .toBeLessThan(0.1);
    const titleInk = await measure(title);
    const cueInk = await measure(cue.locator('span span'));
    await testInfo.attach('landing-ink', {
      body: JSON.stringify({ profile, titleInk, cueInk }),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: testInfo.outputPath('ordinary-landing.png'),
    });
    expect(titleInk.clips).toEqual([]);
    expect(cueInk.clips).toEqual([]);
    expect(cueInk.lines).toBe(1);
    await page.screenshot({
      path: testInfo.outputPath('ordinary-landing.png'),
    });
    let cta = page.locator('.pegasoft-header__ctas a').first();
    if (profile.width <= 820) {
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      cta = page.locator(
        '#pegasoft-mobile-navigation a[href="/work/concepts"]',
      );
    }
    await expect(cta).toBeVisible();
    const ctaInk = await measure(cta.locator('.pill-btn-span'));
    expect(ctaInk.lines).toBe(1);
    expect(ctaInk.clips).toEqual([]);
    await testInfo.attach('visible-ink', {
      body: JSON.stringify({ profile, titleInk, cueInk, ctaInk }),
      contentType: 'application/json',
    });
    await page.screenshot({ path: testInfo.outputPath('cta.png') });
    const axe = await new AxeBuilder({ page })
      .include('header.pegasoft-header')
      .include('[data-hero-copy="landing"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    expectNoRuntimeErrors(errors);
  });
}
