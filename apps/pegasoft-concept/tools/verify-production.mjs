import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { REFERENCE_LOADER_PRESET } from '../src/loader-reference-preset.js';
import {
  duration,
  storyTime,
  progressAtTime,
  jetStart,
} from '../runtime/ship-jet-sequence.js';
const app = resolve(import.meta.dirname, '..'),
  file = resolve(app, 'production-inputs.json');
const sha = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(app, path)))
    .digest('hex');
function files(directory) {
  return readdirSync(resolve(app, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = directory + '/' + entry.name;
      return entry.isDirectory() ? files(path) : [path];
    },
  );
}
const inputs = () =>
  [
    ...files('src'),
    ...files('runtime').filter(
      (p) => /\.(?:js|css)$/.test(p) && !p.includes('site-audit.'),
    ),
    ...files('public'),
    'index.html',
    'package.json',
    'project.json',
    'vite.config.js',
    'eslint.config.mjs',
    '.env.example',
    ...[
      'check-source.mjs',
      'verify-production.mjs',
      'localized-pages.mjs',
      'deployment-config.mjs',
      'static-compression.mjs',
      'packaging.test.mjs',
      'cloud-motion.test.mjs',
      'lifecycle.test.mjs',
      'transport-timeline.test.mjs',
      'counter.test.mjs',
      'localization.test.mjs',
    ].map((p) => 'tools/' + p),
  ].sort();
if (process.argv.includes('--record')) {
  const data = {
    schemaVersion: 1,
    threeRevision: '182',
    loaderPreset: REFERENCE_LOADER_PRESET,
    chapterClock: { duration, jetStart },
    files: inputs().map((path) => ({ path, sha256: sha(path) })),
  };
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('Recorded production inputs; comparison evidence remains local.');
} else {
  const manifest = JSON.parse(readFileSync(file));
  assert.deepEqual(
    manifest.files.map((r) => r.path),
    inputs(),
    'Production input inventory drift',
  );
  for (const row of manifest.files) {
    assert.ok(!/(?:^|\/)(?:artifacts|evidence|watch)\//.test(row.path));
    assert.equal(
      sha(row.path),
      row.sha256,
      'Production input drift: ' + row.path,
    );
  }
  assert.deepEqual(
    REFERENCE_LOADER_PRESET,
    manifest.loaderPreset,
    'Approved loader preset drift',
  );
  assert.equal(manifest.threeRevision, '182');
  assert.equal(duration, 26);
  assert.equal(jetStart, 14);
  for (let i = 0; i <= 1000; i++)
    assert.ok(Math.abs(progressAtTime(storyTime(i / 1000)) - i / 1000) < 1e-12);
  // All source imports and public addresses must resolve in a clean checkout.
  for (const row of manifest.files.filter(
    (r) => /\.[cm]?js$/.test(r.path) && !r.path.startsWith('tools/'),
  )) {
    const source = readFileSync(resolve(app, row.path), 'utf8');
    for (const match of source.matchAll(
      /(?:from\s*|import\s*)['"]([^'"\n]+)['"]/g,
    )) {
      const spec = match[1].split(/[?#]/)[0];
      if (!spec.startsWith('.')) continue;
      assert.ok(
        existsSync(resolve(app, dirname(row.path), spec)),
        row.path + ' imports missing ' + spec,
      );
    }
  }
  const index = readFileSync(resolve(app, 'index.html'), 'utf8');
  for (const id of [
    'opening-stage',
    'hero',
    'stage',
    'ship-copy',
    'trust-title',
    'insights-title',
    'faq',
    'contact',
  ])
    assert.ok(index.includes('id="' + id + '"'), 'Missing chapter: ' + id);
  for (const match of index.matchAll(/(?:src|url)=["'](\/assets\/[^"']+)["']/g))
    assert.ok(
      existsSync(resolve(app, 'public' + match[1])),
      'Missing HTML asset: ' + match[1],
    );
  const registry = readFileSync(
    resolve(app, 'runtime/runtime-assets.js'),
    'utf8',
  );
  for (const match of registry.matchAll(/"assets\/([^"\n]+)"/g))
    assert.ok(
      existsSync(resolve(app, 'public/assets', match[1])),
      'Missing registered runtime asset: ' + match[1],
    );
  console.log(
    JSON.stringify({
      status: 'production_inputs_verified',
      mode: process.argv[2] || 'all',
      files: manifest.files.length,
      assets: manifest.files.filter((r) => r.path.startsWith('public/')).length,
    }),
  );
}
