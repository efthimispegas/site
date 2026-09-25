import * as THREE from 'three';
import { sampleHeroCameraPose } from './hero-camera-model';
import {
  HERO_PROXY_GROUND_POSITION,
  HERO_PROXY_GROUND_ROTATION,
  HERO_PROXY_GROUND_SIZE,
} from './hero-world-layout';

/** Intersects the actual shared plane transform, with horizon/missing hits explicit. */
export function sampleHeroGroundCoverage(
  progress: number,
  aspect: number,
  size = HERO_PROXY_GROUND_SIZE,
) {
  const pose = sampleHeroCameraPose(progress, aspect);
  const camera = new THREE.PerspectiveCamera(pose.fov, aspect, 0.1, 1000);
  camera.position.set(...pose.position);
  camera.quaternion.set(...pose.quaternion);
  camera.updateMatrixWorld(true);
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...HERO_PROXY_GROUND_POSITION),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...HERO_PROXY_GROUND_ROTATION),
    ),
    new THREE.Vector3(1, 1, 1),
  );
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(
    matrix,
  );
  const inverse = matrix.clone().invert();
  const ray = new THREE.Raycaster();
  return [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1].map((y) => {
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const world = ray.ray.intersectPlane(plane, new THREE.Vector3());
      if (!world)
        return {
          ndc: [x, y],
          status: 'no-forward-plane-intersection' as const,
          world: null,
          local: null,
          projectedDepth: null,
        };
      const local = world.clone().applyMatrix4(inverse),
        projected = world.clone().project(camera);
      const covered =
        Math.abs(local.x) <= size / 2 && Math.abs(local.y) <= size / 2;
      const clipped = projected.z < -1 || projected.z > 1;
      return {
        ndc: [x, y],
        status: clipped
          ? ('outside-camera-depth-range' as const)
          : covered
            ? ('covered' as const)
            : ('exposed-ground-edge' as const),
        world: world.toArray(),
        local: local.toArray(),
        projectedDepth: projected.z,
      };
    }),
  );
}
