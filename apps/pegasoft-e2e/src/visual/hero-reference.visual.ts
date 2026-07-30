import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REFERENCE_STATES = [
  'loader-mark',
  'world-reveal',
  'landing',
  'landing-idle',
  'activation-route',
  'activation-contact',
  'clearance-travel',
  'clearance-field-preview',
  'field-approach',
  'field-contact',
  'field-pulse-a',
  'field-pulse-b',
  'arrival-travel',
  'arrival-lockup',
  'journey-exit',
] as const;

type ReferenceStateKey = (typeof REFERENCE_STATES)[number];

const LOCAL_TIME_MS: Partial<Record<ReferenceStateKey, number>> = {
  'loader-mark': 2000,
  'world-reveal': 3500,
  landing: 0,
  'landing-idle': 2500,
  'field-contact': 0,
  'field-pulse-a': 300,
  'field-pulse-b': 2800,
  'arrival-travel': 300,
  'arrival-lockup': 0,
  'journey-exit': 1000,
};

const outputRoot = path.resolve(
  process.cwd(),
  'test-output/hero-reference/recording',
);

function createStateQuery(stateKey: ReferenceStateKey) {
  const query = new URLSearchParams({
    __heroState: stateKey,
  });
  const localTime = LOCAL_TIME_MS[stateKey];
  if (localTime !== undefined) {
    query.set('__heroTime', String(localTime));
  }

  return query.toString();
}

