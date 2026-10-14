import type { Page } from '@playwright/test';

export type CaptureCssClockSnapshot = {
  nowMs: number;
  animations: {
    id: number;
    kind: 'animation' | 'transition';
    currentTime: number;
    observedAtMs: number;
    initialTimeMs: number;
    animationName: string | null;
    transitionProperty: string | null;
    target: {
      tagName: string;
      namespaceURI: string | null;
      id: string;
      className: string;
      selector: string | null;
      pseudoElement: string | null;
    } | null;
    timing: {
      delay: number;
      endDelay: number;
      duration: number | string;
      iterations: number | 'infinite';
      iterationStart: number;
      direction: PlaybackDirection;
      fill: FillMode;
      easing: string;
    } | null;
  }[];
  log: { type: string; atMs: number; deltaMs?: number; animationId?: number }[];
};

type BrowserCssClock = {
  sync(): void;
  snapshot(): CaptureCssClockSnapshot;
  logAdvance(deltaMs: number): void;
};
type ClockWindow = Window & { __captureCssClock?: BrowserCssClock };

/** Runs in the page. It reads native animation timing; no styles or states are assigned. */
function bootstrapCaptureCssClock() {
  const target = window as ClockWindow;
  if (target.__captureCssClock) return;
  const records = new Map<
    Animation,
    {
      id: number;
      kind: 'animation' | 'transition';
      observedAtMs: number;
      initialTimeMs: number;
      playbackRate: number;
      advances: boolean;
    }
  >();
  const log: CaptureCssClockSnapshot['log'] = [];
  let nextId = 0;
  let synchronizing = false;
  function readEffectIdentity(
    animation: Animation,
  ): Pick<
    CaptureCssClockSnapshot['animations'][number],
    'animationName' | 'transitionProperty' | 'target' | 'timing'
  > {
    const effect =
      animation.effect instanceof KeyframeEffect ? animation.effect : null;
    const element = effect?.target;
    let selector: string | null = null;
    if (element) {
      // Use an ID only when it identifies this exact element uniquely. Otherwise
      // retain its capture-time DOM path, never assign meaning from animation order.
      const idSelector = element.id ? `#${CSS.escape(element.id)}` : null;
      if (
        idSelector &&
        document.querySelectorAll(idSelector).length === 1 &&
        document.querySelector(idSelector) === element
      ) {
        selector = idSelector;
      } else {
        const parts: string[] = [];
        let node: Element | null = element;
        while (node) {
          const parent: Element | null = node.parentElement;
          const index = parent ? [...parent.children].indexOf(node) + 1 : 1;
          parts.unshift(`${CSS.escape(node.localName)}:nth-child(${index})`);
          node = parent;
        }
        const candidate = parts.join(' > ');
        if (
          document.querySelectorAll(candidate).length === 1 &&
          document.querySelector(candidate) === element
        )
          selector = candidate;
      }
    }
    const timing = effect?.getTiming();
    return {
      animationName:
        animation instanceof CSSAnimation ? animation.animationName : null,
      transitionProperty:
        animation instanceof CSSTransition
          ? animation.transitionProperty
          : null,
      target: element
        ? {
            tagName: element.localName,
            namespaceURI: element.namespaceURI,
            id: element.id,
            className: element.getAttribute('class') ?? '',
            selector,
            pseudoElement: effect?.pseudoElement ?? null,
          }
        : null,
      timing: timing
        ? {
            delay: timing.delay ?? 0,
            endDelay: timing.endDelay ?? 0,
            duration:
              timing.duration === Infinity
                ? 'infinite'
                : typeof timing.duration === 'object'
                  ? timing.duration.toString()
                  : (timing.duration ?? 'auto'),
            iterations:
              timing.iterations === Infinity
                ? ('infinite' as const)
                : (timing.iterations ?? 1),
            iterationStart: timing.iterationStart ?? 0,
            direction: timing.direction ?? 'normal',
            fill: timing.fill ?? 'auto',
            easing: timing.easing ?? 'linear',
          }
        : null,
    };
  }
  function sync() {
    if (synchronizing) return;
    synchronizing = true;
    try {
      const now = performance.now();
      // getAnimations resolves styles, including transitions created by the callback just completed.
      for (const animation of document.getAnimations()) {
        if (
          !(animation instanceof CSSAnimation) &&
          !(animation instanceof CSSTransition)
        )
          continue;
        let record = records.get(animation);
        if (!record) {
          if (
            animation.currentTime !== null &&
            typeof animation.currentTime !== 'number'
          ) {
            throw new Error(
              'CSS transport supports document-timeline numeric animation time only',
            );
          }
          record = {
            id: nextId++,
            kind:
              animation instanceof CSSTransition ? 'transition' : 'animation',
            observedAtMs: now,
            initialTimeMs: animation.currentTime ?? 0,
            playbackRate: animation.playbackRate,
            advances:
              animation.playState !== 'paused' &&
              animation.playState !== 'finished',
          };
          records.set(animation, record);
          animation.pause();
          animation.currentTime = record.initialTimeMs;
          log.push({ type: 'discover', atMs: now, animationId: record.id });
        }
        animation.currentTime =
          record.initialTimeMs +
          (record.advances
            ? (now - record.observedAtMs) * record.playbackRate
            : 0);
      }
    } finally {
      synchronizing = false;
    }
  }
  const nativeTimeout = target.setTimeout.bind(window);
  const nativeInterval = target.setInterval.bind(window);
  const nativeFrame = window.requestAnimationFrame.bind(window);
  function timerHandler(handler: TimerHandler): TimerHandler {
    if (typeof handler !== 'function')
      throw new Error(
        'CSS clock transport does not support string timer callbacks',
      );
    return (...args: unknown[]) => {
      sync();
      try {
        return handler.apply(window, args);
      } finally {
        sync();
      }
    };
  }
  target.setTimeout = (
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => nativeTimeout(timerHandler(handler), timeout, ...args);
  target.setInterval = (
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => nativeInterval(timerHandler(handler), timeout, ...args);
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    nativeFrame((time) => {
      sync();
      try {
        callback(time);
      } finally {
        sync();
      }
    });
  new MutationObserver(sync).observe(document, {
    subtree: true,
    attributes: true,
    childList: true,
    characterData: true,
  });
  target.__captureCssClock = {
    sync,
    snapshot() {
      sync();
      return {
        nowMs: performance.now(),
        animations: [...records]
          .filter(([animation]) => document.getAnimations().includes(animation))
          .map(([animation, record]) => ({
            id: record.id,
            kind: record.kind,
            observedAtMs: record.observedAtMs,
            initialTimeMs: record.initialTimeMs,
            currentTime: animation.currentTime as number,
            ...readEffectIdentity(animation),
          })),
        log: [...log],
      };
    },
    logAdvance(deltaMs: number) {
      log.push({ type: 'advance', atMs: performance.now(), deltaMs });
    },
  };
  sync();
}

/** Install after Playwright's paused clock and before navigating to the capture page. */
export async function installCaptureCssClock(page: Page): Promise<void> {
  await page.addInitScript(bootstrapCaptureCssClock);
  await page.evaluate(bootstrapCaptureCssClock);
}

export async function advanceCaptureClock(
  page: Page,
  deltaMs: number,
): Promise<void> {
  if (!Number.isFinite(deltaMs) || deltaMs < 0)
    throw new Error('Capture clock requires a finite nonnegative input delta');
  await page.evaluate(() => {
    const clock = (window as ClockWindow).__captureCssClock;
    if (!clock) throw new Error('Capture CSS clock is not installed');
    clock.sync();
  });
  await page.clock.runFor(deltaMs);
  await page.evaluate((delta) => {
    const clock = (window as ClockWindow).__captureCssClock;
    if (!clock) throw new Error('Capture CSS clock is not installed');
    clock.sync();
    clock.logAdvance(delta);
  }, deltaMs);
}

export async function readCaptureCssClock(
  page: Page,
): Promise<CaptureCssClockSnapshot> {
  return page.evaluate(() => {
    const clock = (window as ClockWindow).__captureCssClock;
    if (!clock) throw new Error('Capture CSS clock is not installed');
    return clock.snapshot();
  });
}
