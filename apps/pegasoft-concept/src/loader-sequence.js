import { openingState, clamp, smooth } from './hero-opening-sequence.js';

import { REFERENCE_LOADER_PRESET } from './loader-reference-preset.js';

export const LOADER_DEFAULTS = REFERENCE_LOADER_PRESET;
const track = (time, start, duration) =>
  smooth((time - start) / Math.max(0.001, duration));
const wave = (time, start, duration) =>
  Math.min(
    1,
    2.5 * Math.pow(clamp((time - start) / Math.max(0.001, duration)), 2.8),
  );
/** Position stays fixed: the accent and final-colour fronts travel over the text. */
export function heroTextReveal(
  time,
  line = 0,
  settings = LOADER_DEFAULTS,
  reduced = false,
) {
  const s = { ...LOADER_DEFAULTS, ...settings },
    age = time - s.headlineStart - line * s.headlineLineStagger;
  return {
    visible: reduced ? 1 : clamp(age / s.headlineDuration),
    settled: reduced
      ? 1
      : clamp((age - s.headlineColorDuration) / s.headlineDuration),
  };
}
export function loaderState(time, settings = LOADER_DEFAULTS, reduced = false) {
  const s = { ...LOADER_DEFAULTS, ...settings },
    state = openingState(time, s, reduced);
  const rings = Array.from({ length: 5 }, (_, index) => {
    const age = time - index * s.ringStagger,
      x = clamp(age / s.ringArrivalDuration),
      settleAge = Math.max(0, age - s.ringArrivalDuration);
    const arrival = 1 - Math.pow(1 - x, 3),
      bounce =
        age < s.ringArrivalDuration
          ? 0
          : s.bounce *
            Math.exp(-settleAge / Math.max(0.01, s.settle)) *
            Math.sin((settleAge / Math.max(0.01, s.settle)) * Math.PI * 2);
    const exit = track(
      time,
      s.ringEnd - s.ringFadeLead - index * 0.04,
      s.ringFadeDuration,
    );
    return {
      scale:
        (s.ringFrom + (s.ringTo - s.ringFrom) * arrival + bounce) *
        (1 + 0.35 * exit),
      opacity:
        reduced || age < 0
          ? 0
          : (index === 0 ? 1 : track(age, 0, 0.08)) * (1 - exit),
    };
  });
  const pulses = [0, 1].map((index) => ({
    kind: 'fill',
    start: s.pulseStart + index * s.pulseGap,
    scale: reduced
      ? 0
      : wave(time, s.pulseStart + index * s.pulseGap, s.pulseDuration),
  }));
  const aperture = reduced
    ? 1
    : wave(time, s.apertureStart, s.apertureDuration);
  pulses.push({ kind: 'hero', start: s.apertureStart, scale: aperture });
  const lines = [0, 1, 2].map(
    (index) => heroTextReveal(time, index, s, reduced).visible,
  );
  const end = Math.max(
    3.8,
    s.headlineStart +
      2 * s.headlineLineStagger +
      s.headlineDuration +
      s.headlineColorDuration,
  );
  return {
    ...state,
    end,
    complete: reduced || time >= end,
    aperture,
    rings,
    pulses,
    lines,
    nav: reduced ? 1 : track(time, s.apertureStart + 0.1, 0.4),
    body: reduced ? 1 : track(time, s.headlineStart + 0.2, 0.8),
    cta: reduced ? 1 : track(time, s.headlineStart + 0.08, 0.85),
    ringScale: rings[0].scale,
    ringOpacity: Math.max(...rings.map((r) => r.opacity)),
    markOpacity: reduced
      ? 0
      : track(time, s.markIntroStart, s.markIntroDuration) *
        (1 - track(time, s.markStart, s.markDuration)),
    pulseVisible: !reduced && time >= s.pulseStart && aperture < 1,
    pulseScale: pulses[0].scale,
    pulseAge: Math.max(0, time - s.pulseStart),
    phase: reduced
      ? 'Reduced motion'
      : time < s.pulseStart
        ? 'Ring arrival / mark'
        : aperture < 1
          ? 'Three nested expansion fronts'
          : time >= end
            ? 'Opening complete'
            : 'Accent text reveal',
    beatScale:
      1 +
      s.beatAmount *
        (0.5 -
          0.5 * Math.cos((time / Math.max(0.1, s.beatDuration)) * Math.PI * 2)),
    progress: clamp(time / end),
  };
}
