import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { acknowledgeHeroFrame, type HeroFrameRef } from './hero-frame-state';
import {
  createHeroFeederCurve,
  createHeroRouteMesh,
  disposeHeroRouteMesh,
  setHeroTubeRange,
} from './hero-route-rendering';
import { HeroLandingRails } from './hero-landing-rails';
import { HERO_PALETTE } from './hero-materials';
import {
  getHeroRoutePoint,
  getHeroRouteProgress,
  HERO_ACTIVATION_FEEDER_PATHS,
  HERO_ROUTE_RENDERING,
  HERO_ROUTE_SEGMENT_PROGRESS,
} from './hero-route';

const RED_ROUTE_END = HERO_ROUTE_SEGMENT_PROGRESS.activation[1];
const BLUE_ZERO_ROUTE_END = HERO_ROUTE_SEGMENT_PROGRESS.clearance[1];
const TUBE_RADIAL_SEGMENTS = HERO_ROUTE_RENDERING.radialSegments;

const redFeederCurves = HERO_ACTIVATION_FEEDER_PATHS.map((_, index) =>
  createHeroFeederCurve(index),
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

function SourceTube({
  curve,
  tubularSegments,
  radius,
  color,
  frameRef,
  ratioKey,
  consumerId,
  opacity = 1,
  glow = false,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  tubularSegments: number;
  radius: number;
  color: string;
  frameRef: HeroFrameRef;
  ratioKey: 'red' | 'blueZero' | 'blueOne';
  consumerId: string;
  opacity?: number;
  glow?: boolean;
}) {
  const mesh = useMemo(
    () =>
      createHeroRouteMesh(curve, tubularSegments, radius, {
        color,
        opacity,
        glow,
      }),
    [curve, tubularSegments, radius, color, opacity, glow],
  );
  const geometry = mesh.geometry;

  useFrame(() => {
    const end = frameRef.current.ratios[ratioKey];
    setHeroTubeRange(geometry, 0, end);
    mesh.visible = end > 0;
    const indicesPerSegment = TUBE_RADIAL_SEGMENTS * 6;
    const endRing =
      (geometry.drawRange.start + geometry.drawRange.count) / indicesPerSegment;
    const positions = geometry.getAttribute('position');
    const head = [0, 0, 0];
    for (let index = 0; index < TUBE_RADIAL_SEGMENTS; index++) {
      const vertex = endRing * (TUBE_RADIAL_SEGMENTS + 1) + index;
      head[0] += positions.getX(vertex) / TUBE_RADIAL_SEGMENTS;
      head[1] += positions.getY(vertex) / TUBE_RADIAL_SEGMENTS;
      head[2] += positions.getZ(vertex) / TUBE_RADIAL_SEGMENTS;
    }
    acknowledgeHeroFrame(frameRef, consumerId, {
      drawStart: geometry.drawRange.start,
      drawCount: geometry.drawRange.count,
      visibleRange: [
        geometry.drawRange.start / indicesPerSegment / tubularSegments,
        endRing / tubularSegments,
      ],
      visible: mesh.visible,
      headWorld: head,
      physicalRadius: geometry.parameters.radius,
    });
  }, -30);
  useEffect(() => () => disposeHeroRouteMesh(mesh), [mesh]);
  return <primitive object={mesh} />;
}

export function HeroBeam({ frameRef }: { frameRef: HeroFrameRef }) {
  const tipRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const frame = frameRef.current;
    const tip = getHeroRoutePoint(getHeroRouteProgress(frame.rendered.value));
    if (tipRef.current) {
      tipRef.current.position.set(tip.x, tip.y + 0.02, tip.z);
      tipRef.current.visible = frame.ratios.blueZero > 0;
    }
    if (lightRef.current) {
      lightRef.current.position.set(tip.x, tip.y + 0.02, tip.z);
      lightRef.current.visible = frame.ratios.blueZero > 0;
    }
    acknowledgeHeroFrame(frameRef, 'beam', {
      tipPosition: tipRef.current?.position.toArray() ?? [],
      tipVisible: tipRef.current?.visible ?? false,
      lightPosition: lightRef.current?.position.toArray() ?? [],
    });
  }, -30);
  return (
    <group>
      <HeroLandingRails frameRef={frameRef} />

      {redFeederCurves.map((curve, index) => (
        <SourceTube
          key={`red-feeder-${index}`}
          curve={curve}
          tubularSegments={150}
          radius={HERO_ROUTE_RENDERING.redCoreRadius}
          color={HERO_PALETTE.redRoute}
          frameRef={frameRef}
          ratioKey="red"
          consumerId={`red-feeder-${index}`}
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
        frameRef={frameRef}
        ratioKey="blueZero"
        consumerId="blue-zero-glow"
        opacity={HERO_ROUTE_RENDERING.blueGlowOpacity}
        glow
      />
      <SourceTube
        curve={blueZeroCurve}
        tubularSegments={100}
        radius={HERO_ROUTE_RENDERING.blueCoreRadius}
        color={HERO_PALETTE.blueCore}
        frameRef={frameRef}
        ratioKey="blueZero"
        consumerId="blue-zero-core"
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={
          HERO_ROUTE_RENDERING.blueCoreRadius *
          HERO_ROUTE_RENDERING.blueGlowRadiusScale
        }
        color={HERO_PALETTE.blueGlow}
        frameRef={frameRef}
        ratioKey="blueOne"
        consumerId="blue-one-glow"
        opacity={HERO_ROUTE_RENDERING.blueGlowOpacity}
        glow
      />
      <SourceTube
        curve={blueOneCurve}
        tubularSegments={100}
        radius={HERO_ROUTE_RENDERING.blueCoreRadius}
        color={HERO_PALETTE.blueCore}
        frameRef={frameRef}
        ratioKey="blueOne"
        consumerId="blue-one-core"
      />

      <>
        <mesh ref={tipRef} visible={false} renderOrder={4}>
          <sphereGeometry args={[0.2, 14, 14]} />
          <meshBasicMaterial color={HERO_PALETTE.blueCore} toneMapped={false} />
        </mesh>
        <pointLight
          color={HERO_PALETTE.blueGlow}
          intensity={2.4}
          distance={5}
          ref={lightRef}
          visible={false}
        />
      </>
    </group>
  );
}
