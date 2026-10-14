# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-alternatives.spec.ts >> ready scene survives the loading deadline and settles reduced motion
- Location: src/hero-alternatives.spec.ts:580:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 100
Received:    114.20000000018626
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - navigation "Primary links" [ref=e5]:
          - link "Services" [ref=e6] [cursor=pointer]:
            - /url: /services
          - link "Studio" [ref=e7] [cursor=pointer]:
            - /url: /studio
        - link "PEGASOFT" [ref=e9] [cursor=pointer]:
          - /url: /
        - generic [ref=e11]:
          - link "Concept Lab" [ref=e12] [cursor=pointer]:
            - /url: /work/concepts
            - generic [ref=e13]: Concept Lab
          - link "Book a Call" [ref=e14] [cursor=pointer]:
            - /url: https://cal.com/pegasoft/intro
            - generic [ref=e15]: Book a Call
      - generic [ref=e16]:
        - generic:
          - generic:
            - heading "The New Standard in Product Delivery" [level=1]:
              - generic: The New Standard
              - generic: in Product Delivery
            - paragraph:
              - generic: Design clarity. Production rigor.
              - generic: Pegasoft builds resilient digital products and brand systems that hold together in production.
          - button "scroll to discover our process" [ref=e21]:
            - generic [ref=e23]: scroll to discover our process
        - generic [ref=e27]:
          - generic [ref=e28]:
            - button "01 Signal becomes system" [ref=e29] [cursor=pointer]:
              - generic [ref=e31]: "01"
              - heading "Signal becomes system" [level=3] [ref=e32]
            - paragraph [ref=e34]: A loose product brief turns into an operating map with priorities, risks, acceptance criteria, and delivery intent before the build gets expensive.
          - generic [ref=e35]:
            - button "02 Interface logic takes shape" [expanded] [ref=e36]:
              - generic [ref=e38]: "02"
              - heading "Interface logic takes shape" [level=3] [ref=e39]
            - paragraph [ref=e45]: Pegasoft designs product flows, screen systems, motion rules, and design tokens that can survive handoff without turning fragile in code.
          - generic [ref=e46]:
            - button "03 Quality is engineered early" [ref=e47] [cursor=pointer]:
              - generic [ref=e49]: "03"
              - heading "Quality is engineered early" [level=3] [ref=e50]
            - paragraph [ref=e52]: Accessibility, performance posture, responsive behavior, and implementation guardrails are folded into the system before launch pressure starts to bend it.
          - generic [ref=e53]:
            - button "04 Proof stays honest" [ref=e54] [cursor=pointer]:
              - generic [ref=e56]: "04"
              - heading "Proof stays honest" [level=3] [ref=e57]
            - paragraph [ref=e59]: Concept Lab studies stay clearly labeled, client portfolio work stays earned, and the site tells the truth about what is exploratory versus approved.
        - generic [ref=e61]:
          - heading "Designed for ambitious studios, beyond presentation-only design workflows." [level=2] [ref=e62]:
            - text: Designed for ambitious studios,
            - text: beyond presentation-only design workflows.
          - generic [ref=e63]:
            - article [ref=e64]:
              - generic [ref=e68]:
                - heading "Rapid framing" [level=3] [ref=e69]
                - paragraph [ref=e70]: We shorten the distance between product intent and a buildable operating model.
            - article [ref=e71]:
              - generic [ref=e75]:
                - heading "Delivery-grade systems" [level=3] [ref=e76]
                - paragraph [ref=e77]: The design language is structured for implementation, not for static approval only.
            - article [ref=e78]:
              - generic [ref=e82]:
                - heading "Measured motion" [level=3] [ref=e83]
                - paragraph [ref=e84]: Interaction polish is treated like product behavior, with restraint, accessibility, and hierarchy.
            - article [ref=e85]:
              - generic [ref=e89]:
                - heading "Honest proof" [level=3] [ref=e90]
                - paragraph [ref=e91]: Concepts, real work, and capability claims stay cleanly separated so credibility holds.
      - generic [ref=e98]:
        - heading "Launch-grade standards across every release." [level=2] [ref=e99]:
          - generic [ref=e100]: Launch-grade standards
          - generic [ref=e101]: across every release.
        - paragraph [ref=e102]: Pegasoft treats design quality like operational quality. Motion, accessibility, implementation logic, and proof discipline are part of the system from the start.
        - link "Explore our work model" [ref=e104] [cursor=pointer]:
          - /url: /work
          - generic [ref=e105]: Explore our work model
      - generic [ref=e107]:
        - heading "How we work and how we deliver premium digital product systems." [level=2] [ref=e109]
        - generic [ref=e111]:
          - generic [ref=e112]:
            - button "How does Pegasoft start a new engagement?" [expanded] [ref=e113]:
              - generic [ref=e114]: How does Pegasoft start a new engagement?
              - img [ref=e116]
            - paragraph [ref=e119]: We begin by framing scope, product goals, and delivery risk together. That produces a decision map, experience direction, and quality bar before visual detail starts to outrun clarity.
          - generic [ref=e120]:
            - button "Does Pegasoft only design, or also support delivery?" [ref=e121]:
              - generic [ref=e122]: Does Pegasoft only design, or also support delivery?
              - img [ref=e124]
            - paragraph [ref=e126]: Delivery quality is part of the offer. We shape interface systems, implementation priorities, accessibility expectations, and release readiness so the work lands well beyond the prototype.
          - generic [ref=e127]:
            - button "How do you handle Concept Lab versus real portfolio work?" [ref=e128]:
              - generic [ref=e129]: How do you handle Concept Lab versus real portfolio work?
              - img [ref=e131]
            - paragraph [ref=e133]: Concept Lab studies are clearly presented as speculative explorations. Client and product portfolio work appears only when permission, assets, and source truth are approved.
          - generic [ref=e134]:
            - button "What kinds of teams are the best fit?" [ref=e135]:
              - generic [ref=e136]: What kinds of teams are the best fit?
              - img [ref=e138]
            - paragraph [ref=e140]: Pegasoft works best with founders, product teams, and premium digital businesses that care as much about shipping quality as they do about looking polished in the deck.
      - generic [ref=e141]:
        - heading "Build the next product with precision, and ship it without guesswork." [level=2] [ref=e142]:
          - generic [ref=e143]: Build the next product with precision,
          - generic [ref=e144]: and ship it without guesswork.
        - paragraph [ref=e145]: Pegasoft helps teams frame the product, shape the interface system, and protect delivery quality before launch pressure takes over.
        - link "Book a client call" [ref=e147] [cursor=pointer]:
          - /url: https://cal.com/pegasoft/intro
          - generic [ref=e148]: Book a client call
      - generic [ref=e149]:
        - navigation [ref=e150]:
          - link "Services" [ref=e151] [cursor=pointer]:
            - /url: /services
            - generic [ref=e152]: Services
            - generic [ref=e153]:
              - img [ref=e154]
              - img [ref=e156]
          - link "Work" [ref=e158] [cursor=pointer]:
            - /url: /work
            - generic [ref=e159]: Work
            - generic [ref=e160]:
              - img [ref=e161]
              - img [ref=e163]
          - link "Studio" [ref=e165] [cursor=pointer]:
            - /url: /studio
            - generic [ref=e166]: Studio
            - generic [ref=e167]:
              - img [ref=e168]
              - img [ref=e170]
        - generic [ref=e172]:
          - generic [ref=e173]: PEGASOFT
          - generic [ref=e174]:
            - paragraph [ref=e175]: © 2026 Pegasoft
            - link "Privacy Policy" [ref=e176] [cursor=pointer]:
              - /url: /privacy
            - link "Concept Lab" [ref=e177] [cursor=pointer]:
              - /url: /work/concepts
            - link "Portfolio status" [ref=e178] [cursor=pointer]:
              - /url: /work/portfolio
  - button "Open Next.js Dev Tools" [ref=e184] [cursor=pointer]:
    - img [ref=e185]
  - alert [ref=e188]
