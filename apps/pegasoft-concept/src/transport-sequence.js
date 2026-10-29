import * as T from '../runtime/vendor/three/build/three.module.js';
import { createShipSequence as createDeckSequence } from '../runtime/ship-integration-sequence.js';
import { createShipSequence as createCrossingSequence } from '../runtime/ship-jet-sequence.js';
import { gates, ease } from '../runtime/handoff-sequence.js';
import { chapterAt } from './transport-timeline.js';
import { createRoadDeckRegistration } from './road-deck-registration.js';
import { repairTruckDetails } from './truck-detail-repair.js';
import { createMobileReferenceSequence } from './mobile-reference-sequence.js';

/** One camera and one physical C01 instance across all three accepted chapters. */
export function createTransportSequence(options) {
  const {
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
  } = options;
  const truckDetails = repairTruckDetails(legacy.truck);
  const deck = createDeckSequence(options);
  const crossing = createCrossingSequence({
    ...options,
    acceptedSequence: deck,
    clearClipOnMount: false,
  });
  const clips = new Map();
  for (const group of [road, floor, legacy.truck, ship, water])
    group.traverse((n) => {
      if (n.isMesh)
        for (const m of [].concat(n.material)) clips.set(m, m.clippingPlanes);
    });
  const shipKey = scene.userData.shipLight,
    hemisphere = scene.children.find((n) => n.isHemisphereLight),
    fill = scene.children.find((n) => n.isDirectionalLight && n !== shipKey);
  const handoffKey = new T.DirectionalLight(0xf5f8fc, 2.1);
  handoffKey.position.set(0, 12, 7);
  scene.add(handoffKey);
  const shadows = contactShadows(T, scene, legacy, rig);
  const registration = createRoadDeckRegistration({
    road,
    ship,
    truck: legacy.truck,
    camera,
    scale: legacy.scale,
  });
  const context = rig.attachment.support,
    contextMaterials = new Set();
  context.traverse((n) => {
    if (n.isMesh)
      for (const m of [].concat(n.material)) contextMaterials.add(m);
  });
  const contextNodes = [
    rig.attachment.lowerScene,
    rig.attachment.rearScene,
  ].filter(Boolean);
  const cargoMaterials = new Set();
  cargo.traverse((n) => {
    if (n.isMesh) for (const m of [].concat(n.material)) cargoMaterials.add(m);
  });
  const contextFinishes = contextNodes.map((group, i) => {
    const paint = i === 0 ? '#061e3b' : '#147dff';
    let panels = 0;
    group.traverse((n) => {
      if (n.isMesh)
        for (const m of [].concat(n.material))
          if (m.name === 'cool_brushed_silver') {
            // The support clones own their materials. Never recolor carried C01.
            if (cargoMaterials.has(m))
              throw Error('Stationary container paint shares C01 material');
            m.color.set(paint);
            panels++;
          }
    });
    return { name: group.name, paint, panels };
  });
  const contextPoses = contextNodes.map((n) => {
    n.updateWorldMatrix(true, false);
    return n.matrixWorld.clone();
  });
  // Measure the vertical pickup envelope once. It supplies an authored aim
  // height; moving/rotating bounds never feed the frame-by-frame camera.
  let liftCeiling = 0;
  for (const p of [0, gates.lift, gates.reverse, gates.pickup, gates.lower]) {
    legacy.apply(p);
    liftCeiling = Math.max(
      liftCeiling,
      new T.Box3().setFromObject(rig.root).max.y,
      new T.Box3().setFromObject(cargo).max.y,
    );
  }
  const liftAimHeight = liftCeiling * 0.46;
  const mobile = createMobileReferenceSequence(options);
  let trace,
    previousMobileSea = false;
  function apply(progress) {
    const chapter = chapterAt(progress),
      p = chapter.localProgress;
    registration.reset();
    const seaBlend =
      chapter.id === 'handoff' ? 0 : chapter.id === 'ship' ? ease(p / 0.12) : 1;
    scene.environmentIntensity = T.MathUtils.lerp(0.65, 0.35, seaBlend);
    hemisphere.intensity = T.MathUtils.lerp(0.45, 0.25, seaBlend);
    hemisphere.groundColor.set(0x506276).lerp(new T.Color(0x263344), seaBlend);
    fill.intensity = T.MathUtils.lerp(0.7, 0.3, seaBlend);
    handoffKey.intensity = 2.1 * (1 - seaBlend);
    shipKey.intensity = 2.3 * seaBlend;
    renderer.shadowMap.enabled = seaBlend > 0;
    const mobileSea = viewport.width <= 760 && seaBlend > 0;
    renderer.shadowMap.autoUpdate = viewport.width > 760;
    if (mobileSea && !previousMobileSea) renderer.shadowMap.needsUpdate = true;
    previousMobileSea = mobileSea;
    water.userData.setMobile?.(viewport.width <= 760);
    camera.far = chapter.id === 'handoff' ? 2000 : 10000;
    camera.updateProjectionMatrix();
    scene.userData.shipLight = chapter.id === 'handoff' ? null : shipKey;
    for (const [material, planes] of clips)
      material.clippingPlanes = chapter.id === 'handoff' ? [] : planes;
    rig.root.visible = chapter.id === 'handoff';
    mobile.setVisible(viewport.width <= 760);
    if (viewport.width <= 760) {
      trace = mobile.apply(progress);
    } else if (chapter.id === 'handoff') {
      ship.visible = false;
      water.visible = false;
      const r = legacy.apply(p),
        opacity = ease((p - gates.services) / (gates.upper - gates.services));
      // One authored zoom curve. Never fit rotating bounds or introduce damping.
      // Widen during final seating, settled before truck motion/services reveal.
      const close = T.MathUtils.lerp(
          0.84,
          0.6,
          T.MathUtils.clamp((camera.aspect - 0.7) / 0.7, 0, 1),
        ),
        widen = ease((p - 0.5) / (gates.release - 0.5)),
        framing = close + (1 - close) * widen;
      const aimShift = liftAimHeight * (1 - widen),
        target = new T.Vector3(...r.target);
      camera.position.sub(target).multiplyScalar(framing).add(target);
      camera.position.y += aimShift;
      camera.updateMatrixWorld(true);
      r.acceptedCamera = r.camera;
      r.acceptedDistance = r.distance;
      r.framing = framing;
      r.camera = camera.position.toArray();
      r.distance *= framing;
      r.target[1] += aimShift;
      r.liftAimHeight = liftAimHeight;
      r.truckScreen = legacy.truck
        .getWorldPosition(new T.Vector3())
        .project(camera)
        .toArray();
      for (const child of road.children) child.material.opacity = opacity;
      road.visible = p > gates.services;
      scene.background =
        p >= gates.release && p < gates.upper ? null : new T.Color('#EAEBED');
      floor.visible = !(p >= gates.release && p < gates.upper);
      const contextOpacity =
        1 - ease((p - gates.lift) / (gates.reverse - gates.lift));
      for (const m of contextMaterials) m.opacity = contextOpacity;
      context.visible = contextOpacity > 0;
      r.stackOpacity = contextOpacity;
      r.stackVisible = context.visible;
      r.stackInView = context.visible && r.stackInView;
      trace = {
        ...r,
        chapter: 'handoff',
        sourceShipProgress: -1,
        contentTravel: 0,
        cloudMotionProgress: 0,
        jetProgress: 0,
        hullScreen: {
          left: viewport.width / 2,
          right: viewport.width / 2,
          top: 0,
          bottom: 0,
        },
      };
    } else {
      scene.background = new T.Color('#061e3b');
      for (const child of road.children) child.material.opacity = 1;
      if (chapter.id === 'crossing') {
        water.material.clippingPlanes = [];
        ship.traverse((n) => {
          if (n.isMesh) n.material.clippingPlanes = [];
        });
        trace = { ...crossing.apply(p), chapter: 'crossing' };
      } else {
        trace = {
          ...deck.apply(p),
          chapter: 'ship',
          sourceShipProgress: p,
          contentTravel: 0,
          cloudMotionProgress: 0,
          jetProgress: 0,
        };
      }
      // Track one light target across the connected sea/camera passage, including
      // the crossing's local zero. Avoid resetting it at that chapter boundary.
      if (trace.sourceShipProgress > 0.12) {
        const m = new T.Matrix4().fromArray(trace.shipMatrix),
          q = new T.Quaternion().setFromRotationMatrix(
            new T.Matrix4().extractRotation(m),
          );
        shipKey.target.position.set(...trace.shipPosition);
        shipKey.position
          .copy(shipKey.target.position)
          .add(new T.Vector3(-15, 60, 55).applyQuaternion(q));
        shipKey.target.updateMatrixWorld();
      } else {
        shipKey.position.set(0, 12, 7);
        shipKey.target.position.set(0, 0, 0);
        shipKey.target.updateMatrixWorld();
      }
    }
    for (const { wheel, shadow } of shadows) {
      const p = wheel.getWorldPosition(new T.Vector3());
      shadow.position.set(p.x, 0.006, p.z);
      shadow.quaternion
        .copy(wheel.parent.getWorldQuaternion(new T.Quaternion()))
        .multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(1, 0, 0),
            -Math.PI / 2,
          ),
        );
      shadow.material.opacity = 0.5 * (1 - seaBlend);
      shadow.visible =
        seaBlend < 1 &&
        ((chapter.id === 'handoff' && wheel.userData.liftWheel) ||
          legacy.truck.visible);
    }
    if (viewport.width > 760 && chapter.id === 'ship' && p < 0.44)
      trace.roadRegistration = registration.apply(trace, ease(p / 0.12));
    else trace.roadRegistration = { active: false };
    context.updateMatrixWorld(true);
    trace.contextMatrices = contextNodes.map((n) => {
      n.updateWorldMatrix(true, false);
      return n.matrixWorld.toArray();
    });
    trace.contextMatrix = trace.contextMatrices[0];
    trace.contextPoseResidual = Math.max(
      ...contextNodes.flatMap((n, j) =>
        n.matrixWorld.elements.map((v, i) =>
          Math.abs(v - contextPoses[j].elements[i]),
        ),
      ),
    );
    trace.containerLayout =
      'original two-high C01 stack with one grounded container behind it';
    trace.contextFinishes = contextFinishes;
    trace.truckDetails = truckDetails;
    trace.c01Paint = [...cargoMaterials]
      .filter((m) => m.name === 'cool_brushed_silver')
      .map((m) => m.color.getHexString());
    trace.journeyProgress = progress;
    trace.localTime = chapter.localTime;
    return trace;
  }
  return {
    apply,
    resize: () => deck.resize(),
    tickWater: () => (viewport.width <= 760 ? false : deck.tickWater()),
    get waterTime() {
      return deck.waterTime;
    },
    get trace() {
      return trace;
    },
    get scale() {
      return legacy.scale;
    },
  };
}

// Accepted soft tyre contact treatment, extracted from the handoff renderer.
function contactShadows(T, scene, sequence, rig) {
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++)
      pixels[(y * 128 + x) * 4 + 3] = Math.round(
        255 *
          Math.exp(-6 * (((x - 63.5) / 63.5) ** 2 + ((y - 63.5) / 63.5) ** 2)),
      );
  const map = new T.DataTexture(pixels, 128, 128, T.RGBAFormat);
  map.needsUpdate = true;
  return [...sequence.wheels, ...rig.wheels].map((wheel) => {
    const isLift = rig.wheels.includes(wheel);
    wheel.userData.liftWheel = isLift;
    const width = isLift ? 0.7 : 0.65 * sequence.scale,
      height = isLift ? 0.5 : 0.48 * sequence.scale;
    const shadow = new T.Mesh(
      new T.PlaneGeometry(width, height),
      new T.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    scene.add(shadow);
    return { wheel, shadow };
  });
}
