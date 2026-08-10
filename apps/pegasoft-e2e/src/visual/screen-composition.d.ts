export type ScreenCompositionImage = {
  width: number;
  height: number;
  channels: number;
};

export type ScreenCompositionMeasurement =
  | {
      status: 'blocked';
      label: string;
      reason: string;
      method: {
        id: 'screen-space-sobel-grid';
        roiNormalized: readonly number[];
        roiRasterPixels: readonly number[];
        sobelThreshold: number;
      };
    }
  | {
      status: 'observed';
      evidenceClass: 'observed';
      label: string;
      edgePixelSupport: number;
      edgeDensity: number;
      edgeCentroid: {
        rasterPixels: readonly [number, number];
        cssPixels: readonly [number, number];
        normalized: readonly [number, number];
      };
      grid: {
        columns: number;
        rows: number;
        cells: ReadonlyArray<{
          column: number;
          row: number;
          edgePixels: number;
          edgeDensity: number;
          edgeShare: number;
          negativeSpaceProxy: number;
        }>;
      };
      method: {
        id: 'screen-space-sobel-grid';
        roiNormalized: readonly number[];
        roiRasterPixels: readonly number[];
        sobelThreshold: number;
        minimumEdgePixels: number;
        interpretation: string;
      };
    };

export const SCREEN_COMPOSITION_CONFIG: Readonly<{
  label: string;
  roi: readonly number[];
  sobelThreshold: number;
  gridColumns: number;
  gridRows: number;
  minimumEdgePixels: number;
}>;

export function measureScreenComposition(input: {
  data: Uint8Array;
  image: ScreenCompositionImage;
  dpr: number;
  config?: typeof SCREEN_COMPOSITION_CONFIG;
}): {
  measurement: ScreenCompositionMeasurement;
  debug: {
    mask: Uint8Array;
    roi: { x: number; y: number; width: number; height: number };
  };
};