```

# Test source

```ts
  558 |   const state = page.locator('[data-hero-reference-state]');
  559 |   await expect(state).toHaveAttribute(
  560 |     'data-hero-attempt-state',
  561 |     'loading-resources',
  562 |   );
  563 |   await page.waitForTimeout(15_100);
  564 |   await expect(state).toHaveAttribute(
  565 |     'data-hero-attempt-state',
  566 |     'loading-resources',
  567 |   );
  568 |   const observedAt = await page.evaluate(() => {
  569 |     const now = performance.now();
  570 |     document.dispatchEvent(new Event('visibilitychange'));
  571 |     return now;
  572 |   });
  573 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
  574 |     timeout: 1_000,
  575 |   });
  576 |   await retainFallbackTiming(state, testInfo, observedAt);
  577 |   await expectLoaderDoesNotBlock(page);
  578 | });
  579 | 
  580 | test('ready scene survives the loading deadline and settles reduced motion', async ({
  581 |   page,
  582 | }, testInfo) => {
  583 |   await page.goto('/');
  584 |   const state = page.locator('[data-hero-reference-state]');
  585 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  586 |   await page.waitForTimeout(15_100);
  587 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  588 |   await page.evaluate(() =>
  589 |     window.scrollTo({ top: 1200, behavior: 'instant' }),
  590 |   );
  591 |   await expect
  592 |     .poll(() =>
  593 |       page.evaluate(
  594 |         () =>
  595 |           (
  596 |             window as unknown as {
  597 |               __pegasoftHeroFrame: { frame: { target: number } };
  598 |             }
  599 |           ).__pegasoftHeroFrame.frame.target,
  600 |       ),
  601 |     )
  602 |     .toBeGreaterThan(0);
  603 |   await page.evaluate(() => {
  604 |     window
  605 |       .matchMedia('(prefers-reduced-motion: reduce)')
  606 |       .addEventListener(
  607 |         'change',
  608 |         () => Object.assign(window, { __s6MotionChangedAt: performance.now() }),
  609 |         { once: true },
  610 |       );
  611 |   });
  612 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  613 |   const settlement = await page.waitForFunction(
  614 |     () => {
  615 |       const w = window as unknown as {
  616 |         __s6MotionChangedAt?: number;
  617 |         __pegasoftHeroFrame?: {
  618 |           renderedAtMs?: number;
  619 |           frame: {
  620 |             frameId: number;
  621 |             target: number;
  622 |             rendered: { value: number };
  623 |           };
  624 |           appliedConsumers: Record<string, { frameId: number }>;
  625 |         };
  626 |       };
  627 |       const r = w.__pegasoftHeroFrame;
  628 |       if (
  629 |         !r?.renderedAtMs ||
  630 |         !w.__s6MotionChangedAt ||
  631 |         r.renderedAtMs < w.__s6MotionChangedAt ||
  632 |         Math.abs(r.frame.target - r.frame.rendered.value) > 1e-6
  633 |       )
  634 |         return false;
  635 |       if (
  636 |         !Object.values(r.appliedConsumers).length ||
  637 |         !Object.values(r.appliedConsumers).every(
  638 |           (c) => c.frameId === r.frame.frameId,
  639 |         )
  640 |       )
  641 |         return false;
  642 |       return {
  643 |         changedAtMs: w.__s6MotionChangedAt,
  644 |         renderedAtMs: r.renderedAtMs,
  645 |         elapsedMs: r.renderedAtMs - w.__s6MotionChangedAt,
  646 |         frameId: r.frame.frameId,
  647 |         target: r.frame.target,
  648 |         rendered: r.frame.rendered.value,
  649 |       };
  650 |     },
  651 |     undefined,
  652 |     // Retrieval may cross process boundaries; the measured product budget below stays 100ms.
  653 |     { polling: 10, timeout: 2_000 },
  654 |   );
  655 |   const settled = await settlement.jsonValue();
  656 |   if (!settled)
  657 |     throw new Error('No completed reduced-motion frame was observed');
> 658 |   expect(settled.elapsedMs).toBeLessThanOrEqual(100);
      |                             ^ Error: expect(received).toBeLessThanOrEqual(expected)
  659 |   await testInfo.attach('reduced-motion-settlement', {
  660 |     body: JSON.stringify(settled),
  661 |     contentType: 'application/json',
  662 |   });
  663 |   await expect(state).toHaveAttribute('data-hero-motion', 'reduced', {
  664 |     timeout: 100,
  665 |   });
  666 |   await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  667 |   await expect(state.locator('canvas')).toHaveCount(1);
  668 | });
  669 | 
  670 | test('route remount rejects abandoned resource and context callbacks', async ({
  671 |   page,
  672 | }) => {
  673 |   const errors = captureRuntimeErrors(page);
  674 |   await page.goto('/?__heroResourceDelayMs=5000');
  675 |   const state = page.locator('[data-hero-reference-state]');
  676 |   await expect(state).toHaveAttribute(
  677 |     'data-hero-attempt-state',
  678 |     'loading-resources',
  679 |   );
  680 |   const oldId = await state.getAttribute('data-hero-attempt-id');
  681 |   const oldCanvas = await state.locator('canvas').elementHandle();
  682 |   // Exercise client navigation while the old attempt still owns a pending timer.
  683 |   await page
  684 |     .locator('a[href="/services"]')
  685 |     .first()
  686 |     .evaluate((el) => (el as HTMLElement).click());
  687 |   await expect(page).toHaveURL(/\/services$/);
  688 |   await expect(state).toHaveCount(0);
  689 |   await page.goBack();
  690 |   await expect(state).toHaveAttribute(
  691 |     'data-hero-attempt-state',
  692 |     'loading-resources',
  693 |   );
  694 |   await expect(state).not.toHaveAttribute('data-hero-attempt-id', oldId ?? '');
  695 |   await oldCanvas!.evaluate((el) => {
  696 |     el.dispatchEvent(new Event('webglcontextrestored'));
  697 |     el.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  698 |   });
  699 |   await expect(state).toHaveAttribute(
  700 |     'data-hero-attempt-state',
  701 |     'loading-resources',
  702 |   );
  703 |   await waitForAttemptState(page, 'ready', 7_000);
  704 |   await expect(state.locator('canvas')).toHaveCount(1);
  705 |   await oldCanvas!.dispose();
  706 |   expectNoRuntimeErrors(errors);
  707 | });
  708 | 
  709 | test('successful capability probe with failed actual Canvas selects fallback', async ({
  710 |   page,
  711 | }, testInfo) => {
  712 |   await page.addInitScript(() => {
  713 |     const original = HTMLCanvasElement.prototype.getContext;
  714 |     let reject = true;
  715 |     Object.assign(window, {
  716 |       __s6AllowContext: () => {
  717 |         reject = false;
  718 |       },
  719 |     });
  720 |     HTMLCanvasElement.prototype.getContext = function (
  721 |       this: HTMLCanvasElement,
  722 |       ...args: Parameters<typeof original>
  723 |     ) {
  724 |       if (reject && this.isConnected && String(args[0]).startsWith('webgl'))
  725 |         return null;
  726 |       return original.apply(this, args);
  727 |     } as typeof original;
  728 |   });
  729 |   await page.goto('/');
  730 |   const state = page.locator('[data-hero-reference-state]');
  731 |   await expect(state).toHaveAttribute('data-hero-motion', 'full');
  732 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'fallback', {
  733 |     timeout: 1_000,
  734 |   });
  735 |   const timing = await state.evaluate((el) => ({
  736 |     start: Number(el.getAttribute('data-hero-attempt-started-at')),
  737 |     fallback: Number(el.getAttribute('data-hero-fallback-at')),
  738 |     elapsed: Number(el.getAttribute('data-hero-attempt-elapsed-ms')),
  739 |   }));
  740 |   expect(timing.start).toBeGreaterThan(0);
  741 |   expect(timing.fallback).toBeGreaterThanOrEqual(timing.start);
  742 |   expect(timing.elapsed).toBeCloseTo(timing.fallback - timing.start, 0);
  743 |   expect(timing.elapsed).toBeLessThanOrEqual(1_000);
  744 |   await testInfo.attach('init-failure-timing', {
  745 |     body: JSON.stringify(timing),
  746 |     contentType: 'application/json',
  747 |   });
  748 |   await expectUsefulLanding(page, state);
  749 |   await expectLoaderDoesNotBlock(page);
  750 |   const oldId = await state.getAttribute('data-hero-attempt-id');
  751 |   await page.evaluate(() =>
  752 |     (window as unknown as { __s6AllowContext(): void }).__s6AllowContext(),
  753 |   );
  754 |   await page.locator('a[href="/services"]').first().click();
  755 |   await expect(page).toHaveURL(/\/services$/);
  756 |   await page.goBack();
  757 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  758 |   await expect(state).not.toHaveAttribute('data-hero-attempt-id', oldId ?? '');
```