'use client';

import { animate, createTimeline, cubicBezier, stagger } from 'animejs';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type Vec3Tuple = [number, number, number];

type RailFrame = {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
};

type RigStop = {
  at: number;
  side: number;
  back: number;
  height: number;
  targetForward: number;
  targetSide: number;
  targetHeight: number;
};

type RailSegment = {
  start: Vec3Tuple;
  end: Vec3Tuple;
  length: number;
  startRatio: number;
  endRatio: number;
};

type ReferenceAnchor =
  | 'vectr-ref2-01'
  | 'vectr-ref2-02'
  | 'vectr-ref2-03'
  | 'vectr-ref2-04'
  | 'vectr-ref2-05'
  | 'vectr-ref2-06'
  | 'vectr-ref2-07'
  | 'vectr-ref2-08'
  | 'vectr-ref2-09'
  | 'vectr-ref2-10';

type BeamMode = 'red-concept' | 'tunnel-blue' | 'pulse-blue' | 'arrival-blue';

type MonumentState = {
  key: 'stage1' | 'stage2' | 'stage3' | 'stage4';
  focusAt: number;
  visibleStart: number;
  peak: number;
  visibleEnd: number;
  floorRadius: number;
  floorColor: string;
  floorOpacity: number;
  references: ReferenceAnchor[];
};

type PulseSpec = {
  contactStart: number;
  intervalSeconds: number;
  bandWidth: number;
  references: ReferenceAnchor[];
};

type HeroBeat = {
  key: 'opening' | 'stage1' | 'stage2' | 'stage3' | 'stage4';
  start: number;
  peak: number;
  end: number;
  beamMode: BeamMode;
  textExitStart: number;
  textExitEnd: number;
  references: ReferenceAnchor[];
};

type CameraStop = {
  key: HeroBeat['key'];
  at: number;
  side: number;
  back: number;
  height: number;
  targetForward: number;
  targetSide: number;
  targetHeight: number;
  trailerMix: number;
  references: ReferenceAnchor[];
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothStep = (value: number) => value * value * (3 - value * 2);
const dampAmount = (speed: number, delta: number) =>
  1 - Math.exp(-speed * delta);

const railPoints: Vec3Tuple[] = [
  [-31.2, 0.09, 13.8],
  [-25.4, 0.09, 10.8],
  [-18.6, 0.09, 7.2],
  [-10.2, 0.09, 3.5],
  [-1.2, 0.09, 0.2],
  [9.4, 0.09, -3.8],
  [21.8, 0.09, -7.2],
  [34.6, 0.09, -5.2],
  [47.8, 0.09, -0.4],
];

const railSegments: RailSegment[] = (() => {
  const segments = railPoints.slice(0, -1).map((point, index) => {
    const next = railPoints[index + 1];
    const from = new THREE.Vector3(...point);
    const to = new THREE.Vector3(...next);
    return {
      start: point,
      end: next,
      length: from.distanceTo(to),
      startRatio: 0,
      endRatio: 0,
    };
  });
  const totalLength =
    segments.reduce((sum, segment) => sum + segment.length, 0) || 1;
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
})();

function getRailPointAt(progress: number): Vec3Tuple {
  const lead = clamp01(progress);
  const segment =
    railSegments.find(
      (item) => lead >= item.startRatio && lead <= item.endRatio,
    ) ?? railSegments[railSegments.length - 1];
  const localProgress = clamp01(
    (lead - segment.startRatio) / (segment.endRatio - segment.startRatio || 1),
  );

  return [
    THREE.MathUtils.lerp(segment.start[0], segment.end[0], localProgress),
    THREE.MathUtils.lerp(segment.start[1], segment.end[1], localProgress),
    THREE.MathUtils.lerp(segment.start[2], segment.end[2], localProgress),
  ];
}

function getRailFrameAt(progress: number): RailFrame {
  const normalizedProgress = clamp01(progress);
  const point = new THREE.Vector3(...getRailPointAt(normalizedProgress));
  const before = new THREE.Vector3(
    ...getRailPointAt(normalizedProgress - 0.012),
  );
  const after = new THREE.Vector3(
    ...getRailPointAt(normalizedProgress + 0.012),
  );
  const tangent = after.sub(before).normalize();
  const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

  return { point, tangent, right };
}

function getRailYaw(progress: number) {
  const { tangent } = getRailFrameAt(progress);
  return Math.atan2(tangent.x, tangent.z);
}

function getRailPosition(progress: number, side = 0, lift = 0): Vec3Tuple {
  const { point, right } = getRailFrameAt(progress);
  point.add(right.multiplyScalar(side));
  point.y += lift;
  return [point.x, point.y, point.z];
}

function BeamPath({
  points,
  progress = 1,
  radius = 0.05,
  opacity = 1,
  color = '#ff4b5f',
}: {
  points: Vec3Tuple[];
  progress?: number;
  radius?: number;
  opacity?: number;
  color?: string;
}) {
  const segments = useMemo(() => {
    const items = points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      const from = new THREE.Vector3(...point);
      const to = new THREE.Vector3(...next);
      return {
        start: point,
        end: next,
        length: from.distanceTo(to),
      };
    });
    const totalLength = items.reduce((sum, item) => sum + item.length, 0) || 1;
    let cursor = 0;

    return items.map((item) => {
      const startRatio = cursor / totalLength;
      cursor += item.length;
      return {
        ...item,
        startRatio,
        endRatio: cursor / totalLength,
      };
    });
  }, [points]);

  const pathProgress = clamp01(progress);

  return (
    <group>
      {segments.map((segment, index) => {
        const fill = clamp01(
          (pathProgress - segment.startRatio) /
            (segment.endRatio - segment.startRatio || 1),
        );

        if (fill <= 0.01) {
          return null;
        }

        return (
          <GlowBeam
            key={index}
            start={segment.start}
            end={[
              THREE.MathUtils.lerp(segment.start[0], segment.end[0], fill),
              THREE.MathUtils.lerp(segment.start[1], segment.end[1], fill),
              THREE.MathUtils.lerp(segment.start[2], segment.end[2], fill),
            ]}
            radius={radius}
            opacity={opacity}
            color={color}
          />
        );
      })}
    </group>
  );
}

function windowWeight(value: number, start: number, peak: number, end: number) {
  if (value <= start || value >= end) {
    return 0;
  }

  if (value <= peak) {
    return clamp01((value - start) / (peak - start));
  }

  return clamp01((end - value) / (end - peak));
}

