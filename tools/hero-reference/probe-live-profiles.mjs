import { randomUUID } from 'node:crypto';
import { rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const GENERATED_BY = 'tools/hero-reference/probe-live-profiles.mjs';
const DEFAULT_AUTHORITY_URL = 'https://www.vectrfl.com/?trace=1';
const DEFAULT_OUTPUT = 'docs/hero-reference/live/current-live-profiles.json';
const LIVE_EVIDENCE_DIRECTORY = 'docs/hero-reference/live';
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_SETTLE_MS = 5_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_SETTLE_MS = 30_000;
const MAX_CONSOLE_MESSAGES = 1_000;
const MAX_DIAGNOSTIC_ENTRIES = 500;
const MAX_RESOURCE_URLS = 5_000;
const MAX_TEXT_LENGTH = 4_000;
const SCHEMA_ID = 'vectr-live-profile-probe/v1';

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), '..', '..');
const liveEvidenceRoot = path.join(
  workspaceRoot,
  ...LIVE_EVIDENCE_DIRECTORY.split('/'),
);

const PROFILE_DEFINITIONS = [
  {
    id: 'recording-desktop',
    viewport: { width: 1508, height: 761 },
    screen: { width: 1508, height: 761 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    expectedInput: {
      pointer: 'fine',
      hover: true,
      touch: false,
    },
  },
  {
    id: 'desktop',
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    expectedInput: {
      pointer: 'fine',
      hover: true,
      touch: false,
    },
  },
  {
    id: 'tablet',
    viewport: { width: 1024, height: 768 },
    screen: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    userAgentKind: 'android-tablet',
    expectedInput: {
      pointer: 'coarse',
      hover: false,
      touch: true,
    },
  },
  {
    id: 'mobile',
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    userAgentKind: 'android-mobile',
    expectedInput: {
      pointer: 'coarse',
      hover: false,
      touch: true,
    },
  },
];

const LIVE_SELECTORS = {
  canvas: 'canvas',
  readyCanvas: 'canvas.is-ready',
  loader: '#loader',
  header: 'header',
  headerLogoSvg: '.header__logo > a > svg',
  leftNavigation: '.header__nav-left',
  rightNavigation: '.header__nav-right',
  menuButton: '.menu-btn',
  heroContent: '.hero__content',
  heroTitle: '.hero__title',
  heroSubtitle: '.hero__subtitle',
  scrollCue: '.hero__scroll-btn',
  scrollCueText: '.hero__scroll-btn > span',
  flow: '.flow',
  flowWrapper: '.flow__wrapper',
  flowSteps: '.flow__steps',
  flowStep: '.flow__step',
  activeFlowStep: '.flow__step--active',
  flowHeader: '.flow__header',
  flowNumber: '.flow__number',
  flowTitle: '.flow__title',
  flowBody: '.flow__body',
  flowDescription: '.flow__description',
};

function usage() {
  return [
    'Usage:',
    `  node ${GENERATED_BY} [options]`,
    '',
    'Options:',
    `  --output <path>      Repository-relative .json path directly under ${LIVE_EVIDENCE_DIRECTORY}`,
    `                       (default: ${DEFAULT_OUTPUT})`,
    `  --url <url>          HTTP(S) authority URL (default: ${DEFAULT_AUTHORITY_URL})`,
    `  --timeout-ms <ms>    Per-operation timeout, ${MIN_TIMEOUT_MS}-${MAX_TIMEOUT_MS}`,
    `                       (default: ${DEFAULT_TIMEOUT_MS})`,
    `  --settle-ms <ms>     Bounded post-readiness settle, 0-${MAX_SETTLE_MS}`,
    `                       (default: ${DEFAULT_SETTLE_MS})`,
    '  --help               Print this help without launching Chromium',
    '',
    'A failed run writes <output-stem>.failure.json and never replaces the',
    'requested successful output.',
  ].join('\n');
}

function parseIntegerOption(name, value, minimum, maximum) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new Error(`${name} must be an integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }

  return parsed;
}

function optionParts(argument) {
  const equalsIndex = argument.indexOf('=');
  if (equalsIndex === -1) {
    return { name: argument, inlineValue: null };
  }

  return {
    name: argument.slice(0, equalsIndex),
    inlineValue: argument.slice(equalsIndex + 1),
  };
}

function parseArguments(argv) {
  const values = {
    output: DEFAULT_OUTPUT,
    url: DEFAULT_AUTHORITY_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    settleMs: DEFAULT_SETTLE_MS,
    help: false,
  };
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }

    const { name, inlineValue } = optionParts(argument);
    if (name === '--help') {
      if (inlineValue !== null) {
        throw new Error('--help does not accept a value');
      }
      values.help = true;
      continue;
    }

    const optionName = name.slice(2);
    if (!['output', 'url', 'timeout-ms', 'settle-ms'].includes(optionName)) {
      throw new Error(`Unknown option: ${name}`);
    }
    if (seen.has(optionName)) {
      throw new Error(`Option supplied more than once: ${name}`);
    }
    seen.add(optionName);

    const nextValue = inlineValue === null ? argv[(index += 1)] : inlineValue;
    if (
      nextValue === undefined ||
      nextValue.length === 0 ||
      (inlineValue === null && nextValue.startsWith('--'))
    ) {
      throw new Error(`${name} requires a value`);
    }

    if (optionName === 'output') {
      values.output = nextValue;
    } else if (optionName === 'url') {
      values.url = nextValue;
    } else if (optionName === 'timeout-ms') {
      values.timeoutMs = parseIntegerOption(
        name,
        nextValue,
        MIN_TIMEOUT_MS,
        MAX_TIMEOUT_MS,
      );
    } else {
      values.settleMs = parseIntegerOption(name, nextValue, 0, MAX_SETTLE_MS);
    }
  }

  return values;
}

function validateAuthorityUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`--url is not a valid URL: ${value}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('--url must use http: or https:');
  }
  if (!parsed.hostname) {
    throw new Error('--url must include a hostname');
  }
  if (parsed.username || parsed.password) {
    throw new Error('--url must not contain embedded credentials');
  }

  return parsed.toString();
}

