# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-alternatives.spec.ts >> successful capability probe with failed actual Canvas selects fallback
- Location: src/hero-alternatives.spec.ts:709:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href="/services"]').first()
    - locator resolved to <a href="/services">Services</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - link "PEGASOFT" [ref=e6] [cursor=pointer]:
          - /url: /
        - button "Toggle menu" [ref=e8]:
          - img [ref=e9]
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
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic:
            - img
        - generic:
          - generic:
            - heading "The New Standard in Product Delivery" [level=1]:
              - generic: The New Standard
              - generic: in Product Delivery
            - paragraph: Design clarity. Production rigor.Pegasoft builds resilient digital products and brand systems that hold together in production.
          - button "scroll to discover our process" [ref=e12]:
            - generic [ref=e14]: scroll to discover our process
        - generic [ref=e18]:
          - generic [ref=e19]:
            - button "01 Signal becomes system" [expanded] [ref=e20]:
              - generic [ref=e22]: "01"
              - heading "Signal becomes system" [level=3] [ref=e23]
            - paragraph [ref=e28]: A loose product brief turns into an operating map with priorities, risks, acceptance criteria, and delivery intent before the build gets expensive.
          - generic [ref=e29]:
            - button "02 Interface logic takes shape" [ref=e30] [cursor=pointer]:
              - generic [ref=e32]: "02"
              - heading "Interface logic takes shape" [level=3] [ref=e33]
            - paragraph [ref=e35]: Pegasoft designs product flows, screen systems, motion rules, and design tokens that can survive handoff without turning fragile in code.
          - generic [ref=e36]:
            - button "03 Quality is engineered early" [ref=e37] [cursor=pointer]:
              - generic [ref=e39]: "03"
              - heading "Quality is engineered early" [level=3] [ref=e40]
            - paragraph [ref=e42]: Accessibility, performance posture, responsive behavior, and implementation guardrails are folded into the system before launch pressure starts to bend it.
          - generic [ref=e43]:
            - button "04 Proof stays honest" [ref=e44] [cursor=pointer]:
              - generic [ref=e46]: "04"
              - heading "Proof stays honest" [level=3] [ref=e47]
            - paragraph [ref=e49]: Concept Lab studies stay clearly labeled, client portfolio work stays earned, and the site tells the truth about what is exploratory versus approved.
        - generic [ref=e51]:
          - heading "Designed for ambitious studios, beyond presentation-only design workflows." [level=2] [ref=e52]
          - generic [ref=e53]:
            - article [ref=e54]:
              - generic [ref=e58]:
                - heading "Rapid framing" [level=3] [ref=e59]
                - paragraph [ref=e60]: We shorten the distance between product intent and a buildable operating model.
            - article [ref=e61]:
              - generic [ref=e65]:
                - heading "Delivery-grade systems" [level=3] [ref=e66]
                - paragraph [ref=e67]: The design language is structured for implementation, not for static approval only.
            - article [ref=e68]:
              - generic [ref=e72]:
                - heading "Measured motion" [level=3] [ref=e73]
                - paragraph [ref=e74]: Interaction polish is treated like product behavior, with restraint, accessibility, and hierarchy.
            - article [ref=e75]:
              - generic [ref=e79]:
                - heading "Honest proof" [level=3] [ref=e80]
                - paragraph [ref=e81]: Concepts, real work, and capability claims stay cleanly separated so credibility holds.
      - generic [ref=e88]:
        - heading "Launch-grade standards across every release." [level=2] [ref=e89]:
          - generic [ref=e90]: Launch-grade standards
          - generic [ref=e91]: across every release.
        - paragraph [ref=e92]: Pegasoft treats design quality like operational quality. Motion, accessibility, implementation logic, and proof discipline are part of the system from the start.
        - link "Explore our work model" [ref=e94] [cursor=pointer]:
          - /url: /work
          - generic [ref=e95]: Explore our work model
      - generic [ref=e97]:
        - heading "How we work and how we deliver premium digital product systems." [level=2] [ref=e99]
        - generic [ref=e101]:
          - generic [ref=e102]:
            - button "How does Pegasoft start a new engagement?" [expanded] [ref=e103]:
              - generic [ref=e104]: How does Pegasoft start a new engagement?
              - img [ref=e106]
            - paragraph [ref=e109]: We begin by framing scope, product goals, and delivery risk together. That produces a decision map, experience direction, and quality bar before visual detail starts to outrun clarity.
          - generic [ref=e110]:
            - button "Does Pegasoft only design, or also support delivery?" [ref=e111]:
              - generic [ref=e112]: Does Pegasoft only design, or also support delivery?
              - img [ref=e114]
            - paragraph [ref=e116]: Delivery quality is part of the offer. We shape interface systems, implementation priorities, accessibility expectations, and release readiness so the work lands well beyond the prototype.
          - generic [ref=e117]:
            - button "How do you handle Concept Lab versus real portfolio work?" [ref=e118]:
              - generic [ref=e119]: How do you handle Concept Lab versus real portfolio work?
              - img [ref=e121]
            - paragraph [ref=e123]: Concept Lab studies are clearly presented as speculative explorations. Client and product portfolio work appears only when permission, assets, and source truth are approved.
          - generic [ref=e124]:
            - button "What kinds of teams are the best fit?" [ref=e125]:
              - generic [ref=e126]: What kinds of teams are the best fit?
              - img [ref=e128]
            - paragraph [ref=e130]: Pegasoft works best with founders, product teams, and premium digital businesses that care as much about shipping quality as they do about looking polished in the deck.
      - generic [ref=e131]:
        - heading "Build the next product with precision,and ship it without guesswork." [level=2] [ref=e132]
        - paragraph [ref=e133]: Pegasoft helps teams frame the product, shape the interface system, and protect delivery quality before launch pressure takes over.
        - link "Book a client call" [ref=e135] [cursor=pointer]:
          - /url: https://cal.com/pegasoft/intro
          - generic [ref=e136]: Book a client call
      - generic [ref=e137]:
        - navigation [ref=e138]:
          - link "Services" [ref=e139] [cursor=pointer]:
            - /url: /services
            - generic [ref=e140]: Services
            - generic [ref=e141]:
              - img [ref=e142]
              - img [ref=e144]
          - link "Work" [ref=e146] [cursor=pointer]:
            - /url: /work
            - generic [ref=e147]: Work
            - generic [ref=e148]:
              - img [ref=e149]
              - img [ref=e151]
          - link "Studio" [ref=e153] [cursor=pointer]:
            - /url: /studio
            - generic [ref=e154]: Studio
            - generic [ref=e155]:
              - img [ref=e156]
              - img [ref=e158]
        - generic [ref=e160]:
          - generic [ref=e161]: PEGASOFT
          - generic [ref=e162]:
            - paragraph [ref=e163]: © 2026 Pegasoft
            - link "Privacy Policy" [ref=e164] [cursor=pointer]:
              - /url: /privacy
            - link "Concept Lab" [ref=e165] [cursor=pointer]:
              - /url: /work/concepts
            - link "Portfolio status" [ref=e166] [cursor=pointer]:
              - /url: /work/portfolio
  - generic [ref=e171] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e172]:
      - img [ref=e173]
    - generic [ref=e176]:
      - button "Open issues overlay" [ref=e177]:
        - generic [ref=e178]:
          - generic [ref=e179]: "0"
          - generic [ref=e180]: "1"
        - generic [ref=e181]: Issue
      - button "Collapse issues badge" [ref=e182]:
        - img [ref=e183]
  - alert [ref=e185]
