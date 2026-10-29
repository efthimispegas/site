import { outcomeColumnPosition } from './intro-sequence.js';
/** Company metrics and presentation order confirmed by the user. */
export const OUTCOME_METRICS = Object.freeze([
  {
    value: 98.5,
    suffix: '%',
    title: 'Successful, on-time completion',
    description: 'Projects completed successfully and on time.',
  },
  {
    value: 50,
    suffix: '+',
    title: 'Projects completed',
    description: 'Product experiences, systems and integrations.',
  },
  {
    value: 15,
    suffix: '+',
    title: 'Clients worldwide',
    description: 'Digital products and platforms across complex industries.',
  },
  {
    value: 5,
    suffix: '+',
    title: 'Countries',
    description: 'Connected delivery across markets and teams.',
  },
  {
    value: 2,
    suffix: '+',
    title: 'Years of delivery',
    description: 'From discovery through design, engineering and launch.',
  },
]);
export function metricLayout(
  progress,
  width,
  height,
  count = OUTCOME_METRICS.length,
  { introHeight = 0.38, titleHeight = 0.34 } = {},
) {
  const mobile = width < 680,
    rowGap = mobile ? 0.425 : 0.527,
    inset = mobile ? titleHeight + 0.06 : 0,
    padding = introHeight + inset;
  const metricsY = outcomeColumnPosition(progress);
  return {
    metricsY,
    rowGap,
    padding,
    inset,
    rowPositions: OUTCOME_METRICS.slice(0, count).map(
      (_, i) => metricsY + padding + i * rowGap,
    ),
  };
}
/** A visibility latch owns one timed spring run. Scroll cannot retarget or reset it. */
export function createMetricPlayback(metrics = OUTCOME_METRICS) {
  const rows = metrics.map(() => ({ started: false, elapsed: 0, plays: 0 }));
  return {
    update(positions, dt = 0) {
      return rows.map((row, i) => {
        if (!row.started && positions[i] < 1.12) {
          row.started = true;
          row.plays = 1;
        }
        if (row.started) row.elapsed += Math.max(0, dt);
        return row.started ? metrics[i].value : 0;
      });
    },
    get state() {
      return rows.map((row) => ({ ...row }));
    },
  };
}
