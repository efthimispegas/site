'use client';

import { animate, createTimeline, cubicBezier, stagger } from 'animejs';
import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const buildingMaterial = new THREE.MeshPhysicalMaterial({
  color: '#eef5fb',
  roughness: 0.78,
  metalness: 0.02,
  clearcoat: 0.18,
  clearcoatRoughness: 0.62,
});

const roofMaterial = new THREE.MeshPhysicalMaterial({
  color: '#f7fbff',
  roughness: 0.64,
  metalness: 0.01,
  clearcoat: 0.12,
  clearcoatRoughness: 0.42,
});

const accentMaterial = new THREE.MeshStandardMaterial({
  color: '#d4e2ed',
  roughness: 0.78,
});

const softBlueMaterial = new THREE.MeshStandardMaterial({
  color: '#bed0df',
  roughness: 0.68,
});

function RoofFrame({
  size,
}: {
  size: [number, number, number];
}) {
  return (
    <group position={[0, size[1] / 2 + 0.06, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size[0] * 0.78, 0.14, size[2] * 0.78]} />
        <primitive object={roofMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[size[0] * 0.45, 0.12, size[2] * 0.45]} />
        <primitive object={accentMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function SlabBuilding({
  position,
  size,
  ribs = 6,
}: {
  position: [number, number, number];
  size: [number, number, number];
  ribs?: number;
}) {
  const ribOffsets = useMemo(() => {
    const usable = size[0] * 0.76;
    return Array.from({ length: ribs }, (_, index) => {
      const ratio = ribs === 1 ? 0 : index / (ribs - 1) - 0.5;
      return ratio * usable;
    });
  }, [ribs, size]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <primitive object={buildingMaterial} attach="material" />
      </mesh>
      {ribOffsets.map((offset) => (
        <mesh
          key={`${position.join('-')}-${offset}`}
          position={[offset, 0, size[2] / 2 + 0.03]}
          castShadow
        >
          <boxGeometry args={[size[0] * 0.08, size[1] * 0.78, 0.06]} />
          <primitive object={softBlueMaterial} attach="material" />
        </mesh>
      ))}
      <RoofFrame size={size} />
    </group>
  );
}

function TowerBuilding({
  position,
  levels,
}: {
  position: [number, number, number];
  levels: Array<{ size: [number, number, number]; y: number }>;
}) {
  return (
    <group position={position}>
      {levels.map((level, index) => (
        <group key={`${position.join('-')}-${index}`} position={[0, level.y, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={level.size} />
            <primitive object={buildingMaterial} attach="material" />
          </mesh>
          <RoofFrame size={level.size} />
        </group>
      ))}
    </group>
  );
}

function FactoryBlock({ position }: { position: [number, number, number] }) {
  const pierOffsets = [-1.35, -0.42, 0.48, 1.38];
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.5, 1.7, 2.7]} />
        <primitive object={buildingMaterial} attach="material" />
      </mesh>
      {pierOffsets.map((offset) => (
        <mesh
          key={`${position.join('-')}-${offset}`}
          position={[offset, -1.02, 0.78]}
          castShadow
        >
          <boxGeometry args={[0.42, 0.84, 0.58]} />
          <primitive object={accentMaterial} attach="material" />
        </mesh>
      ))}
      <RoofFrame size={[4.5, 1.7, 2.7]} />
    </group>
  );
}

function PalletCluster({ position }: { position: [number, number, number] }) {
  const stacks = [
    [-0.48, 0.12, 0],
    [0, 0.22, -0.12],
    [0.48, 0.32, 0.08],
  ] as const;

  return (
    <group position={position}>
      {stacks.map((stack, index) => (
        <group key={`${position.join('-')}-${index}`} position={stack}>
          {[0, 0.18, 0.36].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <boxGeometry args={[0.82, 0.12, 1.16]} />
              <primitive object={buildingMaterial} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function WorkerFigure({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.54, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.48, 6, 10]} />
        <primitive object={softBlueMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.97, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 14]} />
        <primitive object={roofMaterial} attach="material" />
      </mesh>
      <mesh position={[-0.12, 0.2, 0]} castShadow rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.04, 0.28, 4, 8]} />
        <primitive object={softBlueMaterial} attach="material" />
      </mesh>
      <mesh position={[0.12, 0.2, 0]} castShadow rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.04, 0.28, 4, 8]} />
        <primitive object={softBlueMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function Turbine({
  position,
  rotation = 0,
  speed = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  speed?: number;
}) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!bladesRef.current) {
      return;
    }

    bladesRef.current.rotation.z = clock.getElapsedTime() * speed + rotation;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.08, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.11, 2.16, 16]} />
        <primitive object={buildingMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 2.22, 0]} castShadow>
        <sphereGeometry args={[0.12, 14, 14]} />
        <primitive object={roofMaterial} attach="material" />
      </mesh>
      <group ref={bladesRef} position={[0, 2.22, 0]}>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]} position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 1.02, 0.02]} />
            <primitive object={accentMaterial} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GlowDisc({
  position,
  radius = 0.44,
  opacity = 0.3,
  color = '#b8ebff',
}: {
  position: [number, number, number];
  radius?: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function GlowBeam({
  start,
  end,
  radius = 0.1,
  opacity = 1,
  color = '#a4e8ff',
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  opacity?: number;
  color?: string;
}) {
  const beam = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const center = from.clone().add(to).multiplyScalar(0.5);
    const direction = to.clone().sub(from);
    const length = direction.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );

    return { center, length, quaternion };
  }, [end, start]);

  return (
    <mesh
      position={[beam.center.x, beam.center.y, beam.center.z]}
      quaternion={[
        beam.quaternion.x,
        beam.quaternion.y,
        beam.quaternion.z,
        beam.quaternion.w,
      ]}
    >
      <cylinderGeometry args={[radius, radius, beam.length, 16]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function StoryTile({
  position,
  size,
  opacity = 0.94,
  glow = 0,
  color = '#eef6fb',
  edgeColor = '#8faabe',
  edgeOpacity = 0.34,
  highlight = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  opacity?: number;
  glow?: number;
  color?: string;
  edgeColor?: string;
  edgeOpacity?: number;
  highlight?: number;
}) {
  return (
    <group position={position}>
      {glow > 0 ? (
        <GlowDisc position={[0, 0.02, 0]} radius={Math.max(size[0], size[2]) * 0.7} opacity={glow} />
      ) : null}
      <mesh castShadow receiveShadow position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.74}
          metalness={0.01}
          clearcoat={0.18}
          clearcoatRoughness={0.46}
        />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.004, 0]} scale={[1.008, 1.008, 1.008]}>
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={edgeOpacity}
          wireframe
          depthWrite={false}
        />
      </mesh>
      {highlight > 0 ? (
        <mesh position={[0, size[1] + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size[0] * 0.7, size[2] * 0.7]} />
          <meshBasicMaterial
            color={edgeColor}
            transparent
            opacity={highlight}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function DotField({
  position,
  rows,
  cols,
  spacing = 1.28,
  progress = 0,
  color = '#b8ebff',
}: {
  position: [number, number, number];
  rows: number;
  cols: number;
  spacing?: number;
  progress?: number;
  color?: string;
}) {
  const dots = useMemo(() => {
    const items: Array<{ x: number; z: number; strength: number }> = [];
    const rowHalf = (rows - 1) / 2;
    const colHalf = (cols - 1) / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const nx = col - colHalf;
        const nz = row - rowHalf;
        const dist = Math.sqrt(nx * nx + nz * nz);
        const maxDist = Math.sqrt(colHalf * colHalf + rowHalf * rowHalf) || 1;
        const strength = 1 - dist / maxDist;
        items.push({
          x: nx * spacing,
          z: nz * spacing,
          strength,
        });
      }
    }

    return items;
  }, [cols, rows, spacing]);

  return (
    <group position={position}>
      {dots.map((dot, index) => (
        <GlowDisc
          key={index}
          position={[dot.x, 0.02, dot.z]}
          radius={0.11 + dot.strength * 0.18}
          opacity={(0.04 + dot.strength * 0.18) * progress}
          color={color}
        />
      ))}
    </group>
  );
}

function RailArrow({
  position,
  opacity = 1,
  color = '#f4fbff',
}: {
  position: [number, number, number];
  opacity?: number;
  color?: string;
}) {
  const layers = [0, 0.28, 0.56];

  return (
    <group position={position}>
      {layers.map((layer, index) => (
        <group key={layer} position={[0, layer * 0.18, 0]}>
          <mesh castShadow receiveShadow position={[-1.3 + index * 0.12, 0.34, 0]}>
            <boxGeometry args={[4.8 - index * 0.18, 0.66, 0.7]} />
            <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.64} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[1.42 + index * 0.1, 0.34, 1.18]}
            rotation={[0, 0, -Math.PI / 4]}
          >
            <boxGeometry args={[2.44 - index * 0.1, 0.66, 0.7]} />
            <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.64} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[1.42 + index * 0.1, 0.34, -1.18]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <boxGeometry args={[2.44 - index * 0.1, 0.66, 0.7]} />
            <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.64} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function JourneyComposition({ progress }: { progress: number }) {
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const windowWeight = (value: number, start: number, peak: number, end: number) => {
    if (value <= start || value >= end) {
      return 0;
    }

    if (value <= peak) {
      return clamp01((value - start) / (peak - start));
    }

    return clamp01((end - value) / (end - peak));
  };

  const stage1 = windowWeight(progress, 0, 0.12, 0.34);
  const stage2 = windowWeight(progress, 0.16, 0.38, 0.62);
  const stage3 = windowWeight(progress, 0.44, 0.66, 0.88);
  const stage4 = windowWeight(progress, 0.72, 0.92, 1.01);
  const beamLead = clamp01((progress - 0.02) / 0.96);
  const railPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [-23.2, 0.09, 14],
      [-18.8, 0.09, 11.8],
      [-13.7, 0.09, 9.3],
      [-8.1, 0.09, 6.8],
      [-2.1, 0.09, 4.3],
      [4, 0.09, 1.9],
      [9.7, 0.09, -0.2],
      [14.4, 0.09, -2.1],
      [18.6, 0.09, -3.9],
    ],
    [],
  );
  const railSegments = useMemo(() => {
    const segments = railPoints.slice(0, -1).map((point, index) => {
      const next = railPoints[index + 1];
      const from = new THREE.Vector3(...point);
      const to = new THREE.Vector3(...next);
      return {
        start: point,
        end: next,
        length: from.distanceTo(to),
      };
    });
    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0) || 1;
    let cursor = 0;
    return segments.map((segment) => {
      const startRatio = cursor / totalLength;
      cursor += segment.length;
      const endRatio = cursor / totalLength;
      return {
        ...segment,
        startRatio,
        endRatio,
      };
    });
  }, [railPoints]);
  const leadPoint = useMemo<[number, number, number]>(() => {
    const segment =
      railSegments.find(
        (item) => beamLead >= item.startRatio && beamLead <= item.endRatio,
      ) ?? railSegments[railSegments.length - 1];
    const localProgress = clamp01(
      (beamLead - segment.startRatio) / (segment.endRatio - segment.startRatio || 1),
    );
    return [
      THREE.MathUtils.lerp(segment.start[0], segment.end[0], localProgress),
      THREE.MathUtils.lerp(segment.start[1], segment.end[1], localProgress),
      THREE.MathUtils.lerp(segment.start[2], segment.end[2], localProgress),
    ];
  }, [beamLead, railSegments]);
  const stageAnchors: Array<{
    position: [number, number, number];
    radius: number;
    opacity: number;
    color: string;
  }> = [
    { position: [-16.2, 0.04, 10.1], radius: 2.9, opacity: 0.16 + stage1 * 0.38, color: '#b6f0ff' },
    { position: [-3.2, 0.04, 4.2], radius: 4.1, opacity: 0.18 + stage2 * 0.4, color: '#c3caff' },
    { position: [7.2, 0.04, -0.2], radius: 5.8, opacity: 0.16 + stage3 * 0.38, color: '#9febff' },
    { position: [18.5, 0.04, -4], radius: 5.2, opacity: 0.16 + stage4 * 0.4, color: '#d7f5ff' },
  ];
  const latePan = clamp01((progress - 0.32) / 0.62);
  const journeyPan = progress * 4.8 + latePan * 13.4;

  return (
    <group
      position={[5.8 - journeyPan, 0.01 + Math.sin(progress * Math.PI) * 0.16, -1.08]}
      rotation={[0, THREE.MathUtils.lerp(-0.045, 0.08, progress), 0]}
      scale={1.18 + progress * 0.06}
    >
      {railSegments.map((segment, index) => (
        <GlowBeam
          key={`rail-base-${index}`}
          start={segment.start}
          end={segment.end}
          radius={0.24}
          opacity={0.28}
          color="#cce7f4"
        />
      ))}

      {railSegments.map((segment, index) => {
        const segmentFill = clamp01(
          (beamLead - segment.startRatio) /
            (segment.endRatio - segment.startRatio || 1),
        );
        if (segmentFill <= 0.01) {
          return null;
        }

        const activeEnd: [number, number, number] = [
          THREE.MathUtils.lerp(segment.start[0], segment.end[0], segmentFill),
          THREE.MathUtils.lerp(segment.start[1], segment.end[1], segmentFill),
          THREE.MathUtils.lerp(segment.start[2], segment.end[2], segmentFill),
        ];
        const segmentOpacity =
          0.2 +
          segmentFill * 0.58 +
          stage1 * 0.06 +
          stage2 * 0.08 +
          stage3 * 0.1 +
          stage4 * 0.12;

        return (
          <group key={`rail-live-${index}`}>
            <GlowBeam
              start={segment.start}
              end={activeEnd}
              radius={0.5}
              opacity={segmentOpacity}
              color="#8be9ff"
            />
            <GlowBeam
              start={segment.start}
              end={activeEnd}
              radius={0.13}
              opacity={0.62 + segmentFill * 0.24}
              color="#f5fdff"
            />
          </group>
        );
      })}

      {railPoints.map((point, index) => (
        <GlowDisc
          key={`rail-node-${index}`}
          position={[point[0], 0.05, point[2]]}
          radius={0.42}
          opacity={0.12 + beamLead * 0.08}
        />
      ))}

      {stageAnchors.map((anchor, index) => (
        <GlowDisc
          key={`anchor-${index}`}
          position={anchor.position}
          radius={anchor.radius}
          opacity={anchor.opacity}
          color={anchor.color}
        />
      ))}

      <GlowDisc position={leadPoint} radius={1.08} opacity={0.48 + beamLead * 0.28} />
      <GlowDisc position={leadPoint} radius={2.12} opacity={0.18 + beamLead * 0.1} />

      <group position={[-16.2, 0, 10.2]}>
        <GlowBeam start={[-4.3, 0.24, 3.8]} end={[4.4, 0.24, -1.7]} radius={0.055} opacity={0.08 + stage1 * 0.56} color="#f5fdff" />
        <GlowBeam start={[-2.4, 0.22, -1.7]} end={[2.6, 0.22, 3.6]} radius={0.045} opacity={0.06 + stage1 * 0.44} color="#a9edff" />
        <StoryTile position={[-2.2, 0, 0.8]} size={[2.8, 0.34, 3.2]} opacity={0.42 + stage1 * 0.48} glow={stage1 * 0.38} edgeColor="#7ddffc" edgeOpacity={0.2 + stage1 * 0.34} highlight={stage1 * 0.2} />
        <StoryTile position={[1.2, 0, -0.2]} size={[2.3, 0.28, 2.8]} opacity={0.34 + stage1 * 0.54} glow={stage1 * 0.32} edgeColor="#9be8ff" edgeOpacity={0.18 + stage1 * 0.34} />
        <StoryTile position={[4.2, 0, -1.1]} size={[1.9, 0.22, 2.4]} opacity={0.26 + stage1 * 0.58} edgeColor="#b8f1ff" edgeOpacity={0.16 + stage1 * 0.28} />
        {[-2.8, -1.4, 0, 1.4, 2.8].map((offset, index) => (
          <StoryTile
            key={index}
            position={[offset, 0, 3.9 - index * 0.32]}
            size={[1.28, 0.14, 1]}
            opacity={0.22 + stage1 * 0.58}
            edgeColor="#b1edf9"
            edgeOpacity={0.12 + stage1 * 0.28}
          />
        ))}
      </group>

      <group position={[-3.2, 0, 4.4]}>
        <GlowBeam start={[-5.7, 0.32, -3.4]} end={[5.8, 0.32, -1.7]} radius={0.075} opacity={0.06 + stage2 * 0.58} color="#a9b5ff" />
        <GlowBeam start={[-5.2, 0.38, 2.8]} end={[4.8, 0.38, 3.9]} radius={0.06} opacity={0.05 + stage2 * 0.45} color="#f4fbff" />
        <StoryTile position={[0, 0, 0]} size={[5.4, 1.66, 3.8]} opacity={0.3 + stage2 * 0.62} glow={stage2 * 0.46} edgeColor="#6875ff" edgeOpacity={0.22 + stage2 * 0.44} highlight={stage2 * 0.3} />
        <StoryTile position={[-2.1, 0.05, -0.1]} size={[0.34, 1.84, 3.98]} opacity={0.1 + stage2 * 0.66} color="#5260f1" edgeColor="#e9edff" edgeOpacity={0.12 + stage2 * 0.32} />
        <StoryTile position={[2.2, 0.05, -0.08]} size={[0.28, 1.5, 3.52]} opacity={0.08 + stage2 * 0.52} color="#6f78ff" edgeColor="#f4f7ff" edgeOpacity={0.1 + stage2 * 0.28} />
        {[-4.4, -1.5, 1.5, 4.4].map((offset, index) => (
          <StoryTile
            key={index}
            position={[offset, 0, 4 - index * 0.8]}
            size={[1.84, 0.62, 2.5]}
            opacity={0.22 + stage2 * 0.58}
            edgeColor="#9aa6ff"
            edgeOpacity={0.16 + stage2 * 0.32}
          />
        ))}
        {[-5.6, -3.6, -1.6, 0.4, 2.4].map((offset, index) => (
          <StoryTile
            key={`lane-${index}`}
            position={[offset, 0, -3.2 + index * 0.44]}
            size={[1.58, 0.26, 4.3]}
            opacity={0.18 + stage2 * 0.48}
            edgeColor="#b9c0ff"
            edgeOpacity={0.1 + stage2 * 0.3}
          />
        ))}
      </group>

      <group position={[7.2, 0, -0.2]}>
        <GlowBeam start={[-5.9, 0.28, 0]} end={[5.9, 0.28, 0]} radius={0.08} opacity={0.05 + stage3 * 0.68} color="#8de9ff" />
        <GlowBeam start={[0, 0.28, -5.9]} end={[0, 0.28, 5.9]} radius={0.08} opacity={0.04 + stage3 * 0.6} color="#f7fdff" />
        <DotField position={[0, 0, 0]} rows={9} cols={9} spacing={1.42} progress={0.02 + stage3 * 0.98} />
        {[-4.26, -2.84, -1.42, 0, 1.42, 2.84, 4.26].map((x) =>
          [-4.26, -2.84, -1.42, 0, 1.42, 2.84, 4.26].map((z, index) => {
            const centerBoost = 1 - Math.min(1, Math.hypot(x, z) / 5.8);
            const isCore = Math.abs(x) < 0.2 && Math.abs(z) < 0.2;
            return (
              <StoryTile
                key={`${x}-${z}-${index}`}
                position={[x, 0, z]}
                size={[1.12, isCore ? 1.18 : 0.46 + centerBoost * 0.38, 1.12]}
                opacity={isCore ? 0.06 + stage3 * 0.84 : 0.04 + stage3 * 0.62 + centerBoost * 0.04}
                glow={isCore ? stage3 * 0.54 : stage3 * 0.16}
                color={isCore ? '#4750ef' : '#eef6fb'}
                edgeColor={isCore ? '#f7fbff' : '#7fdff6'}
                edgeOpacity={isCore ? 0.08 + stage3 * 0.64 : 0.03 + centerBoost * 0.06 + stage3 * 0.36}
                highlight={isCore ? stage3 * 0.36 : 0}
              />
            );
          }),
        )}
        <group position={[0, 0.92, 0]} visible={stage3 > 0.08}>
          <WorkerFigure position={[0, 0, 0]} scale={1.12} />
        </group>
      </group>

      <group position={[18.6, 0, -4.2]}>
        <DotField position={[-1.2, 0, 0.2]} rows={7} cols={15} spacing={1.18} progress={0.12 + stage4 * 0.88} />
        <GlowBeam start={[-5.8, 0.34, 0.6]} end={[5.2, 0.34, 0.6]} radius={0.11} opacity={0.18 + stage4 * 0.48} color="#f5fdff" />
        <StoryTile position={[-4.9, 0, 0.2]} size={[0.62, 2.28, 5.7]} opacity={0.18 + stage4 * 0.66} color="#edf8ff" edgeColor="#8de6ff" edgeOpacity={0.18 + stage4 * 0.4} highlight={stage4 * 0.18} />
        <StoryTile position={[5.2, 0, 0.2]} size={[0.62, 2.02, 5.1]} opacity={0.16 + stage4 * 0.58} color="#edf8ff" edgeColor="#8de6ff" edgeOpacity={0.16 + stage4 * 0.36} />
        <RailArrow position={[0.6, 0, 0.4]} opacity={0.28 + stage4 * 0.72} color="#f8fdff" />
        {[
          [-0.8, 0, 3.2],
          [4.2, 0, 2.2],
          [4.2, 0, -1.2],
          [-0.8, 0, -2.2],
        ].map((pos, index) => (
          <StoryTile
            key={index}
            position={pos as [number, number, number]}
            size={[1.5, 0.72, 1.5]}
            opacity={0.22 + stage4 * 0.64}
            glow={stage4 * 0.28}
            edgeColor="#95e6ff"
            edgeOpacity={0.12 + stage4 * 0.38}
          />
        ))}
      </group>
    </group>
  );
}

