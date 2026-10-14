# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-alternatives.spec.ts >> never-resolving essential resources reach useful fallback at the finite deadline
- Location: src/hero-alternatives.spec.ts:460:5

# Error details

```
TimeoutError: page.waitForFunction: Timeout 16000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic:
        - img
        - img
        - img
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
        - generic [ref=e17]:
          - generic:
            - img
        - generic:
          - generic:
            - heading "The New Standard in Product Delivery" [level=1]:
              - generic: The New Standard
              - generic: in Product Delivery
            - paragraph:
              - generic: Design clarity. Production rigor.
              - generic: Pegasoft builds resilient digital products and brand systems that hold together in production.
          - button "scroll to discover our process" [ref=e18]:
            - generic [ref=e20]: scroll to discover our process
        - generic [ref=e24]:
          - generic [ref=e25]:
            - button "01 Signal becomes system" [expanded] [ref=e26]:
              - generic [ref=e28]: "01"
              - heading "Signal becomes system" [level=3] [ref=e29]
            - paragraph [ref=e34]: A loose product brief turns into an operating map with priorities, risks, acceptance criteria, and delivery intent before the build gets expensive.
          - generic [ref=e35]:
            - button "02 Interface logic takes shape" [ref=e36] [cursor=pointer]:
              - generic [ref=e38]: "02"
              - heading "Interface logic takes shape" [level=3] [ref=e39]
            - paragraph [ref=e41]: Pegasoft designs product flows, screen systems, motion rules, and design tokens that can survive handoff without turning fragile in code.
          - generic [ref=e42]:
            - button "03 Quality is engineered early" [ref=e43] [cursor=pointer]:
              - generic [ref=e45]: "03"
              - heading "Quality is engineered early" [level=3] [ref=e46]
            - paragraph [ref=e48]: Accessibility, performance posture, responsive behavior, and implementation guardrails are folded into the system before launch pressure starts to bend it.
          - generic [ref=e49]:
            - button "04 Proof stays honest" [ref=e50] [cursor=pointer]:
              - generic [ref=e52]: "04"
              - heading "Proof stays honest" [level=3] [ref=e53]
            - paragraph [ref=e55]: Concept Lab studies stay clearly labeled, client portfolio work stays earned, and the site tells the truth about what is exploratory versus approved.
        - generic [ref=e57]:
          - heading "Designed for ambitious studios, beyond presentation-only design workflows." [level=2] [ref=e58]:
            - text: Designed for ambitious studios,
            - text: beyond presentation-only design workflows.
          - generic [ref=e59]:
            - article [ref=e60]:
              - generic [ref=e64]:
                - heading "Rapid framing" [level=3] [ref=e65]
                - paragraph [ref=e66]: We shorten the distance between product intent and a buildable operating model.
            - article [ref=e67]:
              - generic [ref=e71]:
                - heading "Delivery-grade systems" [level=3] [ref=e72]
                - paragraph [ref=e73]: The design language is structured for implementation, not for static approval only.
            - article [ref=e74]:
              - generic [ref=e78]:
                - heading "Measured motion" [level=3] [ref=e79]
                - paragraph [ref=e80]: Interaction polish is treated like product behavior, with restraint, accessibility, and hierarchy.
            - article [ref=e81]:
              - generic [ref=e85]:
                - heading "Honest proof" [level=3] [ref=e86]
                - paragraph [ref=e87]: Concepts, real work, and capability claims stay cleanly separated so credibility holds.
      - generic [ref=e94]:
        - heading "Launch-grade standards across every release." [level=2] [ref=e95]:
          - generic [ref=e96]: Launch-grade standards
          - generic [ref=e97]: across every release.
        - paragraph [ref=e98]: Pegasoft treats design quality like operational quality. Motion, accessibility, implementation logic, and proof discipline are part of the system from the start.
        - link "Explore our work model" [ref=e100] [cursor=pointer]:
          - /url: /work
          - generic [ref=e101]: Explore our work model
      - generic [ref=e103]:
        - heading "How we work and how we deliver premium digital product systems." [level=2] [ref=e105]
        - generic [ref=e107]:
          - generic [ref=e108]:
            - button "How does Pegasoft start a new engagement?" [expanded] [ref=e109]:
              - generic [ref=e110]: How does Pegasoft start a new engagement?
              - img [ref=e112]
            - paragraph [ref=e115]: We begin by framing scope, product goals, and delivery risk together. That produces a decision map, experience direction, and quality bar before visual detail starts to outrun clarity.
          - generic [ref=e116]:
            - button "Does Pegasoft only design, or also support delivery?" [ref=e117]:
              - generic [ref=e118]: Does Pegasoft only design, or also support delivery?
              - img [ref=e120]
            - paragraph [ref=e122]: Delivery quality is part of the offer. We shape interface systems, implementation priorities, accessibility expectations, and release readiness so the work lands well beyond the prototype.
          - generic [ref=e123]:
            - button "How do you handle Concept Lab versus real portfolio work?" [ref=e124]:
              - generic [ref=e125]: How do you handle Concept Lab versus real portfolio work?
              - img [ref=e127]
            - paragraph [ref=e129]: Concept Lab studies are clearly presented as speculative explorations. Client and product portfolio work appears only when permission, assets, and source truth are approved.
          - generic [ref=e130]:
            - button "What kinds of teams are the best fit?" [ref=e131]:
              - generic [ref=e132]: What kinds of teams are the best fit?
              - img [ref=e134]
            - paragraph [ref=e136]: Pegasoft works best with founders, product teams, and premium digital businesses that care as much about shipping quality as they do about looking polished in the deck.
      - generic [ref=e137]:
        - heading "Build the next product with precision, and ship it without guesswork." [level=2] [ref=e138]:
          - generic [ref=e139]: Build the next product with precision,
          - generic [ref=e140]: and ship it without guesswork.
        - paragraph [ref=e141]: Pegasoft helps teams frame the product, shape the interface system, and protect delivery quality before launch pressure takes over.
        - link "Book a client call" [ref=e143] [cursor=pointer]:
          - /url: https://cal.com/pegasoft/intro
          - generic [ref=e144]: Book a client call
      - generic [ref=e145]:
        - navigation [ref=e146]:
          - link "Services" [ref=e147] [cursor=pointer]:
            - /url: /services
            - generic [ref=e148]: Services
            - generic [ref=e149]:
              - img [ref=e150]
              - img [ref=e152]
          - link "Work" [ref=e154] [cursor=pointer]:
            - /url: /work
            - generic [ref=e155]: Work
            - generic [ref=e156]:
              - img [ref=e157]
              - img [ref=e159]
          - link "Studio" [ref=e161] [cursor=pointer]:
            - /url: /studio
            - generic [ref=e162]: Studio
            - generic [ref=e163]:
              - img [ref=e164]
              - img [ref=e166]
        - generic [ref=e168]:
          - generic [ref=e169]: PEGASOFT
          - generic [ref=e170]:
            - paragraph [ref=e171]: © 2026 Pegasoft
            - link "Privacy Policy" [ref=e172] [cursor=pointer]:
              - /url: /privacy
            - link "Concept Lab" [ref=e173] [cursor=pointer]:
              - /url: /work/concepts
            - link "Portfolio status" [ref=e174] [cursor=pointer]:
              - /url: /work/portfolio
  - button "Open Next.js Dev Tools" [ref=e180] [cursor=pointer]:
    - img [ref=e181]
  - alert [ref=e184]
```

