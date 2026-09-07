import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type CDPSession } from '@playwright/test';

/* eslint-disable playwright/no-conditional-in-test -- The probe normalizes
 * browser capability, viewport-profile, and acceptance-mode branches into one
 * deterministic report schema. */

const PERFORMANCE_ENABLED = process.env['HERO_PERFORMANCE'] === '1';
const BASE_URL_EXPLICIT =
  typeof process.env['BASE_URL'] === 'string' &&
  /^https?:\/\//u.test(process.env['BASE_URL']);
const ACCEPTANCE_REQUESTED = process.env['HERO_PERFORMANCE_ACCEPTANCE'] === '1';
const SERVER_MODE =
  process.env['HERO_PERFORMANCE_SERVER_MODE'] === 'production'
    ? 'production'
    : process.env['HERO_PERFORMANCE_SERVER_MODE'] === 'development'
      ? 'development'
      : 'unverified';
const HARDWARE_PROFILE =
  process.env['HERO_PERFORMANCE_HARDWARE']?.trim() || null;
const ACCEPTANCE_ELIGIBILITY_FAILURES = [
  ...(!BASE_URL_EXPLICIT ? ['BASE_URL is not explicit.'] : []),
  ...(SERVER_MODE !== 'production'
    ? ['HERO_PERFORMANCE_SERVER_MODE is not production.']
    : []),
  ...(!HARDWARE_PROFILE
    ? ['HERO_PERFORMANCE_HARDWARE does not identify locked hardware.']
    : []),
];
const ACCEPTANCE_ELIGIBLE = ACCEPTANCE_ELIGIBILITY_FAILURES.length === 0;
const ACCEPTANCE_ENABLED = ACCEPTANCE_REQUESTED && ACCEPTANCE_ELIGIBLE;
const SCRUB_DURATION_PER_DIRECTION_MS = 4_000;

type NumericBudgetCheck = {
  id: 'cls' | 'frame-interval-p95' | 'lcp' | 'long-task';
  limit: number;
  measured: boolean;
  operator: '<' | '<=';
  passed: boolean;
  unit: 'ms' | 'score';
  value: number | null;
};

type CdpDiagnostics = {
  available: boolean;
  domCounters: {
    documents: number;
    jsEventListeners: number;
    nodes: number;
  } | null;
  error: string | null;
  metrics: {
    jsHeapTotalBytes: number | null;
    jsHeapUsedBytes: number | null;
    layoutCount: number | null;
    layoutDurationMs: number | null;
    nodes: number | null;
    recalcStyleCount: number | null;
    recalcStyleDurationMs: number | null;
    scriptDurationMs: number | null;
    taskDurationMs: number | null;
  } | null;
};

function round(value: number, precision = 3) {
  const multiplier = 10 ** precision;

  return Math.round(value * multiplier) / multiplier;
}

function percentile(values: readonly number[], percentileRank: number) {
  if (values.length === 0) {
    return null;
  }

  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(
      ordered.length - 1,
      Math.ceil(percentileRank * ordered.length) - 1,
    ),
  );

  return ordered[index];
}

function summarizeFrameIntervals(
  values: readonly number[],
  frameBudgetMs: number,
) {
  const minimum = values.length > 0 ? Math.min(...values) : null;
  const median = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  const p99 = percentile(values, 0.99);
  const maximum = values.length > 0 ? Math.max(...values) : null;
  const totalDurationMs = values.reduce((total, value) => total + value, 0);

  return {
    method: 'requestAnimationFrame-nearest-rank' as const,
    note: 'Intervals measure browser presentation cadence during the scrub; they are not isolated GPU render durations.',
    sampleCount: values.length,
    minMs: minimum === null ? null : round(minimum),
    medianMs: median === null ? null : round(median),
    p95Ms: p95 === null ? null : round(p95),
    p99Ms: p99 === null ? null : round(p99),
    maxMs: maximum === null ? null : round(maximum),
    meanMs: values.length === 0 ? null : round(totalDurationMs / values.length),
    effectiveFps:
      totalDurationMs <= 0
        ? null
        : round((values.length * 1_000) / totalDurationMs),
    overBudgetCount: values.filter((value) => value > frameBudgetMs).length,
    estimatedDroppedFrameCount: values.reduce(
      (count, value) =>
        count + Math.max(0, Math.ceil(value / frameBudgetMs) - 1),
      0,
    ),
  };
}

