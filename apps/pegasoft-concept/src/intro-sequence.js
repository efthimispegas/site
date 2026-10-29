import { clamp, smooth } from './hero-opening-sequence.js';

/** Local native-scroll progress; the accepted opening clock is independent. */
export const INTRO_GATES = Object.freeze({
  horizonStart: 0.1,
  horizonEnd: 0.27,
  outcomeStart: 0.19,
  titlePin: 0.28,
  mobileTitlePin: 0.31,
});
const horizonSpan = INTRO_GATES.horizonEnd - INTRO_GATES.horizonStart;
/** Double only the horizon's physical scroll span: 50% response, no lag clock. */
export const introScrollDistance = (height) => height * 4.2 * (1 + horizonSpan);
export function introScrollAtProgress(progress, height) {
  const p = clamp(progress),
    extra = clamp(p - INTRO_GATES.horizonStart, 0, horizonSpan);
  return height * 4.2 * (p + extra);
}
export function introProgressAtScroll(offset, height) {
  const p = offset / (height * 4.2),
    start = INTRO_GATES.horizonStart;
  return clamp(
    p <= start
      ? p
      : p < start + 2 * horizonSpan
        ? start + (p - start) / 2
        : p - horizonSpan,
  );
}
const titleEntryScroll = introScrollAtProgress(0.17, 1);
const titleEntrySpeed =
  (1.04 - 0.88) /
  (introScrollAtProgress(INTRO_GATES.outcomeStart, 1) - titleEntryScroll);
/** Preserve entry speed A in physical scroll space, including the horizon's doubled span. */
export function outcomeTitlePosition(progress, { mobile = false } = {}) {
  return Math.max(mobile ? 0.08 : 0.2, outcomeColumnPosition(progress));
}
/** Shared entrance keeps the heading and right-hand introduction in step. */
export function outcomeColumnPosition(progress) {
  const travel = Math.max(
    0,
    introScrollAtProgress(progress, 1) - titleEntryScroll,
  );
  return 1.04 - titleEntrySpeed * travel;
}
export function introState(progress) {
  const p = clamp(progress),
    g = INTRO_GATES,
    wipe = smooth((p - g.horizonStart) / (g.horizonEnd - g.horizonStart));
  return {
    progress: p,
    wipe,
    horizonY: 1.1 - 2.3 * wipe,
    heroY: 0,
    lineExit: [0, 0.015, 0.03].map((delay) => smooth((p - delay) / 0.15)),
    utilityExit: smooth((p - 0.025) / 0.135),
    titleY: outcomeTitlePosition(p),
    outcomeActive: p > 0.17,
  };
}
