import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
const root = process.cwd(),
  require = createRequire(resolve('package.json')),
  ts = require('typescript');
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
require.extensions['.ts'] = (module, path) =>
  module._compile(compile(readFileSync(path, 'utf8')), path);
const folder = resolve('apps/pegasoft/src/app/shared/hero-scene');
const loadBefore = (name) => {
  const path = resolve(folder, name),
    relative = path.slice(root.length + 1);
  const module = new Module(path);
  module.filename = path;
  module.paths = Module._nodeModulePaths(dirname(path));
  module._compile(
    compile(
      execFileSync(
        'git',
        ['show', 'f47854d412637d9003d825bdce417b742bc623fa:' + relative],
        { encoding: 'utf8' },
      ),
    ),
    path,
  );
  return module.exports;
};
const beforeDamp = loadBefore('hero-camera-model.ts').dampHeroProgress;
const beforeField = loadBefore('hero-field-model.ts').sampleHeroFieldReveal;
const { advanceHeroRenderedFrame, createHeroRenderedFrame } = require(
  resolve(folder, 'hero-frame-state.ts'),
);
const { HERO_FIELD_STATIC_VISIBILITY } = require(
  resolve(folder, 'hero-field-model.ts'),
);
function source(current, target, velocity, smooth, dt) {
  dt = Math.max(0, Math.min(0.1, dt));
  const omega = 2 / Math.max(0.0001, smooth),
    x = omega * dt,
    exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x),
    change = current - target,
    temp = (velocity + omega * change) * dt,
    value = target + (change + temp) * exp;
  return target - current > 0 === value > target
    ? { value: target, velocity: 0 }
    : { value, velocity: (velocity - omega * temp) * exp };
}
const frames = [];
for (const hz of [30, 60, 120]) {
  let previous = { value: 0, velocity: 0 },
    oracle = { value: 0, velocity: 0 },
    after = createHeroRenderedFrame();
  for (let i = 0; i < hz; i++) {
    previous = beforeDamp(previous, 0.74, 0.15, 1 / hz);
    oracle = source(oracle.value, 0.74, oracle.velocity, 0.15, 1 / hz);
    after = advanceHeroRenderedFrame(
      after,
      {
        target: 0.74,
        smoothTimeSeconds: 0.15,
        motion: 'full',
        measurementSequence: 1,
      },
      1 / hz,
    );
    frames.push({
      hz,
      index: i + 1,
      source: oracle,
      before: previous,
      after: after.rendered,
    });
    assert.ok(Math.abs(after.rendered.value - oracle.value) < 1e-12);
  }
}
assert.ok(frames.some((f) => Math.abs(f.before.value - f.source.value) > 1e-6));
const field = [0, 0.49, 0.5, 0.52, 0.54, 0.72, 0.75, 0.9].map((progress) => ({
  progress,
  before: beforeField(progress),
  after: HERO_FIELD_STATIC_VISIBILITY,
  sourceStaticVisibility: 1,
}));
assert.ok(field.some((f) => f.before !== 1));
assert.ok(field.every((f) => f.after === 1));
const first = frames.find((f) => f.hz === 60);
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      baseline: 'f47854d412637d9003d825bdce417b742bc623fa',
      sourceBundleSha256:
        '352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494',
      scope:
        'Independent source recurrence against original HEAD and current owner; before beam mismatch uses inspected original wiring, not fabricated GPU trace',
      damping: { originalPasses: false, repairedPasses: true, frames },
      oldMismatch: {
        camera: first.before.value,
        immediateBeam: 0.74,
        repairedOwner: first.after.value,
      },
      staticField: {
        originalPasses: false,
        repairedPasses: true,
        samples: field,
      },
    },
    null,
    2,
  ),
);