function resolveOutputPath(value) {
  if (value.includes('\0')) {
    throw new Error('--output must not contain a null byte');
  }
  if (value.includes('\\')) {
    throw new Error('--output must use repository-style forward slashes');
  }
  if (path.isAbsolute(value)) {
    throw new Error('--output must be repository-relative');
  }

  const segments = value.split('/');
  if (segments.includes('..')) {
    throw new Error('--output must not traverse outside the repository');
  }

  const absolutePath = path.resolve(workspaceRoot, value);
  const repositoryPath = path
    .relative(workspaceRoot, absolutePath)
    .split(path.sep)
    .join('/');

  if (path.dirname(absolutePath) !== liveEvidenceRoot) {
    throw new Error(
      `--output must be directly under ${LIVE_EVIDENCE_DIRECTORY}`,
    );
  }
  if (path.extname(absolutePath) !== '.json') {
    throw new Error('--output must end in .json');
  }
  if (
    repositoryPath === `${LIVE_EVIDENCE_DIRECTORY}/.json` ||
    path.basename(absolutePath).startsWith('.')
  ) {
    throw new Error('--output must use a non-hidden JSON filename');
  }

  const basename = path.basename(absolutePath, '.json');
  const failureAbsolutePath = path.join(
    path.dirname(absolutePath),
    `${basename}.failure.json`,
  );
  const failureRepositoryPath = path
    .relative(workspaceRoot, failureAbsolutePath)
    .split(path.sep)
    .join('/');

  return {
    absolutePath,
    repositoryPath,
    failureAbsolutePath,
    failureRepositoryPath,
  };
}

function androidUserAgent(browserVersion, kind) {
  const product =
    kind === 'android-mobile'
      ? 'Linux; Android 13; Pixel 7'
      : 'Linux; Android 13; Pixel Tablet';
  const mobileToken = kind === 'android-mobile' ? ' Mobile' : '';

  return (
    `Mozilla/5.0 (${product}) AppleWebKit/537.36 ` +
    `(KHTML, like Gecko) Chrome/${browserVersion}${mobileToken} Safari/537.36`
  );
}

function errorRecord(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.slice(0, MAX_TEXT_LENGTH),
      stack: error.stack?.slice(0, MAX_TEXT_LENGTH) ?? null,
    };
  }

  return {
    name: 'NonError',
    message: String(error).slice(0, MAX_TEXT_LENGTH),
    stack: null,
  };
}

function createBoundedCollector(limit) {
  const entries = [];
  let dropped = 0;

  return {
    add(value) {
      if (entries.length < limit) {
        entries.push(value);
      } else {
        dropped += 1;
      }
    },
    entries,
    get dropped() {
      return dropped;
    },
  };
}

function createDiagnostics() {
  return {
    pageErrors: createBoundedCollector(MAX_DIAGNOSTIC_ENTRIES),
    consoleMessages: createBoundedCollector(MAX_CONSOLE_MESSAGES),
    consoleErrors: createBoundedCollector(MAX_DIAGNOSTIC_ENTRIES),
    failedRequests: createBoundedCollector(MAX_DIAGNOSTIC_ENTRIES),
    responseErrors: createBoundedCollector(MAX_DIAGNOSTIC_ENTRIES),
  };
}

function serializeDiagnostics(diagnostics) {
  return {
    pageErrors: diagnostics.pageErrors.entries,
    consoleMessages: diagnostics.consoleMessages.entries,
    consoleErrors: diagnostics.consoleErrors.entries,
    failedRequests: diagnostics.failedRequests.entries,
    responseErrors: diagnostics.responseErrors.entries,
    dropped: {
      pageErrors: diagnostics.pageErrors.dropped,
      consoleMessages: diagnostics.consoleMessages.dropped,
      consoleErrors: diagnostics.consoleErrors.dropped,
      failedRequests: diagnostics.failedRequests.dropped,
      responseErrors: diagnostics.responseErrors.dropped,
    },
  };
}

