import * as THREE from 'three';
import { HERO_PALETTE } from './hero-materials';

const shadowColor = new THREE.Color(HERO_PALETTE.shadow);

/** Static ambient contact falloff; it uses no per-frame shadow render. */
export function HeroGroundShadow({
  position = [-56, -0.038, 3],
  size = [16, 14],
  opacity = 0.23,
}: {
  position?: [number, number, number];
  size?: [number, number];
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <shaderMaterial
        transparent
        depthWrite={false}
        toneMapped={false}
        uniforms={{
          shadowColor: { value: shadowColor },
          opacity: { value: opacity },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 shadowColor;
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            float radius = length((vUv - 0.5) * 2.0);
            float alpha = (1.0 - smoothstep(0.12, 1.0, radius)) * opacity;
            gl_FragColor = vec4(shadowColor, alpha);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}
