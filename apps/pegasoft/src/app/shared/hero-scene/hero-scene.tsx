'use client';

import { Canvas } from '@react-three/fiber';
import { WebGLRenderer, type WebGLRendererParameters } from 'three';
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { HeroJourneySnapshot } from './hero-contract';
import type { HeroDevelopmentDiagnostics } from './hero-development-diagnostics';
import { HeroCamera } from './hero-camera';
import { HeroFrameOwner, HeroFrameReadiness } from './hero-frame-owner';
import { createHeroRenderedFrame, type HeroFrameRef } from './hero-frame-state';
import type { HeroFrameDiagnostics } from './hero-development-diagnostics';
import { HERO_CAMERA_SOURCE } from './hero-camera-model';
import { HeroFallback } from './hero-fallback';
import { HERO_TEST_DIAGNOSTICS } from './hero-test-diagnostics';
import { HeroLighting } from './hero-lighting';
import {
  HERO_PALETTE,
  HERO_STANDARD_MATERIAL_COMPATIBILITY,
} from './hero-materials';
import { HeroWorld } from './hero-world';
import { nextHeroCanvasSize, type HeroCanvasSize } from './hero-profile';
import styles from './hero-scene.module.css';
import {
  advanceHeroAttempt,
  HERO_LOADING_DEADLINE_MS,
  type HeroAttemptEvent,
  type HeroAttemptState,
} from './hero-attempt';

export interface HeroSceneProps {
  snapshot: HeroJourneySnapshot;
  localEffectsActive: boolean;
  onAttemptStateChange?: (state: HeroAttemptState) => void;
}

class HeroCanvasBoundary extends Component<
  { onFatal: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onFatal();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type HeroSceneDiagnosticsFactory = (
  snapshot: HeroJourneySnapshot,
) => HeroDevelopmentDiagnostics;

function getDevelopmentResourceGateDelay() {
  if (process.env.NODE_ENV === 'production' && !HERO_TEST_DIAGNOSTICS)
    return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('__heroNeverResolveResources') === '1') return Infinity;

  const requestedDelay = Number(params.get('__heroResourceDelayMs'));
  return Number.isFinite(requestedDelay)
    ? Math.max(0, Math.min(requestedDelay, HERO_LOADING_DEADLINE_MS))
    : 0;
}

function HeroResourceGate({
  onResourcesReady,
}: {
  onResourcesReady: (startedAt: number) => void;
}) {
  // This runs only after the mounted scene has claimed its synchronous essential
  // resources; Canvas creation alone is not treated as resource completion.
  useEffect(() => {
    const delay = getDevelopmentResourceGateDelay();
    if (delay === Infinity) return;

    const startedAt = performance.now();
    const timer = window.setTimeout(
      () => onResourcesReady(startedAt),
      delay ?? 0,
    );
    return () => window.clearTimeout(timer);
  }, [onResourcesReady]);
  return null;
}

