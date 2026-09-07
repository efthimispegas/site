import type { HeroJourneySnapshot } from './hero-contract';
import type { HeroCameraProgressRef } from './hero-camera';
import { HeroBeam } from './hero-beam';
import { HERO_PALETTE } from './hero-materials';
import { DesktopPointerTrail } from './hero-pointer-trail';
import { ActivationStage } from './stages/activation';
import { ArrivalStage } from './stages/arrival';
import { ClearanceStage } from './stages/clearance';
import { FieldMatchStage } from './stages/field-match';

export function HeroWorld({
  snapshot,
  settledCameraProgressRef,
}: {
  snapshot: HeroJourneySnapshot;
  settledCameraProgressRef: HeroCameraProgressRef;
}) {
  const groundColor =
    snapshot.profile.id === 'recording-desktop'
      ? HERO_PALETTE.recordingBackground
      : HERO_PALETTE.background;

  return (
    <group>
      <mesh position={[-5, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 220]} />
        <meshBasicMaterial color={groundColor} toneMapped={false} />
      </mesh>

      <ActivationStage sceneProgress={snapshot.sceneTargetProgress} />
      <ClearanceStage />
      <FieldMatchStage snapshot={snapshot} />
      <ArrivalStage
        snapshot={snapshot}
        settledCameraProgressRef={settledCameraProgressRef}
      />
      <HeroBeam snapshot={snapshot} />
      {snapshot.profile.pointerTrail ? <DesktopPointerTrail /> : null}
    </group>
  );
}
