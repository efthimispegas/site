import * as THREE from 'three';
import type { HeroTuple3 } from './hero-contract';
import { clampSceneProgress } from './hero-sequence';

export const HERO_ROUTE_Y = 0.15;

export const HERO_ROUTE_EVIDENCE = {
  status: 'source-confirmed',
  source: 'docs/hero-reference/live/source-evidence.json',
  sourceEvidenceId: 'canonical-route-topology',
  liveBundleSha256:
    '352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494',
  renderingCalibration: 'implementation-candidate',
} as const;

export const HERO_ROUTE_SEGMENT_PROGRESS = {
  activation: [0, 0.25],
  clearance: [0.25, 0.75],
  arrival: [0.75, 1],
} as const;

export const HERO_ROUTE_SCENE_PROGRESS = {
  activation: [0, 0.17],
  clearance: [0.17, 0.74],
  arrival: [0.74, 0.9],
  retreat: [0.9, 1.25],
} as const;

export const HERO_ROUTE_RENDERING = {
  redCoreRadius: 0.075,
  landingCoreRadius: 0.05,
  blueCoreRadius: 0.035,
  blueGlowRadiusScale: 2.15,
  blueGlowOpacity: 0.2,
  radialSegments: 8,
} as const;

const RED_ROUTE_END = HERO_ROUTE_SEGMENT_PROGRESS.activation[1];
const BLUE_ROUTE_ZERO_END = HERO_ROUTE_SEGMENT_PROGRESS.clearance[1];

const RED_CAMERA_PATH_SOURCE = [
  [-50, HERO_ROUTE_Y, -35],
  [-56.1, HERO_ROUTE_Y, 3],
] as const satisfies readonly HeroTuple3[];

const BLUE_ROUTE_ZERO_SOURCE = [
  [-56.1, HERO_ROUTE_Y, 3],
  [-55.5, HERO_ROUTE_Y, 11],
  [-50, HERO_ROUTE_Y, 20],
  [-40, HERO_ROUTE_Y, 25],
  [-20, HERO_ROUTE_Y, 25],
  [0, HERO_ROUTE_Y, 25],
  [24, HERO_ROUTE_Y, 25],
] as const satisfies readonly HeroTuple3[];

const BLUE_ROUTE_ONE_SOURCE = [
  [24, HERO_ROUTE_Y, 25],
  [55.5, HERO_ROUTE_Y, 25],
] as const satisfies readonly HeroTuple3[];

export const HERO_ACTIVATION_FEEDER_PATHS = [
  [
    [-53, HERO_ROUTE_Y, -21],
    [-53, HERO_ROUTE_Y, -20.3],
    [-53.09, HERO_ROUTE_Y, -20.09],
    [-53.3, HERO_ROUTE_Y, -20],
    [-55.45, HERO_ROUTE_Y, -20],
    [-55.57, HERO_ROUTE_Y, -19.98],
    [-55.66, HERO_ROUTE_Y, -19.91],
    [-55.73, HERO_ROUTE_Y, -19.81],
    [-55.75, HERO_ROUTE_Y, -19.7],
    [-55.75, HERO_ROUTE_Y, 3],
  ],
  [
    [-53, HERO_ROUTE_Y, -27.5],
    [-53, HERO_ROUTE_Y, -26.3],
    [-53.09, HERO_ROUTE_Y, -26.09],
    [-53.3, HERO_ROUTE_Y, -26],
    [-55.7, HERO_ROUTE_Y, -26],
    [-55.91, HERO_ROUTE_Y, -25.91],
    [-56, HERO_ROUTE_Y, -25.7],
    [-56, HERO_ROUTE_Y, 3],
  ],
  [
    [-59, HERO_ROUTE_Y, -27.5],
    [-59, HERO_ROUTE_Y, -26.3],
    [-58.91, HERO_ROUTE_Y, -26.09],
    [-58.7, HERO_ROUTE_Y, -26],
    [-56.55, HERO_ROUTE_Y, -26],
    [-56.34, HERO_ROUTE_Y, -25.91],
    [-56.25, HERO_ROUTE_Y, -25.7],
    [-56.25, HERO_ROUTE_Y, 3],
  ],
  [
    [-59, HERO_ROUTE_Y, -21.2],
    [-59, HERO_ROUTE_Y, -19.3],
    [-58.91, HERO_ROUTE_Y, -19.09],
    [-58.7, HERO_ROUTE_Y, -19],
    [-56.8, HERO_ROUTE_Y, -19],
    [-56.59, HERO_ROUTE_Y, -18.91],
    [-56.5, HERO_ROUTE_Y, -18.7],
    [-56.5, HERO_ROUTE_Y, 3],
  ],
] as const satisfies readonly (readonly HeroTuple3[])[];

