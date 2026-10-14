import { expect, test } from '@playwright/test';
import {
  captureScrollY,
  hasCausalFieldClock,
  isCaptureEntryAllowed,
  isCaptureObservationReady,
  nextCaptureClockDelta,
  type CaptureSample,
} from './hero-capture-contract';

function sample(): CaptureSample & {
  record: NonNullable<CaptureSample['record']>;
} {
  return {
    attributes: {
      'data-hero-reference-state': 'world-reveal',
      'data-hero-lifecycle': 'loading',
      'data-hero-direct-entry': 'true',
      'data-hero-render-ready': 'true',
      'data-hero-motion': 'full',
      'data-hero-profile': 'desktop',
      'data-hero-seed': '43117',
    },
    canvasVisible: true,
    fontsReady: true,
    record: {
      renderedAtMs: 3500,
      frame: {
        frameId: 8,
        target: 0,
        rendered: { value: 0, velocity: 0 },
        fieldElapsedMs: 0,
      },
      appliedConsumers: {
        camera: { frameId: 8 },
        field: { frameId: 8 },
        beam: { frameId: 8 },
      },
      canvas: {
        cssWidth: 1508,
        cssHeight: 761,
        backingWidth: 2639,
        backingHeight: 1331,
      },
    },
  };
}

test('lifecycle_changes_between_assertions', () => {
  const observed = sample();
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
    }),
  ).toBe(true);
  observed.attributes['data-hero-reference-state'] = 'landing';
  observed.attributes['data-hero-lifecycle'] = 'landing';
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
    }),
  ).toBe(false);
});

test('resource_readiness_delays_entry', () => {
  const observed = sample();
  const expected = { key: 'world-reveal', lifecycle: 'loading', target: 0 };
  observed.attributes['data-hero-render-ready'] = 'false';
  expect(isCaptureObservationReady(observed, expected)).toBe(false);
  observed.attributes['data-hero-render-ready'] = 'true';
  expect(isCaptureObservationReady(observed, expected)).toBe(true);
});

test('pulse_label_differs_from_applied_clock', () => {
  const observed = sample();
  observed.attributes['data-hero-reference-state'] = 'field-contact';
  observed.attributes['data-hero-lifecycle'] = 'journey';
  observed.record.frame = {
    frameId: 8,
    target: 0.74,
    rendered: { value: 0.74, velocity: 0 },
    fieldElapsedMs: 300,
  };
  const expected = {
    key: 'field-pulse-a',
    lifecycle: 'journey',
    target: 0.74,
    fieldElapsedMs: 300,
  };
  expect(isCaptureObservationReady(observed, expected)).toBe(true);
  observed.record.frame.fieldElapsedMs = 2800;
  expect(isCaptureObservationReady(observed, expected)).toBe(false);
});

test('stale_consumer_rejects_frame', () => {
  const observed = sample();
  const expected = { key: 'world-reveal', lifecycle: 'loading', target: 0 };
  observed.record.appliedConsumers.camera.frameId = 7;
  expect(isCaptureObservationReady(observed, expected)).toBe(false);
  observed.record.appliedConsumers.camera.frameId = 8;
  expect(isCaptureObservationReady(observed, expected)).toBe(true);
});

test('pending_render_rejects_frame', () => {
  const observed = sample();
  delete observed.record.renderedAtMs;
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
    }),
  ).toBe(false);
});

test('nonfinite_frame_cannot_qualify', () => {
  const observed = sample();
  observed.record.frame.target = Number.NaN;
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
    }),
  ).toBe(false);
});

test('physical_entry_uses_viewport_and_flow_domains', () => {
  expect(
    captureScrollY(0.74, {
      viewportHeight: 1000,
      flowHeight: 4560,
      wrapperHeight: 1000,
    }),
  ).toBe(3256);
});

test('loader_age_uses_lifecycle_origin_not_rendered_age', () => {
  const observed = sample();
  observed.lifecycleElapsedMs = 3500;
  observed.record.frame.nowMs = 8000;
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
      elapsedMs: 3500,
    }),
  ).toBe(true);
  observed.lifecycleElapsedMs = 4800;
  expect(
    isCaptureObservationReady(observed, {
      key: 'world-reveal',
      lifecycle: 'loading',
      target: 0,
      elapsedMs: 3500,
    }),
  ).toBe(false);
});

test('physical_entry_waits_for_actual_loader_clearance', () => {
  const observed = sample();
  observed.loaderCleared = false;
  expect(isCaptureEntryAllowed(observed)).toBe(false);
  observed.loaderCleared = true;
  expect(isCaptureEntryAllowed(observed)).toBe(true);
});

test('contact_clock_requires_real_history_above_point72', () => {
  const history = [
    {
      frameId: 1,
      target: 0.74,
      rendered: { value: 0.72, velocity: 0 },
      fieldElapsedMs: 0,
      deltaMs: 16,
    },
    {
      frameId: 2,
      target: 0.74,
      rendered: { value: 0.73, velocity: 0 },
      fieldElapsedMs: 16,
      deltaMs: 16,
    },
    {
      frameId: 3,
      target: 0.74,
      rendered: { value: 0.74, velocity: 0 },
      fieldElapsedMs: 32,
      deltaMs: 16,
    },
  ];
  expect(hasCausalFieldClock(history)).toBe(true);
  history[2].fieldElapsedMs = 0;
  expect(hasCausalFieldClock(history)).toBe(false);
});

test('incomplete_clock_history_cannot_qualify', () => {
  expect(
    hasCausalFieldClock([
      {
        frameId: 2,
        target: 0.74,
        rendered: { value: 0.73, velocity: 0 },
        fieldElapsedMs: 16,
        deltaMs: 16,
      },
    ]),
  ).toBe(false);
});

test('clock_transport_batches_without_overshooting_event_window', () => {
  expect(nextCaptureClockDelta(6944, 7500)).toBe(240);
  expect(nextCaptureClockDelta(7480, 7500)).toBe(20);
  expect(nextCaptureClockDelta(7500, 7500)).toBe(16);
});
