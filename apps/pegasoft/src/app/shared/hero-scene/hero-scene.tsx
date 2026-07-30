'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { HeroJourneySnapshot } from './hero-contract';
import type { HeroDevelopmentDiagnostics } from './hero-development-diagnostics';
import { HeroCamera, type HeroCameraProgressRef } from './hero-camera';
import { HERO_CAMERA_SOURCE } from './hero-camera-model';
import { HeroFallback } from './hero-fallback';
import { HeroLighting } from './hero-lighting';
import {
  HERO_PALETTE,
  HERO_STANDARD_MATERIAL_COMPATIBILITY,
} from './hero-materials';
import { HeroWorld } from './hero-world';
import styles from './hero-scene.module.css';

export interface HeroSceneProps {
  snapshot: HeroJourneySnapshot;
}

type HeroSceneDiagnosticsFactory = (
  snapshot: HeroJourneySnapshot,
) => HeroDevelopmentDiagnostics;

export function HeroScene({ snapshot }: HeroSceneProps) {
  const canRender = snapshot.motion !== 'static';
  const [canvasReady, setCanvasReady] = useState(false);
  const [getDevelopmentDiagnostics, setGetDevelopmentDiagnostics] =
    useState<HeroSceneDiagnosticsFactory | null>(null);
  const developmentDiagnostics = getDevelopmentDiagnostics?.(snapshot) ?? {};
  const settledCameraProgressRef = useRef<HeroCameraProgressRef>({
    current:
      snapshot.referenceState.progress.settledCamera ??
      snapshot.sceneTargetProgress,
  }).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    let active = true;

    void import('./hero-development-diagnostics').then(
      ({ getHeroSceneDevelopmentDiagnostics }) => {
        if (active) {
          setGetDevelopmentDiagnostics(
            () => getHeroSceneDevelopmentDiagnostics,
          );
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
      data-hero-render-ready={!canRender || canvasReady}
      style={{ display: 'contents' }}
    >
      {canRender ? (
        <div
          className={styles.field}
          data-hero-surface="canvas"
          aria-hidden="true"
        >
          <Canvas
            frameloop={snapshot.motion === 'full' ? 'always' : 'demand'}
            shadows
            camera={{
              position: [-80, HERO_CAMERA_SOURCE.baseY, 15],
              fov: HERO_CAMERA_SOURCE.baseFov,
            }}
            dpr={[1, snapshot.profile.maxDpr]}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              gl.setClearColor(HERO_PALETTE.background, 0);
              gl.toneMappingExposure =
                HERO_STANDARD_MATERIAL_COMPATIBILITY.exposure;
              setCanvasReady(true);
            }}
          >
            <HeroLighting profile={snapshot.profile} />
            <HeroCamera
              snapshot={snapshot}
              settledProgressRef={settledCameraProgressRef}
            />
            <HeroWorld
              snapshot={snapshot}
              settledCameraProgressRef={settledCameraProgressRef}
            />
          </Canvas>
        </div>
      ) : (
        <HeroFallback snapshot={snapshot} />
      )}
    </div>
  );
}

export default HeroScene;