async function waitForSettledDirectState(
  page: Page,
  stateKey: ReferenceStateKey,
) {
  const root = page.locator(
    `[data-hero-reference-state="${stateKey}"][data-hero-direct-entry="true"]`,
  );

  await expect(root).toHaveCount(1);
  await expect(root).toHaveAttribute('data-hero-render-ready', 'true');
  await expect(root.locator('[data-hero-surface]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (stateKey === 'journey-exit') {
    await page.evaluate(() => {
      const nextSection = document.querySelector<HTMLElement>(
        '[data-hero-next-section]',
      );
      if (!nextSection) {
        throw new Error('Hero exit capture requires the following section');
      }

      window.scrollBy({
        top:
          nextSection.getBoundingClientRect().top -
          window.innerHeight * (367.5 / 761),
        behavior: 'auto',
      });
    });
  }
  await page.locator('nextjs-portal').evaluateAll((portals) => {
    portals.forEach((portal) => portal.remove());
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  return root;
}

async function measurePage(page: Page, stateKey: ReferenceStateKey) {
  return page.evaluate((key) => {
    const serializeBounds = (bounds: DOMRect) => ({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      normalized: {
        x: bounds.x / window.innerWidth,
        y: bounds.y / window.innerHeight,
        width: bounds.width / window.innerWidth,
        height: bounds.height / window.innerHeight,
      },
    });
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        return null;
      }

      return serializeBounds(element.getBoundingClientRect());
    };
    const root = document.querySelector<HTMLElement>(
      `[data-hero-reference-state="${key}"]`,
    );
    const shell = document.querySelector<HTMLElement>('[data-hero-shell]');
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-hero-surface] canvas',
    );
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    let canvasCenterPixel: number[] | null = null;
    let webglContextLost: boolean | null = null;

    if (canvas) {
      const context =
        canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (context) {
        const pixel = new Uint8Array(4);
        context.readPixels(
          Math.floor(context.drawingBufferWidth / 2),
          Math.floor(context.drawingBufferHeight / 2),
          1,
          1,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixel,
        );
        canvasCenterPixel = [...pixel];
        webglContextLost = context.isContextLost();
      }
    }

    return {
      stateKey: key,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
      },
      state: root
        ? Object.fromEntries(
            [...root.attributes]
              .filter((attribute) => attribute.name.startsWith('data-hero-'))
              .map((attribute) => [attribute.name, attribute.value]),
          )
        : null,
      cssVariables: shell
        ? {
            heroExitProgress:
              shell.style.getPropertyValue('--hero-exit-progress'),
            heroFadeProgress:
              shell.style.getPropertyValue('--hero-fade-progress'),
            flowRevealProgress:
              shell.style.getPropertyValue('--flow-reveal-progress'),
            fieldVisibility:
              shell.style.getPropertyValue('--field-visibility'),
          }
        : null,
      renderSurface: canvasStyle
        ? {
            opacity: canvasStyle.opacity,
            visibility: canvasStyle.visibility,
            display: canvasStyle.display,
            backgroundColor: canvasStyle.backgroundColor,
            width: canvas?.width ?? null,
            height: canvas?.height ?? null,
            centerPixel: canvasCenterPixel,
            webglContextLost,
          }
        : null,
      bounds: {
        header: rect('header.pegasoft-header'),
        headerLogo: rect('header.pegasoft-header .pegasoft-header__logo'),
        headerLogoLink: rect(
          'header.pegasoft-header .pegasoft-header__logo > a',
        ),
        headerLogoGraphic: rect(
          'header.pegasoft-header .pegasoft-header__logo > a > svg',
        ),
        headerNavLeft: rect(
          'header.pegasoft-header .pegasoft-header__nav-left',
        ),
        headerPrimaryFirst: rect(
          'header.pegasoft-header .pegasoft-header__nav-left > a:nth-of-type(1)',
        ),
        headerPrimarySecond: rect(
          'header.pegasoft-header .pegasoft-header__nav-left > a:nth-of-type(2)',
        ),
        headerNavRight: rect(
          'header.pegasoft-header .pegasoft-header__nav-right',
        ),
        headerCtaFirst: rect(
          'header.pegasoft-header .pegasoft-header__nav-right .pegasoft-header__ctas > a:nth-of-type(1)',
        ),
        headerCtaSecond: rect(
          'header.pegasoft-header .pegasoft-header__nav-right .pegasoft-header__ctas > a:nth-of-type(2)',
        ),
        landingCopy: rect('[data-hero-copy="landing"]'),
        landingContent: rect('[data-hero-copy="landing"] > div'),
        landingTitle: rect('[data-hero-copy="landing"] h1'),
        landingSubtitle: rect('[data-hero-copy="landing"] p'),
        scrollCue: rect('[data-hero-copy="landing"] button'),
        process: rect('[data-hero-process]'),
        nextSection: rect('[data-hero-next-section]'),
        activeProcessStep: rect(
          '[data-hero-process-step][data-active="true"]',
        ),
        canvas: rect('[data-hero-surface] canvas'),
        fallback: rect('[data-hero-surface="fallback"]'),
      },
      processSteps: [
        ...document.querySelectorAll<HTMLElement>('[data-hero-process-step]'),
      ].map((step) => {
        const childBounds = (selector: string) => {
          const element = step.querySelector<HTMLElement>(selector);
          return element
            ? serializeBounds(element.getBoundingClientRect())
            : null;
        };

        return {
          active: step.dataset['active'] === 'true',
          bounds: serializeBounds(step.getBoundingClientRect()),
          header: childBounds(':scope > button'),
          number: childBounds(':scope > button > div'),
          title: childBounds(':scope > button > h3'),
          body: childBounds(':scope > div'),
          description: childBounds(':scope > div p'),
        };
      }),
    };
  }, stateKey);
}

test.beforeAll(async () => {
  await mkdir(path.join(outputRoot, 'implementation'), { recursive: true });
  await mkdir(path.join(outputRoot, 'measurements'), { recursive: true });
});

for (const stateKey of REFERENCE_STATES) {
  test(`capture ${stateKey} at the recording profile`, async ({ page }) => {
    await page.goto(`/?${createStateQuery(stateKey)}`, {
      waitUntil: 'domcontentloaded',
    });
    const stateRoot = await waitForSettledDirectState(page, stateKey);
    await expect(stateRoot).toHaveAttribute(
      'data-hero-reference-state',
      stateKey,
    );

    const imagePath = path.join(
      outputRoot,
      'implementation',
      `${stateKey}.png`,
    );
    const measurementPath = path.join(
      outputRoot,
      'measurements',
      `${stateKey}.json`,
    );

    await page.screenshot({
      path: imagePath,
      animations: 'disabled',
      scale: 'device',
    });
    await writeFile(
      measurementPath,
      `${JSON.stringify(await measurePage(page, stateKey), null, 2)}\n`,
      'utf8',
    );
  });
}