function FieldComposition({ flowProgress }: { flowProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [scrollRatio, setScrollRatio] = useState(0);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraPositionTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      setPointer({
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      });
    };

    const onScroll = () => {
      const limit =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      setScrollRatio(window.scrollY / limit);
    };

    onScroll();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useFrame(({ clock, camera }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const journeyProgress = Math.min(1, Math.max(0, (flowProgress - 0.012) / 0.988));
    const easedJourney = journeyProgress * journeyProgress * (3 - journeyProgress * 2);
    const focusLift = Math.sin(easedJourney * Math.PI);
    const targetX = THREE.MathUtils.lerp(6.1, 5.12, easedJourney) + pointer.x * 0.34;
    const targetY = pointer.y * 0.18;

    group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, 0.03);
    group.position.y = THREE.MathUtils.lerp(
      group.position.y,
      THREE.MathUtils.lerp(-4.3, -3.72, easedJourney) +
        focusLift * 0.18 +
        targetY * 0.05 +
        scrollRatio * 0.18,
      0.03,
    );
    group.position.z = THREE.MathUtils.lerp(
      group.position.z,
      THREE.MathUtils.lerp(1.4, 0.16, easedJourney),
      0.03,
    );
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      THREE.MathUtils.lerp(-0.66, -0.46, easedJourney) +
        pointer.x * 0.05 +
        scrollRatio * 0.08,
      0.03,
    );
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      THREE.MathUtils.lerp(0.52, 0.46, easedJourney) + pointer.y * 0.04,
      0.03,
    );
    group.scale.setScalar(
      THREE.MathUtils.lerp(
        group.scale.x,
        0.76 + easedJourney * 0.1 + focusLift * 0.025,
        0.03,
      ),
    );

    cameraPositionTarget.set(
      THREE.MathUtils.lerp(24.4, 18.2, easedJourney) + pointer.x * 0.44,
      THREE.MathUtils.lerp(11.8, 9.4, easedJourney) + focusLift * 0.52 - pointer.y * 0.28,
      THREE.MathUtils.lerp(20.8, 24.2, easedJourney),
    );
    camera.position.lerp(cameraPositionTarget, 0.035);
    cameraTarget.set(
      THREE.MathUtils.lerp(4.9, 5.8, easedJourney),
      THREE.MathUtils.lerp(-4.08, -3.42, easedJourney) + pointer.y * 0.12,
      THREE.MathUtils.lerp(0.4, -2.2, easedJourney),
    );
    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

    group.children.forEach((child) => {
      if (!(child instanceof THREE.Group) || !child.name.startsWith('worker-')) {
        return;
      }

      child.position.y =
        Number(child.userData.baseY) +
        Math.sin(elapsed * 1.4 + Number(child.userData.phase)) * 0.06;
    });
  });

  return (
    <group
      ref={groupRef}
      position={[6.1, -4.3, 1.4]}
      rotation={[0.52, -0.66, 0]}
      scale={0.76}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[96, 96]} />
        <meshPhysicalMaterial
          color="#d6e5ee"
          roughness={0.92}
          metalness={0.01}
          clearcoat={0.06}
          clearcoatRoughness={0.72}
        />
      </mesh>

      {flowProgress < 0.012 ? (
        <>
          <PalletCluster position={[-18.6, 0.08, 0.8]} />

          <TowerBuilding
            position={[-21.4, 0.04, -2.8]}
            levels={[
              { size: [2.6, 1.2, 2.6], y: 0.6 },
              { size: [2.12, 1.04, 2.12], y: 1.76 },
              { size: [1.7, 0.88, 1.7], y: 2.76 },
            ]}
          />

          <TowerBuilding
            position={[-14.1, 0.04, 4.6]}
            levels={[
              { size: [3.3, 1.5, 3.3], y: 0.75 },
              { size: [2.74, 1.22, 2.74], y: 2.12 },
              { size: [2.18, 1, 2.18], y: 3.26 },
            ]}
          />

          <group position={[-6.2, 0.04, 0.4]}>
            <SlabBuilding position={[0, 1.66, 0]} size={[2.12, 3.32, 2.12]} ribs={5} />
            <SlabBuilding position={[0, 4.06, 0]} size={[2.12, 1.34, 2.12]} ribs={5} />
          </group>
          <group position={[-2.4, 0.04, -0.92]}>
            <SlabBuilding position={[0, 1.56, 0]} size={[1.92, 3.12, 1.92]} ribs={4} />
            <SlabBuilding position={[0, 3.82, 0]} size={[1.92, 1.2, 1.92]} ribs={4} />
          </group>

          <SlabBuilding position={[2.7, 1.18, -1]} size={[4.84, 2.36, 4.52]} ribs={7} />
          <FactoryBlock position={[8.6, 1.28, -5.9]} />
          <PalletCluster position={[15.4, 0.08, 7.8]} />
          <PalletCluster position={[12.6, 0.08, 10.8]} />

          <group name="worker-a" userData={{ baseY: 0.02, phase: 0.8 }} position={[-17.8, 0.02, 9.6]}>
            <WorkerFigure position={[0, 0, 0]} scale={1.08} />
          </group>
          <group name="worker-b" userData={{ baseY: 0.02, phase: 1.8 }} position={[5.8, 0.02, 4.4]}>
            <WorkerFigure position={[0, 0, 0]} scale={1.08} />
          </group>
          <group name="worker-c" userData={{ baseY: 0.02, phase: 2.7 }} position={[0.6, 0.02, 14.4]}>
            <WorkerFigure position={[0, 0, 0]} scale={0.96} />
          </group>

          <Turbine position={[12.8, 0.02, -0.8]} rotation={0.18} speed={0.68} />
          <Turbine position={[16.4, 0.02, -2.6]} rotation={0.24} speed={0.72} />
          <Turbine position={[20.1, 0.02, -4.3]} rotation={0.3} speed={0.78} />
          <Turbine position={[13.6, 0.02, 4.2]} rotation={0.1} speed={0.64} />
          <Turbine position={[17.6, 0.02, 2.4]} rotation={0.14} speed={0.69} />
          <Turbine position={[21.5, 0.02, 0.6]} rotation={0.2} speed={0.74} />
        </>
      ) : (
        <JourneyComposition progress={flowProgress} />
      )}

      <ContactShadows
        position={[1.6, 0.02, 1.8]}
        opacity={0.72}
        scale={56}
        blur={1.55}
        far={20}
        resolution={1024}
        color="#89a5ba"
      />
    </group>
  );
}

