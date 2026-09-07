import type {
  HeroInputClass,
  HeroMotionProfile,
  HeroRuntimeProfile,
  HeroViewportProfileId,
} from './hero-contract';

type ProfileInput = {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  pointerFine: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
  isIosDevice?: boolean;
};

function selectViewportProfile({
  viewportWidth,
  viewportHeight,
}: ProfileInput): HeroViewportProfileId {
  if (viewportWidth === 1508 && viewportHeight === 761) {
    return 'recording-desktop';
  }

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

function detectIosDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function getMaximumDpr(
  id: HeroViewportProfileId,
  devicePixelRatio: number,
  isIosDevice: boolean,
) {
  const dpr = Number.isFinite(devicePixelRatio)
    ? Math.max(1, devicePixelRatio)
    : 1;
  const cap = isIosDevice ? 1.25 : id === 'mobile' ? 1.5 : 1.75;

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
  const mobileOrTablet = id === 'mobile' || id === 'tablet';
  const desktopInteraction =
    motion === 'full' && !mobileOrTablet && inputClass === 'fine-pointer';
  const isIosDevice = input.isIosDevice ?? detectIosDevice();

  return {
    id,
    inputClass,
    motion,
    cameraSmoothTimeSeconds: mobileOrTablet ? 0.1 : 0.15,
    maxDpr: getMaximumDpr(id, input.devicePixelRatio, isIosDevice),
    pointerTrail: desktopInteraction,
    journeyHeightSvh: id === 'mobile' ? 570 : id === 'tablet' ? 500 : 456,
  };
}
