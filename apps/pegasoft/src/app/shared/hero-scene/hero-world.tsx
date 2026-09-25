import type { HeroJourneySnapshot } from './hero-contract';
import type { HeroFrameRef } from './hero-frame-state';
import { HeroBeam } from './hero-beam';
import { HERO_PALETTE } from './hero-materials';
import { DesktopPointerTrail } from './hero-pointer-trail';
import {
  HERO_PROXY_GROUND_SIZE,
  HERO_PROXY_GROUND_POSITION,
  HERO_PROXY_GROUND_ROTATION,
} from './hero-world-layout';
import { ActivationStage } from './stages/activation';
import { ArrivalStage } from './stages/arrival';
import { ClearanceStage } from './stages/clearance';
import { FieldMatchStage } from './stages/field-match';

export function HeroWorld({
  snapshot,
  frameRef,
}: {
  snapshot: HeroJourneySnapshot;
  frameRef: HeroFrameRef;
}) {
  return (
    <group>
      <mesh
        position={HERO_PROXY_GROUND_POSITION}
        rotation={HERO_PROXY_GROUND_ROTATION}
      >
        <planeGeometry
          args={[HERO_PROXY_GROUND_SIZE, HERO_PROXY_GROUND_SIZE]}
        />
        <meshBasicMaterial color={HERO_PALETTE.background} toneMapped={false} />
      </mesh>

      <ActivationStage frameRef={frameRef} />
      <ClearanceStage />
      <FieldMatchStage frameRef={frameRef} />
      <ArrivalStage frameRef={frameRef} />
      <HeroBeam frameRef={frameRef} />
      {snapshot.profile.pointerTrail ? <DesktopPointerTrail /> : null}
    </group>
  );
}
