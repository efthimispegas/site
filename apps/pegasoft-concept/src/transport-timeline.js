import {
  duration as handoffDuration,
  storySpanScale,
} from '../runtime/handoff-sequence.js';
import {
  duration as shipDuration,
  storyTime as shipTime,
  progressAtTime as shipProgress,
} from '../runtime/ship-integration-sequence.js';
import { duration as crossingDuration } from '../runtime/ship-jet-sequence.js';

// Remove only duplicated overlap: ship starts at handoff .97; clouds start at ship .84.
export const handoffEnd = 0.97,
  shipEnd = 0.84;
export const chapters = Object.freeze([
  { id: 'handoff', duration: handoffDuration * handoffEnd },
  { id: 'ship', duration: shipTime(shipEnd) },
  { id: 'crossing', duration: crossingDuration },
]);
export const duration = chapters.reduce((sum, c) => sum + c.duration, 0);
export function chapterAt(progress) {
  const time = Math.max(0, Math.min(1, progress)) * duration;
  let start = 0;
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i],
      localTime = Math.min(chapter.duration, Math.max(0, time - start));
    if (time < start + chapter.duration || i === chapters.length - 1) {
      const localProgress =
        i === 0
          ? localTime / handoffDuration
          : i === 1
            ? shipProgress(localTime)
            : localTime / crossingDuration;
      return {
        id: chapter.id,
        index: i,
        localTime,
        localProgress,
        progress: time / duration,
      };
    }
    start += chapter.duration;
  }
}
export function scrollSpans(height) {
  const shipDistance = Math.max(4200, height * 8) * 1.04;
  return [
    Math.max(3600, height * 8) * storySpanScale * handoffEnd,
    (shipDistance * shipTime(shipEnd)) / shipDuration,
    shipDistance,
  ];
}
export const scrollDistance = (height) =>
  scrollSpans(height).reduce((sum, d) => sum + d, 0);
export function progressAtScroll(offset, height) {
  const spans = scrollSpans(height);
  let pixels = 0,
    time = 0;
  for (let i = 0; i < chapters.length; i++) {
    if (offset <= pixels + spans[i])
      return (
        (time +
          chapters[i].duration * Math.max(0, (offset - pixels) / spans[i])) /
        duration
      );
    pixels += spans[i];
    time += chapters[i].duration;
  }
  return 1;
}
export function scrollAtProgress(progress, height) {
  const c = chapterAt(progress),
    spans = scrollSpans(height);
  return (
    spans.slice(0, c.index).reduce((sum, d) => sum + d, 0) +
    (spans[c.index] * c.localTime) / chapters[c.index].duration
  );
}