function installDiagnosticListeners(page, diagnostics, resources) {
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.add(errorRecord(error));
  });

  page.on('console', (message) => {
    const location = message.location();
    const entry = {
      level: message.type(),
      text: message.text().slice(0, MAX_TEXT_LENGTH),
      location: {
        url: location.url || null,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      },
    };
    diagnostics.consoleMessages.add(entry);
    if (entry.level === 'error') {
      diagnostics.consoleErrors.add(entry);
    }
  });

  page.on('request', (request) => {
    resources.observeRequest(request);
  });

  page.on('response', (response) => {
    resources.observeResponse(response);
    if (response.status() >= 400) {
      const request = response.request();
      diagnostics.responseErrors.add({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    }
  });

  page.on('requestfailed', (request) => {
    resources.observeFailure(request);
    diagnostics.failedRequests.add({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? 'Unknown request failure',
    });
  });
}

function createResourceCollector() {
  const entries = new Map();
  let dropped = 0;
  let sequence = 0;

  function keyFor(request) {
    return `${request.method()}\n${request.resourceType()}\n${request.url()}`;
  }

  function observeRequest(request) {
    const key = keyFor(request);
    if (entries.has(key)) {
      entries.get(key).requestCount += 1;
      return;
    }
    if (entries.size >= MAX_RESOURCE_URLS) {
      dropped += 1;
      return;
    }

    entries.set(key, {
      sequence,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      requestCount: 1,
      responseStatuses: [],
      fromServiceWorker: false,
      failureTexts: [],
    });
    sequence += 1;
  }

  function observeResponse(response) {
    const request = response.request();
    if (!entries.has(keyFor(request))) {
      observeRequest(request);
    }
    const entry = entries.get(keyFor(request));
    if (!entry) {
      return;
    }

    if (!entry.responseStatuses.includes(response.status())) {
      entry.responseStatuses.push(response.status());
    }
    entry.fromServiceWorker ||= response.fromServiceWorker();
  }

  function observeFailure(request) {
    if (!entries.has(keyFor(request))) {
      observeRequest(request);
    }
    const entry = entries.get(keyFor(request));
    if (!entry) {
      return;
    }

    const failureText =
      request.failure()?.errorText ?? 'Unknown request failure';
    if (!entry.failureTexts.includes(failureText)) {
      entry.failureTexts.push(failureText);
    }
  }

  return {
    observeRequest,
    observeResponse,
    observeFailure,
    serialize() {
      return {
        observed: [...entries.values()].sort(
          (left, right) => left.sequence - right.sequence,
        ),
        dropped,
      };
    },
  };
}

function detectReadyCanvas(selectors) {
  const browserWindow = globalThis;
  const browserDocument = browserWindow.document;
  const usable = (element) => {
    const box = element.getBoundingClientRect();
    const style = browserWindow.getComputedStyle(element);
    return (
      box.width > 1 &&
      box.height > 1 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0
    );
  };

  const allCanvases = [...browserDocument.querySelectorAll(selectors.canvas)];
  const readyCanvases = [
    ...browserDocument.querySelectorAll(selectors.readyCanvas),
  ];
  if (allCanvases.length !== 1 || readyCanvases.length !== 1) {
    return null;
  }

  const canvas = readyCanvases[0];
  if (!usable(canvas) || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }

  return {
    kind: 'canvas',
    selector: selectors.readyCanvas,
    canvasIndex: allCanvases.indexOf(canvas),
    readySignal: 'class:is-ready',
  };
}

async function waitForFontsReady(page, timeoutMs) {
  await page.waitForFunction(
    () =>
      !globalThis.document.fonts ||
      globalThis.document.fonts.status === 'loaded',
    null,
    { timeout: timeoutMs },
  );
  await page.evaluate(async () => {
    if (globalThis.document.fonts) {
      await globalThis.document.fonts.ready;
    }
  });
}

async function waitForReadyPage(page, timeoutMs) {
  await page.waitForFunction(
    () => globalThis.document.readyState === 'complete',
    null,
    { timeout: timeoutMs },
  );
  await waitForFontsReady(page, timeoutMs);

  const readyHandle = await page.waitForFunction(
    detectReadyCanvas,
    LIVE_SELECTORS,
    {
      polling: 100,
      timeout: timeoutMs,
    },
  );
  const readySurface = await readyHandle.jsonValue();
  await readyHandle.dispose();

  return {
    documentReadyState: await page.evaluate(
      () => globalThis.document.readyState,
    ),
    fonts: await page.evaluate(() => ({
      supported: Boolean(globalThis.document.fonts),
      status: globalThis.document.fonts?.status ?? null,
    })),
    readySurface,
  };
}

async function installContextObservation(context) {
  await context.addInitScript(() => {
    const browserWindow = globalThis;
    const state = {
      contextLosses: [],
    };

    Object.defineProperty(browserWindow, '__vectrLiveProfileProbe', {
      configurable: false,
      enumerable: false,
      value: state,
      writable: false,
    });

    browserWindow.addEventListener(
      'webglcontextlost',
      (event) => {
        state.contextLosses.push({
          canvas: event.target,
          atPerformanceMs: browserWindow.performance.now(),
          statusMessage: event.statusMessage || null,
        });
      },
      true,
    );
  });
}

function measurePage(argumentsValue) {
  const { profile, selectors } = argumentsValue;
  const browserWindow = globalThis;
  const browserDocument = browserWindow.document;
  const round = (value, digits = 4) => {
    if (!Number.isFinite(value)) {
      return null;
    }
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
  };
  const text = (element) =>
    element?.textContent?.replace(/\s+/gu, ' ').trim().slice(0, 500) ?? null;
  const elementIdentity = (element) => {
    if (!element) {
      return null;
    }
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className:
        typeof element.className === 'string'
          ? element.className || null
          : null,
    };
  };
  const box = (element) => {
    if (!element) {
      return null;
    }
    const value = element.getBoundingClientRect();
    return {
      x: round(value.x),
      y: round(value.y),
      width: round(value.width),
      height: round(value.height),
      top: round(value.top),
      right: round(value.right),
      bottom: round(value.bottom),
      left: round(value.left),
      documentX: round(value.x + browserWindow.scrollX),
      documentY: round(value.y + browserWindow.scrollY),
    };
  };
  const measure = (element, includeText = false) => {
    if (!element) {
      return null;
    }
    return {
      element: elementIdentity(element),
      box: box(element),
      visible: visible(element),
      ...(includeText ? { text: text(element) } : {}),
    };
  };
  const visible = (element) => {
    if (!element) {
      return false;
    }
    const value = element.getBoundingClientRect();
    const style = browserWindow.getComputedStyle(element);
    return (
      value.width > 0 &&
      value.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  };
  const styleFields = (element, fields) => {
    if (!element) {
      return null;
    }
    const style = browserWindow.getComputedStyle(element);
    return Object.fromEntries(fields.map((field) => [field, style[field]]));
  };
  const font = (element) =>
    styleFields(element, [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'textAlign',
    ]);

  const header = browserDocument.querySelector(selectors.header);
  const headerLogo = browserDocument.querySelector(selectors.headerLogoSvg);
  const leftNavigation = browserDocument.querySelector(
    selectors.leftNavigation,
  );
  const rightNavigation = browserDocument.querySelector(
    selectors.rightNavigation,
  );
  const menuButton = browserDocument.querySelector(selectors.menuButton);
  const loader = browserDocument.querySelector(selectors.loader);
  const heroContent = browserDocument.querySelector(selectors.heroContent);
  const title = browserDocument.querySelector(selectors.heroTitle);
  const subtitle = browserDocument.querySelector(selectors.heroSubtitle);
  const scrollCue = browserDocument.querySelector(selectors.scrollCue);
  const scrollCueText = browserDocument.querySelector(selectors.scrollCueText);
  const flowSection = browserDocument.querySelector(selectors.flow);
  const flowWrapper = browserDocument.querySelector(selectors.flowWrapper);
  const flowSteps = browserDocument.querySelector(selectors.flowSteps);
  const flowStepElements = [
    ...browserDocument.querySelectorAll(selectors.flowStep),
  ];

  const measuredSteps = flowStepElements.map((step, index) => {
    const stepHeader = step.querySelector(selectors.flowHeader);
    const number = step.querySelector(selectors.flowNumber);
    const stepTitle = step.querySelector(selectors.flowTitle);
    const body = step.querySelector(selectors.flowBody);
    const description = step.querySelector(selectors.flowDescription);
    const active = step.matches(selectors.activeFlowStep);

    return {
      index,
      active,
      className: step.className || null,
      box: box(step),
      header: measure(stepHeader),
      number: measure(number, true),
      title: stepTitle
        ? {
            ...measure(stepTitle, true),
            font: font(stepTitle),
          }
        : null,
      body: measure(body),
      description: description
        ? {
            ...measure(description, true),
            font: font(description),
          }
        : null,
    };
  });

  const headerNavigationRegions = header
    ? [...header.querySelectorAll('nav')]
        .filter(visible)
        .map((element) => measure(element))
    : [];
  const headerLinks = header
    ? [...header.querySelectorAll('a')]
        .filter(visible)
        .map((element) => measure(element, true))
    : [];

  const contextState = browserWindow.__vectrLiveProfileProbe ?? {
    contextLosses: [],
  };
  const canvasElements = [
    ...browserDocument.querySelectorAll(selectors.canvas),
  ];
  const readyCanvasElements = [
    ...browserDocument.querySelectorAll(selectors.readyCanvas),
  ];
  const canvases = canvasElements.map((canvas, index) => {
    const contextLossEvents = contextState.contextLosses
      .filter((entry) => entry.canvas === canvas)
      .map((entry) => ({
        atPerformanceMs: round(entry.atPerformanceMs),
        statusMessage: entry.statusMessage,
      }));

    return {
      index,
      element: elementIdentity(canvas),
      box: box(canvas),
      backingStore: {
        width: canvas.width,
        height: canvas.height,
      },
      style: styleFields(canvas, [
        'display',
        'visibility',
        'opacity',
        'position',
        'inset',
        'zIndex',
        'pointerEvents',
        'touchAction',
        'width',
        'height',
      ]),
      readySignals: {
        isReadyClass: canvas.classList.contains('is-ready'),
        dataReady: canvas.dataset.ready ?? null,
        dataRenderReady: canvas.dataset.renderReady ?? null,
        readyAncestor: Boolean(canvas.closest('[data-render-ready="true"]')),
      },
      contextLoss: {
        coverage:
          'limited: main-thread HTMLCanvasElement webglcontextlost events only; worker and OffscreenCanvas contexts are not observed',
        state: contextLossEvents.length > 0 ? 'lost-observed' : 'unknown',
        events: contextLossEvents,
      },
    };
  });
  const selectorCounts = Object.fromEntries(
    Object.entries(selectors).map(([key, selector]) => [
      key,
      browserDocument.querySelectorAll(selector).length,
    ]),
  );

  const htmlStyle = browserWindow.getComputedStyle(
    browserDocument.documentElement,
  );
  const bodyStyle = browserWindow.getComputedStyle(browserDocument.body);
  const visualViewport = browserWindow.visualViewport;
  const orientation = browserWindow.screen.orientation;
  const userAgentData = browserWindow.navigator.userAgentData;
  const flowSectionBox = box(flowSection);
  const flowWrapperBox = box(flowWrapper);

  return {
    capturedAtUtc: new Date().toISOString(),
    userAgent: {
      value: browserWindow.navigator.userAgent,
      platform: browserWindow.navigator.platform,
      language: browserWindow.navigator.language,
      languages: [...browserWindow.navigator.languages],
      userAgentData: userAgentData
        ? {
            brands: userAgentData.brands,
            mobile: userAgentData.mobile,
            platform: userAgentData.platform,
          }
        : null,
    },
    viewport: {
      requestedCss: profile.viewport,
      inner: {
        width: browserWindow.innerWidth,
        height: browserWindow.innerHeight,
      },
      devicePixelRatio: browserWindow.devicePixelRatio,
      visualViewport: visualViewport
        ? {
            width: round(visualViewport.width),
            height: round(visualViewport.height),
            scale: round(visualViewport.scale),
            offsetLeft: round(visualViewport.offsetLeft),
            offsetTop: round(visualViewport.offsetTop),
            pageLeft: round(visualViewport.pageLeft),
            pageTop: round(visualViewport.pageTop),
          }
        : null,
      screen: {
        width: browserWindow.screen.width,
        height: browserWindow.screen.height,
        availWidth: browserWindow.screen.availWidth,
        availHeight: browserWindow.screen.availHeight,
        colorDepth: browserWindow.screen.colorDepth,
        pixelDepth: browserWindow.screen.pixelDepth,
        orientation: orientation
          ? {
              type: orientation.type,
              angle: orientation.angle,
            }
          : null,
      },
      scroll: {
        x: round(browserWindow.scrollX),
        y: round(browserWindow.scrollY),
      },
    },
    input: {
      maxTouchPoints: browserWindow.navigator.maxTouchPoints,
      touchEventProperty: 'ontouchstart' in browserWindow,
      pointerFine: browserWindow.matchMedia('(pointer: fine)').matches,
      pointerCoarse: browserWindow.matchMedia('(pointer: coarse)').matches,
      pointerNone: browserWindow.matchMedia('(pointer: none)').matches,
      anyPointerFine: browserWindow.matchMedia('(any-pointer: fine)').matches,
      anyPointerCoarse: browserWindow.matchMedia('(any-pointer: coarse)')
        .matches,
      hover: browserWindow.matchMedia('(hover: hover)').matches,
      anyHover: browserWindow.matchMedia('(any-hover: hover)').matches,
    },
    media: {
      prefersReducedMotion: browserWindow.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches,
      prefersDarkColorScheme: browserWindow.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches,
      forcedColors: browserWindow.matchMedia('(forced-colors: active)').matches,
      invertedColors: browserWindow.matchMedia('(inverted-colors: inverted)')
        .matches,
      portrait: browserWindow.matchMedia('(orientation: portrait)').matches,
      landscape: browserWindow.matchMedia('(orientation: landscape)').matches,
      standalone: browserWindow.matchMedia('(display-mode: standalone)')
        .matches,
    },
    document: {
      readyState: browserDocument.readyState,
      fonts: {
        supported: Boolean(browserDocument.fonts),
        status: browserDocument.fonts?.status ?? null,
      },
      documentElement: {
        scrollWidth: browserDocument.documentElement.scrollWidth,
        scrollHeight: browserDocument.documentElement.scrollHeight,
        clientWidth: browserDocument.documentElement.clientWidth,
        clientHeight: browserDocument.documentElement.clientHeight,
        offsetWidth: browserDocument.documentElement.offsetWidth,
        offsetHeight: browserDocument.documentElement.offsetHeight,
        backgroundColor: htmlStyle.backgroundColor,
        color: htmlStyle.color,
        overflowX: htmlStyle.overflowX,
        overflowY: htmlStyle.overflowY,
      },
      body: {
        scrollWidth: browserDocument.body.scrollWidth,
        scrollHeight: browserDocument.body.scrollHeight,
        clientWidth: browserDocument.body.clientWidth,
        clientHeight: browserDocument.body.clientHeight,
        offsetWidth: browserDocument.body.offsetWidth,
        offsetHeight: browserDocument.body.offsetHeight,
        backgroundColor: bodyStyle.backgroundColor,
        color: bodyStyle.color,
        overflowX: bodyStyle.overflowX,
        overflowY: bodyStyle.overflowY,
      },
    },
    renderSurface: {
      detected:
        canvasElements.length === 1 &&
        readyCanvasElements.length === 1 &&
        readyCanvasElements[0] === canvasElements[0] &&
        visible(readyCanvasElements[0])
          ? {
              kind: 'canvas',
              selector: selectors.readyCanvas,
              canvasIndex: 0,
              readySignal: 'class:is-ready',
            }
          : null,
      canvases,
      loader: loader
        ? {
            ...measure(loader),
            style: styleFields(loader, ['display', 'visibility', 'opacity']),
          }
        : null,
      contextLossEventCount: contextState.contextLosses.length,
    },
    selectorCounts,
    landingDom: {
      header: measure(header),
      headerLogoSvg: measure(headerLogo),
      headerNavigationRegions,
      headerLinks,
      leftNavigation: leftNavigation
        ? {
            ...measure(leftNavigation),
            display: browserWindow.getComputedStyle(leftNavigation).display,
          }
        : null,
      rightNavigation: rightNavigation
        ? {
            ...measure(rightNavigation),
            display: browserWindow.getComputedStyle(rightNavigation).display,
          }
        : null,
      menuButton: measure(menuButton, true),
      heroContent: measure(heroContent),
      title: title
        ? {
            ...measure(title, true),
            font: font(title),
          }
        : null,
      subtitle: subtitle
        ? {
            ...measure(subtitle, true),
            font: font(subtitle),
          }
        : null,
      scrollCue: scrollCue
        ? {
            ...measure(scrollCue, true),
            textBox: measure(scrollCueText, true),
            font: font(scrollCue),
          }
        : null,
    },
    flow: {
      section: measure(flowSection),
      wrapper: measure(flowWrapper),
      stepsContainer: measure(flowSteps),
      documentTop: flowSectionBox?.documentY ?? null,
      height: flowSectionBox?.height ?? null,
      wrapperHeight: flowWrapperBox?.height ?? null,
      scrollRange:
        flowSectionBox && flowWrapperBox
          ? round(flowSectionBox.height - flowWrapperBox.height)
          : null,
      activeStepIndexes: measuredSteps
        .filter((step) => step.active)
        .map((step) => step.index),
      steps: measuredSteps,
    },
  };
}

function profileContractFailures(profile, measurement) {
  const failures = [];
  const viewport = measurement.viewport;
  if (
    viewport.inner.width !== profile.viewport.width ||
    viewport.inner.height !== profile.viewport.height
  ) {
    failures.push(
      `actual inner viewport ${viewport.inner.width}x${viewport.inner.height} ` +
        `does not match requested ${profile.viewport.width}x${profile.viewport.height}`,
    );
  }
  if (viewport.devicePixelRatio !== profile.deviceScaleFactor) {
    failures.push(
      `actual DPR ${viewport.devicePixelRatio} does not match requested ` +
        profile.deviceScaleFactor,
    );
  }
  if (viewport.scroll.x !== 0 || viewport.scroll.y !== 0) {
    failures.push(
      `landing measurement must be at scroll (0, 0), observed ` +
        `(${viewport.scroll.x}, ${viewport.scroll.y})`,
    );
  }
  const expectsFinePointer = profile.expectedInput.pointer === 'fine';
  if (measurement.input.pointerFine !== expectsFinePointer) {
    failures.push(
      `pointer:fine was ${measurement.input.pointerFine}, expected ${expectsFinePointer}`,
    );
  }
  if (measurement.input.pointerCoarse === expectsFinePointer) {
    failures.push(
      `pointer:coarse was ${measurement.input.pointerCoarse}, expected ${!expectsFinePointer}`,
    );
  }
  if (measurement.input.hover !== profile.expectedInput.hover) {
    failures.push(
      `hover capability was ${measurement.input.hover}, expected ${profile.expectedInput.hover}`,
    );
  }
  const hasTouchPoints = measurement.input.maxTouchPoints > 0;
  if (hasTouchPoints !== profile.expectedInput.touch) {
    failures.push(
      `touch capability was ${hasTouchPoints}, expected ${profile.expectedInput.touch}`,
    );
  }

  const requiredMeasurements = [
    ['landing header', measurement.landingDom.header],
    ['header logo SVG', measurement.landingDom.headerLogoSvg],
    ['hero content', measurement.landingDom.heroContent],
    ['hero title', measurement.landingDom.title],
    ['hero subtitle', measurement.landingDom.subtitle],
    ['hero scroll cue', measurement.landingDom.scrollCue],
    ['flow section', measurement.flow.section],
    ['flow wrapper', measurement.flow.wrapper],
    ['flow steps container', measurement.flow.stepsContainer],
  ];
  for (const [label, value] of requiredMeasurements) {
    if (!value?.box || !value.visible) {
      failures.push(`required ${label} geometry was not found`);
    }
  }

  if (profile.viewport.width > 820) {
    if (!measurement.landingDom.leftNavigation?.visible) {
      failures.push('desktop/tablet left navigation was not found');
    }
    if (!measurement.landingDom.rightNavigation?.visible) {
      failures.push('desktop/tablet right navigation was not found');
    }
  } else if (!measurement.landingDom.menuButton?.visible) {
    failures.push('mobile menu button was not found');
  }

  if (measurement.flow.steps.length !== 4) {
    failures.push(
      `expected exactly four flow steps, observed ${measurement.flow.steps.length}`,
    );
  }
  if (measurement.flow.activeStepIndexes.length !== 1) {
    failures.push(
      `expected exactly one active flow step, observed ${measurement.flow.activeStepIndexes.length}`,
    );
  } else {
    const activeStep =
      measurement.flow.steps[measurement.flow.activeStepIndexes[0]];
    for (const key of ['header', 'number', 'title', 'body', 'description']) {
      if (!activeStep?.[key]?.box || !activeStep[key].visible) {
        failures.push(`active flow step ${key} geometry was not found`);
      }
    }
  }

  const uniqueSelectors = [
    'canvas',
    'readyCanvas',
    'header',
    'headerLogoSvg',
    'heroContent',
    'heroTitle',
    'heroSubtitle',
    'scrollCue',
    'scrollCueText',
    'flow',
    'flowWrapper',
    'flowSteps',
  ];
  for (const selectorName of uniqueSelectors) {
    if (measurement.selectorCounts[selectorName] !== 1) {
      failures.push(
        `selector ${selectorName} matched ${measurement.selectorCounts[selectorName]}, expected 1`,
      );
    }
  }

  return failures;
}

function runtimeFailures(measurement, diagnostics) {
  const failures = [];
  if (diagnostics.pageErrors.length > 0) {
    failures.push(`${diagnostics.pageErrors.length} uncaught page error(s)`);
  }
  if (measurement.renderSurface.contextLossEventCount > 0) {
    failures.push(
      `${measurement.renderSurface.contextLossEventCount} WebGL context-loss event(s)`,
    );
  }
  if (!measurement.renderSurface.detected) {
    failures.push('ready canvas or usable fallback was lost after settling');
  }

  return failures;
}

async function probeProfile(browser, browserVersion, authorityUrl, options) {
  const profile = options.profile;
  const contextOptions = {
    viewport: profile.viewport,
    screen: profile.screen,
    deviceScaleFactor: profile.deviceScaleFactor,
    hasTouch: profile.hasTouch,
    isMobile: profile.isMobile,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    acceptDownloads: false,
  };
  if (profile.userAgentKind) {
    contextOptions.userAgent = androidUserAgent(
      browserVersion,
      profile.userAgentKind,
    );
  }

  const result = {
    id: profile.id,
    status: 'failed',
    startedAtUtc: new Date().toISOString(),
    requestedContext: {
      viewportCss: profile.viewport,
      screenCss: profile.screen,
      deviceScaleFactor: profile.deviceScaleFactor,
      hasTouch: profile.hasTouch,
      isMobile: profile.isMobile,
      expectedInput: profile.expectedInput,
      userAgentKind: profile.userAgentKind ?? 'browser-default',
      emulatedUserAgent: contextOptions.userAgent ?? null,
    },
  };
  const diagnostics = createDiagnostics();
  const resources = createResourceCollector();
  let context = null;
  let stage = 'create-context';

  try {
    context = await browser.newContext(contextOptions);
    await installContextObservation(context);
    const page = await context.newPage();
    installDiagnosticListeners(page, diagnostics, resources);

    stage = 'navigation';
    const navigationStartedAtUtc = new Date().toISOString();
    const response = await page.goto(authorityUrl, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeoutMs,
    });
    if (!response) {
      throw new Error('Navigation completed without an HTTP response');
    }
    result.navigation = {
      requestedUrl: authorityUrl,
      finalUrl: page.url(),
      httpStatus: response.status(),
      statusText: response.statusText(),
      startedAtUtc: navigationStartedAtUtc,
      readyAtUtc: null,
      measuredAtUtc: null,
      documentReadyState: null,
      fonts: null,
      readySurfaceBeforeSettle: null,
      readySurfaceAfterSettle: null,
      boundedSettleMs: options.settleMs,
    };
    if (response.status() !== 200) {
      throw new Error(
        `Authority navigation returned HTTP ${response.status()}, expected 200`,
      );
    }

    stage = 'readiness';
    await page.waitForLoadState('load', { timeout: options.timeoutMs });
    const readiness = await waitForReadyPage(page, options.timeoutMs);
    Object.assign(result.navigation, {
      readyAtUtc: new Date().toISOString(),
      documentReadyState: readiness.documentReadyState,
      fonts: readiness.fonts,
      readySurfaceBeforeSettle: readiness.readySurface,
    });

    stage = 'zero-scroll';
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          globalThis.scrollTo(0, 0);
          globalThis.requestAnimationFrame(() => {
            globalThis.requestAnimationFrame(resolve);
          });
        }),
    );

    stage = 'bounded-settle';
    await page.waitForTimeout(options.settleMs);

    stage = 'post-settle-readiness';
    await waitForFontsReady(page, options.timeoutMs);
    const readyAfterSettle = await page.evaluate(
      detectReadyCanvas,
      LIVE_SELECTORS,
    );
    if (!readyAfterSettle) {
      throw new Error(
        'Unique usable canvas.is-ready was not present after settling',
      );
    }
    result.navigation.readySurfaceAfterSettle = readyAfterSettle;

    stage = 'measurement';
    const measurement = await page.evaluate(measurePage, {
      profile,
      selectors: LIVE_SELECTORS,
    });
    const serializedDiagnostics = serializeDiagnostics(diagnostics);
    const contractErrors = profileContractFailures(profile, measurement);
    const runtimeErrors = runtimeFailures(measurement, serializedDiagnostics);

    Object.assign(result, measurement, {
      navigation: {
        ...result.navigation,
        measuredAtUtc: measurement.capturedAtUtc,
        documentReadyState: readiness.documentReadyState,
        fonts: readiness.fonts,
        readySurfaceBeforeSettle: readiness.readySurface,
        readySurfaceAfterSettle: readyAfterSettle,
        boundedSettleMs: options.settleMs,
      },
      diagnostics: serializedDiagnostics,
      resources: resources.serialize(),
    });

    const failures = [...contractErrors, ...runtimeErrors];
    if (failures.length > 0) {
      result.failure = {
        stage: 'runtime-validation',
        reasons: failures,
      };
    } else {
      result.status = 'passed';
    }
  } catch (error) {
    result.failure = {
      stage,
      reasons: [errorRecord(error).message],
      error: errorRecord(error),
    };
    result.diagnostics = serializeDiagnostics(diagnostics);
    result.resources = resources.serialize();
  } finally {
    if (context) {
      try {
        await context.close();
      } catch (error) {
        result.status = 'failed';
        const closeFailure = `context close failed: ${errorRecord(error).message}`;
        if (result.failure) {
          result.failure.reasons.push(closeFailure);
        } else {
          result.failure = {
            stage: 'context-close',
            reasons: [closeFailure],
          };
        }
      }
    }
  }

  return result;
}

