import * as THREE from 'three';
import { clampSceneProgress } from './hero-sequence';

export const HERO_FIELD_REVEAL_RANGE = [0.5, 0.54] as const;

/**
 * The field is already materially present when the reference first clips it at
 * the upper-right edge. Camera framing owns that entrance; opacity only avoids
 * exposing the field earlier in the clearance travel.
 */
export function sampleHeroFieldReveal(progress: number) {
  return THREE.MathUtils.smoothstep(
    clampSceneProgress(progress),
    HERO_FIELD_REVEAL_RANGE[0],
    HERO_FIELD_REVEAL_RANGE[1],
  );
}
