import { expect, test, type Page } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { measureScreenComposition } from './screen-composition.mjs';
import {
  FIELD_CONTACT_CENTER_CONFIG_BY_STATE,
  FIELD_TILE_PROFILE_CONFIG_BY_STATE,
  IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE,
  JOURNEY_EXIT_BOUNDARY_CONFIG,
  LANDMARK_CONFIG_BY_STATE,
  LANDING_COPY_CONFIG,
  PROCESS_COPY_CONFIG,
  ROUTE_CONFIG_BY_STATE,
  measureChromaFeature,
  measureCopyInk,
  measureFieldTileProfile,
  measureHorizontalBoundary,
  measureLandmarkFeature,
} from './screen-structural-features.mjs';

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

const COPY_CONFIG_BY_STATE: Partial<
  Record<
    ReferenceStateKey,
    typeof LANDING_COPY_CONFIG | typeof PROCESS_COPY_CONFIG
  >
> = {
  landing: LANDING_COPY_CONFIG,
  'landing-idle': LANDING_COPY_CONFIG,
  'activation-route': PROCESS_COPY_CONFIG,
  'activation-contact': PROCESS_COPY_CONFIG,
  'clearance-travel': PROCESS_COPY_CONFIG,
  'clearance-field-preview': PROCESS_COPY_CONFIG,
  'field-approach': PROCESS_COPY_CONFIG,
  'field-contact': PROCESS_COPY_CONFIG,
  'field-pulse-a': PROCESS_COPY_CONFIG,
  'field-pulse-b': PROCESS_COPY_CONFIG,
  'arrival-lockup': PROCESS_COPY_CONFIG,
};

type RouteConfig =
  (typeof ROUTE_CONFIG_BY_STATE)[keyof typeof ROUTE_CONFIG_BY_STATE];

const ROUTE_CONFIGS: Partial<Record<ReferenceStateKey, RouteConfig>> =
  ROUTE_CONFIG_BY_STATE;

type LandmarkConfig =
  (typeof LANDMARK_CONFIG_BY_STATE)[keyof typeof LANDMARK_CONFIG_BY_STATE];

const LANDMARK_CONFIGS: Partial<Record<ReferenceStateKey, LandmarkConfig>> =
  LANDMARK_CONFIG_BY_STATE;

type FieldTileProfileConfig =
  (typeof FIELD_TILE_PROFILE_CONFIG_BY_STATE)[keyof typeof FIELD_TILE_PROFILE_CONFIG_BY_STATE];

const FIELD_TILE_PROFILE_CONFIGS: Partial<
  Record<ReferenceStateKey, FieldTileProfileConfig>
> = FIELD_TILE_PROFILE_CONFIG_BY_STATE;

type FieldContactCenterConfig =
  (typeof FIELD_CONTACT_CENTER_CONFIG_BY_STATE)[keyof typeof FIELD_CONTACT_CENTER_CONFIG_BY_STATE];

const FIELD_CONTACT_CENTER_CONFIGS: Partial<
  Record<ReferenceStateKey, FieldContactCenterConfig>
> = FIELD_CONTACT_CENTER_CONFIG_BY_STATE;

const outputRoot = path.resolve(
  process.cwd(),
  'test-output/hero-reference/recording',
);
const implementationRoot = path.join(outputRoot, 'implementation');
const measurementRoot = path.join(outputRoot, 'measurements');
const comparisonRoot = path.join(outputRoot, 'comparisons');
const comparisonReportPath = path.join(outputRoot, 'comparison-report.json');
const captureManifestPath = path.join(outputRoot, 'capture-manifest.json');
const captureManifestTemporaryPath = path.join(
  outputRoot,
  '.capture-manifest.json.tmp',
);
const generatedOutputPaths = [
  implementationRoot,
  measurementRoot,
  comparisonRoot,
  comparisonReportPath,
  captureManifestPath,
  captureManifestTemporaryPath,
] as const;

type RuntimeErrors = {
  console: string[];
  first: Promise<string>;
  page: string[];
};

let captureRunId = '';
let captureRunStartedAt = '';
const capturedStates = new Set<ReferenceStateKey>();

