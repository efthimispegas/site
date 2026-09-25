import * as THREE from 'three';
import {
  HERO_ACTIVATION_FEEDER_PATHS,
  HERO_ROUTE_RENDERING,
} from './hero-route';

export type HeroRouteMesh = THREE.Mesh<
  THREE.TubeGeometry,
  THREE.MeshBasicMaterial
>;
export function createHeroFeederCurve(index: number) {
  const points = HERO_ACTIVATION_FEEDER_PATHS[index];
  if (!points) throw new RangeError('Unknown canonical feeder');
  return new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
    false,
    'catmullrom',
    0,
  );
}
/** Shared production geometry/material factory, also imported by rendered depth challenges. */
export function createHeroRouteMesh(
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments: number,
  radius: number,
  options: { color: string; opacity?: number; glow?: boolean },
): HeroRouteMesh {
  const { color, opacity = 1, glow = false } = options;
  const geometry = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    radius,
    HERO_ROUTE_RENDERING.radialSegments,
    false,
  );
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: true,
    depthWrite: !glow,
    toneMapped: false,
    side: THREE.DoubleSide,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = glow ? 2 : 3;
  mesh.visible = false;
  return mesh;
}
export function createHeroFeederMesh(index: number, color: string) {
  return createHeroRouteMesh(
    createHeroFeederCurve(index),
    150,
    HERO_ROUTE_RENDERING.redCoreRadius,
    { color },
  );
}
export function setHeroTubeRange(
  geometry: THREE.TubeGeometry,
  start: number,
  end: number,
) {
  const a = THREE.MathUtils.clamp(start, 0, 1),
    b = THREE.MathUtils.clamp(end, a, 1);
  const segments = geometry.parameters.tubularSegments;
  const stride = geometry.parameters.radialSegments * 6;
  const first = Math.floor(a * segments),
    last = Math.ceil(b * segments);
  geometry.setDrawRange(first * stride, Math.max(0, last - first) * stride);
}
export function disposeHeroRouteMesh(mesh: HeroRouteMesh) {
  mesh.geometry.dispose();
  mesh.material.dispose();
}
