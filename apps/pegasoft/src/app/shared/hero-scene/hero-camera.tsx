import { useFrame, type RootState } from '@react-three/fiber';
import { useRef } from 'react';
import type { HeroJourneySnapshot } from './hero-contract';
import {
  dampHeroProgress,
  sampleHeroCameraPose,
  type HeroCameraPose,
  type HeroDampedProgress,
} from './hero-camera-model';

export type HeroCameraProgressRef = {
  current: number;
};

type AdjustableCamera = RootState['camera'] & {
  fov: number;
  isPerspectiveCamera: true;
  updateProjectionMatrix: () => void;
};

function isAdjustableCamera(
  camera: RootState['camera'],
): camera is AdjustableCamera {
  return 'isPerspectiveCamera' in camera && camera.isPerspectiveCamera === true;
}

function applyCameraPose(state: RootState, pose: HeroCameraPose) {
  const camera = state.camera;
  if (!isAdjustableCamera(camera)) {
    return;
  }

  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.quaternion.set(...pose.quaternion);
}

export function HeroCamera({
  snapshot,
  settledProgressRef,
}: {
  snapshot: HeroJourneySnapshot;
  settledProgressRef: HeroCameraProgressRef;
}) {
  const progressRef = useRef<HeroDampedProgress>({
    value:
      snapshot.referenceState.progress.settledCamera ??
      snapshot.sceneTargetProgress,
    velocity: 0,
  });

  useFrame((state, deltaSeconds) => {
    const immediate =
      snapshot.directEntry ||
      snapshot.motion === 'reduced' ||
      snapshot.motion === 'static';

    progressRef.current = immediate
      ? {
          value:
            snapshot.referenceState.progress.settledCamera ??
            snapshot.sceneTargetProgress,
          velocity: 0,
        }
      : dampHeroProgress(
          progressRef.current,
          snapshot.sceneTargetProgress,
          snapshot.profile.cameraSmoothTimeSeconds,
          deltaSeconds,
        );

    settledProgressRef.current = progressRef.current.value;
    applyCameraPose(
      state,
      sampleHeroCameraPose(
        progressRef.current.value,
        state.size.width / state.size.height,
      ),
    );
  }, -1);

  return null;
}
