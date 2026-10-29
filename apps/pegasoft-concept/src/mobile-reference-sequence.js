import { pageScroll } from './page-scroll.js';
import { createMobileMeshBatches } from './mobile-mesh-batches.js';
import * as T from '../runtime/vendor/three/build/three.module.js';
import { ease, gates } from '../runtime/handoff-sequence.js';
import {
  chapterAt,
  scrollAtProgress,
  duration,
  chapters,
} from './transport-timeline.js';

const phase = (p, a, b) => T.MathUtils.clamp((p - a) / (b - a), 0, 1);
/** Mobile reference, 10–52s: pickup → overhead handoff → straight road → sea → upward jet.
 * Reuses the accepted rigs and attachments. It owns no clock or renderer.
 */
export function createMobileReferenceSequence({
  legacy,
  rig,
  cargo,
  ship,
  water,
  road,
  floor,
  scene,
  camera,
  viewport,
  renderer,
}) {
  const scale = legacy.scale,
    rigRootPosition = rig.root.position.clone();
  const side = new T.Vector3(
      Math.sin(legacy.startYaw),
      0,
      Math.cos(legacy.startYaw),
    ),
    up = new T.Vector3(0, 1, 0);
  const anchor = new T.Vector3(-4.9, 9.816, -1.269),
    roadClip = new T.Plane(),
    seaClip = new T.Plane();
  const stationary = rig.attachment.support,
    materials = new Set(),
    clipped = new WeakMap();
  stationary.traverse((n) => {
    if (n.isMesh) for (const m of [].concat(n.material)) materials.add(m);
  });
  const initial = new T.Box3();
  for (const progress of [0, 0.1, 0.2, 0.22]) {
    legacy.apply(progress);
    for (const asset of [rig.root, stationary, cargo])
      initial.union(new T.Box3().setFromObject(asset));
  }
  const initialTarget = initial.getCenter(new T.Vector3());
  initialTarget.y = 0;
  const initialSide = new T.Vector3(0, 0, 1);
  const pickupWidth = initial.max.x - initial.min.x;
  const pickupHeight = initial.max.y - initial.min.y;
  const pickupCorners = [];
  for (const x of [initial.min.x, initial.max.x])
    for (const y of [initial.min.y, initial.max.y])
      for (const z of [initial.min.z, initial.max.z])
        pickupCorners.push(new T.Vector3(x, y, z));
  legacy.apply(gates.lower);
  const dockCenter = legacy.trailer.localToWorld(
      new T.Vector3(-5.0575, 1.65, 0),
    ),
    dockSeat = legacy.trailer.localToWorld(new T.Vector3(-5.0575, 0.2, 0));
  // Cache the rigid truck envelope once; projection needs only eight points,
  // never a frame-by-frame walk through the detailed model's mesh hierarchy.
  const truckBox = new T.Box3(),
    truckInverse = legacy.truck.matrixWorld.clone().invert();
  legacy.truck.traverse((node) => {
    if (node.isMesh) {
      node.geometry.computeBoundingBox();
      truckBox.union(
        node.geometry.boundingBox
          .clone()
          .applyMatrix4(
            new T.Matrix4().multiplyMatrices(truckInverse, node.matrixWorld),
          ),
      );
    }
  });
  const truckCorners = [];
  for (const x of [truckBox.min.x, truckBox.max.x])
    for (const y of [truckBox.min.y, truckBox.max.y])
      for (const z of [truckBox.min.z, truckBox.max.z])
        truckCorners.push(new T.Vector3(x, y, z));
  // Mirror the mobile blocking, then cancel the desktop rig's yaw. The
  // camera only tilts upward: no azimuth orbit or rolling into the truck shot.
  const world = new T.Group();
  world.name = 'mobile_mirrored_blocking';
  scene.add(world);
  const stationaryPose = stationary.matrix.clone(),
    stationaryWorld = new T.Matrix4()
      .makeScale(-1, 1, 1)
      .multiply(stationary.matrixWorld.clone());
  const visualRoots = [
    cargo,
    ship,
    rig.attachment.lowerScene,
    rig.attachment.rearScene,
  ].filter(Boolean);
  const visuals = visualRoots.map((asset) => {
    const visual = new T.Group();
    visual.name = 'mobile_width_compensation';
    visual.add(...asset.children);
    asset.add(visual);
    return visual;
  });
  const backdrop = new T.Mesh(
    new T.PlaneGeometry(2, 2),
    new T.ShaderMaterial({
      uniforms: { cut: { value: 0.47 } },
      depthTest: false,
      depthWrite: false,
      vertexShader:
        'varying vec2 screenUV;void main(){screenUV=uv;gl_Position=vec4(position.xy,.99999,1.);}',
      fragmentShader:
        'varying vec2 screenUV;uniform float cut;void main(){gl_FragColor=vec4(mix(vec3(.929,.949,.969),vec3(.067,.082,.106),1.-step(cut,screenUV.y)),1.);}',
    }),
  );
  backdrop.name = 'mobile_pickup_section_boundary';
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10000;
  scene.add(backdrop);
  const edgeMaterial = new T.MeshBasicMaterial({
    color: '#718397',
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const edges = new T.InstancedMesh(
      new T.PlaneGeometry(0.055 * scale, 2.5 * scale),
      edgeMaterial,
      62,
    ),
    edgePose = new T.Object3D();
  edges.name = 'mobile_road_outer_edges';
  edges.frustumCulled = false;
  scene.add(edges);
  function paintRoadEdges(target, viewHeight, progress, clip = null) {
    const stableHeight =
      renderer.domElement.ownerDocument.querySelector('#story-scroll-viewport')
        ?.clientHeight || viewport.height;
    const timeline = pageScroll(renderer.domElement.ownerDocument).timeline,
      offset = (p) =>
        timeline ? timeline.offsetAt(p) : scrollAtProgress(p, stableHeight);
    const start = offset((chapters[0].duration * 0.6) / 0.97 / duration);
    const travel = Math.max(0, offset(progress) - start) * 0.035 * scale,
      pitch = 6 * scale;
    const halfWidth = (viewHeight * camera.aspect) / 2;
    let i = 0;
    for (const edge of [-1, 1])
      for (let row = -15; row <= 15; row++) {
        edgePose.position.set(
          target.x + edge * halfWidth * 0.97,
          0.005,
          target.z + row * pitch - (travel % pitch),
        );
        edgePose.rotation.set(-Math.PI / 2, 0, 0);
        edgePose.updateMatrix();
        edges.setMatrixAt(i++, edgePose.matrix);
      }
    edges.instanceMatrix.needsUpdate = true;
    edgeMaterial.clippingPlanes = clip ? [clip] : [];
    return travel;
  }
  function resetWorld() {
    rig.root.position.copy(rigRootPosition);
    world.scale.setScalar(1);
    world.rotation.set(0, 0, 0);
    world.updateMatrixWorld(true);
    stationaryPose.decompose(
      stationary.position,
      stationary.quaternion,
      stationary.scale,
    );
    for (const visual of visuals) {
      visual.scale.z = 1;
      visual.position.z = 0;
    }
    scene.updateMatrixWorld(true);
  }
  function transformWorld(target) {
    const yaw = new T.Euler().setFromQuaternion(
      cargo.getWorldQuaternion(new T.Quaternion()),
      'YXZ',
    ).y;
    for (const object of [
      rig.root,
      legacy.truck,
      stationary,
      ship,
      water,
      rig.load,
      cargo,
    ])
      if (object.parent === scene) world.add(object);
    world.rotation.y = yaw - Math.PI / 2;
    world.scale.x = -1;
    world.updateMatrixWorld(true);
    // Counter the reflected width of container/ship artwork, retaining readable
    // markings and the approved asset dimensions. No vertices/materials change.
    for (const visual of visuals) visual.scale.z = -1;
    visuals[1].position.z = 2 * anchor.z;
    const local = new T.Matrix4()
      .copy(world.matrixWorld)
      .invert()
      .multiply(stationaryWorld);
    local.decompose(
      stationary.position,
      stationary.quaternion,
      stationary.scale,
    );
    scene.updateMatrixWorld(true);
    target.applyMatrix4(world.matrixWorld);
  }
  function faceTruckDownward(source) {
    // The mobile tractor arrives from the top, facing down the screen. Rotate
    // its complete articulated assembly about the load seat; retain C01's
    // world pose during lowering and its physical trailer ownership afterward.
    const parent = cargo.parent,
      seat = legacy.trailer.localToWorld(new T.Vector3(-5.0575, 0.2, 0));
    scene.attach(cargo);
    const turn = new T.Quaternion().setFromAxisAngle(up, Math.PI);
    legacy.truck.position.sub(seat).applyQuaternion(turn).add(seat);
    legacy.truck.quaternion.premultiply(turn);
    legacy.truck.updateMatrixWorld(true);
    parent.attach(cargo);
    if (source >= gates.release)
      legacy.truck.position.add(seat.clone().sub(dockSeat).multiplyScalar(-2));
    scene.updateMatrixWorld(true);
  }
  function clipGroup(group, plane) {
    let list = clipped.get(group);
    if (!list) {
      const set = new Set();
      group.traverse((n) => {
        if (n.isMesh) for (const m of [].concat(n.material)) set.add(m);
      });
      list = [...set];
      clipped.set(group, list);
    }
    for (const m of list)
      if (
        m.clippingPlanes?.[0] !== plane ||
        (!plane && m.clippingPlanes?.length)
      )
        m.clippingPlanes = plane ? [plane] : [];
  }
  function frame(target, height, pitch = 1, roll = 1) {
    camera.fov = 12;
    camera.up
      .copy(up)
      .lerp(new T.Vector3(0, 0, -1), roll)
      .normalize();
    const distance =
      height / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2));
    camera.position
      .copy(target)
      .addScaledVector(initialSide, Math.cos((pitch * Math.PI) / 2) * distance)
      .addScaledVector(up, Math.sin((pitch * Math.PI) / 2) * distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    return distance;
  }
  const batches = createMobileMeshBatches(
    [
      cargo,
      legacy.truck,
      rig.root,
      rig.attachment.lowerScene,
      rig.attachment.rearScene,
    ].filter(Boolean),
  );
  let trace;
  function apply(progress) {
    resetWorld();
    batches.setActive(true);
    const chapter = chapterAt(progress),
      p = chapter.localProgress;
    road.visible = false;
    floor.visible = false;
    backdrop.visible = chapter.id === 'handoff';
    edges.visible = false;
    if (chapter.id === 'handoff') {
      // Stop before the desktop road turn. Continue physical straight-line travel
      // beneath a stable overhead camera instead of replaying a second orbit.
      const pickupSource =
        p < 0.12 ? 0 : p < 0.2 ? (0.2 * (p - 0.12)) / 0.08 : p;
      const source =
        p <= 0.6 ? pickupSource : 0.6 + phase(p, 0.6, 0.97) * (0.83 - 0.6);
      const r = legacy.apply(source);
      faceTruckDownward(source);
      const orbit = ease(phase(p, 0.22, 0.35)),
        depart = phase(p, 0.6, 0.97),
        recenter = ease(phase(p, 0.91, 0.97));
      rig.root.visible = true;
      ship.visible = false;
      water.visible = false;
      clipGroup(legacy.truck, null);
      const contextOpacity = 1 - ease(phase(p, 0.2, 0.35));
      for (const m of materials) m.opacity = contextOpacity;
      stationary.visible = contextOpacity > 0;
      const pickupView = Math.max(
        pickupHeight / 0.48,
        pickupWidth / (camera.aspect * 0.88),
      );
      const overheadView = 40 * scale,
        viewHeight =
          T.MathUtils.lerp(pickupView, overheadView, orbit) +
          14 * scale * ease(phase(p, 0.88, 0.97));
      // Keep the truck in the same left-hand screen column when browser chrome
      // changes the available height. A fixed world offset would squeeze the gap.
      const railOffset = viewHeight * camera.aspect * 0.35;
      const target = initialTarget
        .clone()
        .lerp(dockCenter.clone().addScaledVector(side, -railOffset), orbit);
      if (p >= 0.6)
        target
          .copy(legacy.trailer.localToWorld(new T.Vector3(-5.0575, 1.65, 0)))
          .addScaledVector(side, -railOffset * (1 - recenter));
      transformWorld(target);
      const entranceOffset =
        viewHeight * camera.aspect * (1 - ease(phase(p, 0, 0.12)));
      if (entranceOffset > 0) {
        const inverse = world.matrixWorld.clone().invert(),
          delta = new T.Vector3(entranceOffset, 0, 0)
            .transformDirection(inverse)
            .multiplyScalar(entranceOffset);
        rig.root.position.add(delta);
        rig.root.updateMatrixWorld(true);
      }
      const distance = frame(target, viewHeight, orbit, orbit);
      backdrop.material.uniforms.cut.value = 0.5 + 0.5 * orbit;
      scene.background = new T.Color('#11151b');
      edges.visible = p >= 0.35;
      const roadTravel = paintRoadEdges(target, viewHeight, progress);
      trace = {
        ...r,
        progress: p,
        chapter: 'handoff',
        phase:
          p < 0.22
            ? 'Mobile · stack pickup'
            : p < 0.35
              ? 'Mobile · overhead reveal'
              : p < 0.6
                ? 'Mobile · overhead handoff'
                : 'Mobile · straight highway',
        camera: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        target: target.toArray(),
        distance,
        cloudMotionProgress: 0,
        jetProgress: 0,
        sourceShipProgress: -1,
        contentTravel: 0,
        cutNDC: -1.22,
        hullScreen: {
          left: 0,
          right: viewport.width,
          top: 0,
          bottom: viewport.height,
        },
        stackOpacity: contextOpacity,
        stackVisible: stationary.visible,
        heading: 0,
        mobileReading: {
          section: p >= 0.69 && p < 0.93 ? 'road' : null,
          progress: phase(p, 0.69, 0.93),
        },
        mobileRoad: { markings: 'outer edges only', travel: roadTravel },
        mobileView: { orbit, depart, recenter, viewHeight },
      };
    } else {
      const shipP = chapter.id === 'ship' ? p : 0.84 + 0.16 * phase(p, 0, 0.54);
      const jetP = chapter.id === 'crossing' ? phase(p, 0.54, 1) : 0;
      legacy.apply(0.83);
      faceTruckDownward(0.83);
      rig.root.visible = false;
      stationary.visible = false;
      const position = cargo.getWorldPosition(new T.Vector3()),
        rotation = cargo.getWorldQuaternion(new T.Quaternion()),
        worldScale = cargo.getWorldScale(new T.Vector3());
      ship.quaternion
        .copy(rotation)
        .multiply(new T.Quaternion().setFromAxisAngle(up, Math.PI));
      ship.scale.copy(worldScale);
      ship.position
        .copy(position)
        .sub(
          anchor.clone().multiply(worldScale).applyQuaternion(ship.quaternion),
        );
      ship.updateMatrixWorld(true);
      const owner = shipP >= 0.22 ? 'deck' : 'trailer';
      if (owner === 'deck') {
        ship.add(cargo);
        cargo.position.copy(anchor);
        cargo.quaternion.setFromAxisAngle(up, Math.PI);
        cargo.scale.setScalar(1);
        cargo.updateMatrixWorld(true);
      }
      const pull = phase(shipP, 0.24, 1),
        target = legacy.trailer.localToWorld(new T.Vector3(-5.0575, 1.65, 0));
      const shipCenter = ship.localToWorld(new T.Vector3(0, 6.6, 0));
      target.lerp(shipCenter, ease(phase(shipP, 0.16, 0.52)));
      transformWorld(target);
      const viewHeight = scale * (54 + 176 * pull ** 1.35),
        distance = frame(target, viewHeight);
      const wipe = ease(phase(shipP, 0.02, 0.22)),
        cut = T.MathUtils.lerp(-1.22, 1.22, wipe),
        score = new T.Vector3(0, 0, -1).dot(target) + (cut * viewHeight) / 2;
      roadClip.set(new T.Vector3(0, 0, -1), -score);
      seaClip.set(new T.Vector3(0, 0, 1), score);
      clipGroup(legacy.truck, roadClip);
      clipGroup(ship, seaClip);
      water.material.clippingPlanes = [seaClip];
      // C01 is one continuous silver load across the wipe, never the deck's blue slot showing through a clipped carried container.
      clipGroup(cargo, null);
      legacy.truck.visible = shipP < 0.22;
      ship.visible = shipP > 0.02;
      water.visible = shipP > 0.02;
      edges.visible = shipP < 0.22;
      const roadTravel = paintRoadEdges(target, viewHeight, progress, roadClip);
      scene.background = new T.Color('#11151b');
      water.position.set(position.x, ship.position.y + 0.3 * scale, position.z);
      water.material.uniforms.scale.value = scale;
      water.material.uniforms.shipInverse.value
        .copy(visuals[1].matrixWorld)
        .invert();
      const hull = [];
      for (const x of [-55, 55])
        for (const z of [-6.7, 6.7])
          hull.push(
            visuals[1].localToWorld(new T.Vector3(x, 6.6, z)).project(camera),
          );
      const hullScreen = {
        left: ((Math.min(...hull.map((v) => v.x)) + 1) * viewport.width) / 2,
        right: ((Math.max(...hull.map((v) => v.x)) + 1) * viewport.width) / 2,
        top: ((1 - Math.max(...hull.map((v) => v.y))) * viewport.height) / 2,
        bottom: ((1 - Math.min(...hull.map((v) => v.y))) * viewport.height) / 2,
      };
      trace = {
        progress: p,
        chapter: chapter.id,
        phase:
          jetP > 0
            ? 'Mobile · upward jet reveal'
            : 'Mobile · continuous vessel pullback',
        owner,
        camera: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        target: target.toArray(),
        distance,
        shipMatrix: ship.matrixWorld.toArray(),
        shipPosition: ship.position.toArray(),
        cargoMatrix: cargo.matrixWorld.toArray(),
        cargoScale: worldScale.toArray(),
        supportGap: ship
          .localToWorld(anchor.clone())
          .distanceTo(cargo.localToWorld(new T.Vector3())),
        hullScreen,
        cutNDC: cut,
        sourceShipProgress: shipP,
        contentTravel: 0,
        cloudMotionProgress: 0,
        jetProgress: jetP,
        mobileReading: {
          section: shipP >= 0.38 && shipP < 1 ? 'ship' : null,
          progress: phase(shipP, 0.38, 1),
        },
        mobileRoad: { markings: 'outer edges only', travel: roadTravel },
        mobileView: { viewHeight, shipProgress: shipP, clouds: false },
      };
    }
    scene.updateMatrixWorld(true);
    trace.journeyProgress = progress;
    trace.localTime = chapter.localTime;
    trace.mobileReference = true;
    if (legacy.truck.visible) {
      const screen = truckCorners.map((point) =>
        point.clone().applyMatrix4(legacy.truck.matrixWorld).project(camera),
      );
      trace.mobileRoad.truckBounds = {
        left: ((Math.min(...screen.map((v) => v.x)) + 1) * viewport.width) / 2,
        right: ((Math.max(...screen.map((v) => v.x)) + 1) * viewport.width) / 2,
        top: ((1 - Math.max(...screen.map((v) => v.y))) * viewport.height) / 2,
        bottom:
          ((1 - Math.min(...screen.map((v) => v.y))) * viewport.height) / 2,
      };
    }
    if (chapter.id === 'handoff' && p <= 0.22) {
      const screen = pickupCorners.map((point) =>
        point.clone().applyMatrix4(world.matrixWorld).project(camera),
      );
      trace.mobilePickupBounds = {
        left: ((Math.min(...screen.map((v) => v.x)) + 1) * viewport.width) / 2,
        right: ((Math.max(...screen.map((v) => v.x)) + 1) * viewport.width) / 2,
        top: ((1 - Math.max(...screen.map((v) => v.y))) * viewport.height) / 2,
        bottom:
          ((1 - Math.min(...screen.map((v) => v.y))) * viewport.height) / 2,
        divider: viewport.height / 2,
      };
    }
    trace.mobileBatchCount = batches.count;
    trace.cargoVisible = cargo.visible;
    trace.cargoParent = cargo.parent.name;
    trace.cargoRoof = cargo
      .localToWorld(new T.Vector3(0, 2.896, 0))
      .project(camera)
      .toArray();
    trace.cargoMatrix = cargo.matrixWorld.toArray();
    trace.mobileCargoVisualMatrix = visuals[0].matrixWorld.toArray();
    trace.mobileCameraRoll = 0;
    trace.mobileMirrored = true;
    if (ship.visible) {
      trace.shipMatrix = ship.matrixWorld.toArray();
      trace.shipPosition = ship.getWorldPosition(new T.Vector3()).toArray();
      water.material.uniforms.shipInverse.value
        .copy(visuals[1].matrixWorld)
        .invert();
    }
    return trace;
  }
  return {
    apply,
    setVisible(value) {
      batches.setActive(value);
      if (!value) {
        resetWorld();
        backdrop.visible = false;
        edges.visible = false;
      }
    },
    get trace() {
      return trace;
    },
  };
}
