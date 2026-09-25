import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  getResponsiveHeroFov,
  HERO_CAMERA_SOURCE,
  sampleHeroCameraPose,
} from './hero-camera-model';
import {
  HERO_FIELD_STATIC_VISIBILITY,
  sampleHeroFieldPulse,
} from './hero-field-model';
import { approachHeroGateRatio, sampleLoopPhase } from './hero-local-clock';
import {
  getHeroRoutePoint,
  getHeroRouteProgress,
  getHeroRouteTangent,
  HERO_ACTIVATION_FEEDER_PATHS,
  HERO_ARRIVAL_CENTER,
  HERO_BLUE_ROUTE_ZERO_POINTS,
  HERO_DESTINATION_TOPOLOGY,
  HERO_ROUTE_CONTACTS,
  HERO_ROUTE_EVIDENCE,
  HERO_ROUTE_POINTS,
  HERO_ROUTE_SCENE_PROGRESS,
  HERO_ROUTE_SEGMENT_PROGRESS,
  HERO_ROUTE_Y,
  sampleHeroRouteSegment,
} from './hero-route';

describe('hero route, camera, and local clocks', () => {
  it('keeps provisional route geometry continuous and labels its evidence', () => {
    expect(JSON.parse(JSON.stringify(HERO_ROUTE_POINTS))).toEqual(
      HERO_ROUTE_POINTS,
    );
    expect(HERO_BLUE_ROUTE_ZERO_POINTS).toHaveLength(40);
    expect(HERO_ACTIVATION_FEEDER_PATHS).toHaveLength(4);
    expect(HERO_ROUTE_SEGMENT_PROGRESS).toEqual({
      activation: [0, 0.25],
      clearance: [0.25, 0.75],
      arrival: [0.75, 1],
    });
    expect(HERO_ROUTE_SCENE_PROGRESS).toEqual({
      activation: [0, 0.17],
      clearance: [0.17, 0.74],
      arrival: [0.74, 0.9],
      retreat: [0.9, 1.25],
    });
    expect(getHeroRouteProgress(0.17)).toBe(0.25);
    expect(getHeroRouteProgress(0.74)).toBe(0.75);
    expect(getHeroRouteProgress(0.9)).toBe(1);

    for (const contact of Object.values(HERO_ROUTE_CONTACTS)) {
      const point = getHeroRoutePoint(contact.routeProgress);
      expect([point.x, point.y, point.z]).toEqual(contact.point);
      expect(contact.pointEvidence).toBe('source-confirmed');
    }
    expect(HERO_ROUTE_CONTACTS.activation.progressEvidence).toBe(
      'source-confirmed',
    );
    expect(HERO_ROUTE_CONTACTS.field.progressEvidence).toBe('source-confirmed');
    expect(HERO_ROUTE_CONTACTS.arrival.progressEvidence).toBe(
      'source-confirmed',
    );
    expect(HERO_ROUTE_EVIDENCE).toMatchObject({
      status: 'source-confirmed',
      sourceEvidenceId: 'canonical-route-topology',
      renderingCalibration: 'implementation-candidate',
    });

    expect(HERO_ARRIVAL_CENTER).toEqual([59, 0.15, 25]);
    expect(HERO_ARRIVAL_CENTER[0] - HERO_ROUTE_CONTACTS.arrival.point[0]).toBe(
      3.5,
    );
    expect(HERO_DESTINATION_TOPOLOGY).toMatchObject({
      activation: {
        contact: HERO_ROUTE_CONTACTS.activation.point,
        proxyCenter: [-56, 0, 3],
      },
      field: {
        contact: HERO_ROUTE_CONTACTS.field.point,
        proxyCenter: [24, 0, 25],
        centerEvidence: 'source-confirmed',
      },
      arrival: {
        contact: HERO_ROUTE_CONTACTS.arrival.point,
        proxyCenter: HERO_ARRIVAL_CENTER,
      },
    });
  });

  it('keeps the journey trunk continuous through both destination contacts', () => {
    const samples = sampleHeroRouteSegment(0, 1, 257);
    expect(samples[0].toArray()).toEqual(HERO_ROUTE_POINTS[0]);
    expect(samples.at(-1)?.toArray()).toEqual(
      HERO_ROUTE_CONTACTS.arrival.point,
    );
    expect(
      samples.every(({ y }) => Math.abs(y - HERO_ROUTE_Y) < 0.000001),
    ).toBe(true);

    for (const boundary of [
      HERO_ROUTE_SEGMENT_PROGRESS.activation[1],
      HERO_ROUTE_SEGMENT_PROGRESS.clearance[1],
    ]) {
      const before = getHeroRouteTangent(boundary - 0.000001).normalize();
      const after = getHeroRouteTangent(boundary + 0.000001).normalize();
      expect(before.angleTo(after)).toBeLessThan(0.001);
    }
  });

  it('keeps the provisional field composition and arrival adjustment stable', () => {
    const landing = sampleHeroCameraPose(0);
    expect(landing.position).toEqual([-80, 66, 15]);
    expect(landing.target).toEqual([-50, 0.15, -35]);

    const fieldContact = sampleHeroCameraPose(0.74);
    expect(fieldContact.position[0]).toBeCloseTo(7.1868131868, 9);
    expect(fieldContact.position[1]).toBe(66);
    expect(fieldContact.position[2]).toBe(75);
    expect(fieldContact.target).toEqual(HERO_ROUTE_CONTACTS.field.point);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion(...fieldContact.quaternion),
    );
    const expectedForward = new THREE.Vector3()
      .subVectors(
        new THREE.Vector3(...HERO_ROUTE_CONTACTS.field.point),
        new THREE.Vector3(...fieldContact.position),
      )
      .normalize();
    expect(forward.distanceTo(expectedForward)).toBeLessThan(0.000001);

    const arrival = sampleHeroCameraPose(0.9);
    expect(arrival.position).toEqual([59, 66, 25]);
    expect(arrival.target).toEqual(HERO_ROUTE_CONTACTS.arrival.point);
    const arrivalQuaternion = new THREE.Quaternion(...arrival.quaternion);
    const arrivalForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      arrivalQuaternion,
    );
    const arrivalRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      arrivalQuaternion,
    );
    expect(arrivalForward.distanceTo(new THREE.Vector3(0, -1, 0))).toBeLessThan(
      0.0002,
    );
    expect(arrivalRight.distanceTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(
      0.0002,
    );
    expect(sampleHeroCameraPose(0.74)).toEqual(sampleHeroCameraPose(0.74));
  });

  it('keeps static field visibility independent from pulse activation', () => {
    expect(HERO_FIELD_STATIC_VISIBILITY).toBe(1);
    expect(sampleHeroFieldPulse(1, false, 0, 500)).toBe(0);
    expect(sampleHeroFieldPulse(1, false, 1, 500)).toBeCloseTo(1, 9);
    expect(sampleHeroFieldPulse(1, true, 1, 500)).toBe(0);
  });

  it('retreats 45 world units on the final local camera axis', () => {
    const arrival = sampleHeroCameraPose(0.9);
    const exit = sampleHeroCameraPose(1.25);
    const retreat = new THREE.Vector3(...exit.position).sub(
      new THREE.Vector3(...arrival.position),
    );

    expect(retreat.length()).toBeCloseTo(HERO_CAMERA_SOURCE.retreatDistance, 9);
    expect(exit.position[1]).toBeGreaterThan(110.9);
  });

  it('uses the candidate FOV and caps narrow responsive views', () => {
    expect(HERO_CAMERA_SOURCE.rangeEvidence).toBe('source-confirmed');
    expect(HERO_CAMERA_SOURCE.poseConstantsEvidence).toBe(
      'implementation-candidate',
    );
    expect(getResponsiveHeroFov(2)).toBe(HERO_CAMERA_SOURCE.baseFov);
    expect(getResponsiveHeroFov(390 / 844)).toBeCloseTo(
      HERO_CAMERA_SOURCE.baseFov * HERO_CAMERA_SOURCE.maximumFovScale,
      9,
    );
  });

  it('keeps primary world landmarks inside the recording camera frustum', () => {
    const anchors = [
      [0, [-55, 0, -20]],
      [0.085, [-56, 2.5, 3]],
      [0.74, [24, 0, 25]],
      [0.98, [59, 0, 25]],
    ] as const;
    const projections = anchors.map(([progress, point]) => {
      const pose = sampleHeroCameraPose(progress, 1508 / 761);
      const camera = new THREE.PerspectiveCamera(
        pose.fov,
        1508 / 761,
        0.1,
        1000,
      );
      camera.position.set(...pose.position);
      camera.quaternion.set(...pose.quaternion);
      camera.updateMatrixWorld();

      return new THREE.Vector3(...point).project(camera).toArray();
    });

    projections.forEach(([x, y, z]) => {
      expect(Math.abs(x)).toBeLessThan(1);
      expect(y).toBeGreaterThan(-1.3);
      expect(y).toBeLessThan(1.3);
      expect(z).toBeGreaterThan(-1);
      expect(z).toBeLessThan(1);
    });
  });

  it('retains finite loop and gate primitives without output injection', () => {
    expect(sampleLoopPhase(800, 3200)).toBe(0.25);
    expect(approachHeroGateRatio(0, true, 0.25)).toBe(0.5);
    expect(approachHeroGateRatio(0.5, true, 0.25)).toBe(1);
    expect(approachHeroGateRatio(1, false, 0.25)).toBe(0.5);
    expect(approachHeroGateRatio(0.5, false, 0.25)).toBe(0);
  });
});