function metricValue(
  metrics: readonly { name: string; value: number }[],
  name: string,
) {
  const value = metrics.find((metric) => metric.name === name)?.value;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function readCdpDiagnostics(
  session: CDPSession | null,
): Promise<CdpDiagnostics> {
  if (!session) {
    return {
      available: false,
      domCounters: null,
      error: 'CDP is unavailable for this browser.',
      metrics: null,
    };
  }

  try {
    const [performanceMetrics, domCounters] = await Promise.all([
      session.send('Performance.getMetrics'),
      session.send('Memory.getDOMCounters'),
    ]);
    const metrics = performanceMetrics.metrics;

    return {
      available: true,
      domCounters: {
        documents: domCounters.documents,
        jsEventListeners: domCounters.jsEventListeners,
        nodes: domCounters.nodes,
      },
      error: null,
      metrics: {
        jsHeapTotalBytes: metricValue(metrics, 'JSHeapTotalSize'),
        jsHeapUsedBytes: metricValue(metrics, 'JSHeapUsedSize'),
        layoutCount: metricValue(metrics, 'LayoutCount'),
        layoutDurationMs: (metricValue(metrics, 'LayoutDuration') ?? 0) * 1_000,
        nodes: metricValue(metrics, 'Nodes'),
        recalcStyleCount: metricValue(metrics, 'RecalcStyleCount'),
        recalcStyleDurationMs:
          (metricValue(metrics, 'RecalcStyleDuration') ?? 0) * 1_000,
        scriptDurationMs: (metricValue(metrics, 'ScriptDuration') ?? 0) * 1_000,
        taskDurationMs: (metricValue(metrics, 'TaskDuration') ?? 0) * 1_000,
      },
    };
  } catch (error) {
    return {
      available: false,
      domCounters: null,
      error: error instanceof Error ? error.message : String(error),
      metrics: null,
    };
  }
}

function cdpDelta(before: CdpDiagnostics, after: CdpDiagnostics) {
  const subtract = (
    afterValue: number | null | undefined,
    beforeValue: number | null | undefined,
  ) =>
    typeof afterValue === 'number' && typeof beforeValue === 'number'
      ? round(afterValue - beforeValue)
      : null;

  return {
    jsHeapUsedBytes: subtract(
      after.metrics?.jsHeapUsedBytes,
      before.metrics?.jsHeapUsedBytes,
    ),
    layoutCount: subtract(
      after.metrics?.layoutCount,
      before.metrics?.layoutCount,
    ),
    layoutDurationMs: subtract(
      after.metrics?.layoutDurationMs,
      before.metrics?.layoutDurationMs,
    ),
    recalcStyleCount: subtract(
      after.metrics?.recalcStyleCount,
      before.metrics?.recalcStyleCount,
    ),
    recalcStyleDurationMs: subtract(
      after.metrics?.recalcStyleDurationMs,
      before.metrics?.recalcStyleDurationMs,
    ),
    scriptDurationMs: subtract(
      after.metrics?.scriptDurationMs,
      before.metrics?.scriptDurationMs,
    ),
    taskDurationMs: subtract(
      after.metrics?.taskDurationMs,
      before.metrics?.taskDurationMs,
    ),
  };
}

test.describe('Phase 19 hero performance probe', () => {
  // The probe must never expand the ordinary E2E workload implicitly.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    !PERFORMANCE_ENABLED,
    'Set HERO_PERFORMANCE=1 to run the locked performance probe.',
  );
  test.setTimeout(75_000);

  test('records a full forward and reverse hero scrub', async ({
    browserName,
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      type LongTaskSample = {
        durationMs: number;
        startTimeMs: number;
      };
      type ResourceCounter = {
        created: number;
        deleted: number;
        live: number;
        peakLive: number;
      };
      type WebGlProbe = {
        contextsCreated: number;
        drawCalls: {
          byMethod: Record<string, number>;
          estimatedPrimitives: number;
          total: number;
        };
        resources: {
          buffers: ResourceCounter;
          programs: ResourceCounter;
          textures: ResourceCounter;
        };
        supported: boolean;
      };
      type HeroPerformanceProbe = {
        cls: {
          cumulative: number;
          entryCount: number;
          maxSingleShift: number;
        };
        lcp: {
          element: string | null;
          sizeCssPixels: number | null;
          startTimeMs: number;
          url: string | null;
        } | null;
        longTasks: LongTaskSample[];
        supported: {
          cls: boolean;
          lcp: boolean;
          longTask: boolean;
          performanceMemory: boolean;
          resourceTiming: boolean;
          webglInterception: boolean;
        };
        webgl: WebGlProbe;
      };
      type LayoutShiftEntry = PerformanceEntry & {
        hadRecentInput?: boolean;
        value?: number;
      };
      type LargestContentfulPaintEntry = PerformanceEntry & {
        element?: Element | null;
        size?: number;
        url?: string;
      };
      type ResourceKind = 'buffers' | 'programs' | 'textures';

      const supportedEntryTypes = PerformanceObserver.supportedEntryTypes ?? [];
      const webgl: WebGlProbe = {
        contextsCreated: 0,
        drawCalls: {
          byMethod: {},
          estimatedPrimitives: 0,
          total: 0,
        },
        resources: {
          buffers: {
            created: 0,
            deleted: 0,
            live: 0,
            peakLive: 0,
          },
          programs: {
            created: 0,
            deleted: 0,
            live: 0,
            peakLive: 0,
          },
          textures: {
            created: 0,
            deleted: 0,
            live: 0,
            peakLive: 0,
          },
        },
        supported:
          typeof WebGLRenderingContext !== 'undefined' ||
          typeof WebGL2RenderingContext !== 'undefined',
      };
      const probe: HeroPerformanceProbe = {
        cls: {
          cumulative: 0,
          entryCount: 0,
          maxSingleShift: 0,
        },
        lcp: null,
        longTasks: [],
        supported: {
          cls: supportedEntryTypes.includes('layout-shift'),
          lcp: supportedEntryTypes.includes('largest-contentful-paint'),
          longTask: supportedEntryTypes.includes('longtask'),
          performanceMemory: 'memory' in performance,
          resourceTiming:
            supportedEntryTypes.includes('resource') ||
            typeof PerformanceResourceTiming !== 'undefined',
          webglInterception: webgl.supported,
        },
        webgl,
      };
      const scope = window as Window & {
        __heroPerformanceProbe?: HeroPerformanceProbe;
      };

      scope.__heroPerformanceProbe = probe;

      const describeElement = (element: Element | null | undefined) => {
        if (!element) {
          return null;
        }

        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList]
          .slice(0, 2)
          .map((className) => `.${className}`)
          .join('');

        return `${element.tagName.toLowerCase()}${id}${classes}`;
      };

      if (probe.supported.lcp) {
        new PerformanceObserver((list) => {
          const entry = list.getEntries().at(-1) as
            | LargestContentfulPaintEntry
            | undefined;

          if (entry) {
            probe.lcp = {
              element: describeElement(entry.element),
              sizeCssPixels: typeof entry.size === 'number' ? entry.size : null,
              startTimeMs: entry.startTime,
              url: entry.url || null,
            };
          }
        }).observe({
          buffered: true,
          type: 'largest-contentful-paint',
        });
      }

      if (probe.supported.cls) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShiftEntry;

            if (!layoutShift.hadRecentInput) {
              const value = layoutShift.value ?? 0;

              probe.cls.cumulative += value;
              probe.cls.entryCount += 1;
              probe.cls.maxSingleShift = Math.max(
                probe.cls.maxSingleShift,
                value,
              );
            }
          }
        }).observe({
          buffered: true,
          type: 'layout-shift',
        });
      }

      if (probe.supported.longTask) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            probe.longTasks.push({
              durationMs: entry.duration,
              startTimeMs: entry.startTime,
            });
          }
        }).observe({
          buffered: true,
          type: 'longtask',
        });
      }

      const trackedResources: Record<ResourceKind, WeakSet<object>> = {
        buffers: new WeakSet(),
        programs: new WeakSet(),
        textures: new WeakSet(),
      };
      const wrappedFunctions = new WeakSet<object>();
      const trackedContexts = new WeakSet<object>();
      const contextPrototypes: object[] = [];

      if (typeof WebGLRenderingContext !== 'undefined') {
        contextPrototypes.push(WebGLRenderingContext.prototype);
      }

      if (typeof WebGL2RenderingContext !== 'undefined') {
        contextPrototypes.push(WebGL2RenderingContext.prototype);
      }

      const mutateResource = (
        resourceKind: ResourceKind,
        action: 'create' | 'delete',
        resource: unknown,
      ) => {
        if (
          (typeof resource !== 'object' || resource === null) &&
          typeof resource !== 'function'
        ) {
          return;
        }

        const objectResource = resource as object;
        const tracked = trackedResources[resourceKind];
        const counter = webgl.resources[resourceKind];

        if (action === 'create' && !tracked.has(objectResource)) {
          tracked.add(objectResource);
          counter.created += 1;
          counter.live += 1;
          counter.peakLive = Math.max(counter.peakLive, counter.live);
        }

        if (action === 'delete' && tracked.has(objectResource)) {
          tracked.delete(objectResource);
          counter.deleted += 1;
          counter.live = Math.max(0, counter.live - 1);
        }
      };
      const replaceMethod = (
        prototype: object,
        methodName: string,
        replacement: (
          original: (...args: unknown[]) => unknown,
          receiver: unknown,
          args: unknown[],
        ) => unknown,
      ) => {
        const methodOwner = prototype as Record<string, unknown>;
        const original = methodOwner[methodName];

        if (typeof original !== 'function' || wrappedFunctions.has(original)) {
          return;
        }

        const wrapped = function (this: unknown, ...args: unknown[]) {
          return replacement(
            original as (...args: unknown[]) => unknown,
            this,
            args,
          );
        };

        wrappedFunctions.add(wrapped);
        Object.defineProperty(prototype, methodName, {
          configurable: true,
          value: wrapped,
          writable: true,
        });
      };
      const primitiveCount = (
        mode: number,
        vertexOrIndexCount: number,
        instanceCount: number,
      ) => {
        const count = Math.max(0, vertexOrIndexCount);
        let primitives = 0;

        switch (mode) {
          case 0:
            primitives = count;
            break;
          case 1:
            primitives = Math.floor(count / 2);
            break;
          case 2:
            primitives = count > 1 ? count : 0;
            break;
          case 3:
            primitives = Math.max(0, count - 1);
            break;
          case 4:
            primitives = Math.floor(count / 3);
            break;
          case 5:
          case 6:
            primitives = Math.max(0, count - 2);
            break;
          default:
            primitives = 0;
        }

        return primitives * Math.max(1, instanceCount);
      };

      for (const prototype of contextPrototypes) {
        for (const [createMethod, deleteMethod, resourceKind] of [
          ['createBuffer', 'deleteBuffer', 'buffers'],
          ['createProgram', 'deleteProgram', 'programs'],
          ['createTexture', 'deleteTexture', 'textures'],
        ] as const) {
          replaceMethod(prototype, createMethod, (original, receiver, args) => {
            const resource = Reflect.apply(original, receiver, args);

            mutateResource(resourceKind, 'create', resource);

            return resource;
          });
          replaceMethod(prototype, deleteMethod, (original, receiver, args) => {
            mutateResource(resourceKind, 'delete', args[0]);

            return Reflect.apply(original, receiver, args);
          });
        }

        for (const methodName of [
          'drawArrays',
          'drawElements',
          'drawArraysInstanced',
          'drawElementsInstanced',
        ]) {
          replaceMethod(prototype, methodName, (original, receiver, args) => {
            const mode = Number(args[0] ?? -1);
            const count =
              methodName === 'drawArrays' ||
              methodName === 'drawArraysInstanced'
                ? Number(args[2] ?? 0)
                : Number(args[1] ?? 0);
            const instances =
              methodName === 'drawArraysInstanced'
                ? Number(args[3] ?? 1)
                : methodName === 'drawElementsInstanced'
                  ? Number(args[4] ?? 1)
                  : 1;

            webgl.drawCalls.total += 1;
            webgl.drawCalls.byMethod[methodName] =
              (webgl.drawCalls.byMethod[methodName] ?? 0) + 1;
            webgl.drawCalls.estimatedPrimitives += primitiveCount(
              mode,
              count,
              instances,
            );

            return Reflect.apply(original, receiver, args);
          });
        }
      }

      const canvasPrototype = HTMLCanvasElement.prototype as unknown as Record<
        string,
        unknown
      >;
      const originalGetContext = canvasPrototype['getContext'];

      if (typeof originalGetContext === 'function') {
        canvasPrototype['getContext'] = function (
          this: HTMLCanvasElement,
          ...args: unknown[]
        ) {
          const context = Reflect.apply(originalGetContext, this, args);

          if (
            context &&
            typeof context === 'object' &&
            (args[0] === 'webgl' ||
              args[0] === 'experimental-webgl' ||
              args[0] === 'webgl2') &&
            !trackedContexts.has(context)
          ) {
            trackedContexts.add(context);
            webgl.contextsCreated += 1;
          }

          return context;
        };
      }
    });

    const navigationResponse = await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });
    const shell = page.locator('[data-hero-shell]');
    const surface = page.locator('[data-hero-surface]').first();

    await expect(shell).toHaveAttribute('data-loader-cleared', 'true', {
      timeout: 15_000,
    });
    await expect(surface).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        () =>
          surface.evaluate((element) => {
            const canvas = element.querySelector('canvas');

            return (
              !canvas ||
              (canvas.width > 0 &&
                canvas.height > 0 &&
                canvas.getContext('webgl2') !== null)
            );
          }),
        {
          message: 'Canvas must expose an initialized WebGL2 context.',
          timeout: 15_000,
        },
      )
      .toBe(true);

    let cdpSession: CDPSession | null = null;

    if (browserName === 'chromium') {
      try {
        cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Performance.enable');
      } catch {
        cdpSession = null;
      }
    }

    const cdpBefore = await readCdpDiagnostics(cdpSession);
    const scrub = await page.evaluate(
      async ({ durationMs }) => {
        type LongTaskSample = {
          durationMs: number;
          startTimeMs: number;
        };
        type ResourceCounter = {
          created: number;
          deleted: number;
          live: number;
          peakLive: number;
        };
        type StoredProbe = {
          cls: {
            cumulative: number;
            entryCount: number;
            maxSingleShift: number;
          };
          lcp: {
            element: string | null;
            sizeCssPixels: number | null;
            startTimeMs: number;
            url: string | null;
          } | null;
          longTasks: LongTaskSample[];
          supported: {
            cls: boolean;
            lcp: boolean;
            longTask: boolean;
            performanceMemory: boolean;
            resourceTiming: boolean;
            webglInterception: boolean;
          };
          webgl: {
            contextsCreated: number;
            drawCalls: {
              byMethod: Record<string, number>;
              estimatedPrimitives: number;
              total: number;
            };
            resources: {
              buffers: ResourceCounter;
              programs: ResourceCounter;
              textures: ResourceCounter;
            };
            supported: boolean;
          };
        };
        type HeroSignature = {
          rawProgress: number | null;
          sceneProgress: number | null;
          scrollY: number;
        };
        type PerformanceWithMemory = Performance & {
          memory?: {
            jsHeapSizeLimit: number;
            totalJSHeapSize: number;
            usedJSHeapSize: number;
          };
        };

        const scope = window as Window & {
          __heroPerformanceProbe?: StoredProbe;
        };
        const probe = scope.__heroPerformanceProbe;
        const shellElement =
          document.querySelector<HTMLElement>('[data-hero-shell]');
        const flowElement = document.querySelector<HTMLElement>(
          '[data-hero-process]',
        );

        if (!probe || !shellElement || !flowElement) {
          throw new Error('Hero performance instrumentation did not mount.');
        }

        const parseProgress = (value: string | undefined) => {
          if (!value) {
            return null;
          }

          const parsed = Number(value);

          return Number.isFinite(parsed) ? parsed : null;
        };
        const readSignature = (): HeroSignature => ({
          rawProgress: parseProgress(shellElement.dataset.heroRawProgress),
          sceneProgress: parseProgress(shellElement.dataset.heroSceneProgress),
          scrollY: window.scrollY,
        });
        const readHeap = () => {
          const memory = (performance as PerformanceWithMemory).memory;

          return memory
            ? {
                available: true,
                jsHeapSizeLimitBytes: memory.jsHeapSizeLimit,
                totalJsHeapSizeBytes: memory.totalJSHeapSize,
                usedJsHeapSizeBytes: memory.usedJSHeapSize,
              }
            : {
                available: false,
                jsHeapSizeLimitBytes: null,
                totalJsHeapSizeBytes: null,
                usedJsHeapSizeBytes: null,
              };
        };
        const cloneWebGl = () =>
          JSON.parse(JSON.stringify(probe.webgl)) as StoredProbe['webgl'];
        const nextFrame = () =>
          new Promise<number>((resolve) => requestAnimationFrame(resolve));
        const settle = async () => {
          await nextFrame();
          await nextFrame();
        };
        const runLeg = (
          fromY: number,
          toY: number,
          direction: 'forward' | 'reverse',
        ) =>
          new Promise<{
            direction: 'forward' | 'reverse';
            fromY: number;
            intervalsMs: number[];
            toY: number;
          }>((resolve) => {
            const intervalsMs: number[] = [];
            let firstTimestamp: number | null = null;
            let previousTimestamp: number | null = null;

            const update = (timestamp: number) => {
              firstTimestamp ??= timestamp;

              if (previousTimestamp !== null) {
                intervalsMs.push(timestamp - previousTimestamp);
              }

              previousTimestamp = timestamp;

              const elapsed = timestamp - firstTimestamp;
              const progress = Math.min(1, elapsed / durationMs);
              const easedProgress =
                progress < 0.5
                  ? 2 * progress * progress
                  : 1 - (-2 * progress + 2) ** 2 / 2;

              window.scrollTo(0, fromY + (toY - fromY) * easedProgress);

              if (progress < 1) {
                requestAnimationFrame(update);
                return;
              }

              resolve({
                direction,
                fromY,
                intervalsMs,
                toY,
              });
            };

            requestAnimationFrame(update);
          });

        const documentRoot = document.documentElement;
        const previousScrollBehavior = documentRoot.style.scrollBehavior;
        documentRoot.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        await settle();

        const maximumScrollY = Math.max(
          0,
          documentRoot.scrollHeight - window.innerHeight,
        );
        const heroScrollRange = Math.max(
          0,
          flowElement.offsetHeight - window.innerHeight,
        );
        const startY = 0;
        const endY = Math.min(
          maximumScrollY,
          window.innerHeight * 0.4 + heroScrollRange,
        );
        const lcpAtScrubStart = probe.lcp ? { ...probe.lcp } : null;
        const heapBefore = readHeap();
        const webglBefore = cloneWebGl();
        const scrubStartedAtMs = performance.now();
        const forward = await runLeg(startY, endY, 'forward');
        await settle();
        const forwardEnd = readSignature();
        const reverse = await runLeg(endY, startY, 'reverse');
        await settle();
        const reverseEnd = readSignature();
        const scrubEndedAtMs = performance.now();
        const webglAfter = cloneWebGl();
        const heapAfter = readHeap();

        documentRoot.style.scrollBehavior = previousScrollBehavior;

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 150);
        });

        const canvases = [
          ...document.querySelectorAll<HTMLCanvasElement>(
            '[data-hero-surface] canvas',
          ),
        ];
        const canvasMetrics = canvases.map((canvas) => {
          const bounds = canvas.getBoundingClientRect();
          const gl =
            canvas.getContext('webgl2') ??
            canvas.getContext('webgl') ??
            canvas.getContext('experimental-webgl');

          if (
            !(gl instanceof WebGLRenderingContext) &&
            !(gl instanceof WebGL2RenderingContext)
          ) {
            return {
              backingPixels: {
                height: canvas.height,
                width: canvas.width,
              },
              context: null,
              cssPixels: {
                height: bounds.height,
                width: bounds.width,
              },
              effectiveDpr: {
                x: bounds.width > 0 ? canvas.width / bounds.width : null,
                y: bounds.height > 0 ? canvas.height / bounds.height : null,
              },
            };
          }

          const debugRendererInfo = gl.getExtension(
            'WEBGL_debug_renderer_info',
          ) as {
            UNMASKED_RENDERER_WEBGL: number;
            UNMASKED_VENDOR_WEBGL: number;
          } | null;

          return {
            backingPixels: {
              height: canvas.height,
              width: canvas.width,
            },
            context: {
              api: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
              attributes: gl.getContextAttributes(),
              caps: {
                maxCombinedTextureImageUnits: gl.getParameter(
                  gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
                ) as number,
                maxRenderbufferSize: gl.getParameter(
                  gl.MAX_RENDERBUFFER_SIZE,
                ) as number,
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
                maxVertexAttribs: gl.getParameter(
                  gl.MAX_VERTEX_ATTRIBS,
                ) as number,
              },
              renderer: debugRendererInfo
                ? (gl.getParameter(
                    debugRendererInfo.UNMASKED_RENDERER_WEBGL,
                  ) as string)
                : null,
              rendererMasked: gl.getParameter(gl.RENDERER) as string,
              shadingLanguageVersion: gl.getParameter(
                gl.SHADING_LANGUAGE_VERSION,
              ) as string,
              vendor: debugRendererInfo
                ? (gl.getParameter(
                    debugRendererInfo.UNMASKED_VENDOR_WEBGL,
                  ) as string)
                : null,
              vendorMasked: gl.getParameter(gl.VENDOR) as string,
              version: gl.getParameter(gl.VERSION) as string,
            },
            cssPixels: {
              height: bounds.height,
              width: bounds.width,
            },
            effectiveDpr: {
              x: bounds.width > 0 ? canvas.width / bounds.width : null,
              y: bounds.height > 0 ? canvas.height / bounds.height : null,
            },
          };
        });
        const navigation = performance.getEntriesByType('navigation').at(-1) as
          | PerformanceNavigationTiming
          | undefined;
        const resourceEntries = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceTiming[];
        const resourceBucket = (entry: PerformanceResourceTiming) => {
          if (
            entry.initiatorType === 'script' ||
            /\.m?js(?:$|\?)/u.test(entry.name)
          ) {
            return 'script';
          }

          if (
            entry.initiatorType === 'css' ||
            /\.css(?:$|\?)/u.test(entry.name)
          ) {
            return 'style';
          }

          if (
            entry.initiatorType === 'img' ||
            /\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|\?)/u.test(entry.name)
          ) {
            return 'image';
          }

          if (/\.(?:otf|ttf|woff2?)(?:$|\?)/u.test(entry.name)) {
            return 'font';
          }

          if (
            entry.initiatorType === 'fetch' ||
            entry.initiatorType === 'xmlhttprequest'
          ) {
            return 'fetch';
          }

          return 'other';
        };
        const resourceGroups: Record<
          string,
          {
            count: number;
            decodedBodyBytes: number;
            encodedBodyBytes: number;
            transferBytes: number;
          }
        > = {};

        for (const entry of resourceEntries) {
          const bucket = resourceBucket(entry);
          const group = (resourceGroups[bucket] ??= {
            count: 0,
            decodedBodyBytes: 0,
            encodedBodyBytes: 0,
            transferBytes: 0,
          });

          group.count += 1;
          group.decodedBodyBytes += entry.decodedBodySize;
          group.encodedBodyBytes += entry.encodedBodySize;
          group.transferBytes += entry.transferSize;
        }

        const resourceTotals = Object.values(resourceGroups).reduce(
          (totals, group) => ({
            count: totals.count + group.count,
            decodedBodyBytes: totals.decodedBodyBytes + group.decodedBodyBytes,
            encodedBodyBytes: totals.encodedBodyBytes + group.encodedBodyBytes,
            transferBytes: totals.transferBytes + group.transferBytes,
          }),
          {
            count: 0,
            decodedBodyBytes: 0,
            encodedBodyBytes: 0,
            transferBytes: 0,
          },
        );
        const navigationBytes = navigation
          ? {
              decodedBodyBytes: navigation.decodedBodySize,
              encodedBodyBytes: navigation.encodedBodySize,
              transferBytes: navigation.transferSize,
            }
          : null;
        const lifecycleLongTasks = probe.longTasks.map((entry) => ({
          durationMs: entry.durationMs,
          startTimeMs: entry.startTimeMs,
        }));

        return {
          canvas: {
            count: canvases.length,
            entries: canvasMetrics,
            windowDevicePixelRatio: window.devicePixelRatio,
          },
          cls: probe.cls,
          durationPerDirectionMs: durationMs,
          forward: {
            end: forwardEnd,
            fromY: forward.fromY,
            intervalCount: forward.intervalsMs.length,
            toY: forward.toY,
          },
          frameIntervalsMs: [...forward.intervalsMs, ...reverse.intervalsMs],
          heap: {
            after: heapAfter,
            before: heapBefore,
            deltaUsedBytes:
              heapBefore.usedJsHeapSizeBytes !== null &&
              heapAfter.usedJsHeapSizeBytes !== null
                ? heapAfter.usedJsHeapSizeBytes - heapBefore.usedJsHeapSizeBytes
                : null,
          },
          lcp: {
            finalObserved: probe.lcp,
            navigation: lcpAtScrubStart,
          },
          longTasks: {
            lifecycle: lifecycleLongTasks,
            scrub: lifecycleLongTasks.filter(
              (entry) =>
                entry.startTimeMs >= scrubStartedAtMs &&
                entry.startTimeMs <= scrubEndedAtMs,
            ),
          },
          resources: {
            groups: resourceGroups,
            navigation: navigationBytes,
            note: 'Resource Timing transferSize includes protocol overhead where exposed; zero can mean cache reuse or unavailable cross-origin timing.',
            topByTransfer: resourceEntries
              .map((entry) => {
                let assetPath = entry.name;

                try {
                  const url = new URL(entry.name);
                  assetPath = `${url.pathname}${url.search}`;
                } catch {
                  // Preserve the browser-provided value when it is not a URL.
                }

                return {
                  decodedBodyBytes: entry.decodedBodySize,
                  encodedBodyBytes: entry.encodedBodySize,
                  initiatorType: entry.initiatorType,
                  path: assetPath,
                  transferBytes: entry.transferSize,
                };
              })
              .sort((left, right) => right.transferBytes - left.transferBytes)
              .slice(0, 20),
            totals: resourceTotals,
          },
          reverse: {
            end: reverseEnd,
            fromY: reverse.fromY,
            intervalCount: reverse.intervalsMs.length,
            toY: reverse.toY,
          },
          scrubDurationMs: scrubEndedAtMs - scrubStartedAtMs,
          supported: probe.supported,
          webgl: {
            after: webglAfter,
            before: webglBefore,
            scrubDelta: {
              drawCalls:
                webglAfter.drawCalls.total - webglBefore.drawCalls.total,
              estimatedPrimitives:
                webglAfter.drawCalls.estimatedPrimitives -
                webglBefore.drawCalls.estimatedPrimitives,
            },
          },
        };
      },
      {
        durationMs: SCRUB_DURATION_PER_DIRECTION_MS,
      },
    );
    const cdpAfter = await readCdpDiagnostics(cdpSession);

    if (cdpSession) {
      await cdpSession.detach();
    }

    const runtime = await page.evaluate(() => ({
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    }));
    const profile = runtime.viewport.width <= 820 ? 'mobile' : 'desktop';
    const frameBudgetMs = profile === 'mobile' ? 33.3 : 16.7;
    const frameIntervals = summarizeFrameIntervals(
      scrub.frameIntervalsMs,
      frameBudgetMs,
    );
    const scrubLongTasks = scrub.longTasks.scrub.map((entry) => ({
      durationMs: round(entry.durationMs),
      startTimeMs: round(entry.startTimeMs),
    }));
    const lifecycleLongTasks = scrub.longTasks.lifecycle.map((entry) => ({
      durationMs: round(entry.durationMs),
      startTimeMs: round(entry.startTimeMs),
    }));
    const maximumLongTaskMs =
      scrubLongTasks.length > 0
        ? Math.max(...scrubLongTasks.map((entry) => entry.durationMs))
        : 0;
    const lcpMs =
      scrub.supported.lcp && scrub.lcp.navigation !== null
        ? round(scrub.lcp.navigation.startTimeMs)
        : null;
    const cls = scrub.supported.cls ? round(scrub.cls.cumulative, 6) : null;
    const budgetChecks: NumericBudgetCheck[] = [
      {
        id: 'lcp',
        limit: 2_500,
        measured: lcpMs !== null,
        operator: '<',
        passed: lcpMs !== null && lcpMs < 2_500,
        unit: 'ms',
        value: lcpMs,
      },
      {
        id: 'cls',
        limit: 0.1,
        measured: cls !== null,
        operator: '<',
        passed: cls !== null && cls < 0.1,
        unit: 'score',
        value: cls,
      },
      {
        id: 'frame-interval-p95',
        limit: frameBudgetMs,
        measured: frameIntervals.p95Ms !== null,
        operator: '<=',
        passed:
          frameIntervals.p95Ms !== null &&
          frameIntervals.p95Ms <= frameBudgetMs,
        unit: 'ms',
        value: frameIntervals.p95Ms,
      },
      {
        id: 'long-task',
        limit: 50,
        measured: scrub.supported.longTask,
        operator: '<=',
        passed: scrub.supported.longTask && maximumLongTaskMs <= 50,
        unit: 'ms',
        value: scrub.supported.longTask ? maximumLongTaskMs : null,
      },
    ];
    const forwardScrollCovered =
      Math.abs(scrub.forward.end.scrollY - scrub.forward.toY) <= 1;
    const reverseScrollCovered =
      Math.abs(scrub.reverse.end.scrollY - scrub.reverse.toY) <= 1;
    const fullForward =
      forwardScrollCovered &&
      (scrub.forward.end.rawProgress === null ||
        scrub.forward.end.rawProgress >= 0.999);
    const fullReverse =
      reverseScrollCovered &&
      (scrub.reverse.end.rawProgress === null ||
        scrub.reverse.end.rawProgress <= 0.001);
    const budgetsPass = budgetChecks.every((check) => check.passed);
    const softwareRenderer = scrub.canvas.entries.some((entry) =>
      /swiftshader|llvmpipe|software rasterizer/iu.test(
        entry.context?.renderer ?? entry.context?.rendererMasked ?? '',
      ),
    );
    const evidenceCompleteness = {
      assetTiming: scrub.supported.resourceTiming,
      canvas: scrub.canvas.count > 0,
      hardwareGpu: !softwareRenderer,
      heap: scrub.heap.after.available || cdpAfter.available,
      webgl:
        scrub.supported.webglInterception &&
        scrub.webgl.scrubDelta.drawCalls > 0,
    };
    const evidenceComplete = Object.values(evidenceCompleteness).every(Boolean);
    const acceptanceGatePass =
      ACCEPTANCE_ENABLED &&
      fullForward &&
      fullReverse &&
      evidenceComplete &&
      budgetsPass;
    const classification = ACCEPTANCE_ENABLED
      ? 'locked-production-acceptance'
      : SERVER_MODE === 'development'
        ? 'non-acceptance-development'
        : SERVER_MODE === 'production'
          ? 'non-acceptance-production-observation'
          : 'non-acceptance-unverified-environment';
    const report = {
      $schema:
        '../../../../../docs/hero-reference/performance-report.schema.json',
      schemaVersion: 2,
      classification,
      acceptance: {
        eligible: ACCEPTANCE_ELIGIBLE,
        gatePassed: acceptanceGatePass,
        requested: ACCEPTANCE_REQUESTED,
        eligibilityFailures: ACCEPTANCE_ELIGIBILITY_FAILURES,
        evidenceComplete,
        evidenceCompleteness,
        note: ACCEPTANCE_ENABLED
          ? 'Hard budget gate enabled for an explicit production URL on identified locked hardware.'
          : 'Evidence only. Acceptance requires explicit BASE_URL, HERO_PERFORMANCE_SERVER_MODE=production, HERO_PERFORMANCE_HARDWARE, and HERO_PERFORMANCE_ACCEPTANCE=1.',
      },
      source: {
        baseUrl: new URL(page.url()).origin,
        baseUrlExplicit: BASE_URL_EXPLICIT,
        navigationStatus: navigationResponse?.status() ?? null,
        pageUrl: page.url(),
        projectName: testInfo.project.name,
        serverMode: SERVER_MODE,
      },
      environment: {
        browserName,
        devicePixelRatio: round(runtime.devicePixelRatio),
        hardwareConcurrency: runtime.hardwareConcurrency,
        hardwareProfile: HARDWARE_PROFILE,
        language: runtime.language,
        platform: runtime.platform,
        profile,
        userAgent: runtime.userAgent,
        viewport: runtime.viewport,
      },
      scrub: {
        coverage: {
          diagnosticsAvailable:
            scrub.forward.end.rawProgress !== null &&
            scrub.reverse.end.rawProgress !== null,
          fullForward,
          fullReverse,
          forwardScrollCovered,
          reverseScrollCovered,
        },
        durationMs: round(scrub.scrubDurationMs),
        durationPerDirectionMs: scrub.durationPerDirectionMs,
        forward: {
          endRawProgress: scrub.forward.end.rawProgress,
          endSceneProgress: scrub.forward.end.sceneProgress,
          endScrollY: round(scrub.forward.end.scrollY),
          fromY: round(scrub.forward.fromY),
          intervalCount: scrub.forward.intervalCount,
          toY: round(scrub.forward.toY),
        },
        reverse: {
          endRawProgress: scrub.reverse.end.rawProgress,
          endSceneProgress: scrub.reverse.end.sceneProgress,
          endScrollY: round(scrub.reverse.end.scrollY),
          fromY: round(scrub.reverse.fromY),
          intervalCount: scrub.reverse.intervalCount,
          toY: round(scrub.reverse.toY),
        },
      },
      metrics: {
        canvas: scrub.canvas,
        cls: {
          cumulative: cls,
          entryCount: scrub.supported.cls ? scrub.cls.entryCount : null,
          maxSingleShift: scrub.supported.cls
            ? round(scrub.cls.maxSingleShift, 6)
            : null,
        },
        frameIntervals,
        jsHeap: {
          cdp: {
            after: cdpAfter,
            before: cdpBefore,
            delta: cdpDelta(cdpBefore, cdpAfter),
          },
          performanceMemory: scrub.heap,
          note: 'JS heap is browser-specific and is not a GPU-memory measurement.',
        },
        lcp: {
          finalObserved: scrub.lcp.finalObserved
            ? {
                ...scrub.lcp.finalObserved,
                sizeCssPixels:
                  scrub.lcp.finalObserved.sizeCssPixels === null
                    ? null
                    : round(scrub.lcp.finalObserved.sizeCssPixels),
                startTimeMs: round(scrub.lcp.finalObserved.startTimeMs),
              }
            : null,
          navigation: scrub.lcp.navigation
            ? {
                ...scrub.lcp.navigation,
                sizeCssPixels:
                  scrub.lcp.navigation.sizeCssPixels === null
                    ? null
                    : round(scrub.lcp.navigation.sizeCssPixels),
                startTimeMs: lcpMs,
              }
            : null,
          note: 'The navigation value is frozen before the scripted scrub so later programmatic visibility changes cannot redefine the LCP budget.',
        },
        longTasks: {
          lifecycle: {
            count: lifecycleLongTasks.length,
            maxDurationMs:
              lifecycleLongTasks.length > 0
                ? Math.max(
                    ...lifecycleLongTasks.map((entry) => entry.durationMs),
                  )
                : 0,
            samples: lifecycleLongTasks,
          },
          scrub: {
            count: scrubLongTasks.length,
            maxDurationMs: scrub.supported.longTask ? maximumLongTaskMs : null,
            overBudgetCount: scrubLongTasks.filter(
              (entry) => entry.durationMs > 50,
            ).length,
            samples: scrubLongTasks,
          },
        },
        networkAssets: scrub.resources,
        renderer: {
          drawCalls: {
            byMethodAfter: scrub.webgl.after.drawCalls.byMethod,
            duringScrub: scrub.webgl.scrubDelta.drawCalls,
            estimatedPrimitivesDuringScrub:
              scrub.webgl.scrubDelta.estimatedPrimitives,
            totalAfter: scrub.webgl.after.drawCalls.total,
          },
          measurement:
            'WebGL API interception installed before application scripts',
          resources: {
            geometry: {
              exactThreeGeometryCount: null,
              proxy: {
                label: 'live WebGL buffer objects',
                ...scrub.webgl.after.resources.buffers,
              },
            },
            materials: {
              exactThreeMaterialCount: null,
              proxy: {
                label: 'live linked WebGL program objects',
                ...scrub.webgl.after.resources.programs,
              },
            },
            textures: {
              exactThreeTextureCount: null,
              proxy: {
                label: 'live WebGL texture objects',
                ...scrub.webgl.after.resources.textures,
              },
            },
          },
          threeRendererInfoAvailable: false,
          threeRendererInfoNote:
            'The production page does not expose WebGLRenderer.info. WebGL object counts are lower-level resource proxies and must not be relabeled as Three.js geometry, material, or texture counts.',
        },
        supported: scrub.supported,
      },
      budgets: {
        checks: budgetChecks,
        note: 'Only the four Phase 19 hard minimums are gates; renderer/resource/memory metrics remain observational until locked-hardware ceilings are approved.',
        passed: budgetsPass,
      },
    };
    const outputDirectory = path.resolve(
      path.dirname(
        testInfo.config.configFile ??
          path.resolve(process.cwd(), 'playwright.config.ts'),
      ),
      'test-output/hero-reference/performance',
    );

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, `${profile}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );

    expect(
      fullForward && fullReverse,
      'The probe must cover the complete hero in both directions.',
    ).toBe(true);
    expect(
      !ACCEPTANCE_ENABLED || acceptanceGatePass,
      JSON.stringify(
        {
          budgetChecks,
          evidenceCompleteness,
          fullForward,
          fullReverse,
        },
        null,
        2,
      ),
    ).toBe(true);
  });
});
