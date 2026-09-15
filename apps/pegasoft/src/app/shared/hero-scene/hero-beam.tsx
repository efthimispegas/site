import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HeroJourneySnapshot } from './hero-contract';
import { HeroLandingRails } from './hero-landing-rails';
import { HERO_PALETTE } from './hero-materials';
import {
  getHeroRoutePoint,
  getHeroRouteProgress,
  HERO_ACTIVATION_FEEDER_PATHS,
  HERO_ROUTE_RENDERING,
  HERO_ROUTE_SCENE_PROGRESS,
  HERO_ROUTE_SEGMENT_PROGRESS,
} from './hero-route';
import { clampSceneProgress } from './hero-sequence';

const RED_END_SCENE_PROGRESS = HERO_ROUTE_SCENE_PROGRESS.activation[1];
const BLUE_ZERO_END_SCENE_PROGRESS = HERO_ROUTE_SCENE_PROGRESS.clearance[1];
const BLUE_ONE_END_SCENE_PROGRESS = HERO_ROUTE_SCENE_PROGRESS.arrival[1];
const RED_ROUTE_END = HERO_ROUTE_SEGMENT_PROGRESS.activation[1];
const BLUE_ZERO_ROUTE_END = HERO_ROUTE_SEGMENT_PROGRESS.clearance[1];
const TUBE_RADIAL_SEGMENTS = HERO_ROUTE_RENDERING.radialSegments;

const redFeederCurves = HERO_ACTIVATION_FEEDER_PATHS.map(
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
          radius={HERO_ROUTE_RENDERING.redCoreRadius}
          color={HERO_PALETTE.redRoute}
          rangeEnd={redRatio}
        />
      ))}

      <SourceTube
        curve={blueZeroCurve}
        tubularSegments={100}
        radius={
          HERO_ROUTE_RENDERING.blueCoreRadius *
          HERO_ROUTE_RENDERING.blueGlowRadiusScale
        }
        color={HERO_PALETTE.blueGlow}
        rangeEnd={blueZeroRatio}
        opacity={HERO_ROUTE_RENDERING.blueGlowOpacity}
        glow
      />
      <SourceTube
        curve={blueZeroCurve}
        tubularSegments={100}
        radius={HERO_ROUTE_RENDERING.blueCoreRadius}
        color={HERO_PALETTE.blueCore}
        rangeEnd={blueZeroRatio}
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={
          HERO_ROUTE_RENDERING.blueCoreRadius *
          HERO_ROUTE_RENDERING.blueGlowRadiusScale
        }
        color={HERO_PALETTE.blueGlow}
        rangeEnd={blueOneRatio}
        opacity={HERO_ROUTE_RENDERING.blueGlowOpacity}
        glow
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={HERO_ROUTE_RENDERING.blueCoreRadius}
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
