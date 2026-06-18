import { getMotionSafeDuration, shouldReduceMotion } from './reduced-motion';

describe('reduced motion helpers', () => {
  it('honors explicit reduced-motion preferences first', () => {
    expect(shouldReduceMotion(true, false)).toBe(true);
    expect(shouldReduceMotion(false, true)).toBe(false);
  });

  it('collapses animation duration when motion is reduced', () => {
    expect(getMotionSafeDuration(900, true)).toBe(0);
    expect(getMotionSafeDuration(900, false)).toBe(900);
  });
});
