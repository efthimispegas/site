import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { clampJourneyProgress } from './hero-sequence';
import {
  getHeroRoutePoint,
  getHeroRouteProgress,
  sampleHeroRouteSegment,
} from './hero-route';
import { HERO_PALETTE } from './hero-materials';

const RED_ROUTE_END = 0.27;
const BLUE_ROUTE_START = 0.25;

function LandingRailCadence({ progress }: { progress: number }) {
  const groupRef = useRef<{ visible: boolean } | null>(null);
  const signalRefs = useRef<
    Array<{
      visible: boolean;
      position: { set: (x: number, y: number, z: number) => unknown };
    } | null>
  >([]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    group.visible = progress <= 0.025;
    if (!group.visible) {
      return;
    }

    const cadence = (clock.getElapsedTime() % 1.8) / 1.8;
    signalRefs.current.forEach((signal, index) => {
      if (!signal) {
        return;
      }
      const packet = cadence - index * 0.16;
      const visible = packet >= 0 && packet <= 0.42;
      const point = getHeroRoutePoint(
        0.018 + Math.max(0, Math.min(1, packet / 0.42)) * 0.22,
      );
      signal.visible = visible;
      signal.position.set(point.x, point.y + 0.2, point.z);
    });
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(signal) => {
            signalRefs.current[index] = signal;
          }}
        >
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshBasicMaterial color={HERO_PALETTE.redRoute} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function HeroBeam({ progress }: { progress: number }) {
  const normalizedProgress = clampJourneyProgress(progress);
  const redOpacity = Math.min(
    0.96,
    Math.max(0, ((normalizedProgress - 0.025) / 0.055) * 0.96),
  );
  const redEnd = Math.max(
    0.002,
    Math.min(RED_ROUTE_END, normalizedProgress * 2.25),
  );
  const contactLead =
    0.05 *
    (1 -
      Math.min(1, Math.max(0, (normalizedProgress - BLUE_ROUTE_START) / 0.29)));
  const routeProgress = getHeroRouteProgress(normalizedProgress);
  const blueEnd = Math.max(
    BLUE_ROUTE_START + 0.002,
    routeProgress + contactLead,
  );
  const redPoints = useMemo(
    () => sampleHeroRouteSegment(0, redEnd, 42),
    [redEnd],
  );
  const bluePoints = useMemo(
    () => sampleHeroRouteSegment(BLUE_ROUTE_START, blueEnd, 72),
    [blueEnd],
  );
  const bluePointTuples = bluePoints.map(
    (point) => [point.x, point.y + 0.18, point.z] as [number, number, number],
  );
  const tip = getHeroRoutePoint(blueEnd);
  const tipPosition: [number, number, number] = [tip.x, tip.y + 0.18, tip.z];
  const blueIsActive = normalizedProgress >= BLUE_ROUTE_START;

  return (
    <group>
      <LandingRailCadence progress={normalizedProgress} />
      {[
        [
          [-4, 0.09, 0],
          [-4, 0.09, 3],
          [-0.34, 0.09, 4],
        ],
        [
          [0, 0.09, -1],
          [0, 0.09, 4],
        ],
        [
          [4.2, 0.09, 1],
          [4.2, 0.09, 3],
          [0.34, 0.09, 4],
        ],
      ].map((points, index) => (
        <Line
          key={`feeder-${index}`}
          points={points as [number, number, number][]}
          color={HERO_PALETTE.redRoute}
          lineWidth={1.15}
          transparent
          opacity={normalizedProgress < 0.4 ? redOpacity : 0.18}
        />
      ))}
      {[-0.34, 0, 0.34].map((offset) => (
        <Line
          key={offset}
          points={redPoints.map((point) => [
            point.x + offset,
            point.y,
            point.z,
          ])}
          color={HERO_PALETTE.redRoute}
          lineWidth={1.15}
          transparent
          opacity={normalizedProgress < 0.4 ? redOpacity : 0.18}
        />
      ))}
      {blueIsActive ? (
        <>
          <Line
            points={bluePointTuples}
            color={HERO_PALETTE.blueGlow}
            lineWidth={5.5}
            transparent
            opacity={0.48}
          />
          <Line
            points={bluePointTuples}
            color={HERO_PALETTE.blueCore}
            lineWidth={1.8}
          />
          <mesh position={tipPosition}>
            <sphereGeometry args={[0.24, 18, 18]} />
            <meshBasicMaterial
              color={HERO_PALETTE.blueCore}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color={HERO_PALETTE.blueGlow}
            intensity={4.2}
            distance={6}
            position={tipPosition}
          />
        </>
      ) : null}
    </group>
  );
}
