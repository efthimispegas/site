import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(resolve('package.json'));
const ts = require('typescript');
const compile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
require.extensions['.ts'] = (module, path) =>
  module._compile(compile(readFileSync(path, 'utf8')), path);
const path = 'apps/pegasoft/src/app/shared/hero-scene/hero-profile.ts';
const oldText = execFileSync(
  'git',
  ['show', 'f47854d412637d9003d825bdce417b742bc623fa:' + path],
  { encoding: 'utf8' },
);
const oldModule = new Module(resolve('historical-hero-profile.cjs'));
oldModule.filename = resolve('historical-hero-profile.cjs');
oldModule._compile(compile(oldText), oldModule.filename);
const old = oldModule.exports.selectHeroRuntimeProfile;
const current = require(resolve(path)).selectHeroRuntimeProfile;
const base = {
  viewportWidth: 1440,
  viewportHeight: 900,
  devicePixelRatio: 2,
  pointerFine: true,
  reducedMotion: false,
  webglAvailable: true,
  isIosDevice: false,
};
const cases = [
  {
    id: 'recording-only-production-label',
    input: { viewportWidth: 1508, viewportHeight: 761 },
    field: 'id',
    expected: 'desktop',
  },
  {
    id: 'tablet-flow500',
    input: { viewportWidth: 1024 },
    field: 'journeyHeightSvh',
    expected: 456,
  },
  {
    id: 'desktop-narrow-smoothing',
    input: { viewportWidth: 390 },
    field: 'cameraSmoothTimeSeconds',
    expected: 0.15,
  },
  {
    id: 'desktop-coarse-pointer',
    input: { pointerFine: false },
    field: 'pointerTrail',
    expected: true,
  },
  {
    id: 'android-fine-wide-pointer',
    input: { userAgent: 'Android' },
    field: 'pointerTrail',
    expected: false,
  },
  {
    id: 'android-899-dpr',
    input: { userAgent: 'Android', viewportWidth: 899 },
    field: 'maxDpr',
    expected: 1.5,
  },
  {
    id: 'desktop-390-dpr',
    input: { viewportWidth: 390 },
    field: 'maxDpr',
    expected: 1.75,
  },
  {
    id: 'sub-one-dpr',
    input: { devicePixelRatio: 0.75 },
    field: 'maxDpr',
    expected: 0.75,
  },
];
const rows = cases.map((c) => {
  const before = old({ ...base, ...c.input })[c.field],
    after = current({ ...base, ...c.input })[c.field];
  return {
    ...c,
    before,
    after,
    beforeFailed: before !== c.expected,
    afterPassed: after === c.expected,
  };
});
const report = {
  schemaVersion: 1,
  scope:
    'Pure historical profile before/after, not historical browser evidence',
  baseRevision: 'f47854d412637d9003d825bdce417b742bc623fa',
  sourceContract: 'docs/hero-reference/repairs/s0/source/source-contract.md',
  originalSha256: createHash('sha256').update(oldText).digest('hex'),
  currentSha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  rows,
};
writeFileSync(
  new URL('./regression-results.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    cases: rows.length,
    beforeFailed: rows.filter((r) => r.beforeFailed).length,
    afterPassed: rows.filter((r) => r.afterPassed).length,
  }),
);
if (rows.some((r) => !r.beforeFailed || !r.afterPassed)) process.exitCode = 1;
