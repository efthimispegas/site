export type HeroWorldVec3 = readonly [number, number, number];

type HeroWorldLayoutBase<Kind extends string> = {
  readonly id: string;
  readonly kind: Kind;
  readonly position: HeroWorldVec3;
  readonly rotationY?: number;
  readonly scale?: number;
};

export type HeroWorldLayoutItem =
  | (HeroWorldLayoutBase<'building'> & {
      readonly size: HeroWorldVec3;
      readonly roof: 'slab' | 'service';
    })
  | (HeroWorldLayoutBase<'stepped-building'> & {
      readonly size: HeroWorldVec3;
      readonly tiers: 2 | 3;
    })
  | (HeroWorldLayoutBase<'warehouse'> & {
      readonly size: HeroWorldVec3;
    })
  | HeroWorldLayoutBase<'campus-hub'>
  | (HeroWorldLayoutBase<'hangar'> & {
      readonly size: HeroWorldVec3;
    })
  | (HeroWorldLayoutBase<'utility-bank'> & {
      readonly modules: 6 | 8 | 10;
    })
  | HeroWorldLayoutBase<'factory'>
  | HeroWorldLayoutBase<'cooling-tower'>
  | (HeroWorldLayoutBase<'tank-cluster'> & {
      readonly tanks: 3 | 4;
    })
  | (HeroWorldLayoutBase<'water-tower'> & {
      readonly height: number;
    })
  | HeroWorldLayoutBase<'pallet-stacks'>
  | HeroWorldLayoutBase<'pipe-rack'>
  | HeroWorldLayoutBase<'truck'>
  | (HeroWorldLayoutBase<'wind-turbine'> & {
      readonly height: number;
      readonly rotorRotation: number;
    })
  | HeroWorldLayoutBase<'worker'>;

export type HeroWorldZoneLayout = {
  readonly id: 'activation' | 'clearance';
  readonly calibration: 'provisional-unaccepted-proxy';
  readonly assetPolicy: 'original-procedural-only';
  readonly items: readonly HeroWorldLayoutItem[];
};

/**
 * Pure-data proxy layout kept outside the rendering components so every
 * coordinate can be replaced independently as source measurements become
 * defensible. No coordinate in this candidate is accepted as a recording
 * measurement.
 *
 * The scene uses original generic primitives; no reference meshes, textures,
 * shaders, or identity assets are represented by this manifest.
 */