export const HERO_LANDING_RAIL_PATHS = [
  [
    [-59.225, HERO_ROUTE_Y, -24.943],
    [-58.9, HERO_ROUTE_Y, -25.7],
    [-58.6, HERO_ROUTE_Y, -26.2],
    [-58.6, HERO_ROUTE_Y, -27.2],
    [-57.8, HERO_ROUTE_Y, -28.4],
    [-57.538, HERO_ROUTE_Y, -30.127],
  ],
  [
    [-58.097, HERO_ROUTE_Y, -24.266],
    [-57.8, HERO_ROUTE_Y, -25.25],
    [-57.45, HERO_ROUTE_Y, -26.15],
    [-56.9, HERO_ROUTE_Y, -27],
    [-56.701, HERO_ROUTE_Y, -28.825],
  ],
  [
    [-56.969, HERO_ROUTE_Y, -23.589],
    [-56.7, HERO_ROUTE_Y, -24.8],
    [-55.75, HERO_ROUTE_Y, -25.65],
    [-55.1, HERO_ROUTE_Y, -26.7],
    [-54.946, HERO_ROUTE_Y, -28.572],
  ],
  [
    [-55.841, HERO_ROUTE_Y, -22.912],
    [-55.55, HERO_ROUTE_Y, -24],
    [-54.65, HERO_ROUTE_Y, -24.8],
    [-53.9, HERO_ROUTE_Y, -25.65],
    [-53.654, HERO_ROUTE_Y, -26.997],
  ],
] as const satisfies readonly (readonly HeroTuple3[])[];

/**
 * Serializable source controls for the canonical route. Runtime sampling is
 * piecewise so the red, blue-zero, and blue-one contact points cannot drift.
 */
export const HERO_ROUTE_POINTS = [
  RED_CAMERA_PATH_SOURCE[0],
  ...BLUE_ROUTE_ZERO_SOURCE,
  BLUE_ROUTE_ONE_SOURCE[1],
] as const satisfies readonly HeroTuple3[];

export const HERO_ROUTE_CONTACTS = {
  activation: {
    sceneProgress: 0.17,
    routeProgress: RED_ROUTE_END,
    point: RED_CAMERA_PATH_SOURCE[1],
    progressEvidence: 'source-confirmed',
    pointEvidence: 'source-confirmed',
  },
  field: {
    sceneProgress: 0.74,
    routeProgress: BLUE_ROUTE_ZERO_END,
    point: BLUE_ROUTE_ZERO_SOURCE[BLUE_ROUTE_ZERO_SOURCE.length - 1],
    progressEvidence: 'source-confirmed',
    pointEvidence: 'source-confirmed',
  },
  arrival: {
    sceneProgress: 0.9,
    routeProgress: 1,
    point: BLUE_ROUTE_ONE_SOURCE[BLUE_ROUTE_ONE_SOURCE.length - 1],
    progressEvidence: 'source-confirmed',
    pointEvidence: 'source-confirmed',
  },
} as const;

/**
 * The second blue route terminates at the arrow shaft at x=55.5. The authored
 * lockup is centered 3.5 world units farther along the same axis so the route
 * meets the arrow without shifting the five surrounding marks off-center.
 */
export const HERO_ARRIVAL_CENTER = [
  59,
  HERO_ROUTE_Y,
  25,
] as const satisfies HeroTuple3;

export const HERO_DESTINATION_TOPOLOGY = {
  activation: {
    contact: HERO_ROUTE_CONTACTS.activation.point,
    proxyCenter: [-56, 0, 3] as const satisfies HeroTuple3,
    centerEvidence: 'implementation-candidate',
  },
  field: {
    contact: HERO_ROUTE_CONTACTS.field.point,
    proxyCenter: [24, 0, 25] as const satisfies HeroTuple3,
    centerEvidence: 'source-confirmed',
  },
  arrival: {
    contact: HERO_ROUTE_CONTACTS.arrival.point,
    proxyCenter: HERO_ARRIVAL_CENTER,
    centerEvidence: 'implementation-candidate',
  },
} as const;

export const HERO_ROUTE_SCENE_STOPS = [
  [0, 0],
  [HERO_ROUTE_SCENE_PROGRESS.activation[1], RED_ROUTE_END],
  [HERO_ROUTE_SCENE_PROGRESS.clearance[1], BLUE_ROUTE_ZERO_END],
  [HERO_ROUTE_SCENE_PROGRESS.arrival[1], 1],
  [HERO_ROUTE_SCENE_PROGRESS.retreat[1], 1],
] as const satisfies readonly (readonly [
  sceneProgress: number,
  routeProgress: number,
])[];

function toVector([x, y, z]: HeroTuple3) {
  return new THREE.Vector3(x, y, z);
}

/**
 * Follows the two-step curve construction observed in the audited live bundle:
 * sample the authored Catmull-Rom curve 31 times, then resample that polyline
 * into 40 points with equal path-length spacing. The implementation's
 * world-space control points and resampling construction are source-confirmed.
 * Render radii remain independently calibrated implementation values.
 */
