import type { Page } from '@playwright/test';
import {
  readHeroCaptureWithPresentation,
  type HeroPresentation,
} from './hero-presentation-readback';
import {
  advanceCaptureClock,
  installCaptureCssClock,
  readCaptureCssClock,
  type CaptureCssClockSnapshot,
} from './hero-capture-clock';

export type CaptureSample = {
  presentation?: HeroPresentation;
  attributes: Record<string, string>;
  canvasVisible: boolean;
  fontsReady: boolean;
  loaderCleared?: boolean;
  lifecycleElapsedMs?: number | null;
  record: {
    renderedAtMs?: number;
    frame: {
      frameId: number;
      target: number;
      rendered: { value: number; velocity: number };
      fieldElapsedMs: number;
      nowMs?: number;
      deltaMs?: number;
    };
    appliedConsumers: Record<string, { frameId: number }>;
    canvas: {
      cssWidth: number;
      cssHeight: number;
      backingWidth: number;
      backingHeight: number;
    };
  } | null;
};

export type CaptureExpectation = {
  key: string;
  lifecycle: string;
  target: number;
  fieldElapsedMs?: number;
  elapsedMs?: number;
};

export function captureScrollY(
  target: number,
  measurement: {
    viewportHeight: number;
    flowHeight: number;
    wrapperHeight: number;
  },
): number {
  return Math.max(
    0,
    target *
      Math.max(
        measurement.viewportHeight * 0.4 +
          (Math.max(measurement.flowHeight - measurement.wrapperHeight, 1) *
            400) /
            356,
        1,
      ),
  );
}

export function isCaptureEntryAllowed(sample: CaptureSample): boolean {
  return (
    sample.loaderCleared === true &&
    sample.fontsReady &&
    sample.attributes['data-hero-render-ready'] === 'true' &&
    Boolean(sample.record && Number.isFinite(sample.record.renderedAtMs))
  );
}

export function hasCausalFieldClock(
  history: NonNullable<CaptureSample['record']>['frame'][],
): boolean {
  if (
    !history.length ||
    (history[0].frameId !== 1 &&
      (history[0].rendered.value > 0.72 || history[0].fieldElapsedMs !== 0))
  )
    return false;
  let elapsed = 0;
  let previousId = history[0].frameId - 1;
  for (const frame of history) {
    if (
      frame.frameId !== previousId + 1 ||
      !Number.isFinite(frame.deltaMs) ||
      (frame.deltaMs ?? -1) < 0 ||
      !Number.isFinite(frame.rendered.value)
    )
      return false;
    elapsed = frame.rendered.value > 0.72 ? elapsed + (frame.deltaMs ?? 0) : 0;
    if (
      !Number.isFinite(frame.fieldElapsedMs) ||
      Math.abs(frame.fieldElapsedMs - elapsed) > 0.0001
    )
      return false;
    previousId = frame.frameId;
  }
  return true;
}

export function nextCaptureClockDelta(
  elapsedMs: number,
  targetMs: number,
): number {
  return Math.min(240, Math.max(16, targetMs - elapsedMs));
}

export function isCaptureObservationReady(
  sample: CaptureSample,
  expected: CaptureExpectation,
): boolean {
  const { attributes: attrs, record } = sample;
  if (
    !sample.canvasVisible ||
    !sample.fontsReady ||
    !record ||
    !Number.isFinite(record.renderedAtMs) ||
    record.frame.frameId <= 0 ||
    attrs['data-hero-lifecycle'] !== expected.lifecycle ||
    attrs['data-hero-render-ready'] !== 'true' ||
    attrs['data-hero-motion'] !== 'full' ||
    attrs['data-hero-profile'] !== 'desktop' ||
    attrs['data-hero-seed'] !== '43117'
  )
    return false;
  const consumers = Object.values(record.appliedConsumers);
  if (
    !consumers.length ||
    consumers.some((consumer) => consumer.frameId !== record.frame.frameId)
  )
    return false;
  if (
    ![
      record.frame.target,
      record.frame.rendered.value,
      record.frame.rendered.velocity,
      record.frame.fieldElapsedMs,
    ].every(Number.isFinite)
  )
    return false;
  if (
    Math.abs(record.frame.target - expected.target) > 0.002 ||
    Math.abs(record.frame.rendered.value - record.frame.target) > 0.002 ||
    Math.abs(record.frame.rendered.velocity) > 0.03
  )
    return false;
  if (expected.lifecycle !== 'loading' && sample.loaderCleared === false)
    return false;
  if (
    expected.elapsedMs !== undefined &&
    (!Number.isFinite(sample.lifecycleElapsedMs) ||
      Math.abs((sample.lifecycleElapsedMs ?? Number.NaN) - expected.elapsedMs) >
        50)
  )
    return false;
  if (expected.fieldElapsedMs !== undefined) {
    if (Math.abs(record.frame.fieldElapsedMs - expected.fieldElapsedMs) > 50)
      return false;
  } else if (attrs['data-hero-reference-state'] !== expected.key) return false;
  if (expected.key === 'field-contact' && record.frame.fieldElapsedMs <= 0)
    return false;
  return true;
}

