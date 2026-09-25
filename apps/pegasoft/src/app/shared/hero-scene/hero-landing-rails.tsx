import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { acknowledgeHeroFrame, type HeroFrameRef } from './hero-frame-state';
import { HERO_PALETTE } from './hero-materials';
import { HERO_ACTIVATION_FEEDER_PATHS } from './hero-route';
import {
  createHeroFeederMesh,
  disposeHeroRouteMesh,
  setHeroTubeRange,
} from './hero-route-rendering';

export function HeroLandingRails({ frameRef }: { frameRef: HeroFrameRef }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshes = useMemo(
    () =>
      HERO_ACTIVATION_FEEDER_PATHS.map((_, index) =>
        createHeroFeederMesh(index, HERO_PALETTE.redRoute),
      ),
    [],
  );
  useEffect(() => () => meshes.forEach(disposeHeroRouteMesh), [meshes]);
  useFrame(() => {
    const packets = frameRef.current.idle;
    if (groupRef.current)
      groupRef.current.visible = packets.some(
        (packet) => packet.end > packet.start,
      );
    meshes.forEach((mesh, index) => {
      const packet = packets[index];
      setHeroTubeRange(mesh.geometry, packet.start, packet.end);
      mesh.visible = packet.end > packet.start;
    });
    acknowledgeHeroFrame(frameRef, 'idle', {
      visible: groupRef.current?.visible ?? false,
      drawStarts: meshes.map((mesh) => mesh.geometry.drawRange.start),
      drawCounts: meshes.map((mesh) => mesh.geometry.drawRange.count),
      physicalRadii: meshes.map((mesh) => mesh.geometry.parameters.radius),
      depthTests: meshes.map((mesh) => Number(mesh.material.depthTest)),
      depthWrites: meshes.map((mesh) => Number(mesh.material.depthWrite)),
    });
  }, -30);
  return (
    <group ref={groupRef} visible={false}>
      {meshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
}