export const HERO_WORLD_LAYOUT = {
  activation: {
    id: 'activation',
    calibration: 'provisional-unaccepted-proxy',
    assetPolicy: 'original-procedural-only',
    items: [
      {
        id: 'activation-service-block-west',
        kind: 'building',
        position: [-45.5, 1, -29],
        size: [3.2, 2, 2.4],
        rotationY: 0.12,
        roof: 'service',
      },
      {
        id: 'activation-warehouse-north',
        kind: 'warehouse',
        position: [-50.2, 0, -28],
        size: [4.2, 1.7, 3],
        rotationY: -0.04,
      },
      {
        id: 'activation-office-north',
        kind: 'stepped-building',
        position: [-54.8, 0, -27],
        size: [3.1, 5.1, 2.8],
        rotationY: 0.025,
        tiers: 3,
      },
      {
        id: 'activation-block-north-east',
        kind: 'building',
        position: [-59.2, 1.7, -26.8],
        size: [3.5, 3.4, 3],
        rotationY: -0.04,
        roof: 'slab',
      },
      {
        id: 'activation-office-west',
        kind: 'stepped-building',
        position: [-62.7, 0, -23],
        size: [3.2, 5.8, 2.9],
        rotationY: -0.06,
        tiers: 3,
      },
      {
        id: 'activation-warehouse-center-west',
        kind: 'warehouse',
        position: [-49.5, 0, -21.5],
        size: [4.6, 1.9, 3.5],
        rotationY: 0.055,
      },
      {
        id: 'activation-block-center',
        kind: 'building',
        position: [-55, 1.5, -20.4],
        size: [3.9, 3, 3.2],
        rotationY: 0.02,
        roof: 'service',
      },
      {
        id: 'activation-office-center-east',
        kind: 'stepped-building',
        position: [-59.4, 0, -22.3],
        size: [3.8, 6.1, 3.5],
        rotationY: -0.025,
        tiers: 3,
      },
      {
        id: 'activation-block-west',
        kind: 'building',
        position: [-64.1, 1.15, -22.6],
        size: [3.2, 2.3, 3.8],
        rotationY: -0.08,
        roof: 'slab',
      },
      {
        id: 'activation-warehouse-south-west',
        kind: 'warehouse',
        position: [-50.6, 0, -20.8],
        size: [4.9, 2, 3.7],
        rotationY: 0.04,
      },
      {
        id: 'activation-office-south',
        kind: 'stepped-building',
        position: [-59.7, 0, -18.5],
        size: [3.6, 5.4, 3.3],
        rotationY: -0.02,
        tiers: 2,
      },
      {
        id: 'activation-block-south-east',
        kind: 'building',
        position: [-51.6, 1.3, -16.2],
        size: [3.8, 2.6, 3.6],
        rotationY: 0.035,
        roof: 'service',
      },
      {
        id: 'activation-contact-hub',
        kind: 'campus-hub',
        position: [-56, 0, 3],
      },
      {
        id: 'activation-pallet-yard',
        kind: 'pallet-stacks',
        position: [-45.7, 0, -18.5],
        rotationY: 0.08,
        scale: 0.72,
      },
      {
        id: 'activation-service-truck',
        kind: 'truck',
        position: [-66.2, 0, -22.6],
        rotationY: 0.18,
        scale: 0.7,
      },
      {
        id: 'activation-turbine-one',
        kind: 'wind-turbine',
        position: [-43.2, 0, -17.2],
        height: 5.6,
        rotationY: 0.04,
        rotorRotation: 0.32,
      },
      {
        id: 'activation-turbine-two',
        kind: 'wind-turbine',
        position: [-38.8, 0, -15.7],
        height: 6.1,
        rotationY: -0.02,
        rotorRotation: 1.14,
      },
      {
        id: 'activation-turbine-three',
        kind: 'wind-turbine',
        position: [-34.2, 0, -13.1],
        height: 5.8,
        rotationY: 0.03,
        rotorRotation: 2.22,
      },
      {
        id: 'activation-turbine-four',
        kind: 'wind-turbine',
        position: [-29.8, 0, -10.2],
        height: 5.4,
        rotationY: -0.03,
        rotorRotation: 0.78,
      },
      {
        id: 'activation-worker-one',
        kind: 'worker',
        position: [-46.922, 0, -27.009],
        rotationY: 1.85,
        scale: 0.86,
      },
      {
        id: 'activation-worker-two',
        kind: 'worker',
        position: [-56.991, 0, -29.061],
        rotationY: 5.94,
        scale: 0.88,
      },
      {
        id: 'activation-worker-three',
        kind: 'worker',
        position: [-63.062, 0, -27.011],
        scale: 0.84,
      },
      {
        id: 'activation-worker-four',
        kind: 'worker',
        position: [-62.987, 0, -26.022],
        rotationY: 3.13,
        scale: 0.9,
      },
      {
        id: 'activation-worker-five',
        kind: 'worker',
        position: [-59.11, 0, -8.755],
        scale: 0.84,
      },
      {
        id: 'activation-worker-six',
        kind: 'worker',
        position: [-61.615, 0.072, 7.131],
        rotationY: 1.59,
        scale: 0.82,
      },
      {
        id: 'activation-worker-seven',
        kind: 'worker',
        position: [-60.477, 0, 6.921],
        rotationY: 4.75,
        scale: 0.86,
      },
      {
        id: 'activation-worker-eight',
        kind: 'worker',
        position: [-51.133, 0.095, 4.348],
        scale: 0.84,
      },
      {
        id: 'activation-worker-nine',
        kind: 'worker',
        position: [-51.032, 0, 5.656],
        rotationY: 2.96,
        scale: 0.84,
      },
      {
        id: 'activation-worker-ten',
        kind: 'worker',
        position: [-47.8, 0, -12.2],
        rotationY: 2.2,
        scale: 0.82,
      },
      {
        id: 'activation-worker-eleven',
        kind: 'worker',
        position: [-42.1, 0, -20.7],
        rotationY: 0.6,
        scale: 0.8,
      },
      {
        id: 'activation-worker-twelve',
        kind: 'worker',
        position: [-56.9, 0, -15.2],
        rotationY: 4.1,
        scale: 0.84,
      },
    ],
  },
  clearance: {
    id: 'clearance',
    calibration: 'provisional-unaccepted-proxy',
    assetPolicy: 'original-procedural-only',
    items: [
      {
        id: 'clearance-service-block',
        kind: 'building',
        position: [-61.8, 1.25, 12.8],
        size: [3.4, 2.5, 3.8],
        rotationY: 0.08,
        roof: 'service',
      },
      {
        id: 'clearance-factory-west',
        kind: 'factory',
        position: [-12.9, 0, 28.6],
        rotationY: -0.05,
        scale: 0.72,
      },
      {
        id: 'clearance-cooling-west',
        kind: 'cooling-tower',
        position: [-44.4, 0, 10.8],
        scale: 0.78,
      },
      {
        id: 'clearance-cooling-center',
        kind: 'cooling-tower',
        position: [-47, 0, 15.5],
        scale: 0.65,
      },
      {
        id: 'clearance-utility-bank-center',
        kind: 'utility-bank',
        position: [-43.7, 0, 20.2],
        rotationY: 0.16,
        scale: 0.66,
        modules: 10,
      },
      {
        id: 'clearance-pipe-west',
        kind: 'pipe-rack',
        position: [-53.2, 0, 17.4],
        rotationY: 0.45,
        scale: 0.7,
      },
      {
        id: 'clearance-warehouse-row-one',
        kind: 'warehouse',
        position: [-30.7, 0, 18.8],
        size: [3.4, 1.4, 2.25],
        rotationY: 0.03,
      },
      {
        id: 'clearance-warehouse-row-two',
        kind: 'warehouse',
        position: [-29.6, 0, 21.6],
        size: [3.25, 1.35, 2.2],
        rotationY: -0.04,
      },
      {
        id: 'clearance-office-row',
        kind: 'warehouse',
        position: [-25.8, 0, 20.7],
        size: [3.35, 1.4, 2.25],
        rotationY: 0.025,
      },
      {
        id: 'clearance-warehouse-row-three',
        kind: 'warehouse',
        position: [-24.7, 0, 20.5],
        size: [3.2, 1.35, 2.2],
        rotationY: -0.025,
      },
      {
        id: 'clearance-hangar-travel',
        kind: 'hangar',
        position: [-28, 0, 24.1],
        size: [6.4, 2.7, 4.8],
        rotationY: 0.08,
        scale: 0.82,
      },
      {
        id: 'clearance-pallet-yard-north',
        kind: 'pallet-stacks',
        position: [-17.2, 0, 17.5],
        rotationY: 0.08,
        scale: 0.62,
      },
      {
        id: 'clearance-pallet-yard-south',
        kind: 'pallet-stacks',
        position: [-18.6, 0, 18],
        rotationY: -0.12,
        scale: 0.68,
      },
      {
        id: 'clearance-truck-south',
        kind: 'truck',
        position: [-37.6, 0, 29.8],
        rotationY: 0.18,
        scale: 0.75,
      },
      {
        id: 'clearance-truck-north',
        kind: 'truck',
        position: [3, 0, 27.8],
        rotationY: -0.08,
        scale: 0.8,
      },
      {
        id: 'clearance-warehouse-east-one',
        kind: 'warehouse',
        position: [-20.3, 0, 20],
        size: [3.3, 1.4, 2.25],
        rotationY: 0.03,
      },
      {
        id: 'clearance-warehouse-east-two',
        kind: 'warehouse',
        position: [-16, 0, 19],
        size: [3.2, 1.35, 2.2],
        rotationY: -0.035,
      },
      {
        id: 'clearance-hangar-preview',
        kind: 'hangar',
        position: [-18.5, 0, 17.7],
        size: [5.5, 2.45, 4],
        rotationY: -0.06,
        scale: 0.76,
      },
      {
        id: 'clearance-truck-east',
        kind: 'truck',
        position: [5.5, 0, 17],
        rotationY: 0.1,
        scale: 0.72,
      },
      {
        id: 'clearance-pipe-east',
        kind: 'pipe-rack',
        position: [-11.5, 0, 15.8],
        rotationY: 1.5708,
        scale: 0.75,
      },
      {
        id: 'clearance-water-tower',
        kind: 'water-tower',
        position: [-23.4, 0, 11.4],
        height: 5.8,
        rotationY: 0.04,
        scale: 0.9,
      },
      {
        id: 'clearance-pallet-travel',
        kind: 'pallet-stacks',
        position: [-36.8, 0, 14.1],
        rotationY: 0.04,
        scale: 0.66,
      },
      {
        id: 'clearance-pallet-preview',
        kind: 'pallet-stacks',
        position: [-6.9, 0, 12.1],
        rotationY: 0.12,
        scale: 0.58,
      },
      {
        id: 'clearance-pallet-south-east',
        kind: 'pallet-stacks',
        position: [5, 0, 33],
        rotationY: -0.08,
        scale: 0.54,
      },
      {
        id: 'clearance-turbine-one',
        kind: 'wind-turbine',
        position: [-63.3, 0, 22.4],
        height: 6.2,
        rotationY: 0.08,
        rotorRotation: 0.32,
      },
      {
        id: 'clearance-turbine-two',
        kind: 'wind-turbine',
        position: [-61.6, 0, 25.8],
        height: 6.6,
        rotationY: 0.04,
        rotorRotation: 1.14,
      },
      {
        id: 'clearance-turbine-three',
        kind: 'wind-turbine',
        position: [-60, 0, 29.5],
        height: 6,
        rotationY: -0.06,
        rotorRotation: 2.22,
      },
      {
        id: 'clearance-turbine-four',
        kind: 'wind-turbine',
        position: [-58, 0, 33],
        height: 6.4,
        rotationY: 0.03,
        rotorRotation: 0.78,
      },
      {
        id: 'clearance-turbine-five',
        kind: 'wind-turbine',
        position: [-56, 0, 36],
        height: 5.8,
        rotationY: -0.02,
        rotorRotation: 1.72,
      },
      {
        id: 'clearance-worker-one',
        kind: 'worker',
        position: [-57.13, 0.043, 17.128],
        rotationY: 0.69,
        scale: 0.84,
      },
      {
        id: 'clearance-worker-two',
        kind: 'worker',
        position: [-40.19, 0, 35.078],
        rotationY: 1.85,
        scale: 0.82,
      },
      {
        id: 'clearance-worker-three',
        kind: 'worker',
        position: [-41.696, 0, 29.159],
        rotationY: 1.85,
        scale: 0.84,
      },
      {
        id: 'clearance-worker-four',
        kind: 'worker',
        position: [-42.8, 0, 19.4],
        scale: 0.82,
      },
      {
        id: 'clearance-worker-five',
        kind: 'worker',
        position: [-26.632, 0.1, 14.905],
        rotationY: 0.65,
        scale: 0.84,
      },
      {
        id: 'clearance-worker-six',
        kind: 'worker',
        position: [-18.1, 0, 29.054],
        rotationY: 1.6,
        scale: 0.82,
      },
      {
        id: 'clearance-worker-seven',
        kind: 'worker',
        position: [-9.193, 0, 30.442],
        rotationY: 3.9,
        scale: 0.82,
      },
      {
        id: 'clearance-worker-eight',
        kind: 'worker',
        position: [-5.4, 0, 12.849],
        rotationY: 3.9,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-nine',
        kind: 'worker',
        position: [-34.778, 0, 26.762],
        rotationY: 2.34,
        scale: 0.86,
      },
      {
        id: 'clearance-worker-ten',
        kind: 'worker',
        position: [3.573, 0, 20.926],
        rotationY: 1.76,
        scale: 0.82,
      },
      {
        id: 'clearance-worker-eleven',
        kind: 'worker',
        position: [-50.4, 0, 29.5],
        rotationY: 4.2,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-twelve',
        kind: 'worker',
        position: [-36.8, 0, 12.1],
        rotationY: 2.5,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-thirteen',
        kind: 'worker',
        position: [-28.2, 0, 35.8],
        rotationY: 5.1,
        scale: 0.82,
      },
      {
        id: 'clearance-worker-fourteen',
        kind: 'worker',
        position: [-15.5, 0, 12.2],
        rotationY: 1.1,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-fifteen',
        kind: 'worker',
        position: [-7.5, 0, 35.7],
        rotationY: 3.3,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-sixteen',
        kind: 'worker',
        position: [0.5, 0, 15.6],
        rotationY: 0.5,
        scale: 0.8,
      },
      {
        id: 'clearance-worker-seventeen',
        kind: 'worker',
        position: [7.2, 0, 29.2],
        rotationY: 2.8,
        scale: 0.8,
      },
    ],
  },
} as const satisfies Record<'activation' | 'clearance', HeroWorldZoneLayout>;
