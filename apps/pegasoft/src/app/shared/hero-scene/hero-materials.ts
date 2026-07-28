export const HERO_PALETTE = {
  background: '#bfdaeb',
  ground: '#bfdaeb',
  surface: '#dce8ed',
  surfaceTop: '#f1f6f8',
  worker: '#9db3bf',
  shadow: '#718b9a',
  redRoute: '#ef4e73',
  blueGlow: '#70d9f2',
  blueCore: '#f4fdff',
  blueDot: '#78d9ed',
  indigo: '#252bd8',
  indigoGlow: '#635dff',
} as const;

export const HERO_SURFACES = {
  structureRoughness: 0.76,
  topRoughness: 0.68,
  groundRoughness: 0.96,
  accentRoughness: 0.42,
} as const;

export const HERO_LIGHTING = {
  ambientIntensity: 0.42,
  hemisphereIntensity: 1.05,
  keyIntensity: 2.35,
  fillIntensity: 0.38,
  exposure: 0.94,
} as const;
