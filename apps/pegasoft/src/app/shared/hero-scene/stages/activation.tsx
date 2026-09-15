import * as THREE from 'three';
import { HERO_WORLD_LAYOUT } from '../hero-world-layout';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';
import { HERO_DESTINATION_TOPOLOGY, HERO_ROUTE_CONTACTS } from '../hero-route';
import { ProceduralWorldItem } from './primitives';

function ActivationDestination({ sceneProgress }: { sceneProgress: number }) {
  const activation = THREE.MathUtils.smoothstep(sceneProgress, 0.13, 0.17);
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
          emissiveIntensity={0.1 + activation * 0.55}
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
          opacity={0.3 + activation * 0.7}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        color={HERO_PALETTE.blueGlow}
        intensity={activation * 2.2}
        distance={5.5}
        position={[contactX, 0.8, contactZ]}
      />
    </group>
  );
}

export function ActivationStage({ sceneProgress }: { sceneProgress: number }) {
  return (
    <group>
      {HERO_WORLD_LAYOUT.activation.items.map((item) => (
        <ProceduralWorldItem key={item.id} item={item} />
      ))}
      <ActivationDestination sceneProgress={sceneProgress} />
    </group>
  );
}
