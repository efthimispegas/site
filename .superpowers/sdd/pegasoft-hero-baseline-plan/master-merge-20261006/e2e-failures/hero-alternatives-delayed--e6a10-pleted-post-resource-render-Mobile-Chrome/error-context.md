# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-alternatives.spec.ts >> delayed essential resources require a completed post-resource render
- Location: src/hero-alternatives.spec.ts:379:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-hero-reference-state]')
Expected: "loading-resources"
Received: "frame-pending"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('[data-hero-reference-state]')
    6 × locator resolved to <div data-hero-step="1" data-hero-ready-at="0" data-hero-seed="43117" data-hero-motion="full" data-hero-fallback-at="0" data-hero-profile="mobile" data-hero-lifecycle="landing" data-hero-render-ready="false" data-hero-direct-entry="false" data-hero-pointer-trail="false" data-hero-fallback-ready="false" data-hero-attempt-id="_R_bslrlb_" data-hero-first-applied-frame="0" data-hero-resources-ready-at="5594" data-hero-reference-state="landing" data-hero-scene-progress="0.000000" data-hero-attempt-state…>…</div>
      - unexpected value "frame-pending"
    8 × locator resolved to <div data-hero-step="1" data-hero-ready-at="0" data-hero-seed="43117" data-hero-motion="full" data-hero-fallback-at="0" data-hero-profile="mobile" data-hero-lifecycle="landing" data-hero-render-ready="false" data-hero-direct-entry="false" data-hero-pointer-trail="false" data-hero-fallback-ready="false" data-hero-attempt-id="_R_bslrlb_" data-hero-first-applied-frame="0" data-hero-resources-ready-at="5594" data-hero-scene-progress="0.000000" data-hero-attempt-state="frame-pending" data-hero-reference…>…</div>
      - unexpected value "frame-pending"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e5]
        - img [ref=e16]
        - img [ref=e18]
      - generic [ref=e20]:
        - link "PEGASOFT" [ref=e22] [cursor=pointer]:
          - /url: /
        - button "Toggle menu" [ref=e24]:
          - img [ref=e25]
        - generic:
          - generic:
            - link:
              - /url: /
              - text: PEGASOFT
            - button:
              - img
          - list:
            - listitem:
              - link:
                - /url: /services
                - text: Services
            - listitem:
              - link:
                - /url: /work
                - text: Work
            - listitem:
              - link:
                - /url: /studio
                - text: Studio
          - generic:
            - generic:
              - link:
                - /url: /work/concepts
                - generic: Concept Lab
            - generic:
              - link:
                - /url: https://cal.com/pegasoft/intro
                - generic: Book a Call
      - generic [ref=e26]:
        - generic:
          - generic:
            - heading "The New Standard in Product Delivery" [level=1]:
              - generic: The New Standard
              - generic: in Product Delivery
            - paragraph: Design clarity. Production rigor.Pegasoft builds resilient digital products and brand systems that hold together in production.
          - button "scroll to discover our process" [ref=e31]:
            - generic [ref=e33]: scroll to discover our process
        - generic [ref=e37]:
          - generic [ref=e38]:
            - button "01 Signal becomes system" [expanded] [ref=e39]:
              - generic [ref=e41]: "01"
              - heading "Signal becomes system" [level=3] [ref=e42]
            - paragraph [ref=e47]: A loose product brief turns into an operating map with priorities, risks, acceptance criteria, and delivery intent before the build gets expensive.
          - generic [ref=e48]:
            - button "02 Interface logic takes shape" [ref=e49] [cursor=pointer]:
              - generic [ref=e51]: "02"
              - heading "Interface logic takes shape" [level=3] [ref=e52]
            - paragraph [ref=e54]: Pegasoft designs product flows, screen systems, motion rules, and design tokens that can survive handoff without turning fragile in code.
          - generic [ref=e55]:
            - button "03 Quality is engineered early" [ref=e56] [cursor=pointer]:
              - generic [ref=e58]: "03"
              - heading "Quality is engineered early" [level=3] [ref=e59]
            - paragraph [ref=e61]: Accessibility, performance posture, responsive behavior, and implementation guardrails are folded into the system before launch pressure starts to bend it.
          - generic [ref=e62]:
            - button "04 Proof stays honest" [ref=e63] [cursor=pointer]:
              - generic [ref=e65]: "04"
              - heading "Proof stays honest" [level=3] [ref=e66]
            - paragraph [ref=e68]: Concept Lab studies stay clearly labeled, client portfolio work stays earned, and the site tells the truth about what is exploratory versus approved.
        - generic [ref=e70]:
          - heading "Designed for ambitious studios, beyond presentation-only design workflows." [level=2] [ref=e71]
          - generic [ref=e72]:
            - article [ref=e73]:
              - generic [ref=e77]:
                - heading "Rapid framing" [level=3] [ref=e78]
                - paragraph [ref=e79]: We shorten the distance between product intent and a buildable operating model.
            - article [ref=e80]:
              - generic [ref=e84]:
                - heading "Delivery-grade systems" [level=3] [ref=e85]
                - paragraph [ref=e86]: The design language is structured for implementation, not for static approval only.
            - article [ref=e87]:
              - generic [ref=e91]:
                - heading "Measured motion" [level=3] [ref=e92]
                - paragraph [ref=e93]: Interaction polish is treated like product behavior, with restraint, accessibility, and hierarchy.
            - article [ref=e94]:
              - generic [ref=e98]:
                - heading "Honest proof" [level=3] [ref=e99]
                - paragraph [ref=e100]: Concepts, real work, and capability claims stay cleanly separated so credibility holds.
      - generic [ref=e107]:
        - heading "Launch-grade standards across every release." [level=2] [ref=e108]:
          - generic [ref=e109]: Launch-grade standards
          - generic [ref=e110]: across every release.
        - paragraph [ref=e111]: Pegasoft treats design quality like operational quality. Motion, accessibility, implementation logic, and proof discipline are part of the system from the start.
        - link "Explore our work model" [ref=e113] [cursor=pointer]:
          - /url: /work
          - generic [ref=e114]: Explore our work model
      - generic [ref=e116]:
        - heading "How we work and how we deliver premium digital product systems." [level=2] [ref=e118]
        - generic [ref=e120]:
          - generic [ref=e121]:
            - button "How does Pegasoft start a new engagement?" [expanded] [ref=e122]:
              - generic [ref=e123]: How does Pegasoft start a new engagement?
              - img [ref=e125]
            - paragraph [ref=e128]: We begin by framing scope, product goals, and delivery risk together. That produces a decision map, experience direction, and quality bar before visual detail starts to outrun clarity.
          - generic [ref=e129]:
            - button "Does Pegasoft only design, or also support delivery?" [ref=e130]:
              - generic [ref=e131]: Does Pegasoft only design, or also support delivery?
              - img [ref=e133]
            - paragraph [ref=e135]: Delivery quality is part of the offer. We shape interface systems, implementation priorities, accessibility expectations, and release readiness so the work lands well beyond the prototype.
          - generic [ref=e136]:
            - button "How do you handle Concept Lab versus real portfolio work?" [ref=e137]:
              - generic [ref=e138]: How do you handle Concept Lab versus real portfolio work?
              - img [ref=e140]
            - paragraph [ref=e142]: Concept Lab studies are clearly presented as speculative explorations. Client and product portfolio work appears only when permission, assets, and source truth are approved.
          - generic [ref=e143]:
            - button "What kinds of teams are the best fit?" [ref=e144]:
              - generic [ref=e145]: What kinds of teams are the best fit?
              - img [ref=e147]
            - paragraph [ref=e149]: Pegasoft works best with founders, product teams, and premium digital businesses that care as much about shipping quality as they do about looking polished in the deck.
      - generic [ref=e150]:
        - heading "Build the next product with precision,and ship it without guesswork." [level=2] [ref=e151]
        - paragraph [ref=e152]: Pegasoft helps teams frame the product, shape the interface system, and protect delivery quality before launch pressure takes over.
        - link "Book a client call" [ref=e154] [cursor=pointer]:
          - /url: https://cal.com/pegasoft/intro
          - generic [ref=e155]: Book a client call
      - generic [ref=e156]:
        - navigation [ref=e157]:
          - link "Services" [ref=e158] [cursor=pointer]:
            - /url: /services
            - generic [ref=e159]: Services
            - generic [ref=e160]:
              - img [ref=e161]
              - img [ref=e163]
          - link "Work" [ref=e165] [cursor=pointer]:
            - /url: /work
            - generic [ref=e166]: Work
            - generic [ref=e167]:
              - img [ref=e168]
              - img [ref=e170]
          - link "Studio" [ref=e172] [cursor=pointer]:
            - /url: /studio
            - generic [ref=e173]: Studio
            - generic [ref=e174]:
              - img [ref=e175]
              - img [ref=e177]
        - generic [ref=e179]:
          - generic [ref=e180]: PEGASOFT
          - generic [ref=e181]:
            - paragraph [ref=e182]: © 2026 Pegasoft
            - link "Privacy Policy" [ref=e183] [cursor=pointer]:
              - /url: /privacy
            - link "Concept Lab" [ref=e184] [cursor=pointer]:
              - /url: /work/concepts
            - link "Portfolio status" [ref=e185] [cursor=pointer]:
              - /url: /work/portfolio
  - button "Open Next.js Dev Tools" [ref=e191] [cursor=pointer]:
    - img [ref=e192]
  - alert [ref=e195]
