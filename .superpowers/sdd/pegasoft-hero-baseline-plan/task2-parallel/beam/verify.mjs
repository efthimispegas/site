import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const dir='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/beam';
const hash=b=>createHash('sha256').update(b).digest('hex');
const m=JSON.parse(await readFile(`${dir}/manifest.json`));
for(const p of [...m.inputs,...m.artifacts]){
  const b=await readFile(p.path);
  assert.equal(hash(b),p.sha256,`Changed pin: ${p.path}`);
  assert.equal(b.length,p.bytes);
}
const outputs=m.artifacts.filter(p=>p.reproducedByDiagnostic);
execFileSync(process.execPath,[`${dir}/diagnose.mjs`],{stdio:'pipe'});
for(const p of outputs)assert.equal(hash(await readFile(p.path)),p.sha256,`Diagnostic not repeatable: ${p.path}`);
console.log(JSON.stringify({status:'pass',inputPins:m.inputs.length,artifactPins:m.artifacts.length,reproducedArtifacts:outputs.length,command:`node ${dir}/verify.mjs`},null,2));
