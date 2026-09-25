import type { HeroJourneySnapshot } from './hero-contract';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type {
  HeroFrameRef,
  HeroAppliedConsumer,
  HeroRenderedFrame,
} from './hero-frame-state';
import { createHeroFrameDriver } from './hero-frame-driver';
import { snapshotHeroFrame } from './hero-frame-state';

export type HeroAppliedFrameRecord = {
  /** Populated only after this frame's automatic gl.render has returned. */
  renderedAtMs?: number;
  schemaVersion: 1;
  frame: HeroRenderedFrame;
  appliedConsumers: Record<string, HeroAppliedConsumer>;
  canvas: {
    cssWidth: number;
    cssHeight: number;
    backingWidth: number;
    backingHeight: number;
  };
  pointer: { x: number; y: number };
};
declare global {
  interface Window {
    __pegasoftHeroFrame?: HeroAppliedFrameRecord;
    __pegasoftHeroFrames?: HeroAppliedFrameRecord[];
    __pegasoftHeroFrameDriver?: {
      pause: () => void;
      advance: (deltaSeconds: number) => HeroAppliedFrameRecord | undefined;
      resume: () => void;
      inputs: Array<{ kind: 'frame'; deltaSeconds: number }>;
    };
  }
}

/** Development only: runs after every consumer's actual mutation/readback. */
export function HeroFrameDiagnostics({ frameRef }: { frameRef: HeroFrameRef }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const driver = createHeroFrameDriver({
      getLoop: () => get().frameloop,
      setLoop: (loop) => get().setFrameloop(loop),
      elapsedSeconds: () => get().clock.elapsedTime,
      advance: (seconds) => get().advance(seconds, true),
      read: () => structuredClone(window.__pegasoftHeroFrame),
    });
    window.__pegasoftHeroFrameDriver = driver;
    return () => {
      driver.dispose();
      delete window.__pegasoftHeroFrameDriver;
    };
  }, [get]);
  useFrame(({ gl, size, pointer }) => {
    const record: HeroAppliedFrameRecord = {
      schemaVersion: 1,
      ...snapshotHeroFrame(frameRef),
      canvas: {
        cssWidth: size.width,
        cssHeight: size.height,
        backingWidth: gl.domElement.width,
        backingHeight: gl.domElement.height,
      },
      pointer: { x: pointer.x, y: pointer.y },
    };
    window.__pegasoftHeroFrame = record;
    const frames = window.__pegasoftHeroFrames ?? [];
    frames.push(record);
    if (frames.length > 1200) frames.splice(0, frames.length - 1200);
    window.__pegasoftHeroFrames = frames;
  }, -1);
  useEffect(
    () => () => {
      delete window.__pegasoftHeroFrame;
      delete window.__pegasoftHeroFrames;
    },
    [],
  );
  return null;
}

export type HeroDevelopmentDiagnostics = Record<
  `data-${string}`,
  string | number | boolean
>;

export function getHeroSceneDevelopmentDiagnostics(
  snapshot: HeroJourneySnapshot,
): HeroDevelopmentDiagnostics {
  return {
    'data-hero-reference-state': snapshot.referenceState.key,
    'data-hero-step': snapshot.stepIndex + 1,
    'data-hero-lifecycle': snapshot.lifecycle,
    'data-hero-motion': snapshot.motion,
    'data-hero-profile': snapshot.profile.id,
    'data-hero-scene-progress': snapshot.sceneTargetProgress.toFixed(6),
    'data-hero-direct-entry': snapshot.directEntry,
    'data-hero-pointer-trail': snapshot.profile.pointerTrail,
    'data-hero-seed': snapshot.deterministicSeed,
  };
}

export function getHeroShellDevelopmentDiagnostics(
  snapshot: HeroJourneySnapshot,
): HeroDevelopmentDiagnostics {
  return {
    'data-direct-entry': snapshot.directEntry,
    'data-hero-lifecycle': snapshot.lifecycle,
    'data-hero-copy-state': snapshot.copyState,
    'data-hero-raw-progress': snapshot.rawProgress.toFixed(6),
    'data-hero-scene-progress': snapshot.sceneTargetProgress.toFixed(6),
  };
}