function FieldFallback() {
  return (
    <div className="pegasoft-field pegasoft-field--fallback" aria-hidden="true">
      <span className="pegasoft-field__fallback pegasoft-field__fallback--a" />
      <span className="pegasoft-field__fallback pegasoft-field__fallback--b" />
      <span className="pegasoft-field__fallback pegasoft-field__fallback--c" />
      <span className="pegasoft-field__fallback pegasoft-field__fallback--d" />
    </div>
  );
}

type LifecyclePiece =
  | 'pallet'
  | 'board'
  | 'tower'
  | 'tower-sm'
  | 'worker'
  | 'tower-md'
  | 'slab'
  | 'slab-lg'
  | 'turbines';

const lifecycleClusters: Array<{
  key: string;
  label: string;
  pieces: LifecyclePiece[];
}> = [
  {
    key: 'signal',
    label: 'Signal framing',
    pieces: ['pallet', 'board'],
  },
  {
    key: 'systems',
    label: 'Interface systems',
    pieces: ['tower', 'tower-sm', 'worker'],
  },
  {
    key: 'quality',
    label: 'Quality checks',
    pieces: ['tower-md', 'slab', 'worker'],
  },
  {
    key: 'proof',
    label: 'Proof and rollout',
    pieces: ['slab-lg', 'turbines'],
  },
] as const;

