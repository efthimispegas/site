import * as THREE from 'three';
import type { HeroTuple3, HeroTuple4 } from './hero-contract';
import { getHeroRoutePoint, getHeroRouteProgress } from './hero-route';
import { clampSceneProgress } from './hero-sequence';

export type HeroCameraPose = {
  position: HeroTuple3;
  target: HeroTuple3;
  quaternion: HeroTuple4;
  fov: number;
};

export const HERO_CAMERA_SOURCE = {
  rangeEvidence: 'source-confirmed',
  poseConstantsEvidence: 'implementation-candidate',
  baseY: 66,
  baseAspect: 1.5,
  baseFov: THREE.MathUtils.radToDeg(0.25178630405316277),
  maximumFovScale: 1.6,
  fieldCompositionRange: [0.72, 0.85],
  retreatRange: [0.9, 1.25],
  retreatDistance: 45,
} as const;

function mapClamped(
  value: number,
  inputStart: number,
  inputEnd: number,
  outputStart: number,
  outputEnd: number,
) {
  const amount = THREE.MathUtils.clamp(
    (value - inputStart) / (inputEnd - inputStart),
    0,
    1,
  );
  return THREE.MathUtils.lerp(outputStart, outputEnd, amount);
}

export function getResponsiveHeroFov(aspect: number) {
  const safeAspect =
    Number.isFinite(aspect) && aspect > 0
      ? aspect
      : HERO_CAMERA_SOURCE.baseAspect;

  if (safeAspect >= HERO_CAMERA_SOURCE.baseAspect) {
    return HERO_CAMERA_SOURCE.baseFov;
  }

  const halfFovRadians =
    THREE.MathUtils.degToRad(HERO_CAMERA_SOURCE.baseFov) / 2;
  const responsiveFov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(halfFovRadians) * (HERO_CAMERA_SOURCE.baseAspect / safeAspect),
      ),
  );

  return Math.min(
    responsiveFov,
    HERO_CAMERA_SOURCE.baseFov * HERO_CAMERA_SOURCE.maximumFovScale,
  );
}

function quaternionLookingAt(position: THREE.Vector3, target: THREE.Vector3) {
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(position);
  camera.lookAt(target);
  return camera.quaternion.clone();
}

/**
 * History-independent camera candidate using the audited live progress ranges.
 * The world stays fixed: the camera follows the implementation route, applies
 * provisional field-composition offsets/orientation, then retreats on local Z.
 */
export function sampleHeroCameraPose(
  progress: number,
  aspect: number = HERO_CAMERA_SOURCE.baseAspect,
): HeroCameraPose {
  const sceneProgress = clampSceneProgress(progress);
  const routeProgress = getHeroRouteProgress(sceneProgress);
  const routePoint = getHeroRoutePoint(routeProgress);
  const blueOneRatio = mapClamped(sceneProgress, 0.74, 0.9, 0, 1);
  const position = routePoint.clone();
  position.y = HERO_CAMERA_SOURCE.baseY;

  const originalQuaternion = quaternionLookingAt(position, routePoint);
  const fieldRatio = mapClamped(sceneProgress, 0.72, 0.85, 0, 1);

  position.x +=
    -30 * mapClamped(fieldRatio, 0, 0.35, 1, 0) +
    3.5 * mapClamped(blueOneRatio, 0.8, 1, 0, 1);
  position.z += 50 * mapClamped(fieldRatio, 0.25, 0.5, 1, 0);

  const fieldQuaternion = quaternionLookingAt(position, routePoint);
  const originalOrientationBlend = 1 - mapClamped(fieldRatio, 0.5, 1, 1, 0);
  const quaternion = fieldQuaternion.slerp(
    originalQuaternion,
    originalOrientationBlend,
  );

  const retreatRatio = mapClamped(sceneProgress, 0.9, 1.25, 0, 1);
  if (retreatRatio > 0) {
    position.add(
      new THREE.Vector3(
        0,
        0,
        retreatRatio * HERO_CAMERA_SOURCE.retreatDistance,
      ).applyQuaternion(quaternion),
    );
  }

  return {
    position: [position.x, position.y, position.z],
    target: [routePoint.x, routePoint.y, routePoint.z],
    quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    fov: getResponsiveHeroFov(aspect),
  };
}

export type HeroDampedProgress = {
  value: number;
  velocity: number;
};

export function dampHeroProgress(
  state: HeroDampedProgress,
  target: number,
  smoothTimeSeconds: number,
  deltaSeconds: number,
): HeroDampedProgress {
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  if (
    !Number.isFinite(state.value) ||
    !Number.isFinite(state.velocity) ||
    !Number.isFinite(deltaSeconds)
  ) {
    return { value: safeTarget, velocity: 0 };
  }
  const smoothTime = Number.isFinite(smoothTimeSeconds)
    ? Math.max(0.0001, smoothTimeSeconds)
    : 0.15;
  const delta = Math.max(0, Math.min(0.1, deltaSeconds));
  const omega = 2 / smoothTime;
  const x = omega * delta;
  const exponential = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - safeTarget;
  const temporary = (state.velocity + omega * change) * delta;
  const velocity = (state.velocity - omega * temporary) * exponential;
  const value = safeTarget + (change + temporary) * exponential;
  const targetWasPassed = safeTarget - state.value > 0 === value > safeTarget;

  if (targetWasPassed) {
    return {
      value: safeTarget,
      velocity: 0,
    };
  }

  return {
    value,
    velocity,
  };
}
