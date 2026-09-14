import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { HeroJourneySnapshot } from './hero-contract';
import {
  HERO_LANDING_RAIL_PATHS,
  HERO_WORLD_REVEAL_START_MS,
  sampleLandingRailRange,
  sampleWorldRevealRailRange,
} from './hero-landing-rail-model';
import {
  INACTIVE_HERO_GATE_CLOCK,
  updateHeroGateClock,
  type HeroGateClockState,
} from './hero-local-clock';
import { HERO_PALETTE } from './hero-materials';

const RED_RADIUS = 0.075;
const TUBE_RADIAL_SEGMENTS = 8;

const landingRailCurves = HERO_LANDING_RAIL_PATHS.map(
  (points) =>
    new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'catmullrom',
      0,
    ),
);

function setTubeRange(
  geometry: THREE.TubeGeometry,
  start: number,
  end: number,
) {
  const clampedStart = THREE.MathUtils.clamp(start, 0, 1);
  const clampedEnd = THREE.MathUtils.clamp(end, clampedStart, 1);
  const tubularSegments = geometry.parameters.tubularSegments;
  const indicesPerSegment = TUBE_RADIAL_SEGMENTS * 6;
  const startSegment = Math.floor(clampedStart * tubularSegments);
  const endSegment = Math.ceil(clampedEnd * tubularSegments);

  geometry.setDrawRange(
    startSegment * indicesPerSegment,
    Math.max(0, endSegment - startSegment) * indicesPerSegment,
  );
}

export function HeroLandingRails({
  snapshot,
}: {
  snapshot: HeroJourneySnapshot;
}) {
  const mode =
    snapshot.referenceState.localPhase === 'world-reveal'
      ? 'reveal'
      : snapshot.referenceState.localPhase === 'landing-packet-visible'
        ? 'cadence'
        : null;
  const active = mode !== null;
  const groupRef = useRef<THREE.Group>(null);
  const clockRef = useRef<HeroGateClockState>(INACTIVE_HERO_GATE_CLOCK);
  const geometries = useMemo(
    () =>
      landingRailCurves.map((curve) => {
        const geometry = new THREE.TubeGeometry(
          curve,
          90,
          RED_RADIUS,
          TUBE_RADIAL_SEGMENTS,
          false,
        );
        geometry.setDrawRange(0, 0);
        return geometry;
      }),
    [],
  );

  useEffect(
    () => () => geometries.forEach((geometry) => geometry.dispose()),
    [geometries],
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.visible = active;
    }

    if (!active || mode === null) {
      clockRef.current = updateHeroGateClock(
        clockRef.current,
        false,
        clock.getElapsedTime() * 1000,
      );
      return;
    }

    if (snapshot.motion !== 'full') {
      geometries.forEach((geometry) => setTubeRange(geometry, 0, 1));
      return;
    }

    const injectedElapsedMs = snapshot.directEntry
      ? mode === 'reveal'
        ? Math.max(
            0,
            snapshot.localClocks.loaderMs - HERO_WORLD_REVEAL_START_MS,
          )
        : snapshot.localClocks.landingIdleMs
      : null;
    clockRef.current = updateHeroGateClock(
      clockRef.current,
      true,
      clock.getElapsedTime() * 1000,
      injectedElapsedMs,
    );
    const elapsedSeconds = clockRef.current.elapsedMs / 1000;

    geometries.forEach((geometry, railIndex) => {
      const range =
        mode === 'reveal'
          ? sampleWorldRevealRailRange(elapsedSeconds, railIndex)
          : sampleLandingRailRange(elapsedSeconds, railIndex);
      setTubeRange(geometry, range?.start ?? 0, range?.end ?? 0);
    });
  });

  return (
    <group ref={groupRef} visible={active}>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} renderOrder={3}>
          {/* The source packet reads above the pale landing aggregate. Keep
              this transient overlay independent from depth-tested journey rails. */}
          <meshBasicMaterial
            color={HERO_PALETTE.redRoute}
            toneMapped={false}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