# Test source

```ts
  138 |         (element) => element === element.ownerDocument.activeElement,
  139 |       )
  140 |     ) {
  141 |       return;
  142 |     }
  143 |   }
  144 | 
  145 |   await expect(
  146 |     target,
  147 |     `Expected keyboard focus within ${maximumPresses} Tab presses`,
  148 |   ).toBeFocused();
  149 | }
  150 | 
  151 | async function expectKeyboardNavigation(page: Page) {
  152 |   const isMobile = (page.viewportSize()?.width ?? 1280) <= 820;
  153 | 
  154 |   if (!isMobile) {
  155 |     const servicesLink = page
  156 |       .getByRole('navigation', { name: 'Primary links' })
  157 |       .getByRole('link', { name: 'Services', exact: true });
  158 | 
  159 |     await expect(servicesLink).toBeVisible();
  160 |     await tabTo(page, servicesLink);
  161 |     await expect(servicesLink).toBeFocused();
  162 |     return;
  163 |   }
  164 | 
  165 |   const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  166 |   await expect(menuButton).toBeVisible();
  167 |   await tabTo(page, menuButton);
  168 |   await expect(menuButton).toBeFocused();
  169 |   await page.keyboard.press('Enter');
  170 |   await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  171 | 
  172 |   const mobileNavigation = page.getByRole('navigation', {
  173 |     name: 'Mobile navigation',
  174 |   });
  175 |   const servicesLink = mobileNavigation.getByRole('link', {
  176 |     name: 'Services',
  177 |     exact: true,
  178 |   });
  179 | 
  180 |   await expect(mobileNavigation).toHaveClass(/\bis-open\b/u);
  181 |   await expect(servicesLink).toBeVisible();
  182 |   await tabTo(page, servicesLink);
  183 |   await expect(servicesLink).toBeFocused();
  184 | }
  185 | 
  186 | async function readStateSignature(state: Locator) {
  187 |   return state.evaluate((element) => ({
  188 |     directEntry: element.getAttribute('data-hero-direct-entry'),
  189 |     motion: element.getAttribute('data-hero-motion'),
  190 |     pointerTrail: element.getAttribute('data-hero-pointer-trail'),
  191 |     profile: element.getAttribute('data-hero-profile'),
  192 |     referenceState: element.getAttribute('data-hero-reference-state'),
  193 |     sceneProgress: element.getAttribute('data-hero-scene-progress'),
  194 |     seed: element.getAttribute('data-hero-seed'),
  195 |     step: element.getAttribute('data-hero-step'),
  196 |     surface: element
  197 |       .querySelector('[data-hero-surface]')
  198 |       ?.getAttribute('data-hero-surface'),
  199 |   }));
  200 | }
  201 | 
  202 | function expectNoRuntimeErrors(errors: RuntimeErrors) {
  203 |   expect(errors.page, 'uncaught page errors').toEqual([]);
  204 |   expect(errors.console, 'console and hydration errors').toEqual([]);
  205 | }
  206 | 
  207 | async function retainFallbackTiming(
  208 |   state: Locator,
  209 |   info: TestInfo,
  210 |   observedAt?: number,
  211 | ) {
  212 |   const timing = await state.evaluate((el) => ({
  213 |     startedAtMs: Number(el.getAttribute('data-hero-attempt-started-at')),
  214 |     fallbackAtMs: Number(el.getAttribute('data-hero-fallback-at')),
  215 |     elapsedMs: Number(el.getAttribute('data-hero-attempt-elapsed-ms')),
  216 |   }));
  217 |   const responseMs =
  218 |     observedAt === undefined
  219 |       ? timing.elapsedMs
  220 |       : timing.fallbackAtMs - observedAt;
  221 |   expect(responseMs).toBeGreaterThanOrEqual(0);
  222 |   expect(responseMs).toBeLessThanOrEqual(
  223 |     observedAt === undefined ? 16_000 : 1_000,
  224 |   );
  225 |   await info.attach('fallback-timing', {
  226 |     body: JSON.stringify({ ...timing, observedAt, responseMs }),
  227 |     contentType: 'application/json',
  228 |   });
  229 | }
  230 | 
  231 | // Observe the transition in the browser rather than spending the assertion
  232 | // budget on repeated protocol/locator snapshots of a GPU-backed page.
  233 | async function waitForAttemptState(
  234 |   page: Page,
  235 |   expected: 'loading-resources' | 'ready' | 'fallback',
  236 |   timeout: number,
  237 | ) {
> 238 |   const observed = await page.waitForFunction(
      |                               ^ TimeoutError: page.waitForFunction: Timeout 16000ms exceeded.
  239 |     (expectedState) => {
  240 |       const scene = document.querySelector('[data-hero-reference-state]');
  241 |       return scene?.getAttribute('data-hero-attempt-state') === expectedState;
  242 |     },
  243 |     expected,
  244 |     { polling: 50, timeout },
  245 |   );
  246 |   await observed.dispose();
  247 | }
  248 | 
  249 | test('reduced motion is useful, non-blocking, deterministic, and keyboard reachable', async ({
  250 |   page,
  251 | }) => {
  252 |   const errors = captureRuntimeErrors(page);
  253 | 
  254 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  255 |   await page.goto(HERO_URL);
  256 | 
  257 |   const state = await waitForNamedHeroState(page);
  258 |   await expect(state).toHaveAttribute('data-hero-motion', 'reduced');
  259 |   await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  260 |   await expectUsefulLanding(page, state);
  261 |   await expectLoaderDoesNotBlock(page);
  262 | 
  263 |   const firstSignature = await readStateSignature(state);
  264 |   await page.reload();
  265 |   const reloadedState = await waitForNamedHeroState(page);
  266 |   const secondSignature = await readStateSignature(reloadedState);
  267 | 
  268 |   expect(secondSignature).toEqual(firstSignature);
  269 |   await expectKeyboardNavigation(page);
  270 |   expectNoRuntimeErrors(errors);
  271 | });
  272 | 
  273 | test('forced WebGL fallback is useful, non-blocking, deterministic, and keyboard reachable', async ({
  274 |   page,
  275 | }) => {
  276 |   const errors = captureRuntimeErrors(page);
  277 | 
  278 |   await page.goto(`${HERO_URL}&__heroFallback=1`);
  279 | 
  280 |   const state = await waitForNamedHeroState(page);
  281 |   await expect(state).toHaveAttribute('data-hero-motion', 'static');
  282 |   await expect(state).toHaveAttribute('data-hero-render-ready', 'false');
  283 |   await expect(state).toHaveAttribute('data-hero-fallback-ready', 'true');
  284 |   await expect(state).toHaveAttribute('data-hero-pointer-trail', 'false');
  285 |   await expect(
  286 |     state.locator(
  287 |       `[data-hero-surface="fallback"][data-hero-fallback-state="${REFERENCE_STATE}"]`,
  288 |     ),
  289 |   ).toBeVisible();
  290 |   await expect(state.locator('[data-hero-fallback-shape]')).toHaveCount(4);
  291 |   await expectUsefulLanding(page, state);
  292 |   await expectLoaderDoesNotBlock(page);
  293 | 
  294 |   const firstSignature = await readStateSignature(state);
  295 |   await page.reload();
  296 |   const reloadedState = await waitForNamedHeroState(page);
  297 |   const secondSignature = await readStateSignature(reloadedState);
  298 | 
  299 |   expect(secondSignature).toEqual(firstSignature);
  300 |   await expectKeyboardNavigation(page);
  301 |   expectNoRuntimeErrors(errors);
  302 | });
  303 | 
  304 | test('active Canvas context loss latches useful fallback and unlocks the page', async ({
  305 |   page,
  306 | }, testInfo) => {
  307 |   const errors = captureRuntimeErrors(page);
  308 |   await page.goto(HERO_URL);
  309 | 
  310 |   const state = await waitForNamedHeroState(page);
  311 |   await expect(state).toHaveAttribute('data-hero-attempt-state', 'ready');
  312 |   const canvas = state.locator('canvas');
  313 |   await expect(canvas).toBeVisible();
  314 |   const observedAt = await canvas.evaluate(
  315 |     (element) =>
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
```