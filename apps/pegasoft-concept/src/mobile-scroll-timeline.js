import { chapters, duration } from './transport-timeline.js';
import { storyTime } from '../runtime/ship-integration-sequence.js';
const clamp = (n) => Math.max(0, Math.min(1, n));
export function mobileJourneyProgress(chapter, p) {
  const i = chapters.findIndex((c) => c.id === chapter),
    start = chapters.slice(0, i).reduce((n, c) => n + c.duration, 0);
  return (
    (start + (i === 0 ? p * 18.75 : i === 1 ? storyTime(p) : p * 26)) / duration
  );
}
/** Content and scene share one reversible native-scroll map; no extra easing clock. */
export function createMobileScrollTimeline(
  height,
  { road = 0, ship = 0 } = {},
) {
  let pixels = 0;
  const points = [{ progress: 0, pixels: 0 }];
  const add = (chapter, p, span) => {
    pixels += span;
    points.push({ progress: mobileJourneyProgress(chapter, p), pixels });
  };
  add('handoff', 0.22, height * 1.1);
  add('handoff', 0.35, height * 0.65);
  add('handoff', 0.6, height * 1.2);
  // Departure clears the lift before the reading rail enters. Keep the
  // copy-free road tail compact instead of spending another viewport on it.
  add('handoff', 0.69, height * 0.45);
  add('handoff', 0.93, height + road);
  add('handoff', 0.97, height * 0.18);
  add('ship', 0.22, height * 0.65);
  add('ship', 0.38, height * 0.24);
  const reading = height + ship;
  add('ship', 0.84, (reading * (0.84 - 0.38)) / 0.62);
  add('crossing', 0.54, (reading * 0.16) / 0.62);
  add('crossing', 1, height * 1.35);
  function interpolate(value, key, out) {
    if (value <= 0) return 0;
    if (value >= points.at(-1)[key]) return points.at(-1)[out];
    const i = points.findIndex((p) => p[key] >= value),
      a = points[i - 1],
      b = points[i];
    return (
      a[out] + (b[out] - a[out]) * clamp((value - a[key]) / (b[key] - a[key]))
    );
  }
  return {
    distance: pixels,
    points,
    progressAt: (offset) => interpolate(offset, 'pixels', 'progress'),
    offsetAt: (progress) => interpolate(progress, 'progress', 'pixels'),
  };
}
