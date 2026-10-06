import { RoundedBox } from '@react-three/drei';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';
import { HeroGroundShadow } from '../hero-ground-shadow';

type Landmark = {
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  tier?: 2 | 3;
  roof?: 'slab' | 'service';
  facade?: 'ribs' | 'windows' | 'bands' | 'buttresses';
};

const landmarks: readonly Landmark[] = [
  { position: [-53.36, 0, -28.09], size: [3.4, 3.8, 3], tier: 3, roof: 'service', facade: 'ribs' },
  { position: [-58.89, 0, -29.25], size: [2.8, 3.2, 2.8], roof: 'slab', facade: 'bands' },
  { position: [-58.01, 0, -24.17], size: [3.6, 2.8, 3.2], roof: 'service', facade: 'ribs' },
  { position: [-39.15, 0, -28.65], size: [3.6, 1.65, 2.55], rotationY: -0.08, roof: 'service', facade: 'buttresses' },
  { position: [-53.45, 0, -22.01], size: [3.5, 4.6, 3.2], roof: 'slab', facade: 'windows' },
];

function LandmarkBuilding({ landmark }: { landmark: Landmark }) {
  const { position, size, rotationY = 0, tier, roof = 'slab', facade = 'ribs' } = landmark;
  // The stepped landmark is three neighboring towers, not three inset floors.
  // Keep each tower's facade continuous from the ground to its roof.
  if (tier === 3) {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {[0.64, 0.82, 1].map((height, index) => (
          <LandmarkBuilding
            key={index}
            landmark={{
              position: [(index - 1) * size[0] / 3, 0, 0],
              size: [size[0] / 3 - 0.055, size[1] * height, size[2]],
              roof,
              facade,
            }}
          />
        ))}
      </group>
    );
  }
  const tierCount = 1;
  const tierHeight = size[1] / tierCount;
  const accent = '#bad0de';
  const faceDepth = 0.045;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: tierCount }, (_, index) => {
        const footprint = 1 - index * 0.12;
        const height = Math.max(0.34, tierHeight - 0.08);
        const width = size[0] * footprint;
        const depth = size[2] * footprint;
        const tierBase = tierHeight * index;
        const tierCenter = tierBase + tierHeight * 0.5;
        return (
          <group key={index}>
            <RoundedBox
              args={[width, height, depth]}
              position={[0, tierCenter, 0]}
              radius={0.045}
              smoothness={2}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={index === tierCount - 1 ? HERO_PALETTE.surfaceTop : HERO_PALETTE.surface}
                roughness={index === tierCount - 1 ? 0.58 : HERO_SURFACES.structureRoughness}
              />
            </RoundedBox>
            {facade !== 'bands' && [-1, 1].map((side) =>
              Array.from({ length: facade === 'windows' ? 24 : 4 }, (_, cell) => {
                const columns = 4;
                const column = cell % columns;
                const row = Math.floor(cell / columns);
                const x = ((column + 1) / (columns + 1) - 0.5) * width;
                const windowY = tierBase + height * (0.14 + row * 0.14);
                return (
                  <mesh
                    key={`${side}-${cell}`}
                    position={[x, facade === 'windows' ? windowY : tierCenter, side * (depth * 0.5 + faceDepth * 0.5)]}
                  >
                    <boxGeometry args={[
                      facade === 'ribs' ? 0.095 : facade === 'buttresses' ? width * 0.12 : 0.34,
                      facade === 'windows' ? 0.1 : height * 0.91,
                      facade === 'buttresses' ? 0.2 : faceDepth,
                    ]} />
                    <meshStandardMaterial
                      color={facade === 'windows' ? accent : HERO_PALETTE.surfaceTop}
                      roughness={HERO_SURFACES.structureRoughness}
                    />
                  </mesh>
                );
              }),
            )}
            {facade === 'bands' && [1 / 3, 2 / 3].map((fraction) => (
              <mesh key={fraction} position={[0, height * fraction, 0]}>
                <boxGeometry args={[width + 0.025, 0.035, depth + 0.025]} />
                <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={HERO_SURFACES.structureRoughness} />
              </mesh>
            ))}
            {index < tierCount - 1 ? (
              <mesh position={[0, tierBase + tierHeight - 0.025, 0]}>
                <boxGeometry args={[width + 0.2, 0.09, depth + 0.2]} />
                <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={0.6} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, size[1] + 0.075, side * (size[2] * (1 - (tierCount - 1) * 0.12) * 0.5 - 0.06)]}>
            <boxGeometry args={[size[0] * (1 - (tierCount - 1) * 0.12) - 0.12, 0.15, 0.09]} />
            <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={0.56} />
          </mesh>
          <mesh position={[side * (size[0] * (1 - (tierCount - 1) * 0.12) * 0.5 - 0.06), size[1] + 0.075, 0]}>
            <boxGeometry args={[0.09, 0.15, size[2] * (1 - (tierCount - 1) * 0.12) - 0.12]} />
            <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={0.56} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, size[1] + 0.11, 0]}>
        <boxGeometry args={[size[0] * 0.55, 0.2, size[2] * 0.48]} />
        <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={0.54} />
      </mesh>
      {roof === 'service' ? (
        <>
          <mesh position={[-size[0] * 0.18, size[1] + 0.29, size[2] * 0.08]} castShadow>
            <boxGeometry args={[size[0] * 0.22, 0.28, size[2] * 0.18]} />
            <meshStandardMaterial color={HERO_PALETTE.surfaceTop} roughness={0.5} />
          </mesh>
          <mesh position={[size[0] * 0.18, size[1] + 0.25, -size[2] * 0.12]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, 0.22, 12]} />
            <meshStandardMaterial color={HERO_PALETTE.surface} roughness={0.62} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

export function LandingGraphics() {
  return (
    <group>
      {landmarks.map((landmark, index) => (
        <group key={index}>
          <HeroGroundShadow
            position={[landmark.position[0], -0.036, landmark.position[2]]}
            size={[landmark.size[0] * 2.1, landmark.size[2] * 2.1]}
            opacity={0.28}
          />
          <LandmarkBuilding landmark={landmark} />
        </group>
      ))}
    </group>
  );
}