export type CaptureObservation = CaptureSample & {
  requestedKey: string;
  physical: {
    scrollY: number;
    effectiveHeroHeight: number;
    measurementSequence: number;
  };
  inputLog: Array<{ kind: 'clock' | 'scroll'; value: number }>;
  viewport: { width: number; height: number; devicePixelRatio: number };
  cssClock: CaptureCssClockSnapshot;
  renderedHistory: NonNullable<CaptureSample['record']>['frame'][];
};

/** A single browser task samples actual attributes and the completed frame. */
export async function readCaptureSample(page: Page): Promise<CaptureSample> {
  return page.evaluate(readHeroCaptureWithPresentation, {});
}

export async function installCaptureInputClock(page: Page) {
  const epoch = new Date('2026-09-30T00:00:00Z');
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(new Date(epoch.getTime() + 1));
  await installCaptureCssClock(page);
}

export async function waitForCaptureObservation(
  page: Page,
  expected: CaptureExpectation,
): Promise<CaptureObservation> {
  const inputLog: CaptureObservation['inputLog'] = [];
  const start = Date.now();
  let sample = await readCaptureSample(page);
  // Readiness retains the existing 5s acquisition budget; virtual lifecycle
  // input advances normally rather than spending this budget in real sleeps.
  while (!sample.record && Date.now() - start < 5000) {
    await advanceCaptureClock(page, 16);
    inputLog.push({ kind: 'clock', value: 16 });
    sample = await readCaptureSample(page);
  }
  if (!sample.record)
    throw new Error(
      `${expected.key}: no applied frame before acquisition deadline`,
    );
  if (expected.target > 0) {
    // Ordinary post-loader entry: do not settle a hidden camera to manufacture
    // a zero-age pulse at the requested endpoint.
    while (!isCaptureEntryAllowed(sample) && Date.now() - start < 5000) {
      // runFor fires every due timer/rAF; batching transport does not skip
      // rendered frames or effect deltas like fastForward would.
      await advanceCaptureClock(page, 240);
      inputLog.push({ kind: 'clock', value: 240 });
      sample = await readCaptureSample(page);
    }
    if (!isCaptureEntryAllowed(sample))
      throw new Error(
        `${expected.key}: loader did not clear before physical entry`,
      );
    const measurement = await page.evaluate(() => {
      const flow = document.querySelector('[data-hero-process]');
      if (
        !(flow instanceof HTMLElement) ||
        !(flow.firstElementChild instanceof HTMLElement)
      )
        throw new Error('Missing source-owned hero/flow measurement surfaces');
      // Same physical source measurement domains as hero-sequence.ts;
      // neither DOM state nor renderer output is assigned.
      return {
        viewportHeight: innerHeight,
        flowHeight: flow.offsetHeight,
        wrapperHeight: flow.firstElementChild.offsetHeight,
      };
    });
    const top = captureScrollY(expected.target, measurement);
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      top,
    );
    inputLog.push({ kind: 'scroll', value: top });
  }
  while (Date.now() - start < 5000) {
    sample = await readCaptureSample(page);
    if (isCaptureObservationReady(sample, expected)) {
      const renderedHistory = await page.evaluate(() => {
        const runtime = window as Window & {
          __pegasoftHeroFrames?: Array<{
            frame: NonNullable<CaptureSample['record']>['frame'];
          }>;
        };
        return (runtime.__pegasoftHeroFrames ?? []).map(({ frame }) => ({
          frameId: frame.frameId,
          target: frame.target,
          rendered: { ...frame.rendered },
          deltaMs: frame.deltaMs,
          fieldElapsedMs: frame.fieldElapsedMs,
          nowMs: frame.nowMs,
        }));
      });
      if (!hasCausalFieldClock(renderedHistory))
        throw new Error(
          `${expected.key}: observed field age does not follow recorded rendered history above .72`,
        );
      // The observation is retained alongside the screenshot; clock transport
      // must hold both JS scheduling and native CSS animation before readback.
      return {
        ...sample,
        requestedKey: expected.key,
        inputLog,
        renderedHistory,
        cssClock: await readCaptureCssClock(page),
        physical: await page.evaluate(() => {
          const flow = document.querySelector('[data-hero-process]');
          if (
            !(flow instanceof HTMLElement) ||
            !(flow.firstElementChild instanceof HTMLElement)
          )
            throw new Error('Missing physical measurement surfaces');
          const frame = (
            window as Window & {
              __pegasoftHeroFrame?: { frame: { measurementSequence: number } };
            }
          ).__pegasoftHeroFrame;
          if (!frame) throw new Error('Missing applied measurement sequence');
          return {
            scrollY,
            effectiveHeroHeight: Math.max(
              innerHeight * 0.4 +
                (Math.max(
                  flow.offsetHeight - flow.firstElementChild.offsetHeight,
                  1,
                ) *
                  400) /
                  356,
              1,
            ),
            measurementSequence: frame.frame.measurementSequence,
          };
        }),
        viewport: await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          devicePixelRatio,
        })),
      };
    }
    const delta =
      expected.elapsedMs !== undefined &&
      sample.lifecycleElapsedMs !== null &&
      sample.lifecycleElapsedMs !== undefined
        ? nextCaptureClockDelta(sample.lifecycleElapsedMs, expected.elapsedMs)
        : 16;
    await advanceCaptureClock(page, delta);
    inputLog.push({ kind: 'clock', value: delta });
  }
  throw new Error(
    `${expected.key}: capture input did not reach a coherent completed frame: ${JSON.stringify(sample)}`,
  );
}

