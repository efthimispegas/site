import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const sharp=createRequire(path.resolve('package.json'))('sharp');
const root='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-independent-landmark-labels';
const run='apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6';
const manifest=JSON.parse(await fs.readFile(run+'/capture-manifest.json','utf8'));
const inputs=[];
for(const state of ['activation-contact','arrival-lockup']) {
 const expected=manifest.states.find(s=>s.key===state).implementation;
 const file=run+'/'+expected.path, bytes=await fs.readFile(file);
 const sha256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,expected.sha256);assert.equal(bytes.length,expected.bytes);
 const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,3016);assert.equal(metadata.height,1522);
 inputs.push({state,path:file,bytes:bytes.length,sha256,historicalManifestPinVerified:true,raster:[3016,1522],cssViewport:[1508,761],screenshotDpr:2});
}
const crops=[
 {state:'activation-contact',name:'contact-rail-junction',rasterBox:[1405,600,65,120],magnification:6},
 {state:'activation-contact',name:'contact-subject',rasterBox:[1320,515,570,555],magnification:1},
 {state:'arrival-lockup',name:'arrival-feed-shaft-junction',rasterBox:[1140,710,200,120],magnification:4},
 {state:'arrival-lockup',name:'arrival-subject',rasterBox:[1170,510,395,505],magnification:2}
];
await fs.mkdir(root,{recursive:true});
for(const crop of crops) {
 const input=inputs.find(i=>i.state===crop.state),[left,top,width,height]=crop.rasterBox;
 const bytes=await sharp(input.path).extract({left,top,width,height}).resize(width*crop.magnification,height*crop.magnification,{kernel:'nearest'}).png().toBuffer();
 const output=root+'/'+crop.name+'.png';await fs.writeFile(output,bytes);
 crop.path=output;crop.bytes=bytes.length;crop.sha256=createHash('sha256').update(bytes).digest('hex');
 crop.method='Exact raster extraction followed by integer nearest-neighbor magnification; no interpolation, color alteration, semantic segmentation or overlay.';
}
await fs.writeFile(root+'/raw-inputs.json',JSON.stringify({date:'2026-10-03',inputs,crops},null,2)+'\n');
console.log(JSON.stringify({historicalPinsVerified:inputs.length,cropsWritten:crops.length}));
