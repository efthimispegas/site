import { useFrame, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { clampJourneyProgress } from './hero-sequence';
import {
  getFieldReorientation,
  getHeroRoutePoint,
  getHeroRouteProgress,
  getHeroRouteTangent,
  getWorldRotation,
  transformWorldPoint,
} from './hero-route';

export type HeroCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export function sampleHeroCameraPose(progress: number): HeroCameraPose {
  const normalizedProgress = clampJourneyProgress(progress);
  const routeProgress = getHeroRouteProgress(normalizedProgress);
  const worldRotation = getWorldRotation(normalizedProgress);
  const followBlend = getFieldReorientation(normalizedProgress);
  const routePoint = getHeroRoutePoint(routeProgress);
  const tangent = getHeroRouteTangent(routeProgress)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), worldRotation)
    .normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const target = transformWorldPoint(routePoint, normalizedProgress);
  const trailDistance = THREE.MathUtils.lerp(20, 8, followBlend);
  const sideDistance = THREE.MathUtils.lerp(10, 2.5, followBlend);
  const height = THREE.MathUtils.lerp(28, 42, followBlend);
  const position = target
    .clone()
    .addScaledVector(tangent, -trailDistance)
    .addScaledVector(side, sideDistance)
    .add(new THREE.Vector3(0, height, 0));
  const lockupBlend = THREE.MathUtils.smoothstep(
    normalizedProgress,
    0.955,
    1,
  );
  const lockupPosition = target
    .clone()
    .addScaledVector(tangent, -11)
    .addScaledVector(side, 1.8)
    .add(new THREE.Vector3(0, 24, 0));
  position.lerp(lockupPosition, lockupBlend);
  target.y = THREE.MathUtils.lerp(target.y, 0.85, lockupBlend);

  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
    fov: THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(28, 25.5, followBlend),
      21.5,
      lockupBlend,
    ),
  };
}

type AdjustableCamera = RootState['camera'] & {
  fov: number;
  isPerspectiveCamera: true;
  updateProjectionMatrix: () => void;
};

function isAdjustableCamera(
  camera: RootState['camera'],
): camera is AdjustableCamera {
  return 'isPerspectiveCamera' in camera && camera.isPerspectiveCamera === true;
}

function applyCameraPose(state: RootState, pose: HeroCameraPose) {
  const camera = state.camera;
  if (!isAdjustableCamera(camera)) {
    return;
  }

  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(...pose.target);
}

export function HeroCamera({ progress }: { progress: number }) {
  useFrame((state) => {
    applyCameraPose(state, sampleHeroCameraPose(progress));
  }, -1);

  return null;
}