const monumentStates: MonumentState[] = [
  {
    key: 'stage1',
    focusAt: 0.12,
    visibleStart: 0,
    peak: 0.12,
    visibleEnd: 0.52,
    floorRadius: 3.1,
    floorColor: '#c2f5ff',
    floorOpacity: 0.18,
    references: ['vectr-ref2-01', 'vectr-ref2-02'],
  },
  {
    key: 'stage2',
    focusAt: 0.38,
    visibleStart: 0.18,
    peak: 0.38,
    visibleEnd: 0.78,
    floorRadius: 3.5,
    floorColor: '#d5dcff',
    floorOpacity: 0.22,
    references: ['vectr-ref2-02', 'vectr-ref2-03', 'vectr-ref2-04'],
  },
  {
    key: 'stage3',
    focusAt: 0.66,
    visibleStart: 0.5,
    peak: 0.67,
    visibleEnd: 0.97,
    floorRadius: 4.2,
    floorColor: '#a8efff',
    floorOpacity: 0.13,
    references: [
      'vectr-ref2-04',
      'vectr-ref2-05',
      'vectr-ref2-06',
      'vectr-ref2-07',
      'vectr-ref2-08',
    ],
  },
  {
    key: 'stage4',
    focusAt: 0.86,
    visibleStart: 0.78,
    peak: 0.88,
    visibleEnd: 1.03,
    floorRadius: 3.7,
    floorColor: '#d7f4ff',
    floorOpacity: 0.18,
    references: ['vectr-ref2-09', 'vectr-ref2-10'],
  },
];

const heroBeats: HeroBeat[] = [
  {
    key: 'opening',
    start: 0,
    peak: 0.03,
    end: 0.14,
    beamMode: 'red-concept',
    textExitStart: 0.02,
    textExitEnd: 0.16,
    references: ['vectr-ref2-01'],
  },
  {
    key: 'stage1',
    start: 0,
    peak: 0.12,
    end: 0.34,
    beamMode: 'red-concept',
    textExitStart: 0.04,
    textExitEnd: 0.18,
    references: ['vectr-ref2-01', 'vectr-ref2-02'],
  },
  {
    key: 'stage2',
    start: 0.26,
    peak: 0.39,
    end: 0.58,
    beamMode: 'tunnel-blue',
    textExitStart: 0.18,
    textExitEnd: 0.28,
    references: ['vectr-ref2-02', 'vectr-ref2-03', 'vectr-ref2-04'],
  },
  {
    key: 'stage3',
    start: 0.54,
    peak: 0.68,
    end: 0.84,
    beamMode: 'pulse-blue',
    textExitStart: 0.56,
    textExitEnd: 0.68,
    references: [
      'vectr-ref2-04',
      'vectr-ref2-05',
      'vectr-ref2-06',
      'vectr-ref2-07',
      'vectr-ref2-08',
    ],
  },
  {
    key: 'stage4',
    start: 0.78,
    peak: 0.9,
    end: 1.02,
    beamMode: 'arrival-blue',
    textExitStart: 0.82,
    textExitEnd: 0.94,
    references: ['vectr-ref2-09', 'vectr-ref2-10'],
  },
];

const pulseSpec: PulseSpec = {
  contactStart: 0.655,
  intervalSeconds: 0.4,
  bandWidth: 1.5,
  references: [
    'vectr-ref2-05',
    'vectr-ref2-06',
    'vectr-ref2-07',
    'vectr-ref2-08',
  ],
};

const cameraStops: CameraStop[] = [
  {
    key: 'opening',
    at: 0,
    side: -18.2,
    back: 24.4,
    height: 15.8,
    targetForward: 9.6,
    targetSide: 0.8,
    targetHeight: 1.1,
    trailerMix: 1,
    references: ['vectr-ref2-01'],
  },
  {
    key: 'stage1',
    at: 0.12,
    side: -15.2,
    back: 22.4,
    height: 14.1,
    targetForward: 7.8,
    targetSide: 0.2,
    targetHeight: 1.15,
    trailerMix: 0.95,
    references: ['vectr-ref2-01', 'vectr-ref2-02'],
  },
  {
    key: 'stage2',
    at: 0.38,
    side: 3.8,
    back: 11.2,
    height: 7.8,
    targetForward: 4.8,
    targetSide: -0.02,
    targetHeight: 1.18,
    trailerMix: 0.32,
    references: ['vectr-ref2-03', 'vectr-ref2-04'],
  },
  {
    key: 'stage3',
    at: 0.66,
    side: -13.8,
    back: 23.2,
    height: 15.1,
    targetForward: 8.1,
    targetSide: 0.46,
    targetHeight: 1.22,
    trailerMix: 0.98,
    references: [
      'vectr-ref2-04',
      'vectr-ref2-05',
      'vectr-ref2-06',
      'vectr-ref2-07',
      'vectr-ref2-08',
    ],
  },
  {
    key: 'stage4',
    at: 0.86,
    side: 8.6,
    back: 22.2,
    height: 14.5,
    targetForward: 7.6,
    targetSide: -0.14,
    targetHeight: 1.24,
    trailerMix: 0.94,
    references: ['vectr-ref2-09', 'vectr-ref2-10'],
  },
  {
    key: 'stage4',
    at: 1,
    side: 9.2,
    back: 23,
    height: 14.7,
    targetForward: 7.9,
    targetSide: -0.18,
    targetHeight: 1.26,
    trailerMix: 0.95,
    references: ['vectr-ref2-10'],
  },
];

function getBeatWeight(value: number, beat: HeroBeat) {
  return windowWeight(value, beat.start, beat.peak, beat.end);
}

function getMonumentWeight(value: number, monument: MonumentState) {
  return windowWeight(
    value,
    monument.visibleStart,
    monument.peak,
    monument.visibleEnd,
  );
}

function getCameraProgress(progress: number) {
  const clamped = clamp01(progress);

  if (clamped <= 0.12) {
    return THREE.MathUtils.lerp(0, 0.12, smoothStep(clamped / 0.12));
  }
  if (clamped <= 0.38) {
    return THREE.MathUtils.lerp(
      0.12,
      0.38,
      smoothStep(clamp01((clamped - 0.12) / 0.26)),
    );
  }
  if (clamped <= 0.66) {
    return THREE.MathUtils.lerp(
      0.38,
      0.66,
      smoothStep(clamp01((clamped - 0.38) / 0.28)),
    );
  }
  return THREE.MathUtils.lerp(
    0.66,
    0.9,
    smoothStep(clamp01((clamped - 0.66) / 0.34)),
  );
}

function getRigStop(progress: number): RigStop {
  const normalizedProgress = clamp01(progress);
  const nextIndex = cameraStops.findIndex(
    (stop) => stop.at >= normalizedProgress,
  );

  if (nextIndex <= 0) {
    return cameraStops[0];
  }

  if (nextIndex === -1) {
    return cameraStops[cameraStops.length - 1];
  }

  const previous = cameraStops[nextIndex - 1];
  const next = cameraStops[nextIndex];
  const amount = smoothStep(
    clamp01((normalizedProgress - previous.at) / (next.at - previous.at || 1)),
  );

  return {
    at: normalizedProgress,
    side: THREE.MathUtils.lerp(previous.side, next.side, amount),
    back: THREE.MathUtils.lerp(previous.back, next.back, amount),
    height: THREE.MathUtils.lerp(previous.height, next.height, amount),
    targetForward: THREE.MathUtils.lerp(
      previous.targetForward,
      next.targetForward,
      amount,
    ),
    targetSide: THREE.MathUtils.lerp(
      previous.targetSide,
      next.targetSide,
      amount,
    ),
    targetHeight: THREE.MathUtils.lerp(
      previous.targetHeight,
      next.targetHeight,
      amount,
    ),
  };
}

