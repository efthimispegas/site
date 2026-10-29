import {
  createShipSequence as createCloudSequence,
  duration as cloudDuration,
} from './cloud-story-sequence.js';
export const jetStart = 14,
  jetDuration = 12,
  duration = jetStart + jetDuration;
export const storyTime = (p) => p * duration,
  progressAtTime = (t) => t / duration,
  gates = { transfer: 0 };
const clamp = (x) => Math.max(0, Math.min(1, x));
export function createShipSequence(options) {
  const base = createCloudSequence(options);
  let trace;
  function apply(progress) {
    const time = storyTime(progress),
      cloudProgress = clamp(time / cloudDuration),
      jetProgress = clamp((time - jetStart) / jetDuration),
      r = base.apply(cloudProgress);
    trace = {
      ...r,
      progress,
      time,
      cloudProgress,
      cloudMotionProgress: time / cloudDuration,
      jetProgress,
      phase:
        time < jetStart
          ? r.phase
          : jetProgress < 0.23
            ? 'Jet enters · ship still visible'
            : jetProgress < 0.65
              ? 'Jet crossing · trust reveal'
              : jetProgress < 1
                ? 'Tail clears · trust chapter'
                : 'Trust chapter',
    };
    return trace;
  }
  return {
    apply,
    resize: () => base.resize(),
    tickWater: () => base.tickWater(),
    get waterTime() {
      return base.waterTime;
    },
    get trace() {
      return trace;
    },
    get scale() {
      return base.scale;
    },
  };
}
