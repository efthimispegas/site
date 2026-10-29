// Elapsed opening time owns the loader/content only. Camera and globe rotation
// never depend on this state, DOM text bounds, or a moving object's bounds.
export const DEFAULTS = Object.freeze({
  ringEnd: 1.64,
  markStart: 1.21,
  pulseStart: 1.34,
  apertureStart: 1.7,
  apertureDuration: 1.13,
  headlineStart: 2.1,
  headlineDuration: 0.72,
});
export const GLOBE_DEFAULTS = Object.freeze({
  speed: 1.52,
  dots: 1.5,
  rim: 0.48,
  arcs: 1.21,
});
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (v) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
export function openingState(t, settings = DEFAULTS, reduced = false) {
  const s = { ...DEFAULTS, ...settings };
  const end = Math.max(
    3.8,
    s.apertureStart + s.apertureDuration,
    s.headlineStart + s.headlineDuration + 0.65,
  );
  const track = (start, duration) =>
    reduced ? 1 : smooth((t - start) / duration);
  const rings = track(0, s.ringEnd),
    mark = track(s.markStart, 0.38);
  const pulse = track(s.pulseStart, 0.42),
    aperture = track(s.apertureStart, s.apertureDuration);
  const lines = [0, 0.13, 0.26].map((delay) =>
    track(s.headlineStart + delay, s.headlineDuration),
  );
  return {
    end,
    ringScale: 0.7 + 1.16 * rings,
    ringOpacity: reduced ? 0 : 1 - track(s.ringEnd - 0.25, 0.3),
    markOpacity: 1 - mark,
    pulseScale: pulse,
    pulseVisible: !reduced && t >= s.pulseStart && aperture < 1,
    aperture,
    nav: track(s.apertureStart + 0.1, 0.62),
    lines,
    body: track(s.headlineStart + 0.4, 0.75),
    cta: track(s.headlineStart + 0.65, 0.72),
    complete: reduced || t >= end,
  };
}
export function cameraEnvelope(width, height, mobile = width < 680) {
  return {
    aspect: width / height,
    viewHeight: 2.28,
    centerX: mobile ? 0.63 : 0.925,
    centerY: mobile ? 0.3 : 0.5,
    radiusHeight: mobile ? 0.32 : 0.52,
  };
}
