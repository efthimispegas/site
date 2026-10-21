import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCloudPaths } from '../review/cloud-motion.js';

const contract=JSON.parse(readFileSync(new URL('../public/assets/generation/cloud-family/haze-treatment.json',import.meta.url)));
const paths=createCloudPaths(contract);
const speed=(path,p,h=.0001)=>Math.hypot(...path(p+h).map((v,i)=>v-path(p)[i]))/h;
for(const [id,path] of Object.entries(paths)){
  test(id+' has steady nonzero travel through veil, bank and jet crossing',()=>{
    const speeds=Array.from({length:16000},(_,i)=>speed(path,i*.0001));
    assert.ok(speeds.every(v=>Number.isFinite(v)&&v>0));
    assert.ok(Math.max(...speeds)/Math.min(...speeds)<1.005);
    for(const p of [.37375,.4,.4225,.975,1,1.2,1.5])assert.ok(speed(path,p)>0);
  });
  test(id+' retains origin/bank, follows the veil route and continues smoothly past bank',()=>{
    assert.deepEqual(path(1),contract.moments.banks[id].center);
    const veil=contract.moments.veil[id].center;
    assert.ok(Math.min(...Array.from({length:10001},(_,i)=>Math.hypot(...path(i/10000).map((v,j)=>v-veil[j]))))<.001);
    const h=.00001,a=path(1-h),b=path(1),c=path(1+h);
    assert.ok(Math.hypot(...b.map((v,i)=>(v-a[i])-(c[i]-v)))/h<.01);
    const initial=path(.25);path(1.5);assert.deepEqual(path(.25),initial);
  });
}
