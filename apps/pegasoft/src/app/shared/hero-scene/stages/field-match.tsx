import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { HeroJourneySnapshot } from '../hero-contract';
import { sampleHeroFieldReveal } from '../hero-field-model';
import {
  INACTIVE_HERO_GATE_CLOCK,
  sampleLoopPhase,
  updateHeroGateClock,
  type HeroGateClockState,
} from '../hero-local-clock';
import { HERO_PALETTE } from '../hero-materials';
import { HERO_DESTINATION_TOPOLOGY } from '../hero-route';
import { Worker } from './primitives';

const fieldTileRgb = [0xee / 255, 0xf5 / 255, 0xf8 / 255] as const;
const fieldPulseRgb = [0x57 / 255, 0xcd / 255, 1] as const;
const fieldPulseEmissiveRgb = [0x57 / 255, 0xcd / 255, 1] as const;
const fieldCenterRgb = [0x39 / 255, 0x32 / 255, 0xdc / 255] as const;
const FIELD_CONTACT_PROGRESS = 0.74;
const FIELD_PULSE_MAX_RADIUS = 7.07;
const FIELD_TILE_SPACING = 2.3;
const FIELD_TILE_SIZE = 2;
const FIELD_TILE_HEIGHT = 0.15;

// Current Vectr source advances the radial grid clock by two cells per second
// and wraps it at 7.07 cells.
export const FIELD_PULSE_PERIOD_MS = 3535;

type FieldTileMaterial = {
  color: { setRGB: (red: number, green: number, blue: number) => unknown };
  emissive: { setRGB: (red: number, green: number, blue: number) => unknown };
  emissiveIntensity: number;
  opacity: number;
};

type FieldContactLight = {
  intensity: number;
};

export function FieldMatchStage({
  snapshot,
}: {
  snapshot: HeroJourneySnapshot;
}) {
  const materialsRef = useRef<Array<FieldTileMaterial | null>>([]);
  const meshesRef = useRef<Array<THREE.Mesh | null>>([]);
  const contactLightRef = useRef<FieldContactLight | null>(null);
  const pulseClockRef = useRef<HeroGateClockState>(INACTIVE_HERO_GATE_CLOCK);
  const contactActive =
    snapshot.sceneTargetProgress >= FIELD_CONTACT_PROGRESS &&
    snapshot.sceneTargetProgress < 0.9;
  const fieldReveal = sampleHeroFieldReveal(snapshot.sceneTargetProgress);
  const [fieldX, , fieldZ] = HERO_DESTINATION_TOPOLOGY.field.proxyCenter;
  const tiles = useMemo(() => {
    const rowSpans = [
      [-1, 1],
      [-2, 2],
      [-3, 3],
      [-4, 4],
      [-5, 5],
      [-5, 5],
      [-5, 5],
      [-4, 4],
      [-3, 3],
      [-2, 2],
      [-1, 1],
    ] as const;

    return rowSpans.flatMap(([start, end], row) => {
      const z = row - 5;
      return Array.from({ length: end - start + 1 }, (_, index) => {
        const x = start + index;
        const adjacentX = Math.abs(x);
        const adjacentZ = Math.abs(z);
        const height =
          adjacentX === 0 && adjacentZ === 0
            ? 1
            : adjacentX <= 1 && adjacentZ <= 1
              ? adjacentX === adjacentZ
                ? 0.251
                : 0.499
              : FIELD_TILE_HEIGHT;

        return { x, z, distance: Math.hypot(x, z), height };
      });
    });
  }, []);

  useFrame(({ clock }) => {
    const nowMs = clock.getElapsedTime() * 1000;
    const frozenReducedPulseMs =
      snapshot.motion === 'reduced'
        ? Math.max(300, snapshot.localClocks.fieldPulseMs)
        : null;
    pulseClockRef.current = updateHeroGateClock(
      pulseClockRef.current,
      contactActive,
      nowMs,
      frozenReducedPulseMs ??
        (snapshot.directEntry ? snapshot.localClocks.fieldPulseMs : null),
    );
    const pulseProgress = sampleLoopPhase(
      pulseClockRef.current.elapsedMs,
      FIELD_PULSE_PERIOD_MS,
    );
    const pulseRadius = pulseProgress * FIELD_PULSE_MAX_RADIUS;

    if (contactLightRef.current) {
      contactLightRef.current.intensity = contactActive
        ? (1 - THREE.MathUtils.smoothstep(pulseRadius, 0.8, 2.4)) * 1.8
        : 0;
    }

    tiles.forEach(({ x, z, distance, height }, index) => {
      const material = materialsRef.current[index];
      const mesh = meshesRef.current[index];
      if (!material) {
        return;
      }

      const center = x === 0 && z === 0;
      const distanceFromPulse = Math.abs(distance - pulseRadius);
      const pulseStrength = contactActive
        ? center
          ? 0
          : THREE.MathUtils.clamp(1 - distanceFromPulse / 1.2, 0, 1)
        : 0;
      const pulseDisplacement = pulseStrength * pulseStrength;

      if (mesh) {
        const heightScale = 1 + 2 * pulseDisplacement;
        mesh.scale.y = heightScale;
        mesh.position.y = (height * heightScale) / 2;
      }

      material.opacity = fieldReveal;
      if (center && contactActive) {
        material.color.setRGB(...fieldCenterRgb);
        material.emissive.setRGB(...fieldCenterRgb);
        material.emissiveIntensity = 0.65;
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

  if (fieldReveal <= 0) {
    return null;
  }

  return (
    <group position={[fieldX, 0, fieldZ]}>
      {tiles.map(({ x, z, height }, index) => {
        return (
          <RoundedBox
            key={`${x}-${z}`}
            ref={(mesh) => {
              meshesRef.current[index] = mesh;
            }}
            position={[
              x * FIELD_TILE_SPACING,
              height / 2,
              z * FIELD_TILE_SPACING,
            ]}
            args={[FIELD_TILE_SIZE, height, FIELD_TILE_SIZE]}
            radius={0.08}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              ref={(material) => {
                materialsRef.current[index] = material;
              }}
              color={HERO_PALETTE.surface}
              emissive="#000000"
              emissiveIntensity={0}
              transparent
              opacity={fieldReveal}
              roughness={0.64}
            />
          </RoundedBox>
        );
      })}
      <Worker position={[0, 1, 0]} />
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
