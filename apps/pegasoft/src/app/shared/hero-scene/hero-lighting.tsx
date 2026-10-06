import { ContactShadows } from '@react-three/drei';
import type { HeroRuntimeProfile } from './hero-contract';
import {
  HERO_PALETTE,
  HERO_STANDARD_MATERIAL_COMPATIBILITY,
} from './hero-materials';

/**
 * One owned lighting boundary for the original procedural scene.
 *
 * The reference uses authored node materials; these lights reproduce its
 * screen-space hierarchy without importing or depending on those protected
 * shaders. All stage geometry remains declarative and light-agnostic.
 */
export function HeroLighting({ profile }: { profile: HeroRuntimeProfile }) {
  // Provisional compatibility shadows, NOT reference-equivalent values.
  // Qt selects device policy; source bloom/shader matching remains R3+ work.
  const mobile = profile.sourceMobileDevice;
  const shadowMapSize = mobile
    ? 1024
    : HERO_STANDARD_MATERIAL_COMPATIBILITY.keyLightShadowMapSize;

  return (
    <>
      <ambientLight color={HERO_PALETTE.background} intensity={0.85} />
      <hemisphereLight
        color="#ffffff"
        groundColor={HERO_PALETTE.ground}
        intensity={HERO_STANDARD_MATERIAL_COMPATIBILITY.hemisphereIntensity}
      />
      <directionalLight
        castShadow
        color="#ffffff"
        intensity={HERO_STANDARD_MATERIAL_COMPATIBILITY.keyLightIntensity}
        position={[...HERO_STANDARD_MATERIAL_COMPATIBILITY.keyLightPosition]}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.018}
        shadow-camera-left={-92}
        shadow-camera-right={92}
        shadow-camera-top={92}
        shadow-camera-bottom={-92}
        shadow-camera-near={1}
        shadow-camera-far={180}
      />
      <pointLight
        color={HERO_PALETTE.blueGlow}
        intensity={mobile ? 0.45 : 0.7}
        distance={42}
        position={[-45, 18, -18]}
      />
      <ContactShadows
        position={[-40, 0.012, 0]}
        scale={178}
        opacity={mobile ? 0.22 : 0.34}
        blur={mobile ? 2.2 : 3.2}
        far={88}
        resolution={mobile ? 512 : 1024}
        color={HERO_PALETTE.shadow}
        frames={1}
      />
    </>
  );
}
