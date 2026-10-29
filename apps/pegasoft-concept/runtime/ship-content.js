import { ease } from './handoff-sequence.js';
/** Reserve both the hull gap and the shared mobile page gutter. */
export function shipContentCardBudget(width, hull) {
  return width <= 760
    ? Math.max(
        72,
        Math.min(
          width * 0.4,
          (width - (hull.right - hull.left)) / 2 -
            Math.max(12, width * 0.022) -
            width * 0.06,
        ),
      )
    : Math.min(width * 0.31, 360);
}
export const shipContentCardWidth = (index, width, cardWidth) =>
  index === 2 || index === 3
    ? Math.min(cardWidth, width * 0.24, 280)
    : cardWidth;
export function shipContentLayout(
  progress,
  width,
  height,
  hull,
  cardWidth,
  headingHeight,
  spacing = 1,
) {
  const u = Math.max(0, Math.min(1, (progress - 0.6) / 0.4)),
    rowSpacing = 0.66 * 0.8 * 0.9 * 0.9 * spacing,
    gap = Math.max(12, width * 0.022);
  const left = hull.left - gap - cardWidth,
    right = hull.right + gap,
    titleY = height * (1 - u * 1.7),
    titleGap = height * 0.18 * spacing,
    firstY = titleY + headingHeight + titleGap;
  const items = Array.from({ length: 5 }, (_, i) => {
    const itemWidth = shipContentCardWidth(i, width, cardWidth),
      row = Math.floor(i / 2),
      side = i === 4 ? 'centre' : i % 2 ? 'right' : 'left';
    const entry =
        0.6 +
        (((headingHeight + titleGap) / height + row * rowSpacing) / 1.7) * 0.4,
      close = ease((progress - entry) / 0.18);
    if (side === 'centre')
      return {
        side,
        x: (width - cardWidth) / 2,
        y: firstY + row * rowSpacing * height,
        width: cardWidth,
        hullGap: gap,
        entry,
        originCentre: width * 0.5,
        animated: true,
        visible: progress > 0.6,
      };
    const originCentre = width * (side === 'left' ? 0.25 : 0.75),
      origin = originCentre - itemWidth / 2,
      destination = side === 'left' ? hull.left - gap - itemWidth : right;
    let x = origin + (destination - origin) * close;
    // Retain hull clearance on narrow screens as the bottom entry becomes visible.
    if (progress > entry && i < 2)
      x = side === 'left' ? Math.min(x, left) : Math.max(x, right);
    return {
      side,
      x,
      y: firstY + row * rowSpacing * height,
      width: itemWidth,
      hullGap: gap,
      entry,
      close,
      originCentre,
      animated: true,
      visible: progress >= entry,
    };
  });
  return {
    visible: progress > 0.6,
    entry: 0.6,
    rowSpacing,
    rowEntries: items
      .filter((_, i) => i === 0 || i === 2)
      .map((item) => item.entry),
    titleY,
    titleGap,
    items,
  };
}