```

# Test source

```ts
  654 |   );
  655 |   const settled = await settlement.jsonValue();
  656 |   if (!settled)
  657 |     throw new Error('No completed reduced-motion frame was observed');
  658 |   expect(settled.elapsedMs).toBeLessThanOrEqual(100);
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
> 754 |   await page.locator('a[href="/services"]').first().click();
      |                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  755 |   await expect(page).toHaveURL(/\/services$/);
  756 |   await page.goBack();
  757 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  758 |   await expect(state).not.toHaveAttribute('data-hero-attempt-id', oldId ?? '');
  759 |   await expect(state.locator('canvas')).toHaveCount(1);
  760 | });
  761 | 
  762 | for (const profile of [
  763 |   { name: 'recording-desktop', width: 1508, height: 761 },
  764 |   { name: 'desktop', width: 1440, height: 900 },
  765 |   { name: 'tablet', width: 1024, height: 768 },
  766 |   { name: 'mobile', width: 390, height: 844 },
  767 | ]) {
  768 |   test(`ordinary entry visible ink, cue, CTA and accessibility: ${profile.name}`, async ({
  769 |     page,
  770 |   }, testInfo) => {
  771 |     const errors = captureRuntimeErrors(page);
  772 |     await page.setViewportSize({
  773 |       width: profile.width,
  774 |       height: profile.height,
  775 |     });
  776 |     await page.goto('/');
  777 |     await page.evaluate(() => document.fonts.ready);
  778 |     const state = page.locator('[data-hero-reference-state]');
  779 |     await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  780 |     await expect(state).toHaveAttribute('data-hero-direct-entry', 'false');
  781 |     await expectLoaderDoesNotBlock(page);
  782 |     const title = page.locator('[data-hero-copy="landing"] h1');
  783 |     const cue = page.getByRole('button', {
  784 |       name: 'scroll to discover our process',
  785 |     });
  786 |     await expect(title).toBeVisible();
  787 |     await expect(cue).toBeVisible();
  788 |     // Allow the ordinary presentation's existing entry animation to settle.
  789 |     await expect
  790 |       .poll(() =>
  791 |         cue.locator('span span').evaluate((el) => getComputedStyle(el).opacity),
  792 |       )
  793 |       .toBe('1');
  794 |     const measure = async (locator: Locator) =>
  795 |       locator.evaluate((element) => {
  796 |         const range = document.createRange();
  797 |         range.selectNodeContents(element);
  798 |         const rects = [...range.getClientRects()].filter(
  799 |           (r) => r.width > 0 && r.height > 0,
  800 |         );
  801 |         const lines = [...new Set(rects.map((r) => Math.round(r.top)))];
  802 |         const clips: string[] = [];
  803 |         for (
  804 |           let ancestor: Element | null = element;
  805 |           ancestor;
  806 |           ancestor = ancestor.parentElement
  807 |         ) {
  808 |           const style = getComputedStyle(ancestor);
  809 |           if (style.visibility === 'hidden' || Number(style.opacity) === 0)
  810 |             clips.push('invisible ancestor');
  811 |           if (/(hidden|clip)/.test(style.overflowX + style.overflowY)) {
  812 |             const box = ancestor.getBoundingClientRect();
  813 |             if (
  814 |               rects.some(
  815 |                 (r) =>
  816 |                   r.left < box.left - 1 ||
  817 |                   r.right > box.right + 1 ||
  818 |                   r.top < box.top - 1 ||
  819 |                   r.bottom > box.bottom + 1,
  820 |               )
  821 |             )
  822 |               clips.push(ancestor.tagName);
  823 |           }
  824 |         }
  825 |         return {
  826 |           text: element.textContent,
  827 |           lines: lines.length,
  828 |           clips,
  829 |           rects: rects.map((r) => ({
  830 |             x: r.x,
  831 |             y: r.y,
  832 |             width: r.width,
  833 |             height: r.height,
  834 |           })),
  835 |         };
  836 |       });
  837 |     await expect
  838 |       .poll(() =>
  839 |         cue
  840 |           .locator('span span')
  841 |           .evaluate((el) =>
  842 |             Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42),
  843 |           ),
  844 |       )
  845 |       .toBeLessThan(0.1);
  846 |     const titleInk = await measure(title);
  847 |     const cueInk = await measure(cue.locator('span span'));
  848 |     await testInfo.attach('landing-ink', {
  849 |       body: JSON.stringify({ profile, titleInk, cueInk }),
  850 |       contentType: 'application/json',
  851 |     });
  852 |     await page.screenshot({
  853 |       path: testInfo.outputPath('ordinary-landing.png'),
  854 |     });
```