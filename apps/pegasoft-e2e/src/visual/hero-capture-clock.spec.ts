import { expect, test, type Page } from '@playwright/test';
import {
  advanceCaptureClock,
  installCaptureCssClock,
  readCaptureCssClock,
} from './hero-capture-clock';

const epoch = new Date('2026-09-30T00:00:00Z');
const fixture = `<style>
@keyframes travel { from { transform: translateX(0px); } to { transform: translateX(100px); } }
#animation { width:20px; height:20px; background:blue; animation: travel 1000ms linear infinite; }
#transition { width:20px; height:20px; background:red; opacity:0; transition: opacity 1000ms linear; }
#transition.active { opacity:1; }
</style><div id="animation"></div><div id="transition"></div>`;

async function pausedFixture(page: Page) {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch);
  await page.setContent(fixture);
}

function realElapsed(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

test('native animation name and target binding survive screenshot and DOM reordering', async ({
  page,
}) => {
  await pausedFixture(page);
  await installCaptureCssClock(page);
  const before = await readCaptureCssClock(page);
  expect(before.animations[0]).toEqual(
    expect.objectContaining({
      animationName: 'travel',
      transitionProperty: null,
      target: expect.objectContaining({
        tagName: 'div',
        id: 'animation',
        selector: '#animation',
        pseudoElement: null,
      }),
      timing: expect.objectContaining({
        duration: 1000,
        delay: 0,
        iterations: 'infinite',
      }),
    }),
  );
  await page
    .locator('#transition')
    .evaluate((element) => document.body.prepend(element));
  await page.screenshot({ animations: 'allow' });
  const after = await readCaptureCssClock(page);
  expect(after.animations[0].id).toBe(before.animations[0].id);
  expect(after.animations[0].target).toEqual(before.animations[0].target);
});

test('same-name SVG effects retain distinct native targets without element IDs', async ({
  page,
}) => {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch);
  await page.setContent(
    `<style>@keyframes dash { to { stroke-dashoffset:-24; } } svg { animation:dash 4s linear infinite; }</style><svg viewBox="0 0 10 10"><ellipse cx="5" cy="5" rx="4" ry="4" /></svg><svg viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="9" ry="9" /></svg>`,
  );
  await installCaptureCssClock(page);
  const snapshot = await readCaptureCssClock(page);
  expect(snapshot.animations).toHaveLength(2);
  for (const animation of snapshot.animations) {
    expect(animation.animationName).toBe('dash');
    expect(animation.target?.tagName).toBe('svg');
    expect(animation.target?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    const selector = animation.target?.selector ?? '';
    expect(selector).not.toBe('');
    await expect(page.locator(selector)).toHaveCount(1);
  }
  expect(snapshot.animations[0].target?.selector).not.toBe(
    snapshot.animations[1].target?.selector,
  );
  await page.locator('svg').evaluateAll((elements) =>
    elements.forEach((element) => {
      element.id = 'duplicate';
    }),
  );
  const duplicatedIds = JSON.parse(
    JSON.stringify(await readCaptureCssClock(page)),
  );
  for (const animation of duplicatedIds.animations) {
    expect(animation.target.id).toBe('duplicate');
    await expect(page.locator(animation.target.selector)).toHaveCount(1);
    expect(animation.timing.iterations).toBe('infinite');
  }
  expect(duplicatedIds.animations[0].target.selector).not.toBe(
    duplicatedIds.animations[1].target.selector,
  );
});

test('css_document_timeline_progresses_while_javascript_clock_is_paused', async ({
  page,
}) => {
  await pausedFixture(page);
  const before = await page.evaluate(() => ({
    js: performance.now(),
    css: document.getAnimations()[0].currentTime as number,
  }));
  await realElapsed(80);
  const after = await page.evaluate(() => ({
    js: performance.now(),
    css: document.getAnimations()[0].currentTime as number,
  }));
  expect(after.js).toBe(before.js);
  expect(after.css).toBeGreaterThan(before.css);
});

test('css_transport_advances_input_delta_and_stays_stable_across_screenshot', async ({
  page,
}) => {
  await pausedFixture(page);
  await installCaptureCssClock(page);
  const before = await readCaptureCssClock(page);
  await advanceCaptureClock(page, 300);
  const advanced = await readCaptureCssClock(page);
  expect(
    advanced.animations[0].currentTime - before.animations[0].currentTime,
  ).toBeCloseTo(300, 5);
  await page.screenshot({ animations: 'allow' });
  await realElapsed(80);
  const after = await readCaptureCssClock(page);
  expect(after.animations[0].currentTime).toBe(
    advanced.animations[0].currentTime,
  );
  expect(after.nowMs).toBe(advanced.nowMs);
  expect(after.log).toContainEqual(
    expect.objectContaining({ type: 'advance', deltaMs: 300 }),
  );
});

test('css_transition_created_in_timer_uses_remaining_interval', async ({
  page,
}) => {
  await pausedFixture(page);
  await installCaptureCssClock(page);
  await page.evaluate(() => {
    getComputedStyle(
      document.querySelector('#transition') as Element,
    ).getPropertyValue('opacity');
    setTimeout(
      () => document.querySelector('#transition')?.classList.add('active'),
      100,
    );
  });
  await advanceCaptureClock(page, 300);
  const result = await readCaptureCssClock(page);
  const transition = result.animations.find(
    (animation) => animation.kind === 'transition',
  );
  expect(transition).toBeDefined();
  expect(transition?.observedAtMs).toBe(100);
  expect(transition?.currentTime).toBeCloseTo(200, 5);
  expect(transition).toEqual(
    expect.objectContaining({
      animationName: null,
      transitionProperty: 'opacity',
      target: expect.objectContaining({ selector: '#transition' }),
    }),
  );
  expect(
    await page
      .locator('#transition')
      .evaluate((element) => Number(getComputedStyle(element).opacity)),
  ).toBeCloseTo(0.2, 5);
});

test('css_transport_installed_before_navigation_preserves_timer_creation_time', async ({
  page,
}) => {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch);
  await installCaptureCssClock(page);
  await page.goto(
    `data:text/html,${encodeURIComponent(
      fixture +
        `<script>
    getComputedStyle(document.querySelector('#transition')).opacity;
    document.querySelector('#transition').dataset.scheduledAt = String(performance.now());
    setTimeout(() => document.querySelector('#transition').classList.add('active'), 100);
  </script>`,
    )}`,
  );
  const beforeMs = await page.evaluate(() => performance.now());
  const scheduledAtMs = Number(
    await page.locator('#transition').getAttribute('data-scheduled-at'),
  );
  await advanceCaptureClock(page, 300);
  const result = await readCaptureCssClock(page);
  expect(result.nowMs - beforeMs).toBe(300);
  expect(
    result.animations.find((animation) => animation.kind === 'transition'),
  ).toEqual(
    expect.objectContaining({
      observedAtMs: scheduledAtMs + 100,
      currentTime: result.nowMs - scheduledAtMs - 100,
    }),
  );
});
