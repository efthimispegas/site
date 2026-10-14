import { describe, expect, it } from 'vitest';
import { nextHeroCanvasSize, selectHeroRuntimeProfile } from './hero-profile';

const base = {
  viewportWidth: 1440,
  viewportHeight: 900,
  devicePixelRatio: 2,
  pointerFine: true,
  reducedMotion: false,
  webglAvailable: true,
};
const devices = [
  {
    name: 'desktop',
    userAgent: 'Windows Chrome',
    touchEndAvailable: false,
    msStreamAvailable: false,
    ios: false,
    mobile: false,
  },
  {
    name: 'Android',
    userAgent: 'Android',
    touchEndAvailable: true,
    msStreamAvailable: false,
    ios: false,
    mobile: true,
  },
  {
    name: 'iPhone',
    userAgent: 'iPhone',
    touchEndAvailable: true,
    msStreamAvailable: false,
    ios: true,
    mobile: true,
  },
  {
    name: 'iPadOS',
    userAgent: 'Macintosh',
    touchEndAvailable: true,
    msStreamAvailable: false,
    ios: true,
    mobile: true,
  },
  {
    name: 'Mac without touchend',
    userAgent: 'Macintosh',
    touchEndAvailable: false,
    msStreamAvailable: false,
    ios: false,
    mobile: false,
  },
  {
    name: 'iPhone MSStream',
    userAgent: 'iPhone',
    touchEndAvailable: true,
    msStreamAvailable: true,
    ios: true,
    mobile: false,
  },
  {
    name: 'iPadOS MSStream',
    userAgent: 'Macintosh',
    touchEndAvailable: true,
    msStreamAvailable: true,
    ios: true,
    mobile: true,
  },
];

describe('source-independent profile predicates', () => {
  for (const device of devices)
    for (const pointerFine of [false, true])
      for (const width of [
        819, 820, 821, 899, 900, 901, 1024, 1100, 1101, 1508,
      ]) {
        it(`${device.name}, ${pointerFine ? 'fine' : 'coarse'}, width ${width}`, () => {
          const p = selectHeroRuntimeProfile({
            ...base,
            ...device,
            viewportWidth: width,
            pointerFine,
          });
          expect(p.sourceIosDevice).toBe(device.ios);
          expect(p.sourceMobileDevice).toBe(device.mobile);
          expect(p.cameraSmoothTimeSeconds).toBe(device.mobile ? 0.1 : 0.15);
          expect(p.pointerTrail).toBe(!device.mobile);
          expect(p.maxDpr).toBe(
            device.ios ? 1.25 : device.mobile && width < 900 ? 1.5 : 1.75,
          );
        });
      }
  it('recording neighbors have identical behavioral policy with no capture identity', () => {
    const rows = [
      [1507, 761],
      [1508, 761],
      [1509, 761],
      [1508, 760],
      [1508, 762],
    ].map(([viewportWidth, viewportHeight]) =>
      selectHeroRuntimeProfile({ ...base, viewportWidth, viewportHeight }),
    );
    for (const row of rows) expect(row).toEqual(rows[0]);
    expect(rows[0].id).toBe('desktop');
  });
  it('DPR remains limited by the device, including below one', () => {
    for (const device of devices)
      for (const devicePixelRatio of [0.5, 0.75, 1, 1.25, 1.5, 2, 3]) {
        const p = selectHeroRuntimeProfile({
          ...base,
          ...device,
          viewportWidth: 390,
          devicePixelRatio,
        });
        const cap = device.ios ? 1.25 : device.mobile ? 1.5 : 1.75;
        expect(p.maxDpr).toBe(Math.min(devicePixelRatio, cap));
      }
    for (const devicePixelRatio of [0, -1, NaN, Infinity])
      expect(
        selectHeroRuntimeProfile({ ...base, devicePixelRatio }).maxDpr,
      ).toBe(1);
  });
  it('reduced/static policy disables pointer animation without changing device authority', () => {
    for (const input of [{ reducedMotion: true }, { webglAvailable: false }]) {
      const p = selectHeroRuntimeProfile({ ...base, ...input });
      expect(p.pointerTrail).toBe(false);
      expect(p.sourceMobileDevice).toBe(false);
    }
  });
});

describe('Canvas history is independent of DOM and displayed height', () => {
  const input = {
    width: 390,
    innerHeight: 700,
    largeViewportHeight: 844,
    sourceMobileDevice: true,
  };
  it('seeds from100lvh, preserves shrink/growth, resets orientation without100lvh reseed', () => {
    const start = nextHeroCanvasSize(null, input);
    expect(start.height).toBe(844);
    const shrunk = nextHeroCanvasSize(start, { ...input, innerHeight: 650 });
    expect(shrunk.height).toBe(844);
    const grown = nextHeroCanvasSize(shrunk, { ...input, innerHeight: 900 });
    expect(grown.height).toBe(900);
    const orientation = nextHeroCanvasSize(grown, {
      ...input,
      width: 844,
      innerHeight: 390,
      orientationReset: true,
    });
    expect(orientation.height).toBe(390);
    expect(
      nextHeroCanvasSize(orientation, {
        ...input,
        width: 844,
        innerHeight: 400,
      }).height,
    ).toBe(400);
  });
  it('leaving and reentering900 reseeds only upon branch entry', () => {
    const start = nextHeroCanvasSize(null, input);
    const left = nextHeroCanvasSize(start, {
      ...input,
      width: 900,
      innerHeight: 700,
    });
    expect(left.height).toBe(700);
    expect(left.narrowMobileDevice).toBe(false);
    const entered = nextHeroCanvasSize(left, {
      ...input,
      width: 899,
      largeViewportHeight: 950,
    });
    expect(entered.height).toBe(950);
    const resetEntry = nextHeroCanvasSize(left, {
      ...input,
      width: 899,
      largeViewportHeight: 950,
      orientationReset: true,
    });
    expect(resetEntry.height).toBe(950);
  });
  it('desktop and wide Qt devices use current innerHeight, never cached/lvh height', () => {
    for (const entry of [
      { ...input, sourceMobileDevice: false },
      { ...input, width: 900 },
    ]) {
      const start = nextHeroCanvasSize(null, entry);
      expect(start.height).toBe(700);
      expect(
        nextHeroCanvasSize(start, { ...entry, innerHeight: 600 }).height,
      ).toBe(600);
    }
  });
});