function resampleBlueRouteSource() {
  const authoredCurve = new THREE.CatmullRomCurve3(
    BLUE_ROUTE_ZERO_SOURCE.map(toVector),
    false,
    'catmullrom',
    0.5,
  );
  const authoredSamples = authoredCurve.getPoints(30);
  const cumulativeLengths = [0];

  for (let index = 1; index < authoredSamples.length; index += 1) {
    cumulativeLengths.push(
      cumulativeLengths[index - 1] +
        authoredSamples[index].distanceTo(authoredSamples[index - 1]),
    );
  }

  const totalLength = cumulativeLengths[cumulativeLengths.length - 1];
  const resampled = [authoredSamples[0].clone()];
  let upperIndex = 1;

  for (let index = 1; index < 39; index += 1) {
    const distance = (index / 39) * totalLength;
    while (
      upperIndex < cumulativeLengths.length - 1 &&
      cumulativeLengths[upperIndex] < distance
    ) {
      upperIndex += 1;
    }

    const segmentLength =
      cumulativeLengths[upperIndex] - cumulativeLengths[upperIndex - 1];
    const amount =
      segmentLength > 0
        ? (distance - cumulativeLengths[upperIndex - 1]) / segmentLength
        : 0;
    resampled.push(
      authoredSamples[upperIndex - 1]
        .clone()
        .lerp(authoredSamples[upperIndex], amount),
    );
  }

  resampled.push(authoredSamples[authoredSamples.length - 1].clone());
  return resampled;
}

export const HERO_BLUE_ROUTE_ZERO_POINTS = resampleBlueRouteSource().map(
  ({ x, y, z }) => [x, y, z] as HeroTuple3,
);

const blueRouteZeroCurve = new THREE.CatmullRomCurve3(
  HERO_BLUE_ROUTE_ZERO_POINTS.map(toVector),
  false,
  'catmullrom',
  0.5,
);
const blueRouteOneCurve = new THREE.CatmullRomCurve3(
  BLUE_ROUTE_ONE_SOURCE.map(toVector),
  false,
  'catmullrom',
  0,
);

const redStart = toVector(RED_CAMERA_PATH_SOURCE[0]);
const redContact = toVector(RED_CAMERA_PATH_SOURCE[1]);
const redVector = redContact.clone().sub(redStart);
const redLength = redVector.length();
const redControlOne = redStart.clone().addScaledVector(redVector, 1 / 3);
const redControlTwo = redContact
  .clone()
  .addScaledVector(blueRouteZeroCurve.getTangent(0), -redLength / 3);
const redCameraPathCurve = new THREE.CubicBezierCurve3(
  redStart,
  redControlOne,
  redControlTwo,
  redContact,
);

function clampRouteProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function getHeroRouteProgress(sceneProgress: number) {
  const progress = clampSceneProgress(sceneProgress);
  const nextIndex = HERO_ROUTE_SCENE_STOPS.findIndex(
    ([sceneStop]) => sceneStop >= progress,
  );

  if (nextIndex <= 0) {
    return HERO_ROUTE_SCENE_STOPS[0][1];
  }

  if (nextIndex === -1) {
    return HERO_ROUTE_SCENE_STOPS[HERO_ROUTE_SCENE_STOPS.length - 1][1];
  }

  const [fromScene, fromRoute] = HERO_ROUTE_SCENE_STOPS[nextIndex - 1];
  const [toScene, toRoute] = HERO_ROUTE_SCENE_STOPS[nextIndex];
  const localProgress = (progress - fromScene) / (toScene - fromScene);

  return THREE.MathUtils.lerp(fromRoute, toRoute, localProgress);
}

function selectRouteCurve(progress: number) {
  const routeProgress = clampRouteProgress(progress);

  if (routeProgress <= RED_ROUTE_END) {
    return {
      curve: redCameraPathCurve,
      localProgress: routeProgress / RED_ROUTE_END,
    };
  }

  if (routeProgress <= BLUE_ROUTE_ZERO_END) {
    return {
      curve: blueRouteZeroCurve,
      localProgress:
        (routeProgress - RED_ROUTE_END) / (BLUE_ROUTE_ZERO_END - RED_ROUTE_END),
    };
  }

  return {
    curve: blueRouteOneCurve,
    localProgress:
      (routeProgress - BLUE_ROUTE_ZERO_END) / (1 - BLUE_ROUTE_ZERO_END),
  };
}

export function sampleHeroRouteSegment(
  start: number,
  end: number,
  sampleCount = 64,
) {
  const safeCount = Math.max(2, Math.floor(sampleCount));
  const safeStart = clampRouteProgress(start);
  const safeEnd = Math.max(safeStart + 0.0001, clampRouteProgress(end));

  return Array.from({ length: safeCount }, (_, index) =>
    getHeroRoutePoint(
      THREE.MathUtils.lerp(safeStart, safeEnd, index / (safeCount - 1)),
    ),
  );
}

export function getHeroRoutePoint(progress: number) {
  const { curve, localProgress } = selectRouteCurve(progress);
  return curve.getPoint(localProgress);
}

export function getHeroRouteTangent(progress: number) {
  const { curve, localProgress } = selectRouteCurve(progress);
  return curve.getTangent(localProgress);
}

export function getHeroRouteFrame(sceneProgress: number) {
  const routeProgress = getHeroRouteProgress(sceneProgress);
  const point = getHeroRoutePoint(routeProgress);
  const tangent = getHeroRouteTangent(routeProgress).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  return {
    routeProgress,
    point,
    tangent,
    side,
  };
}
