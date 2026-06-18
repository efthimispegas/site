export function shouldReduceMotion(
  explicitPreference?: boolean,
  mediaQueryMatches?: boolean,
): boolean {
  return explicitPreference ?? mediaQueryMatches ?? false;
}

export function getMotionSafeDuration(
  duration: number,
  reducedMotion: boolean,
): number {
  return reducedMotion ? 0 : duration;
}
