'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  HeroJourneySnapshot,
  HeroPageScrollMeasurement,
  HeroReferenceStateKey,
} from './hero-contract';
import { createHeroJourneySnapshot } from './hero-controller';

type HeroCapabilities = {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  pointerFine: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
};

const SERVER_CAPABILITIES: HeroCapabilities = {
  viewportWidth: 1440,
  viewportHeight: 900,
  devicePixelRatio: 1,
  pointerFine: true,
  reducedMotion: false,
  webglAvailable: false,
};

const LIFECYCLE_MILESTONES_MS = [2895, 3200, 3595, 4800, 6500, 8000] as const;

type HeroDevelopmentControl = {
  stateKey: HeroReferenceStateKey | null;
  localTimeMs: number | null;
  forceFallback: boolean;
};

const NO_DEVELOPMENT_CONTROL: HeroDevelopmentControl = {
  stateKey: null,
  localTimeMs: null,
  forceFallback: false,
};

function canCreateWebGlContext() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

export function useHeroJourneyController(
  pageMeasurement: HeroPageScrollMeasurement,
): HeroJourneySnapshot {
  const startedAtRef = useRef<number | null>(null);
  const [lifecycleElapsedMs, setLifecycleElapsedMs] = useState(0);
  const [capabilities, setCapabilities] =
    useState<HeroCapabilities>(SERVER_CAPABILITIES);
  const [developmentControl, setDevelopmentControl] =
    useState<HeroDevelopmentControl>(NO_DEVELOPMENT_CONTROL);

  useEffect(() => {
    startedAtRef.current = performance.now();
    let timeout = 0;

    const updateElapsed = () => {
      window.clearTimeout(timeout);
      const now = performance.now();
      const startedAt = startedAtRef.current ?? now;
      const elapsed = Math.min(8000, Math.max(0, now - startedAt));
      setLifecycleElapsedMs(elapsed);

      if (elapsed < 8000) {
        const nextMilestone =
          LIFECYCLE_MILESTONES_MS.find((milestone) => milestone > elapsed) ??
          8000;
        timeout = window.setTimeout(
          updateElapsed,
          Math.max(16, nextMilestone - elapsed),
        );
      }
    };

    updateElapsed();
    window.addEventListener('focus', updateElapsed);
    document.addEventListener('visibilitychange', updateElapsed);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', updateElapsed);
      document.removeEventListener('visibilitychange', updateElapsed);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    let active = true;

    void import('./hero-development-control').then(
      ({ parseHeroDevelopmentControl }) => {
        if (active) {
          setDevelopmentControl(
            parseHeroDevelopmentControl(window.location.search),
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    const pointerQuery = window.matchMedia('(pointer: fine)');

    const updateCapabilities = () => {
      setCapabilities({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        pointerFine: pointerQuery.matches,
        reducedMotion: reducedMotionQuery.matches,
        webglAvailable:
          !developmentControl.forceFallback && canCreateWebGlContext(),
      });
    };

    updateCapabilities();
    window.addEventListener('resize', updateCapabilities);
    reducedMotionQuery.addEventListener('change', updateCapabilities);
    pointerQuery.addEventListener('change', updateCapabilities);

    return () => {
      window.removeEventListener('resize', updateCapabilities);
      reducedMotionQuery.removeEventListener('change', updateCapabilities);
      pointerQuery.removeEventListener('change', updateCapabilities);
    };
  }, [developmentControl.forceFallback]);

  return useMemo(
    () =>
      createHeroJourneySnapshot({
        pageMeasurement,
        lifecycleElapsedMs: capabilities.reducedMotion
          ? Math.max(lifecycleElapsedMs, 8000)
          : lifecycleElapsedMs,
        ...capabilities,
        webglAvailable:
          capabilities.webglAvailable &&
          !developmentControl.forceFallback,
        directStateKey: developmentControl.stateKey,
        localTimeOverrideMs: developmentControl.localTimeMs,
      }),
    [capabilities, developmentControl, lifecycleElapsedMs, pageMeasurement],
  );
}
