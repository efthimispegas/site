export const HERO_PALETTE = {
  background: '#d0e1eb',
  ground: '#b6cdda',
  surface: '#e3edf2',
  surfaceTop: '#f5f8fa',
  worker: '#d7e3e9',
  shadow: '#8ea9bd',
  redRoute: '#ff4d67',
  blueGlow: '#0e94fb',
  blueCore: '#f4fdff',
  blueDot: '#57cdff',
  indigo: '#3932dc',
  indigoGlow: '#3932dc',
} as const;

export const HERO_SURFACES = {
  structureRoughness: 0.72,
  topRoughness: 0.56,
  groundRoughness: 0.96,
  accentRoughness: 0.36,
} as const;

/**
 * Temporary compatibility for the local MeshStandardMaterial primitives.
 * The authority uses authored node materials rather than a scene light rig.
 */
export const HERO_STANDARD_MATERIAL_COMPATIBILITY = {
  hemisphereIntensity: 1.1,
  keyLightIntensity: 2.35,
  keyLightPosition: [-34, 72, -26] as const,
  keyLightShadowMapSize: 2048,
  exposure: 1,
} as const;
