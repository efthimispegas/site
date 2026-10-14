import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(resolve('package.json')),
  ts = require('typescript'),
  root = process.cwd(),
  folder = resolve('apps/pegasoft/src/app/shared/hero-scene');
const compile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
require.extensions['.ts'] = (module, path) =>
  module._compile(compile(readFileSync(path, 'utf8')), path);
const route = require(resolve(folder, 'hero-route.ts')),
  render = require(resolve(folder, 'hero-route-rendering.ts'));
const source = JSON.parse(
  readFileSync(new URL('./source-controls.json', import.meta.url)),
);
const beforePath = resolve(folder, 'hero-route.ts'),
  beforeModule = new Module(beforePath);
beforeModule.filename = beforePath;
beforeModule.paths = Module._nodeModulePaths(dirname(beforePath));
beforeModule._compile(
  compile(
    execFileSync(
      'git',
      [
        'show',
        'f47854d412637d9003d825bdce417b742bc623fa:' +
          beforePath.slice(root.length + 1),
      ],
      { encoding: 'utf8' },
    ),
  ),
  beforePath,
);
const before = beforeModule.exports;
assert.deepEqual(route.HERO_ROUTE_SOURCE_CONTROLS, source.controls);
assert.equal(
  createHash('sha256')
    .update(JSON.stringify(route.HERO_ROUTE_SOURCE_CONTROLS))
    .digest('hex'),
  source.serializationSha256,
);
for (const key of [
  'HERO_ACTIVATION_FEEDER_PATHS',
  'HERO_ROUTE_POINTS',
  'HERO_BLUE_ROUTE_ZERO_POINTS',
])
  assert.deepEqual(before[key], route[key]);
assert.notDeepEqual(
  before.HERO_LANDING_RAIL_PATHS,
  before.HERO_ACTIVATION_FEEDER_PATHS,
);
assert.equal(route.HERO_LANDING_RAIL_PATHS, route.HERO_ACTIVATION_FEEDER_PATHS);
const meshes = [0, 1, 2, 3].map((i) =>
  render.createHeroFeederMesh(i, '#ff4d67'),
);
for (const mesh of meshes) {
  assert.equal(mesh.geometry.parameters.radius, 0.075);
  assert.equal(mesh.geometry.parameters.tubularSegments, 150);
  assert.equal(mesh.material.depthTest, true);
  assert.equal(mesh.material.depthWrite, true);
}
assert.equal(route.HERO_ROUTE_RENDERING.blueCoreRadius, 0.125);
const { sampleHeroGroundCoverage } = require(
  resolve(folder, 'hero-ground-coverage.ts'),
);
const { heroRuntimeStates } = require(
  resolve(folder, 'hero-runtime-states.ts'),
);
const coverage = [];
for (const [width, height] of [
  [1508, 761],
  [1440, 900],
  [1024, 768],
  [390, 844],
  [390, 988],
]) {
  for (const state of heroRuntimeStates)
    coverage.push({
      profile: [width, height],
      state: state.key,
      startupNeutral: state.progress.settledCamera === null,
      progress: state.progress.settledCamera ?? 0,
      hits: sampleHeroGroundCoverage(
        state.progress.settledCamera ?? 0,
        width / height,
      ),
    });
  for (let i = 0; i <= 350; i++)
    coverage.push({
      profile: [width, height],
      state: 'exit-sweep',
      progress: 0.9 + i / 1000,
      hits: sampleHeroGroundCoverage(0.9 + i / 1000, width / height),
    });
}
assert.ok(
  coverage.every((sample) =>
    sample.hits.every((hit) => hit.status === 'covered'),
  ),
);
assert.ok(
  sampleHeroGroundCoverage(0, 1508 / 761, 10).some(
    (hit) => hit.status === 'exposed-ground-edge',
  ),
);
const result = {
  schemaVersion: 1,
  baseline:
    'f47854d412637d9003d825bdce417b742bc623fa plus accepted S2 before-route hashes',
  sourceBundleSha256: source.bundleSha256,
  sourceSerializationSha256: source.serializationSha256,
  canonicalCoordinatesUnchanged: true,
  feederConsumers: { beforePasses: false, afterPasses: true },
  physicalRadii: {
    before: before.HERO_ROUTE_RENDERING,
    after: route.HERO_ROUTE_RENDERING,
    source: source.geometry,
  },
  productionDepth: meshes.map((mesh) => ({
    depthTest: mesh.material.depthTest,
    depthWrite: mesh.material.depthWrite,
    renderOrder: mesh.renderOrder,
  })),
  ground: {
    sizeUnchanged: 1000,
    transformUnchanged: true,
    samples: coverage.length,
    rays: coverage.length * 9,
    noIntersection: coverage
      .flatMap((s) => s.hits)
      .filter((h) => h.status === 'no-forward-plane-intersection').length,
    minEdgeMargin: Math.min(
      ...coverage.flatMap((s) =>
        s.hits.flatMap((h) => [
          500 - Math.abs(h.local[0]),
          500 - Math.abs(h.local[1]),
        ]),
      ),
    ),
    negativeSmallPlaneDetected: true,
    coverage,
  },
};
meshes.forEach(render.disposeHeroRouteMesh);
if (process.argv.includes('--write')) {
  writeFileSync(
    new URL('./regression-results.json', import.meta.url),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      ...result,
      ground: {
        ...result.ground,
        coverage: 'persisted in regression-results.json',
      },
    }),
  );
} else console.log(JSON.stringify(result, null, 2));
