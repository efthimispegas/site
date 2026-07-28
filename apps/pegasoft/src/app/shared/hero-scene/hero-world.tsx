import { ContactShadows, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HeroBeam } from './hero-beam';
import { HERO_PALETTE, HERO_SURFACES } from './hero-materials';
import {
  FIELD_WORLD_PIVOT,
  getWorldRotation,
  heroRouteCurve,
  untransformWorldPoint,
} from './hero-route';

type Vec3 = [number, number, number];

const buildingColor = HERO_PALETTE.surface;
const roofColor = HERO_PALETTE.surfaceTop;
const fieldTileRgb = [0xee / 255, 0xf5 / 255, 0xf8 / 255] as const;
const fieldPulseRgb = [0xa8 / 255, 0xf1 / 255, 1] as const;
const fieldPulseEmissiveRgb = [0x45 / 255, 0xdc / 255, 0xf8 / 255] as const;
const fieldCenterRgb = [0x16 / 255, 0x1a / 255, 0xb8 / 255] as const;
const FIELD_CONTACT_PROGRESS = 0.63;
const FIELD_PULSE_SECONDS = 4;
const FIELD_PULSE_MAX_RADIUS = 6.6;
const clearanceHandoffPosition: Vec3 = [-11, 0, -23];
const arrivalRestBaseRgb = [0xd5, 0xe2, 0xe8] as const;
const arrivalRestTopRgb = [0xf1, 0xf6, 0xf8] as const;
const arrivalActiveBaseRgb = [0x0b, 0x2c, 0xae] as const;
const arrivalActiveTopRgb = [0x27, 0x72, 0xf4] as const;
const arrivalArrowShape = new THREE.Shape()
  .moveTo(-3.8, -0.72)
  .lineTo(0.7, -0.72)
  .lineTo(0.7, -2.5)
  .lineTo(3.9, 0)
  .lineTo(0.7, 2.5)
  .lineTo(0.7, 0.72)
  .lineTo(-3.8, 0.72)
  .closePath();

type FieldTileMaterial = {
  color: { setRGB: (red: number, green: number, blue: number) => unknown };
  emissive: { setRGB: (red: number, green: number, blue: number) => unknown };
  emissiveIntensity: number;
};

type FieldContactLight = {
  intensity: number;
};

function mixRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  amount: number,
) {
  return `rgb(${from
    .map((channel, index) =>
      Math.round(THREE.MathUtils.lerp(channel, to[index], amount)),
    )
    .join(', ')})`;
}

function Building({ position, size }: { position: Vec3; size: Vec3 }) {
  return (
    <group position={position}>
      <RoundedBox
        args={size}
        radius={0.16}
        smoothness={2}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={buildingColor}
          roughness={HERO_SURFACES.structureRoughness}
        />
      </RoundedBox>
      <mesh position={[0, size[1] / 2 + 0.08, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.72, 0.14, size[2] * 0.72]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={HERO_SURFACES.topRoughness}
        />
      </mesh>
    </group>
  );
}

function Worker({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
        <meshStandardMaterial color={HERO_PALETTE.worker} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={buildingColor} roughness={0.72} />
      </mesh>
    </group>
  );
}

function CoolingTower({
  position,
  scale = 1,
}: {
  position: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.72, 3.4, 28, 1, true]} />
        <meshStandardMaterial
          color={buildingColor}
          roughness={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 3.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.14, 0.1, 8, 28]} />
        <meshStandardMaterial color={roofColor} roughness={0.74} />
      </mesh>
    </group>
  );
}

function Factory({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Building position={[0, 1.15, 0]} size={[4.8, 2.3, 3.4]} />
      {[-1.35, 0, 1.35].map((offset) => (
        <mesh key={offset} position={[offset, 3.35, 0.35]} castShadow>
          <cylinderGeometry args={[0.3, 0.48, 3.1, 16]} />
          <meshStandardMaterial color={buildingColor} roughness={0.76} />
        </mesh>
      ))}
    </group>
  );
}

