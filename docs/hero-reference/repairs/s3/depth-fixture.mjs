import * as THREE from 'three';
import {
  createHeroFeederMesh,
  setHeroTubeRange,
  disposeHeroRouteMesh,
} from '../../../../apps/pegasoft/src/app/shared/hero-scene/hero-route-rendering';
import { sampleHeroCameraPose } from '../../../../apps/pegasoft/src/app/shared/hero-scene/hero-camera-model';
import {
  createHeroRenderedFrame,
  advanceHeroRenderedFrame,
} from '../../../../apps/pegasoft/src/app/shared/hero-scene/hero-frame-state';
import { HERO_PALETTE } from '../../../../apps/pegasoft/src/app/shared/hero-scene/hero-materials';

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1.75);
renderer.setSize(1508, 761);
renderer.setClearColor('#101820');
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);
let previous = [];
window.__heroDepthChallenge = ({ phase, cover, disabledDepth }) => {
  previous.forEach((mesh) => {
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });
  previous = [];
  const scene = new THREE.Scene();
  let frame = createHeroRenderedFrame();
  const input = (target) => ({
    target,
    smoothTimeSeconds: 0.15,
    motion: 'full',
    measurementSequence: 1,
  });
  const history = [{ target: 0, delta: 1 / 60 }];
  frame = advanceHeroRenderedFrame(frame, input(0), 1 / 60);
  for (let i = 0; i < 33; i++) {
    history.push({ target: 0, delta: 1 / 60 });
    frame = advanceHeroRenderedFrame(frame, input(0), 1 / 60);
  }
  if (phase === 'activation') {
    for (let i = 0; i < 60; i++) {
      history.push({ target: 0.12395, delta: 1 / 60 });
      frame = advanceHeroRenderedFrame(frame, input(0.12395), 1 / 60);
    }
  }
  const pose = sampleHeroCameraPose(frame.rendered.value, 1508 / 761);
  const camera = new THREE.PerspectiveCamera(pose.fov, 1508 / 761, 0.1, 1000);
  camera.position.set(...pose.position);
  camera.quaternion.set(...pose.quaternion);
  camera.updateMatrixWorld(true);
  const feederIndex = 1;
  const packet = createHeroFeederMesh(feederIndex, HERO_PALETTE.redRoute);
  const range =
    phase === 'landing'
      ? [frame.idle[feederIndex].start, frame.idle[feederIndex].end]
      : [0, frame.ratios.red];
  setHeroTubeRange(packet.geometry, ...range);
  packet.visible = true;
  const productionPolicy = {
    depthTest: packet.material.depthTest,
    depthWrite: packet.material.depthWrite,
    renderOrder: packet.renderOrder,
  };
  if (disabledDepth) {
    packet.material.depthTest = false;
    packet.material.depthWrite = false;
  }
  scene.add(packet);
  previous.push(packet);
  const positions = packet.geometry.getAttribute('position'),
    stride = packet.geometry.parameters.radialSegments * 6;
  const first = packet.geometry.drawRange.start / stride,
    last =
      (packet.geometry.drawRange.start + packet.geometry.drawRange.count) /
      stride;
  const vertices = [];
  for (let ring = first; ring <= last; ring++)
    for (let i = 0; i < 9; i++)
      vertices.push(
        new THREE.Vector3().fromBufferAttribute(positions, ring * 9 + i),
      );
  const projected = vertices.map((point) => point.clone().project(camera));
  const bounds = [
    Math.min(...projected.map((p) => p.x)),
    Math.min(...projected.map((p) => p.y)),
    Math.max(...projected.map((p) => p.x)),
    Math.max(...projected.map((p) => p.y)),
  ];
  let occluder = null;
  if (cover !== 'clear') {
    const center = vertices[Math.floor(vertices.length / 2)];
    const distance = camera.position.distanceTo(center) * 0.5;
    const [x0, y0, x1, y1] = bounds;
    const boundsCover = [
      x0 - 0.01,
      y0 - 0.01,
      cover === 'full' ? x1 + 0.01 : (x0 + x1) / 2,
      y1 + 0.01,
    ];
    const [a, b, c, d] = boundsCover;
    const halfHeight =
      Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * distance;
    const halfWidth = halfHeight * camera.aspect;
    occluder = new THREE.Mesh(
      new THREE.PlaneGeometry((c - a) * halfWidth, (d - b) * halfHeight),
      new THREE.MeshBasicMaterial({ color: '#506070', side: THREE.DoubleSide }),
    );
    occluder.position
      .set(((a + c) / 2) * halfWidth, ((b + d) / 2) * halfHeight, -distance)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    occluder.quaternion.copy(camera.quaternion);
    occluder.renderOrder = 0;
    scene.add(occluder);
    previous.push(occluder);
  }
  renderer.render(scene, camera);
  const gl = renderer.getContext(),
    width = gl.drawingBufferWidth,
    height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let redPixels = 0;
  for (let i = 0; i < pixels.length; i += 4)
    if (
      pixels[i] > 90 &&
      pixels[i] > pixels[i + 1] * 1.4 &&
      pixels[i] > pixels[i + 2] * 1.25
    )
      redPixels++;
  return {
    phase,
    feederIndex,
    cover,
    disabledDepth,
    redPixels,
    range,
    frame,
    history,
    productionPolicy,
    appliedPolicy: {
      depthTest: packet.material.depthTest,
      depthWrite: packet.material.depthWrite,
      renderOrder: packet.renderOrder,
    },
    camera: {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      projectionMatrix: camera.projectionMatrix.toArray(),
    },
    drawRange: { ...packet.geometry.drawRange },
    physicalRadius: packet.geometry.parameters.radius,
    ndcBounds: bounds,
    canvas: { width, height },
    occluder: occluder
      ? {
          position: occluder.position.toArray(),
          quaternion: occluder.quaternion.toArray(),
          parameters: occluder.geometry.parameters,
        }
      : null,
  };
};