export const CAPTURE_EXPECTATIONS: Record<string, CaptureExpectation> = {
  'loader-mark': {
    key: 'loader-mark',
    lifecycle: 'loading',
    target: 0,
    elapsedMs: 2000,
  },
  'world-reveal': {
    key: 'world-reveal',
    lifecycle: 'loading',
    target: 0,
    elapsedMs: 3500,
  },
  landing: { key: 'landing', lifecycle: 'landing', target: 0, elapsedMs: 5000 },
  'landing-idle': {
    key: 'landing-idle',
    lifecycle: 'landing',
    target: 0,
    elapsedMs: 7500,
  },
  'activation-route': {
    key: 'activation-route',
    lifecycle: 'journey',
    target: 0.12395,
  },
  'activation-contact': {
    key: 'activation-contact',
    lifecycle: 'journey',
    target: 0.16128,
  },
  'clearance-travel': {
    key: 'clearance-travel',
    lifecycle: 'journey',
    target: 0.32704,
  },
  'clearance-field-preview': {
    key: 'clearance-field-preview',
    lifecycle: 'journey',
    target: 0.54059,
  },
  'field-approach': {
    key: 'field-approach',
    lifecycle: 'journey',
    target: 0.60928,
  },
  'field-contact': { key: 'field-contact', lifecycle: 'journey', target: 0.74 },
  'field-pulse-a': {
    key: 'field-pulse-a',
    lifecycle: 'journey',
    target: 0.74,
    fieldElapsedMs: 300,
  },
  'field-pulse-b': {
    key: 'field-pulse-b',
    lifecycle: 'journey',
    target: 0.74,
    fieldElapsedMs: 2800,
  },
  'arrival-travel': {
    key: 'arrival-travel',
    lifecycle: 'journey',
    target: 0.89301,
  },
  'arrival-lockup': {
    key: 'arrival-lockup',
    lifecycle: 'journey',
    target: 0.9,
  },
  'journey-exit': { key: 'journey-exit', lifecycle: 'exit', target: 1.0513 },
};
