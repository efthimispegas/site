import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildCaptureProvenance } from './hero-capture-provenance';
import { readCaptureIdentities, readPaintedFonts } from './hero-capture-identity';
import { readCaptureSample } from './hero-capture-contract';
import { compareHeroPresentationBrackets } from './hero-presentation-readback';
import { readCaptureCssClock } from './hero-capture-clock';
import sharp from 'sharp';
import { installCaptureInputClock, waitForCaptureObservation, CAPTURE_EXPECTATIONS } from './hero-capture-contract';
import { readCaptureRun, recordCaptureOutcome, type CaptureRunContext } from './hero-capture-run';
import { measureScreenComposition } from './screen-composition.mjs';
import {
  COPY_CONFIG_BY_STATE,
  FIELD_CONTACT_CENTER_CONFIG_BY_STATE,
  FIELD_TILE_PROFILE_CONFIG_BY_STATE,
  IMPLEMENTATION_ROUTE_CONFIG_BY_STATE,
  IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE,
  JOURNEY_EXIT_BOUNDARY_CONFIG,
  LANDMARK_CONFIG_BY_STATE,
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

let captureRun: CaptureRunContext;
let outputRoot: string;
let implementationRoot: string;
let measurementRoot: string;
let identities: ReturnType<typeof readCaptureIdentities>;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

type RuntimeErrors = {
  console: string[];
  first: Promise<string>;
  page: string[];
};

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
  const semanticLandmarkConfig =
    IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[
      stateKey as keyof typeof IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE
    ];
  const resolvedLandmarkConfig = landmarkConfig ?? semanticLandmarkConfig;
  const landmark = resolvedLandmarkConfig
    ? withSourceArtifact(
        measureLandmarkFeature({
          data,
          image: info,
          dpr: devicePixelRatio,
          config: resolvedLandmarkConfig,
        }).measurement,
      )
    : undefined;
  const copyConfig =
    COPY_CONFIG_BY_STATE[stateKey as keyof typeof COPY_CONFIG_BY_STATE];
  const implementationRouteConfig =
    IMPLEMENTATION_ROUTE_CONFIG_BY_STATE[
      stateKey as keyof typeof IMPLEMENTATION_ROUTE_CONFIG_BY_STATE
    ];
  const routeConfig = implementationRouteConfig ?? ROUTE_CONFIGS[stateKey];
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

async function waitForSettledStateOrRuntimeError(page: Page, stateKey: ReferenceStateKey, runtimeErrors: RuntimeErrors) {
  const outcome = await Promise.race([
    waitForCaptureObservation(page, CAPTURE_EXPECTATIONS[stateKey]).then((observation) => ({ observation })),
    runtimeErrors.first.then((runtimeError) => ({ runtimeError })),
  ]);
  if ('runtimeError' in outcome) throw new Error(`${stateKey}: hero failed before capture: ${outcome.runtimeError}`);
  return outcome.observation;
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
      '[data-hero-render-ready]',
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
  captureRun = await readCaptureRun();
  identities = readCaptureIdentities();
  await mkdir(path.join(captureRun.outputRoot, 'observations'), { recursive: true });
  outputRoot = captureRun.outputRoot;
  implementationRoot = path.join(outputRoot, 'implementation');
  measurementRoot = path.join(outputRoot, 'measurements');
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    const state = REFERENCE_STATES.find((key) => testInfo.title === `capture ${key} at the recording profile`);
    if (state) await recordCaptureOutcome(captureRun, { state, status: 'failed', error: `${page.url()}\n${testInfo.errors.map((error) => error.message).join('\n') || String(testInfo.status)}` });
  }
});

