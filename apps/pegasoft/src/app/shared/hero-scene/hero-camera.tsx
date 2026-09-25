import { useFrame, type RootState } from '@react-three/fiber';
import { sampleHeroCameraPose, type HeroCameraPose } from './hero-camera-model';
import { acknowledgeHeroFrame, type HeroFrameRef } from './hero-frame-state';

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
export function applyHeroCameraPose(
  camera: AdjustableCamera,
  pose: HeroCameraPose,
) {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.quaternion.set(...pose.quaternion);
  camera.updateMatrixWorld(true);
}
export function HeroCamera({ frameRef }: { frameRef: HeroFrameRef }) {
  useFrame((state) => {
    if (!isAdjustableCamera(state.camera)) return;
    applyHeroCameraPose(
      state.camera,
      sampleHeroCameraPose(
        frameRef.current.rendered.value,
        state.size.width / state.size.height,
      ),
    );
    acknowledgeHeroFrame(frameRef, 'camera', {
      position: state.camera.position.toArray(),
      quaternion: state.camera.quaternion.toArray(),
      fovDegrees: state.camera.fov,
      projectionMatrix: state.camera.projectionMatrix.toArray(),
      matrixWorld: state.camera.matrixWorld.toArray(),
    });
  }, -50);
  return null;
}
