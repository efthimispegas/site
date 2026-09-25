import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { acknowledgeHeroFrame, type HeroFrameRef } from '../hero-frame-state';
import { HERO_WORLD_LAYOUT } from '../hero-world-layout';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';
import { HERO_DESTINATION_TOPOLOGY, HERO_ROUTE_CONTACTS } from '../hero-route';
import { ProceduralWorldItem } from './primitives';

function ActivationDestination({ frameRef }: { frameRef: HeroFrameRef }) {
  const accentRef = useRef<THREE.MeshStandardMaterial>(null);
  const contactRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const activation = THREE.MathUtils.smoothstep(
      frameRef.current.rendered.value,
      0.13,
      0.17,
    );
    if (accentRef.current)
      accentRef.current.emissiveIntensity = 0.1 + activation * 0.55;
    if (contactRef.current) contactRef.current.opacity = 0.3 + activation * 0.7;
    if (lightRef.current) lightRef.current.intensity = activation * 2.2;
    acknowledgeHeroFrame(frameRef, 'activation', {
      accentEmissive: accentRef.current?.emissiveIntensity ?? 0,
      contactOpacity: contactRef.current?.opacity ?? 0,
      lightIntensity: lightRef.current?.intensity ?? 0,
    });
  }, -30);
  const [contactX, , contactZ] = HERO_ROUTE_CONTACTS.activation.point;
  const [centerX, , centerZ] = HERO_DESTINATION_TOPOLOGY.activation.proxyCenter;

  return (
    <group>
      <mesh
        position={[centerX, 2.55, centerZ + 1.405]}
        rotation={[0, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[0.56, 32]} />
        <meshStandardMaterial
          color={HERO_PALETTE.indigo}
          emissive={HERO_PALETTE.indigo}
          ref={accentRef}
          emissiveIntensity={0.1}
          roughness={HERO_SURFACES.accentRoughness}
        />
      </mesh>
      <mesh
        position={[contactX, 0.158, contactZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
      >
        <circleGeometry args={[0.35, 24]} />
        <meshBasicMaterial
          color={HERO_PALETTE.blueCore}
          transparent
          ref={contactRef}
          opacity={0.3}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        color={HERO_PALETTE.blueGlow}
        ref={lightRef}
        intensity={0}
        distance={5.5}
        position={[contactX, 0.8, contactZ]}
      />
    </group>
  );
}

export function ActivationStage({ frameRef }: { frameRef: HeroFrameRef }) {
  return (
    <group>
      {HERO_WORLD_LAYOUT.activation.items.map((item) => (
        <ProceduralWorldItem key={item.id} item={item} />
      ))}
      <ActivationDestination frameRef={frameRef} />
    </group>
  );
}