for (const stateKey of REFERENCE_STATES) {
  test(`capture ${stateKey} at the recording profile`, async ({ page }) => {
    const runtimeErrors = captureRuntimeErrors(page);
    await installWebGlContextLossMonitor(page);

    await installCaptureInputClock(page);
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });
    const captureObservation = await waitForSettledStateOrRuntimeError(
      page,
      stateKey,
      runtimeErrors,
    );
    expectNoRuntimeErrors(runtimeErrors, stateKey);

    const imagePath = path.join(implementationRoot, `${stateKey}.png`);
    const measurementPath = path.join(measurementRoot, `${stateKey}.json`);

    const inputProfile = await page.evaluate(() => ({ pointerClass: matchMedia('(pointer: fine)').matches ? 'fine' : 'coarse', isIos: /iPad|iPhone|iPod/u.test(navigator.userAgent), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    expect(inputProfile).toEqual({ pointerClass: 'fine', isIos: false, reducedMotion: false });
    const fontEvidence = await readPaintedFonts(page);
    const beforeSample = await readCaptureSample(page);
    const before = { record: beforeSample.record, presentation: beforeSample.presentation, cssClock: await readCaptureCssClock(page) };
    await page.screenshot({
      path: imagePath,
      animations: 'allow',
      scale: 'device',
    });
    const afterSample = await readCaptureSample(page);
    const after = { record: afterSample.record, presentation: afterSample.presentation, cssClock: await readCaptureCssClock(page) };
    const presentationParity = compareHeroPresentationBrackets(captureObservation.presentation, before.presentation, after.presentation);
    expect(after.record?.frame.frameId).toBe(before.record?.frame.frameId);
    expect(after.cssClock.nowMs).toBe(before.cssClock.nowMs);
    const observationPath = path.posix.join('observations', `${stateKey}.json`);
    const observationBytes = Buffer.from(`${JSON.stringify({ schemaVersion: 1, runId: captureRun.runId, stateId: stateKey, initialPresentation: captureObservation.presentation, before, after, presentationParity }, null, 2)}\n`);
    await writeFile(path.join(outputRoot, observationPath), observationBytes);
    const pageMeasurement = await measurePage(page, stateKey);
    const structuralAccuracy = await measureImplementationStructure(
      imagePath,
      stateKey,
      pageMeasurement.viewport.devicePixelRatio,
    );
    const measurement = {
      schemaVersion: 7,
      runId: captureRun.runId,
      buildId: captureRun.buildId,
      inputTreeSha256: captureRun.inputTreeSha256,
      captureObservation,
      presentationParity,
      ...pageMeasurement,
      structuralAccuracy,
    };
    expect(measurement.state).toMatchObject({
      'data-hero-motion': 'full',
      'data-hero-profile': 'desktop',
      'data-hero-render-ready': 'true',
      'data-hero-seed': '43117',
    });
    expect(measurement.viewport).toEqual({
      width: 1508,
      height: 761,
      devicePixelRatio: 2,
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
    const artifacts = await Promise.all([imagePath, measurementPath].map(async (file) => {
      const bytes = await readFile(file);
      return { path: path.relative(outputRoot, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha256(bytes) };
    }));
    const browser = page.context().browser();
    if (!browser || !captureObservation.record) throw new Error('Missing actual browser/frame identity');
    const captureProvenance = buildCaptureProvenance({ context: captureRun, state: stateKey, measurement, artifacts,
      ...identities, environment: { node: process.version, browserName: browser.browserType().name(), browserVersion: browser.version() },
      fontEvidence, profile: { captureLabel: 'recording-desktop', ...inputProfile },
      physical: captureObservation.physical,
      build: { mode: 'test-enabled-production', startupCommand: 'NEXT_DIST_DIR=.next-s7-diagnostics pnpm --filter @site/pegasoft exec next start -H 127.0.0.1 -p 4317' },
    });
    const canvas = captureObservation.record.canvas;
    const profile = { viewportWidth: captureObservation.viewport.width, viewportHeight: captureObservation.viewport.height, screenshotDpr: captureObservation.viewport.devicePixelRatio,
      canvasCssWidth: canvas.cssWidth, canvasCssHeight: canvas.cssHeight, canvasBackingWidth: canvas.backingWidth, canvasBackingHeight: canvas.backingHeight,
      canvasDprX: canvas.backingWidth / canvas.cssWidth, canvasDprY: canvas.backingHeight / canvas.cssHeight, ...inputProfile };
    const qualificationPath = path.join(outputRoot, 'qualification-contract.json');
    const previousQualification = await readFile(qualificationPath, 'utf8').then((text) => JSON.parse(text)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; return { states: {} }; });
    const qualificationStates = previousQualification.states;
    qualificationStates[stateKey] = { captureFrameId: before.record?.frame.frameId, observation: { relativePath: observationPath, sha256: sha256(observationBytes), bytes: observationBytes.length } };
    await writeFile(`${qualificationPath}.tmp`, `${JSON.stringify({ schemaVersion: 1, runId: captureRun.runId, profiles: { 'recording-desktop': profile }, states: qualificationStates }, null, 2)}\n`);
    await rename(`${qualificationPath}.tmp`, qualificationPath);
    await recordCaptureOutcome(captureRun, { state: stateKey, status: 'complete', captureProvenance });
  });
}