function captureRuntimeErrors(page: Page): RuntimeErrors {
  let reportFirstError: (message: string) => void = () => undefined;
  const errors: RuntimeErrors = {
    console: [],
    first: new Promise<string>((resolve) => {
      reportFirstError = resolve;
    }),
    page: [],
  };

  page.on('pageerror', (error) => {
    const message = error.stack ?? error.message;
    errors.page.push(message);
    reportFirstError(`pageerror: ${message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      errors.console.push(text);
      reportFirstError(`console.error: ${text}`);
    }
  });

  return errors;
}

async function installWebGlContextLossMonitor(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener(
      'webglcontextlost',
      (event) => {
        const statusMessage =
          'statusMessage' in event && typeof event.statusMessage === 'string'
            ? event.statusMessage
            : '';
        console.error(
          `HERO_CAPTURE_WEBGL_CONTEXT_LOST${
            statusMessage ? `: ${statusMessage}` : ''
          }`,
        );
      },
      true,
    );
  });
}

function expectNoRuntimeErrors(
  errors: RuntimeErrors,
  stateKey: ReferenceStateKey,
) {
  expect(
    {
      console: errors.console,
      page: errors.page,
    },
    `${stateKey}: hero capture emitted browser runtime errors`,
  ).toEqual({
    console: [],
    page: [],
  });
}

async function createArtifactEvidence(relativePath: string) {
  const artifact = await readFile(path.join(outputRoot, relativePath));

  return {
    path: relativePath,
    bytes: artifact.byteLength,
    sha256: createHash('sha256').update(artifact).digest('hex'),
  };
}

async function measureImplementationStructure(
  imagePath: string,
  stateKey: ReferenceStateKey,
  devicePixelRatio: number,
) {
  const { data, info } = await sharp(imagePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { measurement: screenComposition } = measureScreenComposition({
    data,
    image: info,
    dpr: devicePixelRatio,
  });

  if (screenComposition.status !== 'observed') {
    throw new Error(`${stateKey}: ${screenComposition.reason}`);
  }

  const sourceArtifact = path.posix.join('implementation', `${stateKey}.png`);
  const withSourceArtifact = <T extends object>(measurement: T) => ({
    ...measurement,
    sourceArtifact,
  });
  const landmarkConfig = LANDMARK_CONFIGS[stateKey];
  const semanticLandmarkBlocker =
    IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE[
      stateKey as keyof typeof IMPLEMENTATION_SEMANTIC_LANDMARK_BLOCKERS_BY_STATE
    ];
  const landmark = landmarkConfig
    ? withSourceArtifact(
        measureLandmarkFeature({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: landmarkConfig,
        }).measurement,
      )
    : semanticLandmarkBlocker
      ? withSourceArtifact(semanticLandmarkBlocker)
      : undefined;
  const copyConfig = COPY_CONFIG_BY_STATE[stateKey];
  const routeConfig = ROUTE_CONFIGS[stateKey];
  const fieldTileProfileConfig = FIELD_TILE_PROFILE_CONFIGS[stateKey];
  const fieldContactCenterConfig = FIELD_CONTACT_CENTER_CONFIGS[stateKey];
  const route = routeConfig
    ? withSourceArtifact(
        measureChromaFeature({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: routeConfig,
        }).measurement,
      )
    : undefined;
  const copy = copyConfig
    ? withSourceArtifact(
        measureCopyInk({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: copyConfig,
        }).measurement,
      )
    : undefined;
  const fieldProfile = fieldTileProfileConfig
    ? withSourceArtifact(
        measureFieldTileProfile({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: fieldTileProfileConfig,
        }).measurement,
      )
    : undefined;
  const contactCenter = fieldContactCenterConfig
    ? withSourceArtifact(
        measureLandmarkFeature({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: fieldContactCenterConfig,
        }).measurement,
      )
    : undefined;
  const boundary =
    stateKey === 'journey-exit'
      ? withSourceArtifact(
          measureHorizontalBoundary({
            data,
            image: info,
            dpr: devicePixelRatio,
            config: JOURNEY_EXIT_BOUNDARY_CONFIG,
          }).measurement,
        )
      : undefined;

  return {
    schemaVersion: 6,
    screenComposition: {
      ...screenComposition,
      sourceArtifact,
    },
    ...(landmark ? { landmark } : {}),
    ...(route ? { route } : {}),
    ...(copy ? { copy } : {}),
    ...(fieldProfile ? { fieldProfile } : {}),
    ...(contactCenter ? { contactCenter } : {}),
    ...(boundary ? { boundary } : {}),
  };
}

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
  await expect(root).toHaveAttribute('data-hero-motion', 'full');
  await expect(root).toHaveAttribute('data-hero-profile', 'recording-desktop');
  await expect(root).toHaveAttribute('data-hero-seed', '43117');
  await expect(
    root.locator('[data-hero-surface="canvas"] canvas'),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (stateKey === 'journey-exit') {
    await page.evaluate(() =>
      window.scrollTo({
        top: 3520,
        behavior: 'auto',
      }),
    );
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

async function waitForSettledStateOrRuntimeError(
  page: Page,
  stateKey: ReferenceStateKey,
  runtimeErrors: RuntimeErrors,
) {
  const outcome = await Promise.race([
    waitForSettledDirectState(page, stateKey).then((root) => ({
      root,
    })),
    runtimeErrors.first.then((runtimeError) => ({
      runtimeError,
    })),
  ]);

  if ('runtimeError' in outcome) {
    throw new Error(
      `${stateKey}: hero failed before render readiness: ${outcome.runtimeError}`,
    );
  }

  return outcome.root;
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
    const surface = root?.querySelector<HTMLElement>('[data-hero-surface]');
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-hero-surface] canvas',
    );
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    let canvasCenterPixel: number[] | null = null;
    let webglContextAvailable = false;
    let webglContextType: 'webgl2' | 'webgl' | null = null;
    let webglContextLost: boolean | null = null;

    if (canvas) {
      let context: WebGLRenderingContext | WebGL2RenderingContext | null =
        canvas.getContext('webgl2');
      if (context) {
        webglContextType = 'webgl2';
      } else {
        context = canvas.getContext('webgl');
        if (context) {
          webglContextType = 'webgl';
        }
      }
      if (context) {
        webglContextAvailable = true;
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
    const processStepElements = [
      ...document.querySelectorAll<HTMLElement>('[data-hero-process-step]'),
    ];
    const processStepsContainer = processStepElements[0]?.parentElement ?? null;

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
            heroExitProgress: shell.style.getPropertyValue(
              '--hero-exit-progress',
            ),
            heroFadeProgress: shell.style.getPropertyValue(
              '--hero-fade-progress',
            ),
            flowRevealProgress: shell.style.getPropertyValue(
              '--flow-reveal-progress',
            ),
            fieldVisibility: shell.style.getPropertyValue('--field-visibility'),
          }
        : null,
      renderSurface: surface
        ? {
            kind: surface.getAttribute('data-hero-surface'),
            canvasPresent: Boolean(canvas),
            webglContextAvailable,
            webglContextType,
            opacity: canvasStyle?.opacity ?? null,
            visibility: canvasStyle?.visibility ?? null,
            display: canvasStyle?.display ?? null,
            backgroundColor: canvasStyle?.backgroundColor ?? null,
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
        processSteps: processStepsContainer
          ? serializeBounds(processStepsContainer.getBoundingClientRect())
          : null,
        nextSection: rect('[data-hero-next-section]'),
        activeProcessStep: rect('[data-hero-process-step][data-active="true"]'),
        canvas: rect('[data-hero-surface] canvas'),
        fallback: rect('[data-hero-surface="fallback"]'),
      },
      processSteps: processStepElements.map((step) => {
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
  captureRunId = randomUUID();
  captureRunStartedAt = new Date().toISOString();
  capturedStates.clear();

  await Promise.all(
    generatedOutputPaths.map((generatedPath) =>
      rm(generatedPath, { force: true, recursive: true }),
    ),
  );
  await Promise.all([
    mkdir(implementationRoot, { recursive: true }),
    mkdir(measurementRoot, { recursive: true }),
  ]);
});

test.afterAll(async () => {
  if (REFERENCE_STATES.some((stateKey) => !capturedStates.has(stateKey))) {
    return;
  }

  const states = await Promise.all(
    REFERENCE_STATES.map(async (stateKey) => ({
      key: stateKey,
      implementation: await createArtifactEvidence(
        path.posix.join('implementation', `${stateKey}.png`),
      ),
      measurement: await createArtifactEvidence(
        path.posix.join('measurements', `${stateKey}.json`),
      ),
    })),
  );
  const manifest = {
    schemaVersion: 7,
    status: 'complete',
    runId: captureRunId,
    startedAt: captureRunStartedAt,
    completedAt: new Date().toISOString(),
    expectedStateCount: REFERENCE_STATES.length,
    capturedStateCount: capturedStates.size,
    states,
  };

  await writeFile(
    captureManifestTemporaryPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  await rename(captureManifestTemporaryPath, captureManifestPath);
});

for (const stateKey of REFERENCE_STATES) {
  test(`capture ${stateKey} at the recording profile`, async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await installWebGlContextLossMonitor(page);

    await page.goto(`/?${createStateQuery(stateKey)}`, {
      waitUntil: 'domcontentloaded',
    });
    const stateRoot = await waitForSettledStateOrRuntimeError(
      page,
      stateKey,
      runtimeErrors,
    );
    await expect(stateRoot).toHaveAttribute(
      'data-hero-reference-state',
      stateKey,
    );
    expectNoRuntimeErrors(runtimeErrors, stateKey);

    const imagePath = path.join(implementationRoot, `${stateKey}.png`);
    const measurementPath = path.join(measurementRoot, `${stateKey}.json`);

    await page.screenshot({
      path: imagePath,
      animations: 'disabled',
      scale: 'device',
    });
    const pageMeasurement = await measurePage(page, stateKey);
    const structuralAccuracy = await measureImplementationStructure(
      imagePath,
      stateKey,
      pageMeasurement.viewport.devicePixelRatio,
    );
    const measurement = {
      schemaVersion: 7,
      ...pageMeasurement,
      structuralAccuracy,
    };
    expect(measurement.state).toMatchObject({
      'data-hero-motion': 'full',
      'data-hero-profile': 'recording-desktop',
      'data-hero-render-ready': 'true',
      'data-hero-seed': '43117',
    });
    expect(measurement.renderSurface).toMatchObject({
      kind: 'canvas',
      canvasPresent: true,
      webglContextAvailable: true,
      webglContextLost: false,
    });
    expect(
      measurement.renderSurface?.webglContextLost,
      `${stateKey}: hero WebGL context was lost`,
    ).not.toBe(true);
    expectNoRuntimeErrors(runtimeErrors, stateKey);
    await writeFile(
      measurementPath,
      `${JSON.stringify(measurement, null, 2)}\n`,
      'utf8',
    );
    expectNoRuntimeErrors(runtimeErrors, stateKey);
    capturedStates.add(stateKey);
  });
}
