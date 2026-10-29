const origins = { K01: [-1.1, -0.8], K02: [-0.85, 0.75], K03: [2.5, 2] };
const length = (v) => Math.hypot(...v);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const unit = (v) => v.map((x) => x / length(v));
const scaled = (v, scale) => v.map((x) => x * scale);

function hermite(a, b, va, vb, duration, t) {
  const t2 = t * t,
    t3 = t2 * t;
  return a.map(
    (x, i) =>
      (2 * t3 - 3 * t2 + 1) * x +
      (t3 - 2 * t2 + t) * duration * va[i] +
      (-2 * t3 + 3 * t2) * b[i] +
      (t3 - t2) * duration * vb[i],
  );
}

/**
 * Follow the existing origin/veil/bank route without stopping at its waypoints.
 * Distance sampling keeps travel steady; the bank tangent continues through the jet.
 * Progress is story seconds / 16, deliberately allowed to exceed one.
 */
export function createCloudPaths(contract) {
  return Object.fromEntries(
    Object.entries(origins).map(([id, start]) => {
      const veil = contract.moments.veil[id].center,
        bank = contract.moments.banks[id].center;
      const first = subtract(veil, start),
        second = subtract(bank, veil);
      const firstDirection = unit(first),
        lastDirection = unit(second);
      const joinDirection = unit(
        firstDirection.map((v, i) => v + lastDirection[i]),
      );
      const joinVelocity = scaled(
        joinDirection,
        Math.min(length(first) / 0.4, length(second) / 0.6),
      );
      const firstVelocity = scaled(firstDirection, length(first) / 0.4),
        lastVelocity = scaled(lastDirection, length(second) / 0.6);
      const points = [],
        distances = [];
      let distance = 0;
      for (let i = 0; i <= 2048; i++) {
        const u = i / 2048;
        const point =
          u <= 0.4
            ? hermite(start, veil, firstVelocity, joinVelocity, 0.4, u / 0.4)
            : hermite(
                veil,
                bank,
                joinVelocity,
                lastVelocity,
                0.6,
                (u - 0.4) / 0.6,
              );
        if (i) distance += length(subtract(point, points[i - 1]));
        points.push(point);
        distances.push(distance);
      }
      return [
        id,
        (progress) => {
          if (progress <= 0) return [...start];
          if (progress >= 1)
            return bank.map(
              (v, i) => v + lastDirection[i] * distance * (progress - 1),
            );
          const wanted = progress * distance;
          let low = 0,
            high = distances.length - 1;
          while (high - low > 1) {
            const middle = (low + high) >> 1;
            if (distances[middle] < wanted) low = middle;
            else high = middle;
          }
          const fraction =
            (wanted - distances[low]) / (distances[high] - distances[low]);
          return points[low].map(
            (v, i) => v + (points[high][i] - v) * fraction,
          );
        },
      ];
    }),
  );
}
