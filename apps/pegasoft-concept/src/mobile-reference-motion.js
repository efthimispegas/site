const clamp = (x) => Math.max(0, Math.min(1, x));
/** Same J02 artwork, portrait passage. The trailing wings reveal below them. */
export function mobileJetPose(p, w, h, wingTrailingProfile) {
  const length = h * 1.45,
    scale = length / w,
    imageHeight = (length * 9) / 16;
  const noseY = h * 1.05 - (h + length) * 1.2 * p,
    x = (w - imageHeight) / 2,
    y = noseY + length;
  const xs = [
    0,
    ...wingTrailingProfile
      .map(([v]) => x + v * imageHeight)
      .filter((v) => v > 0 && v < w),
    w,
  ];
  const boundary = xs.map((screenX) => {
    const v = (screenX - x) / imageHeight;
    let i = 1;
    while (i < wingTrailingProfile.length - 1 && v > wingTrailingProfile[i][0])
      i++;
    const [av, ax] = wingTrailingProfile[i - 1],
      [bv, bx] = wingTrailingProfile[i];
    return [
      screenX,
      y - (ax + (bx - ax) * clamp((v - av) / (bv - av))) * length,
    ];
  });
  const clip =
    'polygon(0px ' +
    h +
    'px, ' +
    boundary.map(([px, py]) => px + 'px ' + py + 'px').join(', ') +
    ', ' +
    w +
    'px ' +
    h +
    'px)';
  return {
    progress: p,
    x,
    y,
    scale,
    noseY,
    transform: `translate3d(${x}px,${y}px,0) rotate(-90deg) scale(${scale})`,
    reveal: {
      clip,
      boundary,
      visible: boundary.some(([, py]) => py < h),
      complete: boundary.every(([, py]) => py <= 0),
    },
  };
}

export const mobileContentOffset = (progress, contentHeight, viewportHeight) =>
  viewportHeight - (viewportHeight + contentHeight) * clamp(progress);

/** Alternate side entrances, settling at each block's existing reading position. */
export function mobileShipBlockEntry(top, width, height, index) {
  const entered = clamp((height - top) / (height * 0.24));
  return (index % 2 ? 1 : -1) * (1 - entered) * width * 0.3;
}

/** One scroll clock: descriptions enter at 90% of heading speed. Both settle
 * over 5% more scroll distance, then keep their original reading position. */
export function mobileShipTextEntry(top, width, height, index) {
  const travel = Math.max(0, height - top),
    span = height * 0.24;
  const settle = (value) => {
    const p = clamp(value);
    if (p <= 0.7) return p;
    const u = (p - 0.7) / 0.3;
    return 0.7 + 0.3 * (u + u * u - u * u * u);
  };
  const heading = settle(travel / (span * 1.05)),
    description = settle(travel / ((span * 1.05) / 0.9));
  const side = index % 2 ? 1 : -1;
  return {
    headingX: side * (1 - heading) * width * 0.3,
    descriptionX: side * (1 - description) * width * 0.3,
    descriptionY: span * 0.1 * Math.sin(Math.PI * description),
  };
}

/** Read the complete localized label, then let its trailing edge leave left. */
export function mobileServicesTitlePose(
  progress,
  viewportWidth,
  titleWidth,
  gutter,
) {
  const pan = clamp((progress - 0.02) / 0.46),
    exit = clamp((progress - 0.5) / 0.09);
  const overflow = Math.max(0, titleWidth - viewportWidth + 2 * gutter);
  // scrollWidth rounds glyph bounds; clear the final subpixel before hiding.
  return {
    x: -overflow * pan - (viewportWidth - gutter + 1) * exit,
    visible: progress < 0.6,
    pan,
    exit,
  };
}
