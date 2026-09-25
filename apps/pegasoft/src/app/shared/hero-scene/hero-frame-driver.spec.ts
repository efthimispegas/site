import { describe, expect, it } from 'vitest';
import { createHeroFrameDriver, type HeroFrameLoop } from './hero-frame-driver';

describe('development frame input transport', () => {
  it('advances monotonically, records only input deltas and restores on resume/disposal', () => {
    let loop: HeroFrameLoop = 'demand';
    let elapsed = 0;
    const calls: number[] = [];
    const driver = createHeroFrameDriver({
      getLoop: () => loop,
      setLoop: (next) => {
        loop = next;
        elapsed = 0;
      },
      elapsedSeconds: () => elapsed,
      advance: (time) => {
        calls.push(time);
        elapsed = time;
      },
      read: () => elapsed,
    });
    driver.pause();
    expect(driver.advance(0.5)).toBe(0.5);
    expect(driver.advance(0.25)).toBe(0.75);
    expect(calls).toEqual([0.5, 0.75]);
    expect(driver.inputs).toEqual([
      { kind: 'frame', deltaSeconds: 0.5 },
      { kind: 'frame', deltaSeconds: 0.25 },
    ]);
    driver.inputs[0].deltaSeconds = 999;
    expect(driver.inputs[0].deltaSeconds).toBe(0.5);
    driver.resume();
    expect(loop).toBe('demand');
    driver.pause();
    driver.dispose();
    expect(loop).toBe('demand');
    expect(() => driver.advance(0.1)).toThrow('disposed');
  });
  it.each([NaN, Infinity, -1])(
    'rejects invalid delta %s and restores original loop',
    (delta) => {
      let loop: HeroFrameLoop = 'always';
      const driver = createHeroFrameDriver({
        getLoop: () => loop,
        setLoop: (next) => {
          loop = next;
        },
        elapsedSeconds: () => 0,
        advance: () => {
          throw new Error('must not advance');
        },
        read: () => null,
      });
      driver.pause();
      expect(() => driver.advance(delta)).toThrow('finite and nonnegative');
      expect(loop).toBe('always');
      expect(driver.inputs).toEqual([]);
    },
  );
  it('restores scheduling when a consumer/render throws', () => {
    let loop: HeroFrameLoop = 'always';
    const driver = createHeroFrameDriver({
      getLoop: () => loop,
      setLoop: (next) => {
        loop = next;
      },
      elapsedSeconds: () => 0,
      advance: () => {
        throw new Error('renderer failure');
      },
      read: () => null,
    });
    driver.pause();
    expect(() => driver.advance(0.1)).toThrow('renderer failure');
    expect(loop).toBe('always');
  });
});
