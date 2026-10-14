import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { duration, storyTime, progressAtTime, jetStart } from '../review/ship-jet-sequence.js';

const app = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(app,'baseline-manifest.json')));
test('packaged runtime assets retain approved bytes and contain no historical evidence', () => {
  const assets = manifest.sources.filter(row => row.packaged.startsWith('public/'));
  assert.ok(assets.length > 0);
  for (const asset of assets) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(app,asset.packaged))).digest('hex'), asset.sourceSha256);
    assert.doesNotMatch(asset.source,/^(?:evidence|watch)\//);
  }
});
test('every imported Three.js entry resolves to the same approved vendored implementation', () => {
  const entries = new Set();
  const refactor=JSON.parse(readFileSync(resolve(app,'controller-refactor-manifest.json')));
  const transport=JSON.parse(readFileSync(resolve(app,'transport-integration-manifest.json')));
  const modules=[...manifest.sources,...refactor.addedFiles.map(row=>({packaged:row.path})),...transport.addedFiles.map(row=>({packaged:row.path}))];
  for (const row of modules.filter(row => /\.[cm]?js$/.test(row.packaged))) {
    const text = readFileSync(resolve(app,row.packaged),'utf8');
    for (const match of text.matchAll(/from\s*['"]([^'"]+)['"]/g)) {
      assert.notEqual(match[1],'three');
      if (match[1].includes('three.module.js')) entries.add(resolve(app,dirname(row.packaged),match[1]));
    }
  }
  assert.deepEqual([...entries],[resolve(app,'review/vendor/three/build/three.module.js')]);
});
test('approved chapter clocks retain their duration, overlap and reversible mapping', () => {
  assert.equal(duration,26); assert.equal(jetStart,14);
  for (let i=0;i<=1000;i++) assert.ok(Math.abs(progressAtTime(storyTime(i/1000))-i/1000)<1e-12);
});
test('frozen inputs and explicitly commissioned runtime amendments remain verified', () => {
  execFileSync(process.execPath,['tools/package-reviewed-slice.mjs','--check'],{cwd:app});
});