const lifecycleFocus = [0.14, 0.39, 0.63, 0.88] as const;

export interface PegasoftFieldSceneProps {
  activeLifecycle?: number;
  flowProgress?: number;
  ready?: boolean;
}

export function PegasoftFieldScene({
  activeLifecycle = 0,
  flowProgress = 0,
  ready = true,
}: PegasoftFieldSceneProps) {
  const [canRender, setCanRender] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const clusterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) {
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const supported = Boolean(
        canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
      );
      setCanRender(supported);
    } catch {
      setCanRender(false);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion || !stageRef.current) {
      return;
    }

    const stage = stageRef.current;
    let pointerX = 0;
    let pointerY = 0;
    let scrollRatio = 0;
    let frame = 0;

    const updateScroll = () => {
      const limit =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollRatio = window.scrollY / limit;
    };

    const animateStage = () => {
      const normalizedProgress = Math.min(1, Math.max(0, flowProgress));
      const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
      const ramp = (value: number, start: number, end: number) =>
        clamp01((value - start) / (end - start));
      const focus =
        normalizedProgress > 0
          ? normalizedProgress
          : (lifecycleFocus[activeLifecycle] ?? lifecycleFocus[0]);
      const focusIndex = normalizedProgress * (lifecycleFocus.length - 1);
      const progressDrift = normalizedProgress - 0.5;
      stage.style.setProperty(
        '--stage-x',
        `${(pointerX - 0.5) * 42 + progressDrift * 14}px`,
      );
      stage.style.setProperty(
        '--stage-y',
        `${(pointerY - 0.5) * 24 + scrollRatio * 24 - normalizedProgress * 16}px`,
      );
      stage.style.setProperty(
        '--stage-rotate',
        `${(pointerX - 0.5) * 2 + progressDrift * 1.8}deg`,
      );
      stage.style.setProperty(
        '--path-a-progress',
        `${ramp(normalizedProgress, 0.03, 0.48).toFixed(3)}`,
      );
      stage.style.setProperty(
        '--path-b-progress',
        `${ramp(normalizedProgress, 0.4, 0.92).toFixed(3)}`,
      );

      clusterRefs.current.forEach((cluster, index) => {
        if (!cluster) {
          return;
        }

        const center = lifecycleFocus[index];
        const distance = Math.abs(focus - center);
        const emphasis = clamp01(1 - distance / 0.24);
        const halo = clamp01(1 - distance / 0.46);
        const travel = index - focusIndex;
        const xShift =
          travel * (16 - emphasis * 5) +
          (pointerX - 0.5) * (10 + halo * 5);
        const yShift =
          distance * 26 -
          emphasis * 10 -
          halo * 4 +
          (pointerY - 0.5) * (5 + halo * 3);

        cluster.style.setProperty('--cluster-shift-x', `${xShift.toFixed(2)}px`);
        cluster.style.setProperty('--cluster-shift-y', `${yShift.toFixed(2)}px`);
        cluster.style.setProperty(
          '--cluster-scale',
          `${(0.84 + halo * 0.08 + emphasis * 0.16).toFixed(3)}`,
        );
        cluster.style.setProperty(
          '--cluster-opacity',
          `${(0.24 + halo * 0.22 + emphasis * 0.54).toFixed(3)}`,
        );
        cluster.style.setProperty(
          '--cluster-blur',
          `${((1 - halo) * 4.8 + (1 - emphasis) * 0.8).toFixed(2)}px`,
        );
        cluster.style.setProperty(
          '--cluster-glow',
          `${(0.06 + halo * 0.12 + emphasis * 0.2).toFixed(3)}`,
        );
      });

      nodeRefs.current.forEach((node, index) => {
        if (!node) {
          return;
        }

        const distance = Math.abs(index - focusIndex);
        const emphasis = clamp01(1 - distance / 0.9);
        const halo = clamp01(1 - distance / 1.6);
        node.style.setProperty(
          '--node-scale',
          `${(1 + halo * 0.1 + emphasis * 0.18).toFixed(3)}`,
        );
        node.style.setProperty(
          '--node-opacity',
          `${(0.34 + halo * 0.24 + emphasis * 0.42).toFixed(3)}`,
        );
      });

      frame = window.requestAnimationFrame(animateStage);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };

    const onScroll = () => {
      updateScroll();
    };

    updateScroll();
    frame = window.requestAnimationFrame(animateStage);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [activeLifecycle, flowProgress, reducedMotion]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      reducedMotion ||
      !stageRef.current ||
      !ready
    ) {
      return;
    }

    const stage = stageRef.current;
    const clusters = stage.querySelectorAll('.pegasoft-cluster');
    const pieces = stage.querySelectorAll('.pegasoft-cluster__piece, .pegasoft-cluster__worker, .pegasoft-cluster__turbine');
    const flowPath = stage.querySelector('.pegasoft-flow-path');
    const flowNodes = stage.querySelectorAll('.pegasoft-flow-node');

    const timeline = createTimeline({
      defaults: {
        ease: cubicBezier(0.22, 1, 0.36, 1),
      },
    });

    if (flowPath) {
      timeline.add(flowPath, {
        opacity: [0, 1],
        scaleX: [0.7, 1],
        duration: 1100,
      });
    }

    timeline
      .add(
        flowNodes,
        {
          opacity: [0, 1],
          scale: [0.4, 1],
          duration: 740,
          delay: stagger(120),
        },
        flowPath ? '-=760' : 0,
      )
      .add(
        clusters,
        {
          opacity: [0, 1],
          translateY: [56, 0],
          translateX: [18, 0],
          scale: [0.82, 1],
          duration: 980,
          delay: stagger(120),
        },
        '-=660',
      )
      .add(
        pieces,
        {
          opacity: [0, 1],
          translateY: [22, 0],
          scale: [0.92, 1],
          duration: 740,
          delay: stagger(28),
        },
        '-=820',
      );

    const shimmer = animate(stage.querySelectorAll('.pegasoft-cluster__glow'), {
      opacity: [0.2, 0.54],
      duration: 2400,
      delay: stagger(180),
      direction: 'alternate',
      loop: true,
      ease: 'inOutSine',
    });

    return () => {
      timeline.pause();
      shimmer.pause();
    };
  }, [ready, reducedMotion]);

  if (!canRender) {
    return <FieldFallback />;
  }

  return (
    <div className="pegasoft-field" aria-hidden="true">
      <Canvas shadows camera={{ position: [24.4, 11.8, 20.8], fov: 24 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#d0e1eb']} />
        <fog attach="fog" args={['#d0e1eb', 28, 84]} />
        <ambientLight intensity={1.52} />
        <directionalLight
          color="#ffffff"
          intensity={2.8}
          position={[18, 22, 12]}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00008}
        />
        <directionalLight
          color="#cbd9e7"
          intensity={1.2}
          position={[-14, 10, 24]}
        />
        <FieldComposition flowProgress={flowProgress} />
      </Canvas>
      <div
        ref={stageRef}
        className={`pegasoft-stage stage--life-${activeLifecycle}${flowProgress > 0.02 ? ' is-flowing' : ''}`}
      >
        <div className="pegasoft-flow-path">
          <span className="pegasoft-flow-path__line pegasoft-flow-path__line--a" />
          <span className="pegasoft-flow-path__line pegasoft-flow-path__line--b" />
        </div>
        <div className="pegasoft-flow-nodes">
          {lifecycleClusters.map((cluster, index) => (
            <div
              key={cluster.key}
              ref={(node) => {
                nodeRefs.current[index] = node;
              }}
              className={index === activeLifecycle ? 'pegasoft-flow-node is-active' : 'pegasoft-flow-node'}
            >
              <span className="pegasoft-flow-node__core" />
            </div>
          ))}
        </div>
        {lifecycleClusters.map((cluster, index) => (
          <div
            key={cluster.key}
            ref={(node) => {
              clusterRefs.current[index] = node;
            }}
            className={index === activeLifecycle ? 'pegasoft-cluster is-active' : 'pegasoft-cluster'}
            data-lifecycle={cluster.key}
            aria-label={cluster.label}
          >
            <span className="pegasoft-cluster__glow" />
            <div className="pegasoft-cluster__shadow" />
            {cluster.pieces.includes('pallet') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--pallet" />
            ) : null}
            {cluster.pieces.includes('board') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--board" />
            ) : null}
            {cluster.pieces.includes('tower') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--tower" />
            ) : null}
            {cluster.pieces.includes('tower-sm') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--tower-sm" />
            ) : null}
            {cluster.pieces.includes('tower-md') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--tower-md" />
            ) : null}
            {cluster.pieces.includes('slab') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--slab" />
            ) : null}
            {cluster.pieces.includes('slab-lg') ? (
              <div className="pegasoft-cluster__piece pegasoft-cluster__piece--slab-lg" />
            ) : null}
            {cluster.pieces.includes('worker') ? (
              <div className="pegasoft-cluster__worker" />
            ) : null}
            {cluster.pieces.includes('turbines') ? (
              <div className="pegasoft-cluster__turbines">
                {[0, 1, 2].map((turbine) => (
                  <div
                    key={turbine}
                    className={`pegasoft-cluster__turbine pegasoft-cluster__turbine--${turbine + 1}`}
                  >
                    <span className="pegasoft-cluster__mast" />
                    <span className="pegasoft-cluster__hub">
                      <span className="pegasoft-cluster__blade pegasoft-cluster__blade--1" />
                      <span className="pegasoft-cluster__blade pegasoft-cluster__blade--2" />
                      <span className="pegasoft-cluster__blade pegasoft-cluster__blade--3" />
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
