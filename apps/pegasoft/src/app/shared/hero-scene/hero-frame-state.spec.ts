import { describe, expect, it } from 'vitest';
import { dampHeroProgress } from './hero-camera-model';
import {
  advanceHeroRenderedFrame,
  createHeroRenderedFrame,
  sampleHeroFrameRatios,
  snapshotHeroFrame,
  HERO_FIELD_PULSE_PERIOD_MS,
  type HeroFrameRef,
} from './hero-frame-state';
import { sampleHeroFieldPulse } from './hero-field-model';

/** Independent transcription of source _a (uncapped maxSpeed), not imported candidate math. */
function sourceDamp(
  current: number,
  target: number,
  velocity: number,
  smooth: number,
  dt: number,
) {
  dt = Math.min(Math.max(dt, 0), 0.1);
  smooth = Math.max(0.0001, smooth);
  const omega = 2 / smooth,
    x = omega * dt,
    exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target,
    temporary = (velocity + omega * change) * dt;
  const nextVelocity = (velocity - omega * temporary) * exp;
  const value = target + (change + temporary) * exp;
  return target - current > 0 === value > target
    ? { value: target, velocity: 0 }
    : { value, velocity: nextVelocity };
}
const input = (target: number, smoothTimeSeconds = 0.15) => ({
  target,
  smoothTimeSeconds,
  motion: 'full' as const,
  measurementSequence: 1,
});
describe('one source-equivalent frame owner', () => {
  it('detaches nested telemetry from live camera, routes, effects and clock history', () => {
    const ref: HeroFrameRef = {
      current: createHeroRenderedFrame(),
      applied: {
        camera: {
          frameId: 0,
          renderedProgress: 0,
          readback: { position: [-80, 66, 15] },
        },
      },
    };
    const before = structuredClone(ref);
    const telemetry = snapshotHeroFrame(ref);
    telemetry.frame.rendered.value = 1;
    telemetry.frame.fieldElapsedMs = 9999;
    telemetry.frame.idle[0].phaseSeconds = 99;
    telemetry.frame.ratios.blueZero = 1;
    (telemetry.appliedConsumers.camera.readback.position as number[])[0] = 999;
    expect(ref).toEqual(before);
    expect(advanceHeroRenderedFrame(ref.current, input(0.8), 1 / 60)).toEqual(
      advanceHeroRenderedFrame(before.current, input(0.8), 1 / 60),
    );
  });
  it.each([30, 60, 120])(
    'matches source on every forward/reverse/jump/stop frame at %iHz',
    (hz) => {
      for (const smooth of [0.15, 0.1]) {
        let frame = createHeroRenderedFrame(),
          oracle = { value: 0, velocity: 0 };
        const targets = [
          ...Array.from({ length: hz * 2 }, (_, i) => (i / (hz * 2)) * 1.25),
          ...Array.from(
            { length: hz * 2 },
            (_, i) => 1.25 - (i / (hz * 2)) * 1.25,
          ),
          ...Array(hz).fill(0.9),
          ...Array(hz).fill(0),
          ...[0, 0.17, 0.72, 0.74, 0.75, 0.85, 0.9, 1, 1.25].flatMap((target) =>
            Array(hz).fill(target),
          ),
        ];
        targets.forEach((target, index) => {
          oracle = sourceDamp(
            oracle.value,
            target,
            oracle.velocity,
            smooth,
            1 / hz,
          );
          frame = advanceHeroRenderedFrame(
            frame,
            input(target, smooth),
            1 / hz,
          );
          expect(frame.frameId).toBe(index + 1);
          expect(frame.rendered.value).toBeCloseTo(oracle.value, 12);
          expect(frame.rendered.velocity).toBeCloseTo(oracle.velocity, 12);
        });
      }
    },
  );
  it.each([0, 0.17, 0.72, 0.74, 0.75, 0.85, 0.9, 1, 1.25])(
    'uses independent source gate triplets at %f',
    (gate) => {
      for (const p of [gate - 0.001, gate, gate + 0.001]) {
        const ratios = sampleHeroFrameRatios(p);
        const clamp = (v: number) => Math.min(1, Math.max(0, v));
        const expected = {
          red: clamp(p / 0.17),
          blueZero: clamp((p - 0.17) / 0.57),
          field: clamp((p - 0.72) / 0.03),
          fieldComposition: clamp((p - 0.72) / 0.13),
          blueOne: clamp((p - 0.74) / 0.16),
          retreat: clamp((p - 0.9) / 0.35),
        };
        for (const key of Object.keys(expected) as Array<keyof typeof expected>)
          expect(ratios[key]).toBeCloseTo(expected[key], 12);
      }
    },
  );
  it('caps damping delta only while field and arrival receive all 500ms', () => {
    const initial = createHeroRenderedFrame(0.95);
    const frame = advanceHeroRenderedFrame(initial, input(1.1), 0.5);
    expect(frame.rendered.value).toBeCloseTo(
      sourceDamp(0.95, 1.1, 0, 0.15, 0.1).value,
      12,
    );
    expect(frame.fieldElapsedMs).toBe(500);
    expect(frame.arrivalElapsedMs).toBe(500);
    expect(frame.arrivalRatio).toBe(1);
    expect(frame.deltaMs).toBe(500);
  });
  it('settles spatial frames without advancing hidden field or arrival effects', () => {
    const hidden = advanceHeroRenderedFrame(
      createHeroRenderedFrame(0.95),
      { ...input(1.1), localEffectsActive: false },
      4.8,
    );
    expect(hidden.rendered.value).toBeGreaterThan(0.95);
    expect(hidden.fieldElapsedMs).toBe(0);
    expect(hidden.fieldResetSequence).toBe(0);
    expect(hidden.arrivalElapsedMs).toBe(0);
    expect(hidden.arrivalRatio).toBe(0);
    expect(hidden.arrivalResetSequence).toBe(0);

    const visible = advanceHeroRenderedFrame(
      hidden,
      { ...input(1.1), localEffectsActive: true },
      0.3,
    );
    expect(visible.fieldElapsedMs).toBe(300);
    expect(visible.arrivalElapsedMs).toBe(300);
    expect(visible.arrivalRatio).toBeCloseTo(0.6, 12);
  });
  it.each([30, 60, 120])(
    'runs three pulse cycles and reset/re-entry at %iHz',
    (hz) => {
      let frame = createHeroRenderedFrame(0.8);
      for (
        let i = 0;
        i < Math.ceil((3 * HERO_FIELD_PULSE_PERIOD_MS * hz) / 1000);
        i++
      )
        frame = advanceHeroRenderedFrame(frame, input(0.8), 1 / hz);
      expect(frame.fieldElapsedMs).toBeGreaterThanOrEqual(3 * 3535 - 0.000001);
      const previousTime = frame.fieldElapsedMs;
      frame = advanceHeroRenderedFrame(frame, input(1.1), 0.5);
      expect(frame.fieldElapsedMs).toBeCloseTo(previousTime + 500, 6);
      for (let i = 0; i < hz * 2; i++)
        frame = advanceHeroRenderedFrame(frame, input(0.7), 1 / hz);
      expect(frame.fieldElapsedMs).toBe(0);
      expect(frame.fieldResetSequence).toBe(1);
      for (let i = 0; i < hz; i++)
        frame = advanceHeroRenderedFrame(frame, input(0.8), 1 / hz);
      expect(frame.fieldElapsedMs).toBeGreaterThan(0);
      expect(frame.fieldElapsedMs).toBeLessThan(1001);
      expect(sampleHeroFieldPulse(1, false, 1, 500)).toBeCloseTo(
        sampleHeroFieldPulse(1, false, 1, 500 + 3535 * 3),
        10,
      );
    },
  );
  it.each([30, 60, 120])(
    'finishes idle packets after leaving target zero and completes three cycles at %iHz',
    (hz) => {
      let frame = createHeroRenderedFrame();
      for (let i = 0; i < hz * 18; i++)
        frame = advanceHeroRenderedFrame(frame, input(0), 1 / hz);
      expect(frame.idle.every((packet) => packet.completedCycles >= 3)).toBe(
        true,
      );
      const fresh = advanceHeroRenderedFrame(
        createHeroRenderedFrame(),
        input(0),
        1 / hz,
      );
      expect(fresh.idle[0].active).toBe(true);
      let left = fresh;
      for (let i = 0; i < hz * 3; i++)
        left = advanceHeroRenderedFrame(left, input(0.5), 1 / hz);
      expect(left.idle[0].completedCycles).toBe(1);
      expect(
        left.idle.every(
          (packet) => !packet.active && packet.start === 0 && packet.end === 0,
        ),
      ).toBe(true);
      expect(
        left.idle.slice(1).every((packet) => packet.completedCycles === 0),
      ).toBe(true);
    },
  );
  it.each([30, 60, 120])(
    'activates/releases arrival over three histories at %iHz',
    (hz) => {
      let frame = createHeroRenderedFrame();
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < hz * 2; i++)
          frame = advanceHeroRenderedFrame(frame, input(1), 1 / hz);
        expect(frame.arrivalRatio).toBe(1);
        for (let i = 0; i < hz * 2; i++)
          frame = advanceHeroRenderedFrame(frame, input(0.8), 1 / hz);
        expect(frame.arrivalRatio).toBe(0);
        expect(frame.arrivalElapsedMs).toBe(0);
        expect(frame.arrivalResetSequence).toBe(cycle + 1);
      }
    },
  );
  it('preserves unbounded targets, finite guards, reduced-motion freeze and fresh history', () => {
    let frame = advanceHeroRenderedFrame(
      createHeroRenderedFrame(1.5),
      input(2),
      0.5,
    );
    expect(frame.target).toBe(2);
    expect(frame.rendered.value).toBeGreaterThan(1.25);
    frame = advanceHeroRenderedFrame(
      frame,
      { ...input(0.8), motion: 'reduced' },
      0.5,
    );
    expect(frame.rendered).toEqual({ value: 0.8, velocity: 0 });
    expect(frame.fieldElapsedMs).toBe(0);
    expect(frame.idle.every((packet) => !packet.active)).toBe(true);
    expect(createHeroRenderedFrame()).toEqual(createHeroRenderedFrame());
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(
        dampHeroProgress({ value: invalid, velocity: 0 }, 0.8, 0.15, 0.1),
      ).toEqual({ value: 0.8, velocity: 0 });
      expect(
        dampHeroProgress({ value: 0, velocity: 0 }, 0.8, invalid, 0.1).value,
      ).toBeTypeOf('number');
      expect(
        advanceHeroRenderedFrame(
          createHeroRenderedFrame(),
          input(invalid),
          invalid,
        ).rendered,
      ).toEqual({ value: 0, velocity: 0 });
    }
  });
  it('does not mislabel normalized residual as the screen-space settling budget', () => {
    for (const smooth of [0.15, 0.1]) {
      let frame = createHeroRenderedFrame();
      for (let i = 0; i < Math.round(smooth * 3 * 60); i++)
        frame = advanceHeroRenderedFrame(frame, input(1, smooth), 1 / 60);
      expect(1 - frame.rendered.value).toBeGreaterThan(0.01);
      expect(1 - frame.rendered.value).toBeLessThan(0.02);
    }
  });
});
