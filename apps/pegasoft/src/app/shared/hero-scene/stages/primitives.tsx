import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { HeroWorldLayoutItem, HeroWorldVec3 } from '../hero-world-layout';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';

export type Vec3 = [number, number, number];

const buildingColor = HERO_PALETTE.surface;
const roofColor = HERO_PALETTE.surfaceTop;

function mutableVec3([x, y, z]: HeroWorldVec3): Vec3 {
  return [x, y, z];
}

export function Building({
  position,
  size,
  rotationY = 0,
  scale = 1,
  roof = 'slab',
}: {
  position: Vec3;
  size: Vec3;
  rotationY?: number;
  scale?: number;
  roof?: 'slab' | 'service';
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <RoundedBox
        args={size}
        radius={Math.min(0.12, Math.min(size[0], size[2]) * 0.04)}
        smoothness={2}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={buildingColor}
          roughness={HERO_SURFACES.structureRoughness}
        />
      </RoundedBox>
      <mesh position={[0, size[1] / 2 + 0.07, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.76, 0.14, size[2] * 0.76]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
      {roof === 'service' ? (
        <>
          <mesh
            position={[-size[0] * 0.2, size[1] / 2 + 0.21, size[2] * 0.08]}
            castShadow
          >
            <boxGeometry args={[size[0] * 0.22, 0.28, size[2] * 0.2]} />
            <meshStandardMaterial
              color={roofColor}
              roughness={HERO_SURFACES.topRoughness}
            />
          </mesh>
          <mesh
            position={[size[0] * 0.17, size[1] / 2 + 0.17, -size[2] * 0.12]}
            castShadow
          >
            <cylinderGeometry
              args={[
                Math.min(size[0], size[2]) * 0.06,
                Math.min(size[0], size[2]) * 0.08,
                0.2,
                10,
              ]}
            />
            <meshStandardMaterial
              color={buildingColor}
              roughness={HERO_SURFACES.structureRoughness}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

export function SteppedBuilding({
  position,
  size,
  tiers,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  size: Vec3;
  tiers: 2 | 3;
  rotationY?: number;
  scale?: number;
}) {
  const tierHeight = size[1] / tiers;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {Array.from({ length: tiers }, (_, index) => {
        const footprintScale = 1 - index * 0.13;

        return (
          <RoundedBox
            key={index}
            args={[
              size[0] * footprintScale,
              Math.max(0.2, tierHeight - 0.06),
              size[2] * footprintScale,
            ]}
            position={[0, tierHeight * (index + 0.5), 0]}
            radius={0.09}
            smoothness={2}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={index === tiers - 1 ? roofColor : buildingColor}
              roughness={
                index === tiers - 1
                  ? HERO_SURFACES.topRoughness
                  : HERO_SURFACES.structureRoughness
              }
            />
          </RoundedBox>
        );
      })}
      <mesh position={[0, size[1] + 0.08, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.34, 0.16, size[2] * 0.28]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
    </group>
  );
}

export function CampusHub({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Building position={[0, 2.5, 0]} size={[3.5, 5, 2.8]} roof="service" />
      <Building
        position={[-2.45, 1.75, 0.1]}
        size={[1.75, 3.5, 3.1]}
        roof="slab"
      />
      <Building
        position={[2.45, 1.75, 0.1]}
        size={[1.75, 3.5, 3.1]}
        roof="slab"
      />
      <RoundedBox
        args={[2.75, 0.3, 2.2]}
        position={[0, 5.16, 0]}
        radius={0.12}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </RoundedBox>
      {[-1, 1].flatMap((side) =>
        [0, 1, 2].flatMap((floor) =>
          [-1, 1].map((column) => (
            <mesh
              key={`${side}-${floor}-${column}`}
              position={[side * 2.45 + column * 0.35, 0.92 + floor * 0.85, 1.67]}
            >
              <boxGeometry args={[0.2, 0.34, 0.045]} />
              <meshStandardMaterial
                color={HERO_PALETTE.ground}
                roughness={HERO_SURFACES.structureRoughness}
              />
            </mesh>
          )),
        ),
      )}
      <mesh position={[0, 0.5, 1.47]} castShadow>
        <boxGeometry args={[1.35, 1, 0.16]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
    </group>
  );
}

export function Hangar({
  position,
  size,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  size: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  const bodyHeight = size[1] * 0.62;
  const bayWidth = size[0] / 3;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Building
        position={[0, bodyHeight / 2, 0]}
        size={[size[0], bodyHeight, size[2]]}
        roof="slab"
      />
      {[-1, 0, 1].map((bay) => (
        <mesh
          key={bay}
          position={[bay * bayWidth, bodyHeight + size[2] * 0.18, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry
            args={[size[2] * 0.46, size[2] * 0.46, bayWidth * 0.92, 3]}
          />
          <meshStandardMaterial
            color={roofColor}
            roughness={HERO_SURFACES.topRoughness}
          />
        </mesh>
      ))}
    </group>
  );
}

export function UtilityBank({
  position,
  modules = 8,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  modules?: 6 | 8 | 10;
  rotationY?: number;
  scale?: number;
}) {
  const columns = modules / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {Array.from({ length: modules }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const height = 1.35 + ((column + row) % 3) * 0.24;

        return (
          <group
            key={index}
            position={[
              (column - (columns - 1) / 2) * 1.05,
              0,
              (row - 0.5) * 1.25,
            ]}
          >
            <RoundedBox
              args={[0.78, height, 0.92]}
              position={[0, height / 2, 0]}
              radius={0.055}
              smoothness={2}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={buildingColor}
                roughness={HERO_SURFACES.structureRoughness}
              />
            </RoundedBox>
            <mesh position={[0, height + 0.07, 0]} castShadow>
              <boxGeometry args={[0.55, 0.14, 0.62]} />
              <meshStandardMaterial
                color={roofColor}
                roughness={HERO_SURFACES.topRoughness}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Worker({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
        <meshStandardMaterial color={HERO_PALETTE.worker} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={buildingColor} roughness={0.72} />
      </mesh>
      <mesh position={[0.1, 0.47, 0.03]} rotation={[0, 0, -0.22]} castShadow>
        <capsuleGeometry args={[0.035, 0.28, 3, 6]} />
        <meshStandardMaterial color={HERO_PALETTE.worker} roughness={0.78} />
      </mesh>
    </group>
  );
}

export function CoolingTower({
  position,
  scale = 1,
}: {
  position: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.65, 3.4, 24, 1, true]} />
        <meshStandardMaterial
          color={buildingColor}
          roughness={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 3.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.04, 0.09, 8, 24]} />
        <meshStandardMaterial color={roofColor} roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <cylinderGeometry args={[1.62, 1.72, 0.14, 24]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function TankCluster({
  position,
  tanks = 3,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  tanks?: 3 | 4;
  rotationY?: number;
  scale?: number;
}) {
  const offsets: readonly Vec3[] =
    tanks === 4
      ? [
          [-1.05, 0, -0.8],
          [1.05, 0, -0.8],
          [-1.05, 0, 0.8],
          [1.05, 0, 0.8],
        ]
      : [
          [-1.1, 0, -0.65],
          [1.1, 0, -0.65],
          [0, 0, 0.9],
        ];

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {offsets.map(([x, , z], index) => {
        const tankHeight = 1.65 + (index % 2) * 0.3;

        return (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, tankHeight / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.58, 0.58, tankHeight, 16]} />
              <meshStandardMaterial
                color={buildingColor}
                roughness={HERO_SURFACES.structureRoughness}
              />
            </mesh>
            <mesh position={[0, tankHeight + 0.02, 0]} castShadow>
              <sphereGeometry
                args={[0.58, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshStandardMaterial
                color={roofColor}
                roughness={HERO_SURFACES.topRoughness}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
    </group>
  );
}

export function WaterTower({
  position,
  height = 6,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  height?: number;
  rotationY?: number;
  scale?: number;
}) {
  const tankY = height * 0.76;
  const legHeight = height * 0.68;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {[-0.58, 0.58].flatMap((x) =>
        [-0.58, 0.58].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, legHeight / 2, z]}
            rotation={[0, 0, x * 0.025]}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.11, legHeight, 8]} />
            <meshStandardMaterial
              color={buildingColor}
              roughness={HERO_SURFACES.structureRoughness}
            />
          </mesh>
        )),
      )}
      <mesh position={[0, tankY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 0.82, height * 0.24, 18]} />
        <meshStandardMaterial
          color={buildingColor}
          roughness={HERO_SURFACES.structureRoughness}
        />
      </mesh>
      <mesh position={[0, tankY + height * 0.13, 0]} castShadow>
        <coneGeometry args={[1.1, height * 0.12, 18]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
      <mesh position={[0, legHeight * 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.05, 6, 18]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
    </group>
  );
}

export function Factory({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Building position={[0, 1.15, 0]} size={[4.8, 2.3, 3.4]} />
      {[-1.35, 0, 1.35].map((offset) => (
        <group key={offset} position={[offset, 3.35, 0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.48, 3.1, 14]} />
            <meshStandardMaterial color={buildingColor} roughness={0.76} />
          </mesh>
          <mesh position={[0, 1.57, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.12, 14]} />
            <meshStandardMaterial color={roofColor} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Warehouse({
  position,
  size = [7, 2.6, 4.4],
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  size?: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Building position={[0, size[1] / 2, 0]} size={size} />
      {[-0.28, 0, 0.28].map((offset) => (
        <mesh
          key={offset}
          position={[offset * size[0], 0.78, size[2] / 2 + 0.012]}
        >
          <planeGeometry args={[size[0] * 0.2, 1.25]} />
          <meshStandardMaterial
            color={roofColor}
            roughness={0.74}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function PalletStacks({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {[-1.1, 0, 1.1].map((x) =>
        [-0.65, 0.65].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            {[0.14, 0.38, 0.62].map((y) => (
              <mesh key={y} position={[0, y, 0]} castShadow>
                <boxGeometry args={[0.92, 0.16, 1.04]} />
                <meshStandardMaterial color={roofColor} roughness={0.8} />
              </mesh>
            ))}
          </group>
        )),
      )}
    </group>
  );
}

export function Truck({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[-0.55, 0.65, 0]} castShadow>
        <boxGeometry args={[2.5, 1.15, 1.15]} />
        <meshStandardMaterial color={buildingColor} roughness={0.72} />
      </mesh>
      <mesh position={[1.15, 0.53, 0]} castShadow>
        <boxGeometry args={[0.9, 0.92, 1.08]} />
        <meshStandardMaterial color={roofColor} roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[4, 0.18, 1]} />
        <meshStandardMaterial color={HERO_PALETTE.worker} roughness={0.76} />
      </mesh>
      {[-1.05, 1.18].flatMap((x) =>
        [-0.58, 0.58].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.2, z]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.25, 0.25, 0.12, 12]} />
            <meshStandardMaterial
              color={HERO_PALETTE.shadow}
              roughness={0.86}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

export function WindTurbine({
  position,
  height = 7,
  rotationY = 0,
  rotorRotation = 0,
  scale = 1,
}: {
  position: Vec3;
  height?: number;
  rotationY?: number;
  rotorRotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.34, height, 12]} />
        <meshStandardMaterial color={buildingColor} roughness={0.74} />
      </mesh>
      <group position={[0, height, 0]} rotation={[0, 0, rotorRotation]}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color={roofColor} roughness={0.62} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((rotation) => (
          <mesh
            key={rotation}
            position={[Math.cos(rotation) * 1.45, Math.sin(rotation) * 1.45, 0]}
            rotation={[0, 0, rotation + Math.PI / 2]}
            castShadow
          >
            <boxGeometry args={[0.18, 2.65, 0.08]} />
            <meshStandardMaterial color={roofColor} roughness={0.68} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function PipeRack({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {[-1.2, 0, 1.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[0.12, 1.7, 0.12]} />
            <meshStandardMaterial color={buildingColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.65, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 2.7, 10]} />
            <meshStandardMaterial color={roofColor} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ProceduralWorldItem({ item }: { item: HeroWorldLayoutItem }) {
  const position = mutableVec3(item.position);

  switch (item.kind) {
    case 'building':
      return (
        <Building
          position={position}
          size={mutableVec3(item.size)}
          rotationY={item.rotationY}
          scale={item.scale}
          roof={item.roof}
        />
      );
    case 'stepped-building':
      return (
        <SteppedBuilding
          position={position}
          size={mutableVec3(item.size)}
          tiers={item.tiers}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'warehouse':
      return (
        <Warehouse
          position={position}
          size={mutableVec3(item.size)}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'campus-hub':
      return (
        <CampusHub
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'hangar':
      return (
        <Hangar
          position={position}
          size={mutableVec3(item.size)}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'utility-bank':
      return (
        <UtilityBank
          position={position}
          modules={item.modules}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'factory':
      return (
        <Factory
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'cooling-tower':
      return <CoolingTower position={position} scale={item.scale} />;
    case 'tank-cluster':
      return (
        <TankCluster
          position={position}
          tanks={item.tanks}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'water-tower':
      return (
        <WaterTower
          position={position}
          height={item.height}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'pallet-stacks':
      return (
        <PalletStacks
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'pipe-rack':
      return (
        <PipeRack
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'truck':
      return (
        <Truck
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    case 'wind-turbine':
      return (
        <WindTurbine
          position={position}
          height={item.height}
          rotationY={item.rotationY}
          rotorRotation={item.rotorRotation}
          scale={item.scale}
        />
      );
    case 'worker':
      return (
        <Worker
          position={position}
          rotationY={item.rotationY}
          scale={item.scale}
        />
      );
    default: {
      const exhaustiveItem: never = item;
      throw new Error(
        `Unsupported procedural world item: ${JSON.stringify(exhaustiveItem)}`,
      );
    }
  }
}
