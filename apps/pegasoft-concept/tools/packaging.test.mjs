import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { duration, storyTime, progressAtTime, jetStart } from '../review/ship-jet-sequence.js';

const app = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(app,'production-inputs.json')));
test('packaged runtime assets retain approved bytes and contain no historical evidence', () => {
  const assets = manifest.files.filter(row => row.path.startsWith('public/'));
  assert.ok(assets.length > 0);
  for (const asset of assets) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(app,asset.path))).digest('hex'), asset.sha256);
    assert.doesNotMatch(asset.path,/^(?:evidence|watch)\//);
  }
});
test('every imported Three.js entry resolves to the same approved vendored implementation', () => {
  const entries = new Set();
  const modules=manifest.files.map(row=>({packaged:row.path}));
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
test('production input and chapter contracts verify without historical evidence', () => {
  execFileSync(process.execPath,['tools/verify-production.mjs','all'],{cwd:app});
});

test('lift runtime metadata retains axle definitions and geometry ownership',()=>{
 const wheel=JSON.parse(readFileSync(resolve(app,'public/assets/generation/lift-family/model-draft/wheel-ownership-motion-amended.json')));
 assert.ok(wheel.axles.front&&wheel.axles.rear,'Both axle definitions are needed during lift construction');
 assert.ok(Object.keys(wheel.wheel_triangle_ranges_by_position_count).length>0);
 const head=JSON.parse(readFileSync(resolve(app,'public/assets/generation/lift-family/model-draft/attachment-ownership.json')));
 assert.ok(Object.keys(head.spreader_triangle_ranges_by_position_count).length>0);
});
