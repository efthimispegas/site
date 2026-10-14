# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-alternatives.spec.ts >> expired loading deadline is checked on resume when its timer was throttled
- Location: src/hero-alternatives.spec.ts:540:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-hero-reference-state]')
Expected: "loading-resources"
Received: "fallback"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('[data-hero-reference-state]')
    2 × locator resolved to <div data-hero-step="1" data-hero-ready-at="0" data-hero-seed="43117" data-hero-motion="full" data-hero-profile="desktop" data-hero-lifecycle="landing" data-hero-render-ready="false" data-hero-direct-entry="false" data-hero-pointer-trail="true" data-hero-fallback-ready="true" data-hero-resources-ready-at="0" data-hero-attempt-id="_R_bslrlb_" data-hero-first-applied-frame="0" data-hero-attempt-state="fallback" data-hero-resources-started-at="0" data-hero-attempt-reason="deadline" data-hero-scene-pro…>…</div>
      - unexpected value "fallback"

```

```
Test timeout of 30000ms exceeded while running "afterEach" hook.
```

# Test source

```ts
  1   | import {
  2   |   expect,
  3   |   test,
  4   |   type Locator,
  5   |   type Page,
  6   |   type TestInfo,
  7   | } from '@playwright/test';
  8   | import AxeBuilder from '@axe-core/playwright';
  9   | 
  10  | const REFERENCE_STATE = 'landing-idle';
  11  | const HERO_URL = `/?__heroState=${REFERENCE_STATE}&__heroTime=2500`;
  12  | 
> 13  | test.afterEach(async ({ page, browser }, testInfo) => {
      |      ^ Test timeout of 30000ms exceeded while running "afterEach" hook.
  14  |   if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
  15  |   const observed = await page.evaluate(() => {
  16  |     const scene = document.querySelector('[data-hero-reference-state]');
  17  |     const loader = document.querySelector('[data-hidden][data-revealing]');
  18  |     const style = loader ? getComputedStyle(loader) : null;
  19  |     return {
  20  |       nowMs: performance.now(),
  21  |       visibility: document.visibilityState,
  22  |       url: location.href,
  23  |       userAgent: navigator.userAgent,
  24  |       scene: scene
  25  |         ? Object.fromEntries(
  26  |             [...scene.attributes].map(({ name, value }) => [name, value]),
  27  |           )
  28  |         : null,
  29  |       loader: loader
  30  |         ? {
  31  |             hidden: loader.getAttribute('data-hidden'),
  32  |             revealing: loader.getAttribute('data-revealing'),
  33  |             visibility: style?.visibility,
  34  |             opacity: style?.opacity,
  35  |             display: style?.display,
  36  |             pointerEvents: style?.pointerEvents,
  37  |             animations: loader.getAnimations().map((animation) => ({
  38  |               currentTime: animation.currentTime,
  39  |               playState: animation.playState,
  40  |               pending: animation.pending,
  41  |             })),
  42  |           }
  43  |         : null,
  44  |     };
  45  |   });
  46  |   await testInfo.attach('failure-runtime-state', {
  47  |     body: JSON.stringify({ browserVersion: browser.version(), ...observed }),
  48  |     contentType: 'application/json',
  49  |   });
  50  | });
  51  | 
  52  | type RuntimeErrors = {
  53  |   console: string[];
  54  |   page: string[];
  55  | };
  56  | 
  57  | function captureRuntimeErrors(page: Page): RuntimeErrors {
  58  |   const errors: RuntimeErrors = {
  59  |     console: [],
  60  |     page: [],
  61  |   };
  62  | 
  63  |   page.on('pageerror', (error) => {
  64  |     errors.page.push(error.message);
  65  |   });
  66  |   page.on('console', (message) => {
  67  |     if (message.type() === 'error') {
  68  |       errors.console.push(message.text());
  69  |     }
  70  |   });
  71  | 
  72  |   return errors;
  73  | }
  74  | 
  75  | async function waitForNamedHeroState(page: Page) {
  76  |   const state = page.locator(
  77  |     `[data-hero-reference-state="${REFERENCE_STATE}"]`,
  78  |   );
  79  | 
  80  |   await expect(state).toHaveCount(1, { timeout: 10_000 });
  81  |   await expect(state).toHaveAttribute('data-hero-direct-entry', 'true');
  82  |   await expect
  83  |     .poll(() => state.getAttribute('data-hero-attempt-state'))
  84  |     .toMatch(/^(ready|fallback)$/u);
  85  |   await expect(state.locator('[data-hero-surface]')).toBeVisible();
  86  | 
  87  |   return state;
  88  | }
  89  | 
  90  | async function expectUsefulLanding(page: Page, state: Locator) {
  91  |   await expect(
  92  |     page.getByRole('heading', {
  93  |       name: /the new standard\s+in product delivery/i,
  94  |       level: 1,
  95  |     }),
  96  |   ).toBeVisible();
  97  |   await expect(page.locator('header.pegasoft-header')).toBeVisible();
  98  |   await expect(state.locator('[data-hero-surface]')).toBeVisible();
  99  | }
  100 | 
  101 | async function expectLoaderDoesNotBlock(page: Page) {
  102 |   // Match a single committed CSS/DOM observation before locator assertions.
  103 |   // The same 5s visibility budget applies; no animation or page state is changed.
  104 |   const cleared = await page.waitForFunction(() => {
  105 |     const shell = document.querySelector('[data-hero-shell]');
  106 |     const loaders = document.querySelectorAll(
  107 |       '[aria-hidden="true"][data-direct][data-hidden][data-revealing]',
  108 |     );
  109 |     const loader = loaders[0];
  110 |     if (!loader || loaders.length !== 1) return false;
  111 |     const style = getComputedStyle(loader);
  112 |     return shell?.getAttribute('data-loader-cleared') === 'true' &&
  113 |       loader.getAttribute('data-hidden') === 'true' &&
```