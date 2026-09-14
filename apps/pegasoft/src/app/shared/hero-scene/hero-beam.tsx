import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HeroJourneySnapshot, HeroTuple3 } from './hero-contract';
import { HeroLandingRails } from './hero-landing-rails';
import { HERO_PALETTE } from './hero-materials';
import { getHeroRoutePoint, getHeroRouteProgress } from './hero-route';
import { clampSceneProgress } from './hero-sequence';

const RED_END_SCENE_PROGRESS = 0.17;
const BLUE_ZERO_END_SCENE_PROGRESS = 0.74;
const BLUE_ONE_END_SCENE_PROGRESS = 0.9;
const RED_ROUTE_END = 0.25;
const BLUE_ZERO_ROUTE_END = 0.75;
const RED_RADIUS = 0.075;
const BLUE_RADIUS = 0.125;
const TUBE_RADIAL_SEGMENTS = 8;

/**
 * Source-confirmed feeder controls. Each rail has its own authored approach
 * and converges on the first handoff instead of being an offset copy of a
 * camera curve.
 */
export const HERO_RED_FEEDER_PATHS = [
  [
    [-53, 0.15, -21],
    [-53, 0.15, -20.3],
    [-53.09, 0.15, -20.09],
    [-53.3, 0.15, -20],
    [-55.45, 0.15, -20],
    [-55.57, 0.15, -19.98],
    [-55.66, 0.15, -19.91],
    [-55.73, 0.15, -19.81],
    [-55.75, 0.15, -19.7],
    [-55.75, 0.15, 3],
  ],
  [
    [-53, 0.15, -27.5],
    [-53, 0.15, -26.3],
    [-53.09, 0.15, -26.09],
    [-53.3, 0.15, -26],
    [-55.7, 0.15, -26],
    [-55.91, 0.15, -25.91],
    [-56, 0.15, -25.7],
    [-56, 0.15, 3],
  ],
  [
    [-59, 0.15, -27.5],
    [-59, 0.15, -26.3],
    [-58.91, 0.15, -26.09],
    [-58.7, 0.15, -26],
    [-56.55, 0.15, -26],
    [-56.34, 0.15, -25.91],
    [-56.25, 0.15, -25.7],
    [-56.25, 0.15, 3],
  ],
  [
    [-59, 0.15, -21.2],
    [-59, 0.15, -19.3],
    [-58.91, 0.15, -19.09],
    [-58.7, 0.15, -19],
    [-56.8, 0.15, -19],
    [-56.59, 0.15, -18.91],
    [-56.5, 0.15, -18.7],
    [-56.5, 0.15, 3],
  ],
] as const satisfies readonly (readonly HeroTuple3[])[];

const redFeederCurves = HERO_RED_FEEDER_PATHS.map(
  (points) =>
    new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'catmullrom',
      0,
    ),
);

class HeroRouteSegmentCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly start: number,
    private readonly end: number,
  ) {
    super();
  }

  override getPoint(progress: number, target = new THREE.Vector3()) {
    return target.copy(
      getHeroRoutePoint(
        THREE.MathUtils.lerp(
          this.start,
          this.end,
          THREE.MathUtils.clamp(progress, 0, 1),
        ),
      ),
    );
  }
}

const blueZeroCurve = new HeroRouteSegmentCurve(
  RED_ROUTE_END,
  BLUE_ZERO_ROUTE_END,
);
const blueOneCurve = new HeroRouteSegmentCurve(BLUE_ZERO_ROUTE_END, 1);

function progressBetween(value: number, start: number, end: number) {
  return THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
}

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

function SourceTube({
  curve,
  tubularSegments,
  radius,
  color,
  rangeEnd,
  opacity = 1,
  glow = false,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  tubularSegments: number;
  radius: number;
  color: string;
  rangeEnd: number;
  opacity?: number;
  glow?: boolean;
}) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        tubularSegments,
        radius,
        TUBE_RADIAL_SEGMENTS,
        false,
      ),
    [curve, radius, tubularSegments],
  );

  useLayoutEffect(() => {
    setTubeRange(geometry, 0, rangeEnd);
  }, [geometry, rangeEnd]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={glow ? 2 : 3}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={!glow}
        toneMapped={false}
        side={THREE.DoubleSide}
        blending={glow ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

export function HeroBeam({ snapshot }: { snapshot: HeroJourneySnapshot }) {
  const sceneProgress = clampSceneProgress(snapshot.sceneTargetProgress);
  const redRatio = progressBetween(sceneProgress, 0, RED_END_SCENE_PROGRESS);
  const blueZeroRatio = progressBetween(
    sceneProgress,
    RED_END_SCENE_PROGRESS,
    BLUE_ZERO_END_SCENE_PROGRESS,
  );
  const blueOneRatio = progressBetween(
    sceneProgress,
    BLUE_ZERO_END_SCENE_PROGRESS,
    BLUE_ONE_END_SCENE_PROGRESS,
  );
  const routeProgress = getHeroRouteProgress(sceneProgress);
  const tip = getHeroRoutePoint(routeProgress);
  const tipPosition: [number, number, number] = [tip.x, tip.y + 0.02, tip.z];
  const blueIsActive = sceneProgress >= RED_END_SCENE_PROGRESS;

  return (
    <group>
      <HeroLandingRails snapshot={snapshot} />

      {redFeederCurves.map((curve, index) => (
        <SourceTube
          key={`red-feeder-${index}`}
          curve={curve}
          tubularSegments={150}
          radius={RED_RADIUS}
          color={HERO_PALETTE.redRoute}
          rangeEnd={redRatio}
        />
      ))}

      <SourceTube
        curve={blueZeroCurve}
        tubularSegments={100}
        radius={BLUE_RADIUS * 2.15}
        color={HERO_PALETTE.blueGlow}
        rangeEnd={blueZeroRatio}
        opacity={0.2}
        glow
      />
      <SourceTube
        curve={blueZeroCurve}
        tubularSegments={100}
        radius={BLUE_RADIUS}
        color={HERO_PALETTE.blueCore}
        rangeEnd={blueZeroRatio}
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={BLUE_RADIUS * 2.15}
        color={HERO_PALETTE.blueGlow}
        rangeEnd={blueOneRatio}
        opacity={0.2}
        glow
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={BLUE_RADIUS}
        color={HERO_PALETTE.blueCore}
        rangeEnd={blueOneRatio}
      />

      {blueIsActive ? (
        <>
          <mesh position={tipPosition} renderOrder={4}>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshBasicMaterial
              color={HERO_PALETTE.blueCore}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color={HERO_PALETTE.blueGlow}
            intensity={2.4}
            distance={5}
            position={tipPosition}
          />
        </>
      ) : null}
    </group>
  );
}
