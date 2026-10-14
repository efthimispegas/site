import type {
  HeroInputClass,
  HeroMotionProfile,
  HeroRuntimeProfile,
  HeroViewportProfileId,
} from './hero-contract';
import { isHeroMobileDevice } from './hero-sequence';

type ProfileInput = {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  pointerFine: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
  userAgent?: string;
  touchEndAvailable?: boolean;
  msStreamAvailable?: boolean;
};

function selectViewportProfile({
  viewportWidth,
}: ProfileInput): HeroViewportProfileId {
  if (viewportWidth <= 820) {
    return 'mobile';
  }

  if (viewportWidth <= 1100) {
    return 'tablet';
  }

  return 'desktop';
}

function selectMotionProfile({
  reducedMotion,
  webglAvailable,
}: ProfileInput): HeroMotionProfile {
  if (!webglAvailable) {
    return 'static';
  }

  return reducedMotion ? 'reduced' : 'full';
}

/** Source Uo differs from Qt: no MSStream exclusion, and case-insensitive iOS UA. */
export function isHeroIosDevice(userAgent: string, touchEndAvailable: boolean) {
  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/.test(userAgent) && touchEndAvailable)
  );
}

function getMaximumDpr(
  narrowMobileDevice: boolean,
  devicePixelRatio: number,
  isIosDevice: boolean,
) {
  const dpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const cap = isIosDevice ? 1.25 : narrowMobileDevice ? 1.5 : 1.75;

  return Math.min(cap, dpr);
}

export function selectHeroRuntimeProfile(
  input: ProfileInput,
): HeroRuntimeProfile {
  const id = selectViewportProfile(input);
  const motion = selectMotionProfile(input);
  const inputClass: HeroInputClass = input.pointerFine
    ? 'fine-pointer'
    : 'coarse-pointer';
  const userAgent = input.userAgent ?? '';
  const touchEndAvailable = input.touchEndAvailable ?? false;
  const sourceMobileDevice = isHeroMobileDevice(
    userAgent,
    touchEndAvailable,
    input.msStreamAvailable,
  );
  const sourceIosDevice = isHeroIosDevice(userAgent, touchEndAvailable);

  return {
    id,
    inputClass,
    motion,
    sourceMobileDevice,
    sourceIosDevice,
    cameraSmoothTimeSeconds: sourceMobileDevice ? 0.1 : 0.15,
    maxDpr: getMaximumDpr(
      sourceMobileDevice && input.viewportWidth < 900,
      input.devicePixelRatio,
      sourceIosDevice,
    ),
    pointerTrail: motion === 'full' && !sourceMobileDevice,
  };
}

export type HeroCanvasSize = {
  width: number;
  height: number;
  narrowMobileDevice: boolean;
};

/** Source resize history; independent of DOM effective height and displayed 100lvh. */
export function nextHeroCanvasSize(
  previous: HeroCanvasSize | null,
  input: {
    width: number;
    innerHeight: number;
    largeViewportHeight: number;
    sourceMobileDevice: boolean;
    orientationReset?: boolean;
  },
): HeroCanvasSize {
  const narrowMobileDevice = input.sourceMobileDevice && input.width < 900;
  let cachedHeight = input.orientationReset
    ? input.innerHeight
    : (previous?.height ?? input.innerHeight);
  if (narrowMobileDevice && !previous?.narrowMobileDevice) {
    cachedHeight = Math.max(input.innerHeight, input.largeViewportHeight);
  }
  return {
    width: input.width,
    height: narrowMobileDevice
      ? Math.max(cachedHeight, input.innerHeight)
      : input.innerHeight,
    narrowMobileDevice,
  };
}