const buildingMaterial = new THREE.MeshPhysicalMaterial({
  color: '#edf3f8',
  roughness: 0.56,
  metalness: 0.03,
  clearcoat: 0.08,
  clearcoatRoughness: 0.72,
});

const roofMaterial = new THREE.MeshPhysicalMaterial({
  color: '#f9fcff',
  roughness: 0.38,
  metalness: 0.01,
  clearcoat: 0.18,
  clearcoatRoughness: 0.3,
});

const accentMaterial = new THREE.MeshStandardMaterial({
  color: '#c1d1dd',
  roughness: 0.58,
});

const softBlueMaterial = new THREE.MeshStandardMaterial({
  color: '#abc2d6',
  roughness: 0.52,
});

function RoofFrame({ size }: { size: [number, number, number] }) {
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
      <RoundedBox castShadow receiveShadow args={size} radius={0.14} smoothness={3}>
        <primitive object={buildingMaterial} attach="material" />
      </RoundedBox>
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
        <group
          key={`${position.join('-')}-${index}`}
          position={[0, level.y, 0]}
        >
          <RoundedBox
            castShadow
            receiveShadow
            args={level.size}
            radius={0.14}
            smoothness={3}
          >
            <primitive object={buildingMaterial} attach="material" />
          </RoundedBox>
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
      <RoundedBox
        castShadow
        receiveShadow
        args={[4.5, 1.7, 2.7]}
        radius={0.18}
        smoothness={3}
      >
        <primitive object={buildingMaterial} attach="material" />
      </RoundedBox>
      {pierOffsets.map((offset) => (
        <RoundedBox
          key={`${position.join('-')}-${offset}`}
          position={[offset, -1.02, 0.78]}
          castShadow
          args={[0.42, 0.84, 0.58]}
          radius={0.06}
          smoothness={2}
        >
          <primitive object={accentMaterial} attach="material" />
        </RoundedBox>
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
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function MonumentHeartbeat({
  position,
  active,
  color = '#8eeaff',
  radius = 2.4,
}: {
  position: [number, number, number];
  active: number;
  color?: string;
  radius?: number;
}) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const activeMix = smoothStep(clamp01(active));
    const outer = outerRef.current;
    const inner = innerRef.current;
    const outerMaterial = outerMaterialRef.current;
    const innerMaterial = innerMaterialRef.current;

    if (!outer || !inner || !outerMaterial || !innerMaterial) {
      return;
    }

    if (activeMix <= 0.001) {
      outer.scale.setScalar(0.82);
      inner.scale.setScalar(0.76);
      outerMaterial.opacity = 0;
      innerMaterial.opacity = 0;
      return;
    }

    const heartbeat = Math.pow(Math.max(0, Math.sin(clock.getElapsedTime() * 4.1)), 2);
    const swell = 0.92 + heartbeat * 0.26;
    const coreSwell = 0.88 + heartbeat * 0.16;

    outer.scale.setScalar(swell);
    inner.scale.setScalar(coreSwell);
    outerMaterial.opacity = activeMix * (0.08 + heartbeat * 0.16);
    innerMaterial.opacity = activeMix * (0.06 + heartbeat * 0.2);
  });

  return (
    <group position={position}>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 36]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={innerRef} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.58, 32]} />
        <meshBasicMaterial
          ref={innerMaterialRef}
          color="#f1fcff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
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
      <cylinderGeometry args={[radius, radius, beam.length, 20]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
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
  color?: THREE.ColorRepresentation;
  edgeColor?: THREE.ColorRepresentation;
  edgeOpacity?: number;
  highlight?: number;
}) {
  return (
    <group position={position}>
      {glow > 0 ? (
        <GlowDisc
          position={[0, 0.02, 0]}
          radius={Math.max(size[0], size[2]) * 0.7}
          opacity={glow}
        />
      ) : null}
      <RoundedBox
        receiveShadow
        position={[0, Math.max(0.04, size[1] * 0.08), 0]}
        scale={[1.06, 1, 1.06]}
        args={[size[0], Math.max(0.08, size[1] * 0.14), size[2]]}
        radius={Math.min(size[0], size[2]) * 0.08}
        smoothness={3}
      >
        <meshPhysicalMaterial
          color="#aebfcc"
          transparent
          opacity={0.2 + opacity * 0.18}
          roughness={0.88}
          metalness={0.02}
        />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        position={[0, size[1] / 2, 0]}
        args={size}
        radius={Math.min(size[0], size[2]) * 0.09}
        smoothness={3}
      >
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.58}
          metalness={0.02}
          clearcoat={0.24}
          clearcoatRoughness={0.32}
        />
      </RoundedBox>
      <RoundedBox
        position={[0, size[1] + 0.016, 0]}
        args={[
          size[0] * 0.84,
          Math.max(0.028, size[1] * 0.08),
          size[2] * 0.84,
        ]}
        radius={Math.min(size[0], size[2]) * 0.08}
        smoothness={3}
      >
        <meshPhysicalMaterial
          color="#f7fcff"
          transparent
          opacity={Math.min(0.92, opacity * 0.82)}
          roughness={0.34}
          metalness={0.01}
          clearcoat={0.3}
          clearcoatRoughness={0.22}
        />
      </RoundedBox>
      <mesh
        position={[0, size[1] / 2 + 0.004, 0]}
        scale={[1.005, 1.005, 1.005]}
      >
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={edgeOpacity * 1.18}
          wireframe
          depthWrite={false}
          toneMapped={false}
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
          radius={0.07 + dot.strength * 0.1}
          opacity={(0.02 + dot.strength * 0.11) * progress}
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
          <mesh
            castShadow
            receiveShadow
            position={[-1.3 + index * 0.12, 0.34, 0]}
          >
            <boxGeometry args={[4.8 - index * 0.18, 0.66, 0.7]} />
            <meshPhysicalMaterial
              color={color}
              transparent
              opacity={opacity}
              roughness={0.64}
            />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[1.42 + index * 0.1, 0.34, 1.18]}
            rotation={[0, 0, -Math.PI / 4]}
          >
            <boxGeometry args={[2.44 - index * 0.1, 0.66, 0.7]} />
            <meshPhysicalMaterial
              color={color}
              transparent
              opacity={opacity}
              roughness={0.64}
            />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[1.42 + index * 0.1, 0.34, -1.18]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <boxGeometry args={[2.44 - index * 0.1, 0.66, 0.7]} />
            <meshPhysicalMaterial
              color={color}
              transparent
              opacity={opacity}
              roughness={0.64}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function JourneyComposition({ progress }: { progress: number }) {
  const [, setPulseRenderTick] = useState(0);
  const stage3PulseStartRef = useRef<number | null>(null);
  const stage3PulseElapsedRef = useRef(0);
  const pulseCommitRef = useRef(0);
  const openingBeat = heroBeats[0];
  const stage1Monument = monumentStates[0];
  const stage2Monument = monumentStates[1];
  const stage3Monument = monumentStates[2];
  const stage4Monument = monumentStates[3];
  const openingStage1 = 0.74 * (1 - clamp01((progress - 0.08) / 0.22));
  const stage1 = Math.max(openingStage1, getMonumentWeight(progress, stage1Monument));
  const stage2 = getMonumentWeight(progress, stage2Monument);
  const stage3 = getMonumentWeight(progress, stage3Monument);
  const stage4 = getMonumentWeight(progress, stage4Monument);
  const stage2TunnelActive = smoothStep(clamp01((progress - 0.402) / 0.05));
  const beamBloom = Math.max(stage2, stage3, stage4);
  const ideaProgress = clamp01(progress / (openingBeat.end + 0.18));
  const ideaOpacity = clamp01(1 - (progress - 0.25) / 0.15);
  const blueTravelStart = 0.39;
  const blueTravelEnd = 0.885;
  const blueReveal = clamp01((progress - blueTravelStart) / 0.045);
  const lateTravelBoost = clamp01((progress - 0.62) / 0.28);
  const blueTravelProgress = clamp01(
    (progress - blueTravelStart) / (blueTravelEnd - blueTravelStart),
  );
  const blueRailLead = clamp01(
    Math.min(
      0.862,
      THREE.MathUtils.lerp(0.382, 0.862, blueTravelProgress) +
        lateTravelBoost * 0.01,
    ),
  );
  const blueTipPoint = getRailPointAt(blueRailLead);
  const stage3BeamArrival = smoothStep(
    clamp01((blueRailLead - pulseSpec.contactStart) / 0.03),
  );
  const stage3PulseElapsed = stage3PulseElapsedRef.current;
  const monumentScale = 0.66;
  const stage1Position = getRailPosition(stage1Monument.focusAt, 0.2);
  const stage2Position = getRailPosition(stage2Monument.focusAt, 0);
  const stage3Position = getRailPosition(stage3Monument.focusAt, -0.2);
  const stage4Position = getRailPosition(stage4Monument.focusAt, 0.2);
  const stage3GridOffsets = [
    -7.1, -5.68, -4.26, -2.84, -1.42, 0, 1.42, 2.84, 4.26, 5.68, 7.1,
  ];
  const convergencePoint = getRailPosition(0.265, 0, 0.02);
  const stage1BundleEntry = getRailPosition(0.348, 0, 0.02);
  const ideaPaths: Vec3Tuple[][] = [
    [
      getRailPosition(0.085, -1.7, 0.02),
      getRailPosition(0.16, -1.7, 0.02),
      convergencePoint,
      stage1BundleEntry,
    ],
    [
      getRailPosition(0.095, 1.1, 0.02),
      getRailPosition(0.095, 0.36, 0.02),
      convergencePoint,
      stage1BundleEntry,
    ],
    [
      getRailPosition(0.12, -0.9, 0.02),
      getRailPosition(0.21, -0.9, 0.02),
      getRailPosition(0.21, -0.16, 0.02),
      stage1BundleEntry,
    ],
    [
      getRailPosition(0.13, 1.8, 0.02),
      getRailPosition(0.24, 1.8, 0.02),
      getRailPosition(0.24, 0.18, 0.02),
      stage1BundleEntry,
    ],
  ];
  const stageAnchors: Array<{
    position: [number, number, number];
    radius: number;
    opacity: number;
    color: string;
  }> = [
    {
      position: [stage1Position[0], 0.04, stage1Position[2]],
      radius: 1.8,
      opacity: 0.03 + stage1 * 0.16,
      color: '#b6f0ff',
    },
    {
      position: [stage2Position[0], 0.04, stage2Position[2]],
      radius: 2.5,
      opacity: 0.03 + stage2 * 0.18,
      color: '#c3caff',
    },
    {
      position: [stage3Position[0], 0.04, stage3Position[2]],
      radius: 2.7,
      opacity: 0.015 + stage3 * 0.07,
      color: '#9febff',
    },
    {
      position: [stage4Position[0], 0.04, stage4Position[2]],
      radius: 3.1,
      opacity: 0.03 + stage4 * 0.16,
      color: '#d7f5ff',
    },
  ];
  const entranceBlooms = [
    {
      position: [stage1Position[0], 0.025, stage1Position[2]] as Vec3Tuple,
      radius: 2.7,
      opacity: windowWeight(progress, -0.02, 0.11, 0.31) * 0.24,
    },
    {
      position: [stage2Position[0], 0.025, stage2Position[2]] as Vec3Tuple,
      radius: 3.2,
      opacity: windowWeight(progress, 0.22, 0.39, 0.58) * 0.28,
    },
    {
      position: [stage3Position[0], 0.025, stage3Position[2]] as Vec3Tuple,
      radius: 3.9,
      opacity: windowWeight(progress, 0.52, 0.67, 0.84) * 0.1,
    },
    {
      position: [stage4Position[0], 0.025, stage4Position[2]] as Vec3Tuple,
      radius: 3.6,
      opacity: windowWeight(progress, 0.72, 0.87, 1.02) * 0.24,
    },
  ];

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (stage3BeamArrival > 0.94) {
      if (stage3PulseStartRef.current === null) {
        stage3PulseStartRef.current = elapsed;
        pulseCommitRef.current = elapsed;
      }
      stage3PulseElapsedRef.current = elapsed - stage3PulseStartRef.current;
      if (elapsed - pulseCommitRef.current >= 1 / 30) {
        pulseCommitRef.current = elapsed;
        setPulseRenderTick((current) => (current + 1) % 1024);
      }
      return;
    }

    if (stage3PulseStartRef.current !== null) {
      stage3PulseStartRef.current = null;
      stage3PulseElapsedRef.current = 0;
      pulseCommitRef.current = elapsed;
      setPulseRenderTick((current) => (current + 1) % 1024);
    }
  });

  return (
    <group
      position={[0, 0.01 + Math.sin(progress * Math.PI) * 0.04, 0]}
      rotation={[0, 0, 0]}
      scale={1}
    >
      {ideaPaths.map((path, index) => (
        <BeamPath
          key={`idea-path-${index}`}
          points={path}
          progress={ideaProgress}
          radius={0.062}
          opacity={ideaOpacity * 0.82}
          color="#ff4b5f"
        />
      ))}
      {ideaPaths.map((path, index) => (
        <BeamPath
          key={`idea-core-${index}`}
          points={path}
          progress={ideaProgress}
          radius={0.044}
          opacity={ideaOpacity * 0.92}
          color="#ff8d9a"
        />
      ))}

      {railSegments.map((segment, index) => {
        if (blueReveal <= 0.01 || segment.endRatio <= 0.38) {
          return null;
        }

        const segmentStartRatio = Math.max(segment.startRatio, 0.38);
        const segmentFillRaw =
          (blueRailLead - segmentStartRatio) /
          (segment.endRatio - segmentStartRatio || 1);
        const segmentFill = clamp01(segmentFillRaw);
        if (segmentFill <= 0.01) {
          return null;
        }

        const localStart = clamp01(
          (segmentStartRatio - segment.startRatio) /
            (segment.endRatio - segment.startRatio || 1),
        );
        const activeStart: Vec3Tuple = [
          THREE.MathUtils.lerp(segment.start[0], segment.end[0], localStart),
          THREE.MathUtils.lerp(segment.start[1], segment.end[1], localStart),
          THREE.MathUtils.lerp(segment.start[2], segment.end[2], localStart),
        ];
        const activeEnd: [number, number, number] = [
          THREE.MathUtils.lerp(activeStart[0], segment.end[0], segmentFill),
          THREE.MathUtils.lerp(activeStart[1], segment.end[1], segmentFill),
          THREE.MathUtils.lerp(activeStart[2], segment.end[2], segmentFill),
        ];
        const tipStart: Vec3Tuple = [
          THREE.MathUtils.lerp(activeStart[0], activeEnd[0], 0.67),
          THREE.MathUtils.lerp(activeStart[1], activeEnd[1], 0.67),
          THREE.MathUtils.lerp(activeStart[2], activeEnd[2], 0.67),
        ];
        const tipCoreStart: Vec3Tuple = [
          THREE.MathUtils.lerp(activeStart[0], activeEnd[0], 0.8),
          THREE.MathUtils.lerp(activeStart[1], activeEnd[1], 0.8),
          THREE.MathUtils.lerp(activeStart[2], activeEnd[2], 0.8),
        ];

        return (
          <group key={`rail-live-${index}`}>
            <GlowBeam
              start={activeStart}
              end={activeEnd}
              radius={0.072}
              opacity={(0.12 + beamBloom * 0.05) * blueReveal}
              color="#7edfff"
            />
            <GlowBeam
              start={activeStart}
              end={activeEnd}
              radius={0.038}
              opacity={0.92 * blueReveal}
              color="#3cbdf2"
            />
            <GlowBeam
              start={tipStart}
              end={activeEnd}
              radius={0.058 + beamBloom * 0.012}
              opacity={(0.34 + beamBloom * 0.2) * blueReveal}
              color="#8be9ff"
            />
            <GlowBeam
              start={tipCoreStart}
              end={activeEnd}
              radius={0.026}
              opacity={0.98 * blueReveal}
              color="#f5fdff"
            />
          </group>
        );
      })}

      {stageAnchors.map((anchor, index) => (
        <GlowDisc
          key={`anchor-${index}`}
          position={anchor.position}
          radius={anchor.radius}
          opacity={anchor.opacity}
          color={anchor.color}
        />
      ))}
      {[
        {
          key: 'heartbeat-1',
          position: [stage1Position[0], 0.028, stage1Position[2]] as Vec3Tuple,
          active: windowWeight(progress, 0.13, 0.18, 0.38),
          radius: 2.2,
          color: '#9aefff',
        },
        {
          key: 'heartbeat-2',
          position: [stage2Position[0], 0.028, stage2Position[2]] as Vec3Tuple,
          active: windowWeight(progress, 0.4, 0.47, 0.61),
          radius: 2.7,
          color: '#c0e3ff',
        },
        {
          key: 'heartbeat-3',
          position: [stage3Position[0], 0.028, stage3Position[2]] as Vec3Tuple,
          active: windowWeight(progress, 0.655, 0.72, 0.84),
          radius: 3.1,
          color: '#9feeff',
        },
        {
          key: 'heartbeat-4',
          position: [stage4Position[0], 0.028, stage4Position[2]] as Vec3Tuple,
          active: windowWeight(progress, 0.865, 0.91, 0.97),
          radius: 2.8,
          color: '#cff4ff',
        },
      ].map((heartbeat) => (
        <MonumentHeartbeat
          key={heartbeat.key}
          position={heartbeat.position}
          active={heartbeat.active}
          radius={heartbeat.radius}
          color={heartbeat.color}
        />
      ))}
      {entranceBlooms.map((bloom, index) => (
        <group key={`entrance-bloom-${index}`}>
          <GlowDisc
            position={bloom.position}
            radius={bloom.radius}
            opacity={bloom.opacity}
            color="#72dfff"
          />
          <GlowDisc
            position={[bloom.position[0], bloom.position[1] + 0.005, bloom.position[2]]}
            radius={bloom.radius * 0.58}
            opacity={bloom.opacity * 0.9}
            color="#f1fbff"
          />
        </group>
      ))}

      <GlowDisc
        position={blueTipPoint}
        radius={0.28}
        opacity={blueReveal * (0.24 + beamBloom * 0.14)}
        color="#f5fdff"
      />

      <group
        position={stage1Position}
        rotation={[0, getRailYaw(0.12) + Math.PI / 2, 0]}
        scale={monumentScale}
      >
        <TowerBuilding
          position={[-3.4, 0.04, 3.2]}
          levels={[
            { size: [2.2, 2.2, 2.2], y: 1.1 },
            { size: [1.86, 1.46, 1.86], y: 2.94 },
          ]}
        />
        <SlabBuilding
          position={[-0.7, 1.62, 0.95]}
          size={[1.94, 3.24, 2.02]}
          ribs={5}
        />
        <SlabBuilding
          position={[2.28, 1.08, 1.78]}
          size={[2.18, 2.16, 2.22]}
          ribs={4}
        />
        <PalletCluster position={[6.2, 0.08, -0.86]} />
        <WorkerFigure position={[-5.2, 0.02, -0.24]} scale={0.92} />
        <GlowBeam
          start={[-3.45, 0.14, -0.1]}
          end={[0.95, 0.14, -0.1]}
          radius={0.072}
          opacity={stage1 * 0.42}
          color="#ff6a7a"
        />
        <GlowBeam
          start={[-3.45, 0.14, -0.1]}
          end={[0.95, 0.14, -0.1]}
          radius={0.052}
          opacity={stage1 * 0.9}
          color="#ff9eaa"
        />
        <GlowBeam
          start={[-3.4, 0.14, 0.56]}
          end={[1.02, 0.14, 0.56]}
          radius={0.072}
          opacity={stage1 * 0.4}
          color="#ff6a7a"
        />
        <GlowBeam
          start={[-3.4, 0.14, 0.56]}
          end={[1.02, 0.14, 0.56]}
          radius={0.052}
          opacity={stage1 * 0.9}
          color="#ff9eaa"
        />
        <GlowBeam
          start={[-1.26, 0.14, 2.86]}
          end={[-1.26, 0.14, 0.2]}
          radius={0.058}
          opacity={stage1 * 0.34}
          color="#ff6a7a"
        />
        <GlowBeam
          start={[-1.26, 0.14, 2.86]}
          end={[-1.26, 0.14, 0.2]}
          radius={0.042}
          opacity={stage1 * 0.84}
          color="#ff9eaa"
        />
      </group>

      <group
        position={stage2Position}
        rotation={[0, getRailYaw(0.38) + Math.PI / 2, 0]}
        scale={monumentScale}
      >
        <DotField
          position={[0.8, 0, 0.48]}
          rows={9}
          cols={15}
          spacing={1.16}
          progress={0.18 + stage2 * 0.82}
        />
        <FactoryBlock position={[-4.58, 1.18, -2.62]} />
        <FactoryBlock position={[-1.82, 1.18, -3.6]} />
        <Turbine position={[5.1, 0.02, -3.8]} rotation={0.24} speed={0.58} />
        <Turbine position={[7.18, 0.02, -2.94]} rotation={0.14} speed={0.64} />
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.42, 2.12, 0.88]} />
          <primitive object={buildingMaterial} attach="material" />
        </mesh>
        <mesh position={[-1.76, 1.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 2.16, 3.38]} />
          <primitive object={buildingMaterial} attach="material" />
        </mesh>
        <mesh position={[1.76, 1.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 2.16, 3.38]} />
          <primitive object={buildingMaterial} attach="material" />
        </mesh>
        <GlowBeam
          start={[-5.56, 0.26, 0]}
          end={[5.56, 0.26, 0]}
          radius={0.068}
          opacity={(0.16 + stage2 * 0.2) * stage2TunnelActive}
          color="#94ebff"
        />
        <GlowBeam
          start={[-5.56, 0.26, 0]}
          end={[5.56, 0.26, 0]}
          radius={0.03}
          opacity={0.9 * stage2TunnelActive}
          color="#f6fcff"
        />
      </group>

      <group
        position={stage3Position}
        rotation={[0, getRailYaw(0.66) + Math.PI / 2, 0]}
        scale={monumentScale}
      >
        <GlowBeam
          start={[-7.35, 0.28, 0]}
          end={[7.35, 0.28, 0]}
          radius={0.045}
          opacity={0.02 + stage3 * 0.16}
          color="#8de9ff"
        />
        <GlowBeam
          start={[0, 0.28, -7.35]}
          end={[0, 0.28, 7.35]}
          radius={0.035}
          opacity={0.015 + stage3 * 0.08}
          color="#f7fdff"
        />
        <DotField
          position={[0, 0, 0]}
          rows={11}
          cols={11}
          spacing={1.42}
          progress={0.01 + stage3 * 0.22}
        />
        {stage3GridOffsets.map((x) =>
          stage3GridOffsets.map((z, index) => {
            const centerBoost = 1 - Math.min(1, Math.hypot(x, z) / 8.2);
            const isCore = Math.abs(x) < 0.2 && Math.abs(z) < 0.2;
            const cellX = Math.round(Math.abs(x) / 1.42);
            const cellZ = Math.round(Math.abs(z) / 1.42);
            const chebyshevRing = Math.max(cellX, cellZ);
            const hugsPodium = !isCore && cellX <= 1 && cellZ <= 1;
            const isCardinalInner =
              !isCore &&
              chebyshevRing === 1 &&
              ((cellX === 1 && cellZ === 0) || (cellX === 0 && cellZ === 1));
            const maxRing = 5.25;
            const pulseTravel = stage3PulseElapsed / pulseSpec.intervalSeconds;
            const pulseCycle = pulseTravel % (maxRing + pulseSpec.bandWidth + 0.6);
            const pulseBeat =
              0.78 + Math.sin((pulseTravel % 1) * Math.PI) * 0.22;
            const pulseHead = 1 + pulseCycle;
            const pulseDistance = Math.abs(chebyshevRing - pulseHead);
            const pulseStrength =
              !isCore && chebyshevRing > 0
                ? smoothStep(clamp01(1 - pulseDistance / pulseSpec.bandWidth)) *
                  pulseBeat *
                  stage3BeamArrival
                : 0;
            const pulseCore =
              smoothStep(clamp01(1 - pulseDistance / 0.64)) *
              pulseBeat *
              stage3BeamArrival;
            const pulseHalo =
              smoothStep(clamp01(1 - pulseDistance / 2.2)) *
              pulseBeat *
              stage3BeamArrival;
            const bandStrength = pulseStrength;
            const glowBoost = pulseStrength * 0.78 + pulseHalo * 0.16;
            const tileOpacityBoost = pulseStrength * 0.52 + pulseHalo * 0.08;
            const tileHighlightBoost = pulseStrength * 0.7 + pulseCore * 0.22;
            const tileColor = isCore
              ? '#4750ef'
              : new THREE.Color('#eef6fb').lerp(
                  new THREE.Color('#c8f6ff'),
                  pulseStrength,
                );
            const tileEdgeColor = isCore
              ? new THREE.Color('#89e5ff').lerp(
                  new THREE.Color('#f7fbff'),
                  stage3BeamArrival,
                )
              : new THREE.Color('#7fdff6').lerp(
                  new THREE.Color('#bdefff'),
                  pulseStrength,
                );
            const outerTileHeight = 0.1;
            const innerTileHeight = outerTileHeight * 1.1;
            const coreTileHeight = 0.84;
            const tileHeight = isCore
              ? coreTileHeight
              : isCardinalInner
                ? coreTileHeight * 0.5
                : hugsPodium
                  ? innerTileHeight
                  : outerTileHeight;
            const podiumBlue = stage3BeamArrival;
            const coreColor = new THREE.Color('#edf6fb').lerp(
              new THREE.Color('#4750ef'),
              podiumBlue,
            );
            const coreGlow = smoothStep(stage3BeamArrival) * 0.38;
            const litSurfaceOpacity = !isCore
              ? clamp01(bandStrength * 0.82 + pulseCore * 0.18)
              : 0;
            return (
              <group key={`${x}-${z}-${index}`} position={[x, 0, z]}>
                {!isCore && bandStrength > 0.02 ? (
                  <>
                    <GlowDisc
                      position={[0, 0.045, 0]}
                      radius={0.72}
                      opacity={bandStrength * 0.24}
                      color="#94eeff"
                    />
                  </>
                ) : null}
                <StoryTile
                  position={[0, 0, 0]}
                  size={[1.12, tileHeight, 1.12]}
                  opacity={
                    isCore
                      ? 0.34 + stage3 * 0.28 + podiumBlue * 0.38
                      : 0.08 +
                        stage3 * 0.1 +
                        centerBoost * 0.02 +
                        tileOpacityBoost
                  }
                  glow={
                    isCore
                      ? 0.03 + coreGlow
                      : glowBoost
                  }
                  color={isCore ? coreColor : tileColor}
                  edgeColor={tileEdgeColor}
                  edgeOpacity={
                    isCore
                      ? 0.1 + stage3 * 0.18 + podiumBlue * 0.42
                      : 0.02 +
                        centerBoost * 0.02 +
                        stage3 * 0.06 +
                        glowBoost * 0.12 +
                        bandStrength * 0.28
                  }
                  highlight={
                    isCore
                      ? 0.04 + podiumBlue * 0.14
                      : tileHighlightBoost
                  }
                />
                {!isCore && litSurfaceOpacity > 0.02 ? (
                  <mesh
                    position={[0, tileHeight + 0.05, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <planeGeometry args={[0.96, 0.96]} />
                    <meshBasicMaterial
                      color="#bff8ff"
                      transparent
                      opacity={litSurfaceOpacity * 0.84}
                      depthWrite={false}
                      polygonOffset
                      polygonOffsetFactor={-3}
                      polygonOffsetUnits={-3}
                      toneMapped={false}
                    />
                  </mesh>
                ) : null}
              </group>
            );
          }),
        )}
        <group position={[0, 0.92, 0]} visible={stage3 > 0.08}>
          <WorkerFigure position={[0, 0, 0]} scale={1.12} />
        </group>
      </group>

      <group
        position={stage4Position}
        rotation={[0, getRailYaw(0.86) + Math.PI / 2, 0]}
        scale={monumentScale}
      >
        <DotField
          position={[-0.8, 0, 0.5]}
          rows={9}
          cols={15}
          spacing={1.08}
          progress={0.12 + stage4 * 0.88}
        />
        <GlowBeam
          start={[-5.8, 0.34, 0.6]}
          end={[2.6, 0.34, 0.6]}
          radius={0.058}
          opacity={0.14 + stage4 * 0.32}
          color="#f5fdff"
        />
        <StoryTile
          position={[-4.9, 0, 0.2]}
          size={[0.62, 2.28, 5.7]}
          opacity={0.16 + stage4 * 0.73}
          color="#edf8ff"
          edgeColor="#8de6ff"
          edgeOpacity={0.09 + stage4 * 0.46}
          highlight={0.04 + stage4 * 0.16}
        />
        <StoryTile
          position={[5.2, 0, 0.2]}
          size={[0.62, 2.02, 5.1]}
          opacity={0.14 + stage4 * 0.67}
          color="#edf8ff"
          edgeColor="#8de6ff"
          edgeOpacity={0.08 + stage4 * 0.4}
        />
        <RailArrow
          position={[0.6, 0, 0.4]}
          opacity={0.42 + stage4 * 0.58}
          color="#4e58ef"
        />
        {[
          [-0.8, 0, 3.2],
          [4.2, 0, 2.2],
          [4.2, 0, -1.2],
          [-0.8, 0, -2.2],
        ].map((pos, index) => (
          <StoryTile
            key={index}
            position={pos as [number, number, number]}
            size={[1.4, 0.58, 1.4]}
            opacity={0.16 + stage4 * 0.7}
            glow={0.04 + stage4 * 0.16}
            edgeColor="#7480ff"
            edgeOpacity={0.08 + stage4 * 0.34}
          />
        ))}
      </group>
    </group>
  );
}