```

# Test source

```ts
  316 |       new Promise<number>((resolve) => {
  317 |         element.addEventListener(
  318 |           'webglcontextlost',
  319 |           () => resolve(performance.now()),
  320 |           { once: true, capture: true },
  321 |         );
  322 |         (element as HTMLCanvasElement)
  323 |           .getContext('webgl2')!
  324 |           .getExtension('WEBGL_lose_context')!
  325 |           .loseContext();
  326 |       }),
  327 |   );
  328 | 
  329 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
  330 |     timeout: 1_000,
  331 |   });
  332 |   await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  333 |   await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  334 |   await expectUsefulLanding(page, state);
  335 |   await expectLoaderDoesNotBlock(page);
  336 |   await retainFallbackTiming(state, testInfo, observedAt);
  337 |   expectNoRuntimeErrors(errors);
  338 | });
  339 | 
  340 | test('active Canvas context loss mid-journey latches fallback without a retry', async ({
  341 |   page,
  342 | }, testInfo) => {
  343 |   const errors = captureRuntimeErrors(page);
  344 |   await page.goto('/');
  345 | 
  346 |   const state = page.locator('[data-hero-reference-state]');
  347 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  348 |   await page.evaluate(() => window.scrollTo({ top: 1_200 }));
  349 |   await expect
  350 |     .poll(() => state.getAttribute('data-hero-reference-state'))
  351 |     .not.toMatch(/^(loader-mark|world-reveal|landing|landing-idle)$/u);
  352 | 
  353 |   const canvas = state.locator('canvas');
  354 |   const observedAt = await canvas.evaluate(
  355 |     (element) =>
  356 |       new Promise<number>((resolve) => {
  357 |         element.addEventListener(
  358 |           'webglcontextlost',
  359 |           () => resolve(performance.now()),
  360 |           { once: true, capture: true },
  361 |         );
  362 |         (element as HTMLCanvasElement)
  363 |           .getContext('webgl2')!
  364 |           .getExtension('WEBGL_lose_context')!
  365 |           .loseContext();
  366 |       }),
  367 |   );
  368 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
  369 |     timeout: 1_000,
  370 |   });
  371 |   await page.setViewportSize({ width: 1100, height: 760 });
  372 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback');
  373 |   await expectUsefulLanding(page, state);
  374 |   await expectLoaderDoesNotBlock(page);
  375 |   await retainFallbackTiming(state, testInfo, observedAt);
  376 |   expectNoRuntimeErrors(errors);
  377 | });
  378 | 
  379 | test('delayed essential resources require a completed post-resource render', async ({
  380 |   page,
  381 | }, testInfo) => {
  382 |   const errors = captureRuntimeErrors(page);
  383 |   await page.addInitScript(() => {
  384 |     const request = window.requestAnimationFrame.bind(window);
  385 |     let paused = false;
  386 |     const waiting: FrameRequestCallback[] = [];
  387 |     window.requestAnimationFrame = (callback) =>
  388 |       request((time) => {
  389 |         if (paused) waiting.push(callback);
  390 |         else callback(time);
  391 |       });
  392 |     Object.assign(window, {
  393 |       __s6PauseFrames: () => {
  394 |         paused = true;
  395 |       },
  396 |       __s6ResumeFrames: () => {
  397 |         paused = false;
  398 |         waiting.splice(0).forEach((callback) => request(callback));
  399 |       },
  400 |     });
  401 |   });
  402 |   await page.goto('/?__heroResourceDelayMs=5000');
  403 |   const state = page.locator('[data-hero-reference-state]');
  404 |   await expect(state).toHaveAttribute(
  405 |     'data-hero-attempt-state',
  406 |     'loading-resources',
  407 |   );
  408 |   await page.evaluate(() =>
  409 |     (
  410 |       window as unknown as Window & {
  411 |         __s6PauseFrames(): void;
  412 |       }
  413 |     ).__s6PauseFrames(),
  414 |   );
  415 |   await page.waitForTimeout(4_500);
> 416 |   await expect(state).toHaveAttribute(
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  417 |     'data-hero-attempt-state',
  418 |     'loading-resources',
  419 |   );
  420 |   await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  421 |   await expect(state).toHaveAttribute(
  422 |     'data-hero-attempt-state',
  423 |     'frame-pending',
  424 |     { timeout: 2_000 },
  425 |   );
  426 |   await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  427 |   await expect(state).toHaveAttribute('data-hero-first-applied-frame', '0');
  428 |   await page.evaluate(() =>
  429 |     (
  430 |       window as unknown as Window & {
  431 |         __s6ResumeFrames(): void;
  432 |       }
  433 |     ).__s6ResumeFrames(),
  434 |   );
  435 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready', {
  436 |     timeout: 2_000,
  437 |   });
  438 |   const timings = await state.evaluate((el) => ({
  439 |     resourcesStartedAtMs: Number(
  440 |       el.getAttribute('data-hero-resources-started-at'),
  441 |     ),
  442 |     resourcesReadyAtMs: Number(el.getAttribute('data-hero-resources-ready-at')),
  443 |     readyAtMs: Number(el.getAttribute('data-hero-ready-at')),
  444 |     firstAppliedFrameId: Number(
  445 |       el.getAttribute('data-hero-first-applied-frame'),
  446 |     ),
  447 |   }));
  448 |   expect(timings.readyAtMs).toBeGreaterThan(timings.resourcesReadyAtMs);
  449 |   expect(
  450 |     timings.resourcesReadyAtMs - timings.resourcesStartedAtMs,
  451 |   ).toBeGreaterThanOrEqual(5_000);
  452 |   expect(timings.firstAppliedFrameId).toBeGreaterThan(0);
  453 |   await testInfo.attach('resource-render-timeline', {
  454 |     body: JSON.stringify(timings),
  455 |     contentType: 'application/json',
  456 |   });
  457 |   expectNoRuntimeErrors(errors);
  458 | });
  459 | 
  460 | test('never-resolving essential resources reach useful fallback at the finite deadline', async ({
  461 |   page,
  462 | }, testInfo) => {
  463 |   const errors = captureRuntimeErrors(page);
  464 |   await page.goto('/?__heroNeverResolveResources=1');
  465 | 
  466 |   const state = page.locator('[data-hero-reference-state]');
  467 |   await expect(state).toHaveAttribute(
  468 |     'data-hero-attempt-state',
  469 |     'loading-resources',
  470 |   );
  471 |   await page.setViewportSize({ width: 1100, height: 760 });
  472 |   await waitForAttemptState(page, 'fallback', 16_000);
  473 |   await retainFallbackTiming(state, testInfo);
  474 |   await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  475 |   await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  476 |   await expectUsefulLanding(page, state);
  477 |   await expectLoaderDoesNotBlock(page);
  478 |   expectNoRuntimeErrors(errors);
  479 | });
  480 | 
  481 | test('closed mobile navigation is hidden from assistive technology and keyboard focus', async ({
  482 |   page,
  483 | }) => {
  484 |   await page.setViewportSize({ width: 393, height: 851 });
  485 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  486 |   await page.goto(HERO_URL);
  487 | 
  488 |   const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  489 |   const mobileNavigation = page.locator('#pegasoft-mobile-navigation');
  490 |   const mobileControls = mobileNavigation.locator('a, button');
  491 | 
  492 |   await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  493 |   await expect(mobileNavigation).toHaveAttribute('inert', '');
  494 |   await expect(mobileControls).toHaveCount(7);
  495 |   await expect
  496 |     .poll(() =>
  497 |       mobileControls.evaluateAll((elements) =>
  498 |         elements.every((element) => element.getAttribute('tabindex') === '-1'),
  499 |       ),
  500 |     )
  501 |     .toBe(true);
  502 | 
  503 |   await menuButton.click();
  504 |   await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');
  505 |   await expect(mobileNavigation).not.toHaveAttribute('inert', '');
  506 |   await expect(
  507 |     mobileNavigation.getByRole('button', { name: 'Close menu' }),
  508 |   ).toBeFocused();
  509 | 
  510 |   await page.keyboard.press('Escape');
  511 |   await expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
  512 |   await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  513 |   await expect(menuButton).toBeFocused();
  514 | });
  515 | 
  516 | test('static fallback is deterministic during ordinary initial loading', async ({
```