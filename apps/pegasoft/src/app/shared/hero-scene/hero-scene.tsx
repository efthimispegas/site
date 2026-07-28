'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { PegasoftFieldScene } from '../pegasoft-field-scene';
import { HeroCamera } from './hero-camera';
import { HERO_LIGHTING, HERO_PALETTE } from './hero-materials';
import { getHeroJourneySnapshot } from './hero-sequence';
import { HeroWorld } from './hero-world';

const HERO_RENDERER: 'baseline' | 'legacy' = 'baseline';

export interface HeroSceneProps {
  progress: number;
  ready?: boolean;
  introReady?: boolean;
}

export function HeroScene({
  progress,
  ready = true,
  introReady = true,
}: HeroSceneProps) {
  const journey = getHeroJourneySnapshot(progress);
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reducedMotion) {
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      setCanRender(
        Boolean(
          canvas.getContext('webgl2') ??
            canvas.getContext('webgl') ??
            canvas.getContext('experimental-webgl'),
        ),
      );
    } catch {
      setCanRender(false);
    }
  }, []);

  if (HERO_RENDERER === 'legacy') {
    return (
      <PegasoftFieldScene
        ready={ready}
        introReady={introReady}
        activeLifecycle={journey.stepIndex}
        flowProgress={journey.progress}
      />
    );
  }

  return (
    <div
      data-hero-reference-state={journey.referenceState.key}
      data-hero-step={journey.stepIndex + 1}
      style={{ display: 'contents' }}
    >
      {canRender ? (
        <div className="pegasoft-field" aria-hidden="true">
          <Canvas
            shadows
            camera={{ position: [25, 32, 34], fov: 28 }}
            dpr={[1, 1.4]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = HERO_LIGHTING.exposure;
            }}
          >
            <color attach="background" args={[HERO_PALETTE.background]} />
            <fog attach="fog" args={[HERO_PALETTE.background, 54, 118]} />
            <ambientLight intensity={HERO_LIGHTING.ambientIntensity} />
            <hemisphereLight
              color="#f7fbfd"
              groundColor="#89a6b5"
              intensity={HERO_LIGHTING.hemisphereIntensity}
            />
            <directionalLight
              color="#fffefb"
              intensity={HERO_LIGHTING.keyIntensity}
              position={[18, 34, 16]}
            />
            <directionalLight
              color="#b8d8e6"
              intensity={HERO_LIGHTING.fillIntensity}
              position={[-18, 12, 20]}
            />
            <HeroCamera progress={journey.progress} />
            <HeroWorld progress={journey.progress} />
          </Canvas>
        </div>
      ) : (
        <div
          className="pegasoft-field pegasoft-field--fallback"
          aria-hidden="true"
        >
          <span className="pegasoft-field__fallback pegasoft-field__fallback--a" />
          <span className="pegasoft-field__fallback pegasoft-field__fallback--b" />
          <span className="pegasoft-field__fallback pegasoft-field__fallback--c" />
          <span className="pegasoft-field__fallback pegasoft-field__fallback--d" />
        </div>
      )}
    </div>
  );
}

export default HeroScene;