function PalletStacks({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
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

function DottedWake({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pointerLocal = useMemo(() => new THREE.Vector3(), []);
  const pointerWorld = useMemo(() => new THREE.Vector3(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const unitRotation = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const dots = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    for (let sample = 0; sample < 32; sample += 1) {
      const routeProgress = THREE.MathUtils.lerp(0.24, 0.62, sample / 31);
      const point = heroRouteCurve.getPoint(routeProgress);
      const tangent = heroRouteCurve.getTangent(routeProgress);
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (let lane = -7; lane <= 7; lane += 1) {
        positions.push(point.clone().addScaledVector(side, lane * 0.68));
      }
    }
    return positions;
  }, []);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }
    const matrix = new THREE.Matrix4();
    dots.forEach((position, index) => {
      matrix.makeTranslation(position.x, 0.12, position.z);
      meshRef.current?.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dots]);

  useFrame(({ pointer }) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    // The pointer is mapped to the visible travel region so activation remains
    // stable while the camera follows the beam and the world reorients.
    pointerWorld.set(pointer.x * 48, 0.12, -42 - pointer.y * 32);
    pointerLocal.copy(untransformWorldPoint(pointerWorld, progress));

    const wakeVisible = THREE.MathUtils.smoothstep(progress, 0.25, 0.36);
    dots.forEach((position, index) => {
      const distance = pointerLocal.distanceTo(position);
      const pointerActivation = 1 - THREE.MathUtils.smoothstep(distance, 1.1, 6.4);
      const dotScale =
        0.22 + wakeVisible * 0.12 + pointerActivation * wakeVisible * 2.4;
      scale.setScalar(dotScale);
      matrix.compose(position, unitRotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  const opacity =
    THREE.MathUtils.smoothstep(progress, 0.25, 0.36) *
    (1 - THREE.MathUtils.smoothstep(progress, 0.7, 0.82)) *
    0.3;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dots.length]}>
      <sphereGeometry args={[0.16, 7, 7]} />
      <meshBasicMaterial
        color={HERO_PALETTE.blueDot}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function ArrivalWake({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const active = progress >= 0.82;
  const dots = useMemo(() => {
    const positions: THREE.Vector3[] = [];

    for (let column = 0; column < 33; column += 1) {
      const x = THREE.MathUtils.lerp(3, 42, column / 32);
      for (let lane = -8; lane <= 8; lane += 1) {
        positions.push(new THREE.Vector3(x, 0.12, -58 + lane * 0.68));
      }
    }

    return positions;
  }, []);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const matrix = new THREE.Matrix4();
    dots.forEach((position, index) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      meshRef.current?.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [active, dots]);

  const opacity = THREE.MathUtils.smoothstep(progress, 0.82, 0.88) * 0.56;

  if (!active) {
    return null;
  }

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dots.length]}>
      <sphereGeometry args={[0.14, 7, 7]} />
      <meshBasicMaterial
        color={HERO_PALETTE.blueDot}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function ActivationCity() {
  return (
    <group scale={0.72}>
      <Building position={[-4, 1.5, 0]} size={[3.4, 3, 3.2]} />
      <Building position={[0, 2.5, -1]} size={[3.2, 5, 3.1]} />
      <Building position={[4.2, 1.9, 1]} size={[4.1, 3.8, 3.5]} />
      <Building position={[-1.8, 1, 4]} size={[2.8, 2, 2.6]} />
      <Worker position={[-6, 0, -3]} />
      <Worker position={[6, 0, -4]} />
    </group>
  );
}

function ClearanceLandscape() {
  return (
    <group>
      <Building
        position={[
          clearanceHandoffPosition[0],
          1.25,
          clearanceHandoffPosition[2],
        ]}
        size={[3.5, 2.5, 2.8]}
      />
      <Building position={[-23, 1.2, -34]} size={[5.8, 2.4, 4]} />
      <Building position={[-28, 1.5, -39]} size={[6.4, 3, 4.6]} />
      <CoolingTower position={[-15, 0, -34]} scale={0.9} />
      <CoolingTower position={[-19, 0, -40]} scale={0.72} />
      <Factory position={[-25, 0, -48]} />
      <PalletStacks position={[-17, 0, -47]} />
      {[-3, 0, 3].map((offset) => (
        <mesh key={offset} position={[-21 + offset, 0.72, -39]} castShadow>
          <boxGeometry args={[2.2, 1.44, 3.6]} />
          <meshStandardMaterial color={buildingColor} roughness={0.8} />
        </mesh>
      ))}
      <Worker position={[-15, 0, -27]} />
      <Worker position={[-29, 0, -31]} />
      <Worker position={[-20, 0, -43]} />
    </group>
  );
}

function ClearanceHandoff({ progress }: { progress: number }) {
  const activation = THREE.MathUtils.smoothstep(progress, 0.2, 0.3);

  return (
    <group position={clearanceHandoffPosition}>
      {[-1.5, 1.5].map((x) => (
        <RoundedBox
          key={x}
          position={[x, 1.1, 0]}
          args={[0.34, 2.2, 0.34]}
          radius={0.08}
          smoothness={2}
          castShadow
        >
          <meshStandardMaterial
            color={roofColor}
            emissive={HERO_PALETTE.blueGlow}
            emissiveIntensity={activation * 0.4}
            roughness={0.55}
          />
        </RoundedBox>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[1.25, 1.48, 32]} />
        <meshBasicMaterial
          color={HERO_PALETTE.blueGlow}
          transparent
          opacity={activation * 0.72}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.26, 14, 14]} />
        <meshBasicMaterial
          color={HERO_PALETTE.blueCore}
          transparent
          opacity={0.2 + activation * 0.8}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        color={HERO_PALETTE.blueGlow}
        intensity={activation * 4.6}
        distance={10}
        position={[0, 3.25, 0]}
      />
    </group>
  );
}

function FieldMatch({ progress }: { progress: number }) {
  const materialsRef = useRef<Array<FieldTileMaterial | null>>([]);
  const contactLightRef = useRef<FieldContactLight | null>(null);
  const contactStartedAtRef = useRef<number | null>(null);
  const contactActive = progress >= FIELD_CONTACT_PROGRESS;
  const tiles = useMemo(() => {
    const rowSpans = [
      [-2, 2],
      [-4, 4],
      [-5, 5],
      [-6, 6],
      [-6, 6],
      [-6, 6],
      [-6, 6],
      [-6, 6],
      [-6, 6],
      [-6, 5],
      [-5, 5],
      [-4, 3],
      [-2, 2],
    ] as const;

    return rowSpans.flatMap(([start, end], row) => {
      const z = row - 6;
      return Array.from({ length: end - start + 1 }, (_, index) => {
        const x = start + index;
        return { x, z, distance: Math.max(Math.abs(x), Math.abs(z)) };
      });
    });
  }, []);

  useFrame(({ clock }) => {
    if (!contactActive) {
      contactStartedAtRef.current = null;
    } else if (contactStartedAtRef.current === null) {
      contactStartedAtRef.current = clock.getElapsedTime();
    }

    const elapsed =
      contactStartedAtRef.current === null
        ? 0
        : clock.getElapsedTime() - contactStartedAtRef.current;
    const pulseProgress = (elapsed % FIELD_PULSE_SECONDS) / FIELD_PULSE_SECONDS;
    const pulseRadius = pulseProgress * FIELD_PULSE_MAX_RADIUS;

    if (contactLightRef.current) {
      contactLightRef.current.intensity = contactActive
        ? (1 - THREE.MathUtils.smoothstep(pulseRadius, 0.8, 2.4)) * 1.8
        : 0;
    }

    tiles.forEach(({ x, z, distance }, index) => {
      const material = materialsRef.current[index];
      if (!material) {
        return;
      }

      const center = x === 0 && z === 0;
      const distanceFromPulse = Math.abs(distance - pulseRadius);
      const pulseStrength = contactActive
        ? 1 - THREE.MathUtils.smoothstep(distanceFromPulse, 0.05, 1.25)
        : 0;

      if (center && contactActive) {
        material.color.setRGB(...fieldCenterRgb);
        material.emissive.setRGB(...fieldCenterRgb);
        material.emissiveIntensity = 0.65 + pulseStrength * 0.7;
      } else {
        material.color.setRGB(
          THREE.MathUtils.lerp(
            fieldTileRgb[0],
            fieldPulseRgb[0],
            pulseStrength,
          ),
          THREE.MathUtils.lerp(
            fieldTileRgb[1],
            fieldPulseRgb[1],
            pulseStrength,
          ),
          THREE.MathUtils.lerp(
            fieldTileRgb[2],
            fieldPulseRgb[2],
            pulseStrength,
          ),
        );
        material.emissive.setRGB(
          fieldPulseEmissiveRgb[0] * pulseStrength,
          fieldPulseEmissiveRgb[1] * pulseStrength,
          fieldPulseEmissiveRgb[2] * pulseStrength,
        );
        material.emissiveIntensity = pulseStrength * 1.45;
      }
    });
  });

  return (
    <group position={[0, 0, -58]} rotation={[0, Math.PI / 4, 0]}>
      {tiles.map(({ x, z }, index) => {
        const center = x === 0 && z === 0;
        return (
          <RoundedBox
            key={`${x}-${z}`}
            position={[x * 1.28, center ? 0.68 : 0.22, z * 1.28]}
            args={[1.05, center ? 1.36 : 0.44, 1.05]}
            radius={0.12}
            smoothness={2}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              ref={(material) => {
                materialsRef.current[index] = material;
              }}
              color={buildingColor}
              emissive="#000000"
              emissiveIntensity={0}
              roughness={0.64}
            />
          </RoundedBox>
        );
      })}
      <Worker position={[0, 1.36, 0]} />
      <pointLight
        ref={(light) => {
          contactLightRef.current = light;
        }}
        color={HERO_PALETTE.blueGlow}
        intensity={0}
        distance={8}
        position={[0, 3, 0]}
      />
    </group>
  );
}

function ArrowLayer({
  color,
  emissive,
  emissiveIntensity,
  height,
  positionY,
  scale = 1,
}: {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  height: number;
  positionY: number;
  scale?: number;
}) {
  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(arrivalArrowShape, {
        depth: height,
        bevelEnabled: true,
        bevelSize: 0.1,
        bevelThickness: 0.08,
        bevelSegments: 2,
      }),
    [height],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      position={[0, positionY, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[scale, scale, 1]}
      castShadow
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={HERO_SURFACES.accentRoughness}
      />
    </mesh>
  );
}

const arrivalMarks = [
  { x: -2.6, z: 3, rotation: Math.PI / 4 },
  { x: -3, z: -2.5, rotation: 0 },
  { x: 1.4, z: 3.6, rotation: 0 },
  { x: 4, z: 2.8, rotation: Math.PI / 4 },
  { x: 5, z: 0, rotation: 0 },
  { x: 4, z: -2.8, rotation: Math.PI / 4 },
  { x: 1.4, z: -3.6, rotation: 0 },
] as const;

function ArrivalArrow({ progress }: { progress: number }) {
  if (progress < 0.82) {
    return null;
  }

  const activation = THREE.MathUtils.smoothstep(progress, 0.9, 0.975);
  const baseColor = mixRgb(
    arrivalRestBaseRgb,
    arrivalActiveBaseRgb,
    activation,
  );
  const topColor = mixRgb(arrivalRestTopRgb, arrivalActiveTopRgb, activation);
  const emissiveIntensity = activation * 0.32;

  return (
    <group position={[36, 0, -58]}>
      <ArrowLayer
        color={baseColor}
        emissive={baseColor}
        emissiveIntensity={emissiveIntensity * 0.45}
        height={1.25}
        positionY={0.08}
      />
      <ArrowLayer
        color={topColor}
        emissive={topColor}
        emissiveIntensity={emissiveIntensity}
        height={0.18}
        positionY={1.35}
        scale={0.86}
      />
      {arrivalMarks.map(({ x, z, rotation }) => (
        <group
          key={`${x}-${z}`}
          position={[x, 0, z]}
          rotation={[0, rotation, 0]}
          scale={0.62}
        >
          <RoundedBox
            position={[0, 0.55, 0]}
            args={[1.2, 1.05, 1.2]}
            radius={0.1}
            smoothness={2}
            castShadow
          >
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity * 0.45}
              roughness={0.44}
            />
          </RoundedBox>
          <RoundedBox
            position={[0, 1.12, 0]}
            args={[0.88, 0.14, 0.88]}
            radius={0.08}
            smoothness={2}
            castShadow
          >
            <meshStandardMaterial
              color={topColor}
              emissive={topColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.4}
            />
          </RoundedBox>
        </group>
      ))}
      <pointLight
        color={HERO_PALETTE.indigoGlow}
        intensity={activation * 3.2}
        distance={12}
        position={[1.5, 3, 0]}
      />
    </group>
  );
}

export function HeroWorld({ progress }: { progress: number }) {
  const worldRotation = getWorldRotation(progress);

  return (
    <group
      position={[FIELD_WORLD_PIVOT.x, 0, FIELD_WORLD_PIVOT.z]}
      rotation={[0, worldRotation, 0]}
    >
      <group position={[-FIELD_WORLD_PIVOT.x, 0, -FIELD_WORLD_PIVOT.z]}>
      <mesh position={[0, -0.48, -36]} receiveShadow>
        <boxGeometry args={[170, 0.9, 150]} />
        <meshStandardMaterial
          color={HERO_PALETTE.ground}
          roughness={HERO_SURFACES.groundRoughness}
        />
      </mesh>
      <ActivationCity />
      <ClearanceLandscape />
      <ClearanceHandoff progress={progress} />
      <FieldMatch progress={progress} />
      <ArrivalArrow progress={progress} />
      <DottedWake progress={progress} />
      <ArrivalWake progress={progress} />
      <HeroBeam progress={progress} />
      <ContactShadows
        position={[0, 0.02, -36]}
        opacity={0.82}
        scale={100}
        blur={2.2}
        far={22}
        resolution={1024}
        frames={1}
        color={HERO_PALETTE.shadow}
      />
      </group>
    </group>
  );
}
