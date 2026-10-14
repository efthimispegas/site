import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  HERO_ACTIVATION_FEEDER_PATHS,
  HERO_LANDING_RAIL_PATHS,
  HERO_ROUTE_SOURCE_CONTROLS,
  HERO_BLUE_ROUTE_ZERO_POINTS,
  HERO_ROUTE_RENDERING,
  getHeroRoutePoint,
} from './hero-route';
import {
  createHeroFeederCurve,
  createHeroFeederMesh,
  createHeroRouteMesh,
  setHeroTubeRange,
  disposeHeroRouteMesh,
} from './hero-route-rendering';

describe('source canonical route roles and physical consumers', () => {
  it('preserves the independently extracted source coordinate serialization', () => {
    const digest = createHash('sha256')
      .update(JSON.stringify(HERO_ROUTE_SOURCE_CONTROLS))
      .digest('hex');
    // Public bundle / source-controls.json, not a checksum generated from this implementation.
    expect(digest).toBe(
      '5d7bf626792071c665558af49876d323dbc9be6082c5bfddd6cffff9b78e5183',
    );
  });
  it('has four shared feeders and no independent landing network', () => {
    expect(HERO_ACTIVATION_FEEDER_PATHS).toHaveLength(4);
    expect(HERO_LANDING_RAIL_PATHS).toBe(HERO_ACTIVATION_FEEDER_PATHS);
    HERO_ACTIVATION_FEEDER_PATHS.forEach((points, index) => {
      expect(
        createHeroFeederCurve(index).points.map((point) => point.toArray()),
      ).toEqual(points);
    });
    expect(() => createHeroFeederCurve(4)).toThrow(RangeError);
  });
  it('keeps camera look-at coordinates distinct from all four visible contacts', () => {
    expect(HERO_ROUTE_SOURCE_CONTROLS.redCameraLookAt).toEqual([
      [-50, 0.15, -35],
      [-56.1, 0.15, 3],
    ]);
    expect(HERO_ACTIVATION_FEEDER_PATHS.map((points) => points.at(-1))).toEqual(
      [
        [-55.75, 0.15, 3],
        [-56, 0.15, 3],
        [-56.25, 0.15, 3],
        [-56.5, 0.15, 3],
      ],
    );
    expect(
      HERO_ACTIVATION_FEEDER_PATHS.every(
        (points) => points !== HERO_ROUTE_SOURCE_CONTROLS.redCameraLookAt,
      ),
    ).toBe(true);
  });
  it('applies31-to40 equal-distance resampling only to blue zero', () => {
    const controls = HERO_ROUTE_SOURCE_CONTROLS.blueZero.map(
      (point) => new THREE.Vector3(...point),
    );
    const samples = new THREE.CatmullRomCurve3(
      controls,
      false,
      'catmullrom',
      0.5,
    ).getPoints(30);
    const lengths = samples
      .slice(1)
      .map((point, index) => point.distanceTo(samples[index]));
    const total = lengths.reduce((a, b) => a + b, 0);
    expect(HERO_BLUE_ROUTE_ZERO_POINTS).toHaveLength(40);
    for (let index = 0; index < 40; index++) {
      let left = (index / 39) * total,
        segment = 0;
      while (segment < lengths.length - 1 && left > lengths[segment])
        left -= lengths[segment++];
      const expected = samples[segment]
        .clone()
        .lerp(samples[segment + 1], left / lengths[segment]);
      expect(
        expected.distanceTo(
          new THREE.Vector3(...HERO_BLUE_ROUTE_ZERO_POINTS[index]),
        ),
      ).toBeLessThan(1e-9);
    }
    expect(HERO_ROUTE_SOURCE_CONTROLS.blueOne).toHaveLength(2);
    expect(HERO_ACTIVATION_FEEDER_PATHS.map((points) => points.length)).toEqual(
      [10, 8, 8, 8],
    );
  });
  it('preserves separate source blue contacts and straight blue-one interpolation', () => {
    expect(getHeroRoutePoint(0.25).toArray()).toEqual([-56.1, 0.15, 3]);
    expect(getHeroRoutePoint(0.75).toArray()).toEqual([24, 0.15, 25]);
    expect(getHeroRoutePoint(0.875).toArray()).toEqual([39.75, 0.15, 25]);
    expect(getHeroRoutePoint(1).toArray()).toEqual([55.5, 0.15, 25]);
  });
  it.each([0, 1, 2, 3])(
    'uses source radius/tessellation and real core depth on feeder %i',
    (index) => {
      const mesh = createHeroFeederMesh(index, '#ff4d67');
      expect(mesh.geometry.parameters).toMatchObject({
        radius: 0.075,
        tubularSegments: 150,
        radialSegments: 8,
      });
      expect(mesh.material).toMatchObject({
        depthTest: true,
        depthWrite: true,
      });
      expect(mesh.renderOrder).toBe(3);
      setHeroTubeRange(mesh.geometry, 0.25, 0.55);
      const stride = mesh.geometry.parameters.radialSegments * 6;
      expect(mesh.geometry.drawRange).toEqual({
        start: Math.floor(0.25 * 150) * stride,
        count: (Math.ceil(0.55 * 150) - Math.floor(0.25 * 150)) * stride,
      });
      disposeHeroRouteMesh(mesh);
    },
  );
  it('restores blue physical radius without claiming classifier or glow fidelity', () => {
    expect(HERO_ROUTE_RENDERING.blueCoreRadius).toBe(0.125);
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(24, 0.15, 25),
      new THREE.Vector3(55.5, 0.15, 25),
    );
    const core = createHeroRouteMesh(
      curve,
      100,
      HERO_ROUTE_RENDERING.blueCoreRadius,
      { color: '#0e94fb' },
    );
    const glow = createHeroRouteMesh(
      curve,
      100,
      HERO_ROUTE_RENDERING.blueCoreRadius *
        HERO_ROUTE_RENDERING.blueGlowRadiusScale,
      {
        color: '#57cdff',
        opacity: HERO_ROUTE_RENDERING.blueGlowOpacity,
        glow: true,
      },
    );
    expect(core.geometry.parameters.radius).toBe(0.125);
    expect(core.material.depthWrite).toBe(true);
    expect(glow.material.depthTest).toBe(true);
    expect(glow.material.depthWrite).toBe(false);
    expect(glow.geometry.parameters.radius).not.toBe(
      core.geometry.parameters.radius,
    );
    [core, glow].forEach(disposeHeroRouteMesh);
  });
});