function useHeroCanvasSize(sourceMobileDevice: boolean) {
  const previous = useRef<HeroCanvasSize | null>(null);
  const [size, setSize] = useState<HeroCanvasSize | null>(null);
  useEffect(() => {
    const update = (orientationReset = false) => {
      let largeViewportHeight = window.innerHeight;
      if (
        sourceMobileDevice &&
        window.innerWidth < 900 &&
        !previous.current?.narrowMobileDevice
      ) {
        const probe = document.createElement('div');
        probe.style.cssText =
          'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none;';
        document.documentElement.appendChild(probe);
        largeViewportHeight = probe.offsetHeight || window.innerHeight;
        probe.remove();
      }
      const next = nextHeroCanvasSize(previous.current, {
        width: window.innerWidth,
        innerHeight: window.innerHeight,
        largeViewportHeight,
        sourceMobileDevice,
        orientationReset,
      });
      previous.current = next;
      setSize((current) =>
        current?.width === next.width &&
        current.height === next.height &&
        current.narrowMobileDevice === next.narrowMobileDevice
          ? current
          : next,
      );
    };
    const onResize = () => update();
    const onOrientation = () => update(true);
    update();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [sourceMobileDevice]);
  return size;
}

export function HeroScene({
  snapshot,
  localEffectsActive,
  onAttemptStateChange,
}: HeroSceneProps) {
  const canvasSize = useHeroCanvasSize(snapshot.profile.sourceMobileDevice);
  const canRender = snapshot.motion !== 'static';
  // Capability detection starts false during server rendering. Do not latch that
  // provisional value as an actual Canvas failure before the client probe runs.
  const [attemptState, setAttemptState] =
    useState<HeroAttemptState>('initializing');
  const attemptId = useRef(Symbol('hero-canvas-attempt')).current;
  const diagnosticAttemptId = useId();
  const activeAttempt = useRef(true);
  const currentAttemptState = useRef<HeroAttemptState>('initializing');
  const timeline = useRef({
    resourcesStartedAtMs: 0,
    resourcesReadyAtMs: 0,
    readyAtMs: 0,
    fallbackAtMs: 0,
    elapsedMs: 0,
    firstAppliedFrameId: 0,
    reason: '',
  });
  const attemptStartedAt = useRef<number | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [getDevelopmentDiagnostics, setGetDevelopmentDiagnostics] =
    useState<HeroSceneDiagnosticsFactory | null>(null);
  const developmentDiagnostics = getDevelopmentDiagnostics?.(snapshot) ?? {};
  const frameRef = useRef<HeroFrameRef>({
    current: createHeroRenderedFrame(snapshot.sceneTargetProgress),
    applied: {},
  }).current;
  const [FrameDiagnostics, setFrameDiagnostics] = useState<
    typeof HeroFrameDiagnostics | null
  >(null);

  const transition = useCallback(
    (event: HeroAttemptEvent, owner = attemptId, frameId = 0) => {
      if (!activeAttempt.current || owner !== attemptId) return;
      const next = advanceHeroAttempt(currentAttemptState.current, event);
      if (next === currentAttemptState.current) return;
      currentAttemptState.current = next;
      const now = performance.now();
      timeline.current.elapsedMs = now - (attemptStartedAt.current ?? now);
      if (next === 'fallback') timeline.current.fallbackAtMs = now;
      if (next === 'frame-pending')
        timeline.current.resourcesReadyAtMs = performance.now();
      if (next === 'ready') {
        timeline.current.readyAtMs = performance.now();
        timeline.current.firstAppliedFrameId = frameId;
      }
      timeline.current.reason = event;
      setAttemptState(next);
    },
    [attemptId],
  );
  const onResourcesReady = useCallback(
    (startedAt: number) => {
      timeline.current.resourcesStartedAtMs = startedAt;
      transition('resources-ready');
    },
    [transition],
  );
  const createRenderer = useCallback(
    async (defaults: WebGLRendererParameters) => {
      attemptStartedAt.current ??= performance.now();
      try {
        return new WebGLRenderer({
          ...defaults,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
      } catch {
        // Canvas configures asynchronously, outside React's error boundary.
        // Retire the failed attempt without allowing configure to publish a renderer.
        transition('fatal');
        return new Promise<WebGLRenderer>(() => undefined);
      }
    },
    [transition],
  );

  useEffect(() => {
    activeAttempt.current = true;
    return () => {
      activeAttempt.current = false;
    };
  }, []);

  useEffect(() => {
    onAttemptStateChange?.(attemptState);
  }, [attemptState, onAttemptStateChange]);

  useEffect(() => {
    if (!canvasElement || attemptState === 'fallback') return;
    const owner = attemptId;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      transition('fatal', owner);
    };
    canvasElement.addEventListener('webglcontextlost', onContextLost);
    return () =>
      canvasElement.removeEventListener('webglcontextlost', onContextLost);
  }, [attemptId, canvasElement, transition, attemptState]);

  useEffect(() => {
    if (!canRender) {
      if (snapshot.capabilitiesReady !== false) transition('fatal');
      return;
    }
    if (
      currentAttemptState.current === 'fallback' ||
      currentAttemptState.current === 'ready'
    )
      return;
    let timer = 0;
    const checkDeadline = () => {
      window.clearTimeout(timer);
      const startedAt = attemptStartedAt.current;
      if (
        startedAt !== null &&
        performance.now() - startedAt >= HERO_LOADING_DEADLINE_MS
      ) {
        transition('deadline');
      } else {
        timer = window.setTimeout(
          checkDeadline,
          startedAt === null
            ? 16
            : Math.max(
                1,
                HERO_LOADING_DEADLINE_MS - (performance.now() - startedAt),
              ),
        );
      }
    };
    checkDeadline();
    window.addEventListener('focus', checkDeadline);
    document.addEventListener('visibilitychange', checkDeadline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', checkDeadline);
      document.removeEventListener('visibilitychange', checkDeadline);
    };
  }, [canRender, snapshot.capabilitiesReady, transition, attemptState]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !HERO_TEST_DIAGNOSTICS) {
      return;
    }

    let active = true;

    void import('./hero-development-diagnostics').then(
      ({ getHeroSceneDevelopmentDiagnostics, HeroFrameDiagnostics }) => {
        if (active) {
          setGetDevelopmentDiagnostics(
            () => getHeroSceneDevelopmentDiagnostics,
          );
          setFrameDiagnostics(() => HeroFrameDiagnostics);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      {...developmentDiagnostics}
      data-hero-attempt-state={attemptState}
      data-hero-render-ready={attemptState === 'ready'}
      data-hero-fallback-ready={attemptState === 'fallback'}
      data-hero-attempt-id={diagnosticAttemptId}
      data-hero-attempt-started-at={attemptStartedAt.current ?? 0}
      data-hero-attempt-elapsed-ms={timeline.current.elapsedMs}
      data-hero-fallback-at={timeline.current.fallbackAtMs}
      data-hero-resources-started-at={timeline.current.resourcesStartedAtMs}
      data-hero-resources-ready-at={timeline.current.resourcesReadyAtMs}
      data-hero-ready-at={timeline.current.readyAtMs}
      data-hero-first-applied-frame={timeline.current.firstAppliedFrameId}
      data-hero-attempt-reason={timeline.current.reason}
      style={{ display: 'contents' }}
    >
      {canRender && attemptState !== 'fallback' ? (
        <div
          className={styles.field}
          data-hero-surface="canvas"
          aria-hidden="true"
        >
          <HeroCanvasBoundary onFatal={() => transition('fatal')}>
            <Canvas
              // R3F measures this wrapper for camera/backing size; CSS independently
              // displays the canvas at 100lvh, just as the source does.
              style={{ width: '100vw', height: canvasSize?.height ?? '100vh' }}
              frameloop={snapshot.motion === 'full' ? 'always' : 'demand'}
              shadows
              camera={{
                position: [-80, HERO_CAMERA_SOURCE.baseY, 15],
                fov: HERO_CAMERA_SOURCE.baseFov,
              }}
              dpr={snapshot.profile.maxDpr}
              gl={createRenderer}
              onCreated={({ gl }) => {
                const owner = attemptId;
                setCanvasElement(gl.domElement);
                gl.setClearColor(HERO_PALETTE.background, 0);
                gl.toneMappingExposure =
                  HERO_STANDARD_MATERIAL_COMPATIBILITY.exposure;
                transition('canvas-created', owner);
              }}
            >
              <HeroResourceGate onResourcesReady={onResourcesReady} />
              <HeroLighting profile={snapshot.profile} />
              <HeroFrameOwner
                snapshot={snapshot}
                frameRef={frameRef}
                localEffectsActive={localEffectsActive}
              />
              <HeroCamera frameRef={frameRef} />
              <HeroWorld snapshot={snapshot} frameRef={frameRef} />
              <HeroFrameReadiness
                frameRef={frameRef}
                onFrameApplied={(frameId) =>
                  transition('frame-applied', attemptId, frameId)
                }
              />
              {FrameDiagnostics ? (
                <FrameDiagnostics frameRef={frameRef} />
              ) : null}
            </Canvas>
          </HeroCanvasBoundary>
        </div>
      ) : (
        <HeroFallback snapshot={snapshot} />
      )}
    </div>
  );
}

export default HeroScene;
