import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HERO_PALETTE } from './hero-materials';

const TRAIL_CAPACITY = 72;
const TRAIL_LIFETIME_SECONDS = 1.1;

type TrailPoint = {
  position: THREE.Vector3;
  ageSeconds: number;
};

export function DesktopPointerTrail() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pointerNdcRef = useRef(new THREE.Vector2(2, 2));
  const pointerActiveRef = useRef(false);
  const trailRef = useRef<TrailPoint[]>([]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }

      pointerNdcRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      pointerActiveRef.current = true;
    };
    const onPointerLeave = () => {
      pointerActiveRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  useFrame(({ camera }, deltaSeconds) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const trail = trailRef.current;
    trail.forEach((point) => {
      point.ageSeconds += deltaSeconds;
    });
    trailRef.current = trail.filter(
      (point) => point.ageSeconds < TRAIL_LIFETIME_SECONDS,
    );

    if (pointerActiveRef.current) {
      raycaster.setFromCamera(pointerNdcRef.current, camera);
      const hit = raycaster.ray.intersectPlane(groundPlane, intersection);
      const last = trailRef.current.at(-1);

      if (
        hit &&
        (!last || last.position.distanceToSquared(hit) >= 0.12)
      ) {
        trailRef.current.push({
          position: hit.clone().setY(0.13),
          ageSeconds: 0,
        });

        if (trailRef.current.length > TRAIL_CAPACITY) {
          trailRef.current.shift();
        }
      }
    }

    for (let index = 0; index < TRAIL_CAPACITY; index += 1) {
      const point = trailRef.current[index];
      if (!point) {
        scale.setScalar(0);
        matrix.compose(intersection, rotation, scale);
      } else {
        const life = 1 - point.ageSeconds / TRAIL_LIFETIME_SECONDS;
        scale.setScalar(0.12 + life * life * 0.72);
        matrix.compose(point.position, rotation, scale);
      }
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TRAIL_CAPACITY]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.18, 8, 8]} />
      <meshBasicMaterial
        color={HERO_PALETTE.blueDot}
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
