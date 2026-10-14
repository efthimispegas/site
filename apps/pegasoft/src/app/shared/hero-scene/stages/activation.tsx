import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { acknowledgeHeroFrame, type HeroFrameRef } from '../hero-frame-state';
import { HERO_WORLD_LAYOUT } from '../hero-world-layout';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';
import { HERO_DESTINATION_TOPOLOGY, HERO_ROUTE_CONTACTS } from '../hero-route';
import { ProceduralWorldItem } from './primitives';

const destinationTrees: readonly [number, number, number][] = [
  [-58, 0, 6],
  [-55.5, 0, 8],
  [-60, 0, 9],
  [-57.5, 0, 12],
];

function DestinationTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.065, 0.6, 8]} />
        <meshStandardMaterial color={HERO_PALETTE.ground} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.31, 12, 10]} />
        <meshStandardMaterial color={HERO_PALETTE.surface} roughness={0.84} />
      </mesh>
    </group>
  );
}

// Keep the destination and yard in world space through the first handoff.
// The provisional north/west buildings overlap the authored landing landmarks;
// their layout data remains available for later source-matched placement.
const ACTIVATION_REVIEW_ITEM_IDS = new Set([
  'activation-contact-hub',
  'activation-pallet-yard',
  'activation-service-truck',
  'activation-worker-five',
  'activation-worker-six',
  'activation-worker-seven',
  'activation-worker-eight',
  'activation-worker-nine',
]);

const ACTIVATION_MARK_SHAPES = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4;
  const along = [Math.cos(angle), Math.sin(angle)];
  const across = [-along[1], along[0]];
  const shape = new THREE.Shape();
  const corners = [
    [0.17, -0.075],
    [0.48, -0.075],
    [0.48, 0.075],
    [0.17, 0.075],
  ];
  corners.forEach(([length, width], corner) => {
    const x = along[0] * length + across[0] * width;
    const y = along[1] * length + across[1] * width;
    if (corner === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
});

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
        <shapeGeometry args={[ACTIVATION_MARK_SHAPES]} />
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
      {HERO_WORLD_LAYOUT.activation.items
        .filter((item) => ACTIVATION_REVIEW_ITEM_IDS.has(item.id))
        .map((item) => (
          <ProceduralWorldItem key={item.id} item={item} />
        ))}
      {destinationTrees.map((position, index) => (
        <DestinationTree key={index} position={position} />
      ))}
      <ActivationDestination frameRef={frameRef} />
    </group>
  );
}