async function writeJsonAtomic(outputPath, value) {
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  try {
    await writeFile(temporaryPath, serialized, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o644,
    });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function run(options) {
  const authorityUrl = validateAuthorityUrl(options.url);
  const output = resolveOutputPath(options.output);
  const runStartedAtUtc = new Date().toISOString();
  const results = [];
  let browser = null;
  let browserVersion = null;
  let launchFailure = null;

  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
    browserVersion = browser.version();

    for (const profile of PROFILE_DEFINITIONS) {
      results.push(
        await probeProfile(browser, browserVersion, authorityUrl, {
          profile,
          timeoutMs: options.timeoutMs,
          settleMs: options.settleMs,
        }),
      );
    }
  } catch (error) {
    launchFailure = errorRecord(error);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        launchFailure ??= errorRecord(error);
      }
    }
  }

  const failedProfiles = results
    .filter((profile) => profile.status !== 'passed')
    .map((profile) => ({
      id: profile.id,
      stage: profile.failure?.stage ?? 'unknown',
      reasons: profile.failure?.reasons ?? ['Unknown profile failure'],
    }));
  const expectedProfileCount = PROFILE_DEFINITIONS.length;
  const runPassed =
    !launchFailure &&
    results.length === expectedProfileCount &&
    failedProfiles.length === 0;
  const report = {
    schemaId: SCHEMA_ID,
    schemaVersion: 1,
    artifactType: 'vectr-live-profile-probe',
    generatedAtUtc: new Date().toISOString(),
    runStatus: runPassed ? 'passed' : 'failed',
    authority: {
      requestedUrl: authorityUrl,
      defaultUrl: DEFAULT_AUTHORITY_URL,
    },
    units: {
      boxes:
        'CSS pixels; boxes include x, y, width, height, edges, and document coordinates',
      clockTime: 'UTC ISO 8601 strings',
      boundedSettle: 'milliseconds',
    },
    provenance: {
      generatedBy: GENERATED_BY,
      note:
        'Repository-owned current-live readiness, profile, geometry, and ' +
        'diagnostic observation. This is a distinct artifact schema, not the ' +
        'legacy dom-profiles trace, timing, boundary, or resource-hash schema. ' +
        'Values are run-specific and reruns may expose upstream changes.',
      execution: {
        runStartedAtUtc,
        requestedOutput: output.repositoryPath,
        failureOutput: output.failureRepositoryPath,
        headless: true,
        browserChannel: 'chrome',
        isolatedBrowserContextPerProfile: true,
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',
        reducedMotionOverride: null,
        forcedColorsOverride: null,
        timeoutMs: options.timeoutMs,
        boundedSettleMs: options.settleMs,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
      runtimeFailurePolicy:
        'Main navigation must return 200; readiness, required selector/input ' +
        'contracts, uncaught page errors, and observed main-thread WebGL ' +
        'context-loss events are fatal. Console messages, ancillary request ' +
        'failures, and HTTP resource errors remain recorded diagnostics.',
    },
    browser: {
      name: 'chromium',
      channel: 'chrome',
      version: browserVersion,
    },
    profileOrder: PROFILE_DEFINITIONS.map((profile) => profile.id),
    profiles: results,
    failures: {
      launch: launchFailure,
      profiles: failedProfiles,
      missingProfileCount: expectedProfileCount - results.length,
    },
  };

  const writtenOutput = runPassed
    ? {
        absolutePath: output.absolutePath,
        repositoryPath: output.repositoryPath,
      }
    : {
        absolutePath: output.failureAbsolutePath,
        repositoryPath: output.failureRepositoryPath,
      };
  report.provenance.execution.writtenOutput = writtenOutput.repositoryPath;
  await writeJsonAtomic(writtenOutput.absolutePath, report);

  if (!runPassed) {
    const summary = launchFailure
      ? `Chromium launch/run failure: ${launchFailure.message}`
      : `${failedProfiles.length} profile(s) failed`;
    throw new Error(
      `${summary}; failure report written to ${writtenOutput.repositoryPath}`,
    );
  }

  console.log(`Wrote ${writtenOutput.repositoryPath}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  await run(options);
}

main().catch((error) => {
  console.error(errorRecord(error).message);
  process.exitCode = 1;
});
