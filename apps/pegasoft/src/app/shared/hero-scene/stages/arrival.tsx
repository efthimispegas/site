import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { acknowledgeHeroFrame, type HeroFrameRef } from '../hero-frame-state';
import { HERO_PALETTE, HERO_SURFACES } from '../hero-materials';
import { HERO_DESTINATION_TOPOLOGY } from '../hero-route';

const arrivalRestBaseRgb = [0xd5, 0xe2, 0xe8] as const;
const arrivalRestTopRgb = [0xf1, 0xf6, 0xf8] as const;
const arrivalActiveBaseRgb = [0x0b, 0x2c, 0xae] as const;
const arrivalActiveTopRgb = [0x39, 0x32, 0xdc] as const;
const arrivalArrowShape = new THREE.Shape()
  .moveTo(-3.3348, -0.2099)
  .lineTo(-0.5075, -0.2099)
  .lineTo(-2.5066, -2.2095)
  .lineTo(-2.21, -2.5066)
  .lineTo(0.2094, 0)
  .lineTo(-2.21, 2.5066)
  .lineTo(-2.5066, 2.21)
  .lineTo(-0.5065, 0.2099)
  .lineTo(-3.3348, 0.2099)
  .closePath();

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

function ArrowLayer({
  height,
  materialRef,
  positionY,
  scale = 1,
}: {
  height: number;
  materialRef: (material: THREE.MeshStandardMaterial | null) => void;
  positionY: number;
  scale?: number;
}) {
  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(arrivalArrowShape, {
        depth: height,
        bevelEnabled: false,
        bevelSize: 0,
        bevelThickness: 0,
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
        ref={materialRef}
        color={HERO_PALETTE.surface}
        emissive={HERO_PALETTE.surface}
        emissiveIntensity={0}
        roughness={HERO_SURFACES.accentRoughness}
      />
    </mesh>
  );
}

const arrivalMarks = [
  { x: -0.0005, z: -3.1251, rotation: 0 },
  { x: 2.2093, z: -2.2102, rotation: Math.PI / 4 },
  { x: 3.1251, z: 0.0005, rotation: 0 },
  { x: 2.2093, z: 2.2093, rotation: Math.PI / 4 },
  { x: -0.0005, z: 3.1251, rotation: 0 },
] as const;

function ArrivalRouteWake({ frameRef }: { frameRef: HeroFrameRef }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (let column = 0; column < 53; column += 1) {
      const x = THREE.MathUtils.lerp(24, 63, column / 52);
      for (let lane = -8; lane <= 8; lane += 1) {
        points.push(new THREE.Vector3(x, 0.08, 25 + lane * 0.75));
      }
    }

    return points;
  }, []);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const matrix = new THREE.Matrix4();
    positions.forEach((position, index) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      meshRef.current?.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useFrame(() => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    mesh.visible = frameRef.current.rendered.value >= 0.74;
    material.opacity =
      THREE.MathUtils.smoothstep(frameRef.current.rendered.value, 0.74, 0.9) *
      0.44;
    acknowledgeHeroFrame(frameRef, 'arrival-wake', {
      visible: mesh.visible,
      opacity: material.opacity,
    });
  }, -30);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, positions.length]}
    >
      <sphereGeometry args={[0.14, 7, 7]} />
      <meshBasicMaterial
        color={HERO_PALETTE.blueDot}
        transparent
        ref={materialRef}
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export function ArrivalStage({ frameRef }: { frameRef: HeroFrameRef }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseMaterialsRef = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const topMaterialsRef = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const [arrivalX, , arrivalZ] = HERO_DESTINATION_TOPOLOGY.arrival.proxyCenter;

  const applyMaterialState = (activation: number) => {
    const baseColor = mixRgb(
      arrivalRestBaseRgb,
      arrivalActiveBaseRgb,
      activation,
    );
    const topColor = mixRgb(arrivalRestTopRgb, arrivalActiveTopRgb, activation);
    const emissiveIntensity = activation * 0.32;

    baseMaterialsRef.current.forEach((material) => {
      if (!material) {
        return;
      }
      material.color.set(baseColor);
      material.emissive.set(baseColor);
      material.emissiveIntensity = emissiveIntensity * 0.45;
    });
    topMaterialsRef.current.forEach((material, index) => {
      if (!material) {
        return;
      }
      material.color.set(topColor);
      material.emissive.set(topColor);
      material.emissiveIntensity =
        emissiveIntensity * ([0.72, 0.86, 1][index % 3] ?? 1);
    });
  };

  useFrame(() => {
    applyMaterialState(frameRef.current.arrivalRatio);
    if (groupRef.current)
      groupRef.current.visible = frameRef.current.rendered.value >= 0.74;
    acknowledgeHeroFrame(frameRef, 'arrival', {
      activationRatio:
        (baseMaterialsRef.current[0]?.emissiveIntensity ?? 0) / (0.32 * 0.45),
      clockElapsedMs: frameRef.current.arrivalElapsedMs,
      resetSequence: frameRef.current.arrivalResetSequence,
      visible: groupRef.current?.visible ?? false,
      baseEmissiveIntensities: baseMaterialsRef.current.map(
        (material) => material?.emissiveIntensity ?? -1,
      ),
      topEmissiveIntensities: topMaterialsRef.current.map(
        (material) => material?.emissiveIntensity ?? -1,
      ),
      baseColors: baseMaterialsRef.current.flatMap(
        (material) => material?.color.toArray() ?? [-1, -1, -1],
      ),
      topColors: topMaterialsRef.current.flatMap(
        (material) => material?.color.toArray() ?? [-1, -1, -1],
      ),
    });
  }, -30);

  return (
    <>
      <ArrivalRouteWake frameRef={frameRef} />
      <group ref={groupRef} visible={false} position={[arrivalX, 0, arrivalZ]}>
        <ArrowLayer
          height={0.4}
          materialRef={(material) => {
            baseMaterialsRef.current[0] = material;
          }}
          positionY={0.5}
        />
        <ArrowLayer
          height={0.15}
          materialRef={(material) => {
            topMaterialsRef.current[0] = material;
          }}
          positionY={0.9}
          scale={0.78}
        />
        <ArrowLayer
          height={0.15}
          materialRef={(material) => {
            topMaterialsRef.current[1] = material;
          }}
          positionY={1.05}
          scale={0.56}
        />
        <ArrowLayer
          height={0.15}
          materialRef={(material) => {
            topMaterialsRef.current[2] = material;
          }}
          positionY={1.2}
          scale={0.335}
        />
        {arrivalMarks.map(({ x, z, rotation }, markIndex) => (
          <group
            key={`${x}-${z}`}
            position={[x, 0, z]}
            rotation={[0, rotation, 0]}
          >
            <RoundedBox
              position={[0, 0.7, 0]}
              args={[1.25, 0.4, 1.25]}
              radius={0.04}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial
                ref={(material) => {
                  baseMaterialsRef.current[markIndex + 1] = material;
                }}
                color={HERO_PALETTE.surface}
                emissive={HERO_PALETTE.surface}
                emissiveIntensity={0}
                roughness={0.44}
              />
            </RoundedBox>
            <RoundedBox
              position={[0, 0.975, 0]}
              args={[0.973, 0.15, 0.973]}
              radius={0.035}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial
                ref={(material) => {
                  topMaterialsRef.current[3 + markIndex * 3] = material;
                }}
                color={HERO_PALETTE.surfaceTop}
                emissive={HERO_PALETTE.surfaceTop}
                emissiveIntensity={0}
                roughness={0.4}
              />
            </RoundedBox>
            <RoundedBox
              position={[0, 1.125, 0]}
              args={[0.696, 0.15, 0.696]}
              radius={0.03}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial
                ref={(material) => {
                  topMaterialsRef.current[4 + markIndex * 3] = material;
                }}
                color={HERO_PALETTE.surfaceTop}
                emissive={HERO_PALETTE.surfaceTop}
                emissiveIntensity={0}
                roughness={0.4}
              />
            </RoundedBox>
            <RoundedBox
              position={[0, 1.275, 0]}
              args={[0.419, 0.15, 0.419]}
              radius={0.025}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial
                ref={(material) => {
                  topMaterialsRef.current[5 + markIndex * 3] = material;
                }}
                color={HERO_PALETTE.surfaceTop}
                emissive={HERO_PALETTE.surfaceTop}
                emissiveIntensity={0}
                roughness={0.4}
              />
            </RoundedBox>
          </group>
        ))}
      </group>
    </>
  );
}
