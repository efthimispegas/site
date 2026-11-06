import { readFile, writeFile } from 'node:fs/promises';
import { CITIES, CITY_CONNECTIONS } from '../src/hero-city-routes.js';
import { arcCurve } from '../src/hero-globe.js';
import { Euler, Vector3 } from '../runtime/vendor/three/build/three.module.js';

// Build-time projection of the homepage's own geography and routes. No runtime JS.
const root = new URL('../', import.meta.url);
const geography = JSON.parse(
  await readFile(
    new URL('public/assets/live/hero-globe/land-dots.json', root),
    'utf8',
  ),
);
const rotation = new Euler(0.18, -0.9, 0);
const project = (vector) => vector.clone().applyEuler(rotation);
const position = (lon, lat) => {
  const a = (lon * Math.PI) / 180,
    b = (lat * Math.PI) / 180;
  return new Vector3(
    Math.cos(b) * Math.sin(a),
    Math.sin(b),
    Math.cos(b) * Math.cos(a),
  );
};
const n = (value) => value.toFixed(3);
const dot = (point, radius, opacity) =>
  `<circle cx="${n(point.x)}" cy="${n(-point.y)}" r="${radius}" opacity="${n(opacity)}"/>`;
const dots = [];
for (let i = 0; i < geography.land_lon_lat.length; i += 2) {
  const p = project(
    position(geography.land_lon_lat[i], geography.land_lon_lat[i + 1]),
  );
  if (p.z > 0 && p.y >= 0) dots.push(dot(p, '.003', 0.32 + 0.6 * p.z));
}
const arcs = [],
  nodes = new Set();
for (const { from, to } of CITY_CONNECTIONS) {
  const a = CITIES[from],
    b = CITIES[to];
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(1, position(a.lon, a.lat).dot(position(b.lon, b.lat))),
    ),
  );
  const curve = arcCurve(
    [a.lon, a.lat],
    [b.lon, b.lat],
    Math.min(0.3, Math.max(0.035, angle * 0.22)),
  );
  let path = '',
    drawing = false;
  for (let i = 0; i <= 90; i++) {
    const p = project(curve.getPoint(i / 90));
    if (p.z <= 0) {
      drawing = false;
      continue;
    }
    path += `${drawing ? 'L' : 'M'}${n(p.x)},${n(-p.y)}`;
    drawing = true;
  }
  arcs.push(`<path d="${path}"/>`);
  nodes.add(from);
  nodes.add(to);
}
const cityDots = [...nodes]
  .map((id) =>
    project(position(CITIES[id].lon, CITIES[id].lat).multiplyScalar(1.014)),
  )
  .filter((p) => p.z > 0 && p.y >= 0)
  .map((p) => dot(p, '.007', 1));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.12 -1.06 2.24 1.06" width="1120" height="530"><defs><radialGradient id="body" cx="35%" cy="25%" r="85%"><stop stop-color="#10243b"/><stop offset="1" stop-color="#030b18"/></radialGradient><radialGradient id="halo"><stop offset=".88" stop-color="#147dff" stop-opacity="0"/><stop offset=".96" stop-color="#147dff" stop-opacity=".22"/><stop offset="1" stop-color="#147dff" stop-opacity="0"/></radialGradient></defs><circle r="1.06" fill="url(#halo)"/><circle r="1" fill="url(#body)" stroke="#147dff" stroke-opacity=".45" stroke-width=".004"/><g fill="#a5cdfb">${dots.join('')}</g><g fill="none" stroke="#268dff" stroke-width=".0034" opacity=".75">${arcs.join('')}</g><g fill="#b9e7ff">${cityDots.join('')}</g></svg>`;
await writeFile(
  new URL('public/assets/live/hero-globe/banner-upper-half.svg', root),
  svg,
);
console.log(
  `Static banner globe: ${Buffer.byteLength(svg)} bytes, ${dots.length} land dots, ${arcs.length} routes.`,
);
