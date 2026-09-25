import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { HeroJourneySnapshot } from './hero-contract';
import { HERO_TEST_DIAGNOSTICS } from './hero-test-diagnostics';
import {
  advanceHeroRenderedFrame,
  type HeroFrameRef,
} from './hero-frame-state';

/** Runs before every scene consumer. No state-label or desired-output injection. */
export function HeroFrameOwner({
  snapshot,
  frameRef,
  localEffectsActive,
}: {
  snapshot: HeroJourneySnapshot;
  frameRef: HeroFrameRef;
  localEffectsActive: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useFrame((_, delta) => {
    frameRef.current = advanceHeroRenderedFrame(
      frameRef.current,
      {
        target: snapshot.sceneTargetProgress,
        motion: snapshot.motion,
        smoothTimeSeconds: snapshot.profile.cameraSmoothTimeSeconds,
        measurementSequence: snapshot.progress.measurementSequence,
        localEffectsActive,
      },
      delta,
    );
    frameRef.applied = {};
  }, -100);
  // This component has no host mutations. Demand mode therefore needs an
  // explicit frame after the useFrame callback receives the committed input.
  useLayoutEffect(() => {
    if (snapshot.motion !== 'full') invalidate();
  }, [
    invalidate,
    localEffectsActive,
    snapshot.motion,
    snapshot.sceneTargetProgress,
  ]);
  return null;
}

/** Observe a completed render without taking over R3F's automatic gl.render. */
export function HeroFrameReadiness({
  frameRef,
  onFrameApplied,
}: {
  frameRef: HeroFrameRef;
  onFrameApplied: (frameId: number) => void;
}) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const { gl } = get();
    return () => {
      // R3F releases its root later; Three's detached context listeners must
      // not survive the Canvas. StrictMode's connected replay is not disposal.
      queueMicrotask(() => {
        if (!gl.domElement.isConnected) gl.dispose();
      });
    };
  }, [get]);
  const pending = useRef<{ frameId: number; renderCount: number } | null>(null);
  const callback = useRef(onFrameApplied);
  useEffect(() => {
    callback.current = onFrameApplied;
  }, [onFrameApplied]);
  useFrame(({ gl }) => {
    pending.current = {
      frameId: frameRef.current.frameId,
      renderCount: gl.info.render.frame,
    };
  });
  useEffect(
    () =>
      addAfterEffect(() => {
        const frame = pending.current;
        pending.current = null;
        const { gl } = get();
        if (
          frame &&
          !gl.getContext().isContextLost() &&
          gl.info.render.frame > frame.renderCount
        ) {
          if (process.env.NODE_ENV !== 'production' || HERO_TEST_DIAGNOSTICS) {
            const record = window.__pegasoftHeroFrame;
            if (record?.frame.frameId === frame.frameId)
              record.renderedAtMs = performance.now();
          }
          callback.current(frame.frameId);
        }
      }),
    [get],
  );
  return null;
}
