import * as THREE from 'three';
import { clampJourneyProgress } from './hero-sequence';

export const heroRouteCurve = new THREE.CatmullRomCurve3(
  [
    [0, 0.08, 4],
    [0, 0.08, -8],
    [-8, 0.08, -20],
    [-22, 0.08, -33],
    [-32, 0.08, -42],
    [-28, 0.08, -50],
    [-16, 0.08, -56],
    [0, 0.08, -58],
    [18, 0.08, -58],
    [36, 0.08, -58],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'catmullrom',
  0.3,
);

export const FIELD_WORLD_PIVOT = new THREE.Vector3(0, 0, -58);
export const FIELD_REORIENTATION_START = 0.6;
export const FIELD_REORIENTATION_END = 0.66;
const FIELD_REORIENTATION_ANGLE = -Math.PI / 4;

export function getFieldReorientation(progress: number) {
  return THREE.MathUtils.smoothstep(
    clampJourneyProgress(progress),
    FIELD_REORIENTATION_START,
    FIELD_REORIENTATION_END,
  );
}

export function getWorldRotation(progress: number) {
  return getFieldReorientation(progress) * FIELD_REORIENTATION_ANGLE;
}

export function transformWorldPoint(
  point: THREE.Vector3,
  progress: number,
) {
  return point
    .clone()
    .sub(FIELD_WORLD_PIVOT)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), getWorldRotation(progress))
    .add(FIELD_WORLD_PIVOT);
}

export function untransformWorldPoint(
  point: THREE.Vector3,
  progress: number,
) {
  return point
    .clone()
    .sub(FIELD_WORLD_PIVOT)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -getWorldRotation(progress))
    .add(FIELD_WORLD_PIVOT);
}

const routeProgressStops = [
  [0, 0],
  [0.25, 0.25],
  [0.36, 0.42],
  [0.54, 0.62],
  [0.63, 0.75],
  [0.75, 0.75],
  [0.82, 0.75],
  [0.86, 0.86],
  [1, 1],
] as const;

export function getHeroRouteProgress(journeyProgress: number) {
  const normalizedProgress = clampJourneyProgress(journeyProgress);
  const nextIndex = routeProgressStops.findIndex(
    ([progress]) => progress >= normalizedProgress,
  );

  if (nextIndex <= 0) {
    return routeProgressStops[0][1];
  }

  if (nextIndex === -1) {
    return routeProgressStops[routeProgressStops.length - 1][1];
  }

  const [fromProgress, fromRouteProgress] = routeProgressStops[nextIndex - 1];
  const [toProgress, toRouteProgress] = routeProgressStops[nextIndex];
  const localProgress =
    (normalizedProgress - fromProgress) / (toProgress - fromProgress);

  return THREE.MathUtils.lerp(
    fromRouteProgress,
    toRouteProgress,
    localProgress,
  );
}

export function sampleHeroRouteSegment(
  start: number,
  end: number,
  sampleCount = 64,
) {
  const safeStart = clampJourneyProgress(start);
  const safeEnd = Math.max(safeStart + 0.0001, clampJourneyProgress(end));

  return Array.from({ length: sampleCount }, (_, index) =>
    heroRouteCurve.getPoint(
      THREE.MathUtils.lerp(safeStart, safeEnd, index / (sampleCount - 1)),
    ),
  );
}

export function getHeroRoutePoint(progress: number) {
  return heroRouteCurve.getPoint(clampJourneyProgress(progress));
}

export function getHeroRouteTangent(progress: number) {
  return heroRouteCurve.getTangent(clampJourneyProgress(progress));
}