function FieldComposition({ flowProgress }: { flowProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const previousProgressRef = useRef(flowProgress);
  const progressVelocityRef = useRef(0);
  const initializedRigRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollRatioRef = useRef(0);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraPositionTarget = useMemo(() => new THREE.Vector3(), []);
  const localLookTarget = useMemo(() => new THREE.Vector3(), []);
  const worldCameraTarget = useMemo(() => new THREE.Vector3(), []);
  const worldLookTarget = useMemo(() => new THREE.Vector3(), []);
  const normalizedFlowProgress = clamp01(flowProgress);
  const showLegacyLand = flowProgress < 0 && Number.isFinite(flowProgress);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = {
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      };
    };

    const onScroll = () => {
      const limit =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollRatioRef.current = window.scrollY / limit;
    };

    onScroll();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useFrame(({ clock, camera }, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const journeyProgress = normalizedFlowProgress;
    const progressDelta = journeyProgress - previousProgressRef.current;
    previousProgressRef.current = journeyProgress;
    progressVelocityRef.current = THREE.MathUtils.lerp(
      progressVelocityRef.current,
      Math.abs(progressDelta) / Math.max(delta, 0.016),
      0.18,
    );
    const speedBoost = clamp01(progressVelocityRef.current * 0.36);
    const focusLift = Math.sin(smoothStep(journeyProgress) * Math.PI);
    const stage1Lock = getBeatWeight(journeyProgress, heroBeats[1]);
    const stage2Tunnel = getBeatWeight(journeyProgress, heroBeats[2]);
    const stage3Read = getBeatWeight(journeyProgress, heroBeats[3]);
    const stage4Settle = getBeatWeight(journeyProgress, heroBeats[4]);
    const monumentArrival = Math.max(
      getMonumentWeight(journeyProgress, monumentStates[0]),
      getMonumentWeight(journeyProgress, monumentStates[1]),
      getMonumentWeight(journeyProgress, monumentStates[2]),
      getMonumentWeight(journeyProgress, monumentStates[3]),
    );
    const previewBias = smoothStep(clamp01(speedBoost * 0.9 + journeyProgress * 0.14));
    const lookAhead =
      THREE.MathUtils.lerp(0.2, 0.06, monumentArrival) +
      previewBias * 0.11 +
      stage4Settle * 0.03;
    const cameraProgress = getCameraProgress(
      clamp01(
        journeyProgress +
          speedBoost * 0.05 +
          stage1Lock * 0.01 +
          stage2Tunnel * 0.02 +
          stage3Read * 0.014,
      ),
    );
    const railFrame = getRailFrameAt(
      clamp01(cameraProgress + speedBoost * 0.03 + stage2Tunnel * 0.018),
    );
    const rig = getRigStop(
      clamp01(cameraProgress + speedBoost * 0.035 + stage2Tunnel * 0.018),
    );
    const pointer = pointerRef.current;
    const scrollRatio = scrollRatioRef.current;
    const targetY = pointer.y * 0.18;
    const groupEase = dampAmount(4.6, delta);
    const cameraEase = dampAmount(8.4 + speedBoost * 5.2, delta);
    const targetEase = dampAmount(11.5 + speedBoost * 6, delta);

    group.position.y = THREE.MathUtils.lerp(
      group.position.y,
      -4.46 + focusLift * 0.07 + targetY * 0.04 + scrollRatio * 0.05,
      groupEase,
    );
    group.position.z = THREE.MathUtils.lerp(group.position.z, 0.62, groupEase);
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      -0.62 + pointer.x * 0.025 + scrollRatio * 0.012,
      groupEase,
    );
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      0.44 + pointer.y * 0.024 - stage2Tunnel * 0.04,
      groupEase,
    );
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, groupEase);
    group.scale.setScalar(
      THREE.MathUtils.lerp(
        group.scale.x,
        0.82 - stage2Tunnel * 0.015 + focusLift * 0.008,
        groupEase,
      ),
    );
    group.position.x = THREE.MathUtils.lerp(
      group.position.x,
      4.1 + pointer.x * 0.08,
      groupEase,
    );
    group.updateMatrixWorld(true);

    cameraPositionTarget.set(
      railFrame.point.x -
        railFrame.tangent.x * rig.back +
        railFrame.right.x * (rig.side + pointer.x * 1.05),
      railFrame.point.y + rig.height + focusLift * 0.28 - pointer.y * 0.18,
      railFrame.point.z -
        railFrame.tangent.z * rig.back +
        railFrame.right.z * (rig.side + pointer.x * 1.05),
    );
    worldCameraTarget.copy(cameraPositionTarget);
    group.localToWorld(worldCameraTarget);
    localLookTarget.set(
        railFrame.point.x +
        railFrame.tangent.x * (rig.targetForward + lookAhead * 11.5) +
        railFrame.right.x * (rig.targetSide + pointer.x * 0.24),
      railFrame.point.y + rig.targetHeight + pointer.y * 0.04,
      railFrame.point.z +
        railFrame.tangent.z * (rig.targetForward + lookAhead * 11.5) +
        railFrame.right.z * (rig.targetSide + pointer.x * 0.24),
    );
    worldLookTarget.copy(localLookTarget);
    group.localToWorld(worldLookTarget);

    if (!initializedRigRef.current) {
      camera.position.copy(worldCameraTarget);
      cameraTarget.copy(worldLookTarget);
      initializedRigRef.current = true;
    } else {
      camera.position.lerp(worldCameraTarget, cameraEase);
      cameraTarget.lerp(worldLookTarget, targetEase);
    }

    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

    group.children.forEach((child) => {
      if (
        !(child instanceof THREE.Group) ||
        !child.name.startsWith('worker-')
      ) {
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
      position={[4.1, -4.46, 0.62]}
      rotation={[0.44, -0.62, 0]}
      scale={0.82}
    >
      <group position={[0, -1.42, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[184, 2.8, 184]} />
          <meshPhysicalMaterial
            color="#aabac4"
            roughness={0.95}
            metalness={0.03}
            clearcoat={0.04}
            clearcoatRoughness={0.86}
          />
        </mesh>
        <mesh
          position={[0, 1.43, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[183, 183]} />
          <meshPhysicalMaterial
            color="#d7e2e8"
            roughness={0.9}
            metalness={0.02}
            clearcoat={0.04}
            clearcoatRoughness={0.72}
          />
        </mesh>
        <mesh position={[0, 1.435, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[28, 88, 48]} />
          <meshBasicMaterial
            color="#99afbe"
            transparent
            opacity={0.035}
            depthWrite={false}
          />
        </mesh>
      </group>

      {showLegacyLand ? (
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
            <SlabBuilding
              position={[0, 1.66, 0]}
              size={[2.12, 3.32, 2.12]}
              ribs={5}
            />
            <SlabBuilding
              position={[0, 4.06, 0]}
              size={[2.12, 1.34, 2.12]}
              ribs={5}
            />
          </group>
          <group position={[-2.4, 0.04, -0.92]}>
            <SlabBuilding
              position={[0, 1.56, 0]}
              size={[1.92, 3.12, 1.92]}
              ribs={4}
            />
            <SlabBuilding
              position={[0, 3.82, 0]}
              size={[1.92, 1.2, 1.92]}
              ribs={4}
            />
          </group>

          <SlabBuilding
            position={[2.7, 1.18, -1]}
            size={[4.84, 2.36, 4.52]}
            ribs={7}
          />
          <FactoryBlock position={[8.6, 1.28, -5.9]} />
          <PalletCluster position={[15.4, 0.08, 7.8]} />
          <PalletCluster position={[12.6, 0.08, 10.8]} />

          <group
            name="worker-a"
            userData={{ baseY: 0.02, phase: 0.8 }}
            position={[-17.8, 0.02, 9.6]}
          >
            <WorkerFigure position={[0, 0, 0]} scale={1.08} />
          </group>
          <group
            name="worker-b"
            userData={{ baseY: 0.02, phase: 1.8 }}
            position={[5.8, 0.02, 4.4]}
          >
            <WorkerFigure position={[0, 0, 0]} scale={1.08} />
          </group>
          <group
            name="worker-c"
            userData={{ baseY: 0.02, phase: 2.7 }}
            position={[0.6, 0.02, 14.4]}
          >
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
        <JourneyComposition progress={normalizedFlowProgress} />
      )}

      <ContactShadows
      position={[1.6, 0.02, 1.8]}
      opacity={0.72}
      scale={104}
        blur={1.45}
        far={28}
        resolution={1024}
        color="#748da0"
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
          travel * (16 - emphasis * 5) + (pointerX - 0.5) * (10 + halo * 5);
        const yShift =
          distance * 26 -
          emphasis * 10 -
          halo * 4 +
          (pointerY - 0.5) * (5 + halo * 3);

        cluster.style.setProperty(
          '--cluster-shift-x',
          `${xShift.toFixed(2)}px`,
        );
        cluster.style.setProperty(
          '--cluster-shift-y',
          `${yShift.toFixed(2)}px`,
        );
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
    const pieces = stage.querySelectorAll(
      '.pegasoft-cluster__piece, .pegasoft-cluster__worker, .pegasoft-cluster__turbine',
    );
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
      <Canvas
        shadows
        camera={{ position: [24.4, 12.8, 22.8], fov: 26 }}
        dpr={[1, 1.45]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#d5e2ea']} />
        <fog attach="fog" args={['#d5e2ea', 108, 220]} />
        <ambientLight intensity={0.9} />
        <directionalLight
          color="#fffdf8"
          intensity={3.15}
          position={[16, 24, 10]}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00008}
        />
        <directionalLight
          color="#b8d0df"
          intensity={0.62}
          position={[-12, 9, 22]}
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
              className={
                index === activeLifecycle
                  ? 'pegasoft-flow-node is-active'
                  : 'pegasoft-flow-node'
              }
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
            className={
              index === activeLifecycle
                ? 'pegasoft-cluster is-active'
                : 'pegasoft-cluster'
            }
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
