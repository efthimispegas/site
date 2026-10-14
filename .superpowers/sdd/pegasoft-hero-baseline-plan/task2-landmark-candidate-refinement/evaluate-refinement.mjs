import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as before from './extractor-before.mjs';
import * as current from './extractor-after.mjs';

const dir='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-candidate-refinement';
const prior='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor';
const sharp=createRequire(path.join(process.cwd(),'package.json'))('sharp');
const pin=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};
const ownerPins=JSON.parse(await fs.readFile(dir+'/before-pins.json'));
for(const p of ownerPins){const actual=await pin(p.snapshot??p.path);assert.equal(actual.bytes,p.bytes);assert.equal(actual.sha256,p.sha256)}
const afterPins=JSON.parse(await fs.readFile(dir+'/after-pins.json'));
for(const p of afterPins)assert.deepEqual(await pin(p.path),p);
const packet=JSON.parse(await fs.readFile(prior+'/review-packet.json'));
const inputPins=[await pin(dir+'/extractor-before.mjs'),await pin(dir+'/extractor-after.mjs')],rows=[];
for(const state of ['activation-route','activation-contact','arrival-lockup']){
 const input=packet.inputs.find(p=>p.path.endsWith('/implementation/'+state+'.png'));
 const saved=packet.artifacts.find(p=>p.path.endsWith('/'+state+'-candidate-support.png'));
 for(const p of [input,saved]){assert.deepEqual(await pin(p.path),p);inputPins.push(p)}
 const {data,info:image}=await sharp(input.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const config=current.IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[state];
 assert.deepEqual(JSON.parse(JSON.stringify(config)),JSON.parse(JSON.stringify(before.IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[state])));
 // Predicates are functions from separate modules; compare behavior on all input pixels instead.
 const oldConfig=before.IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[state];
 for(let i=0;i<data.length;i+=image.channels)assert.equal(config.predicate.test(data[i],data[i+1],data[i+2]),oldConfig.predicate.test(data[i],data[i+1],data[i+2]));
 const old=before.measureBackgroundSeparatedLandmark({data,image,dpr:2,config:oldConfig});
 const result=current.measureBackgroundSeparatedLandmark({data,image,dpr:2,config});
 const {data:savedPixels}=await sharp(saved.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let support=0,difference=0;
 for(let i=0;i<result.debug.mask.length;i++){support+=result.debug.mask[i];difference+=result.debug.mask[i]!==old.debug.mask[i]?1:0;assert.equal(old.debug.mask[i],savedPixels[3*i]===255?1:0)}
 assert.equal(difference,0,'ambiguity handling must preserve diagnostic support');
 assert.equal(result.foregroundEvidence.filledInteriorPixels,old.foregroundEvidence.filledInteriorPixels);
 assert.equal(result.qualification.status,'blocked');
 assert.equal(result.measurement.status,state==='activation-route'?'observed':'blocked');
 if(state==='activation-contact')assert(result.foregroundEvidence.contourAmbiguity.redAdjacentContourPixels>0);
 if(state==='arrival-lockup'){
  assert.equal(result.foregroundEvidence.boundarySeparation.boundarySupportPixels,29);
  assert(result.foregroundEvidence.boundarySeparation.externalContinuationPixels>0);
 }
 const maskBytes=Buffer.alloc(image.width*image.height*3);
 for(let i=0;i<result.debug.mask.length;i++)maskBytes.fill(result.debug.mask[i]?255:0,i*3,i*3+3);
 await sharp(maskBytes,{raw:{width:image.width,height:image.height,channels:3}}).png().toFile(dir+'/'+state+'-diagnostic-support.png');
 rows.push({state,input,savedSupport:saved,unchangedConfig:JSON.parse(JSON.stringify(config)),oldMeasurementStatus:old.measurement.status,newMeasurementStatus:result.measurement.status,reason:result.measurement.reason??null,support,changedSupportPixels:difference,filledInteriorPixels:result.foregroundEvidence.filledInteriorPixels,foregroundEvidence:result.foregroundEvidence,quality:result.debug.quality,qualification:result.qualification,diagnosticSupport:await pin(dir+'/'+state+'-diagnostic-support.png')});
}
// Preserve the prior 32-pin packet: it represents BEFORE input bytes, not current source bytes.
let oldPins=0;for(const p of [...packet.inputs,...packet.artifacts]){
 const replacement=ownerPins.find(v=>v.path===p.path)?.snapshot;
 const actual=await pin(replacement??p.path);assert.equal(actual.bytes,p.bytes);assert.equal(actual.sha256,p.sha256);oldPins++;
}
const evaluation={status:'candidate vetoes only; no semantic qualification or active comparison integration',method:'Unchanged classifier, ROIs, support gates and filled masks. Red contour adjacency veto; clipped connected support receives explicit unresolved separation status. No source mask is consumed by measurement.',checks:{historicalImagePins:'3/3',historicalMaskPins:'3/3',priorPacketPins:'32/32; current source/test bytes resolved through immutable BEFORE snapshots',diagnosticMaskReproduction:'3/3 pixel-identical before/after',filledSupportReproduction:'3/3 exact',sourceMaskSubstitution:false,runtimeOrCaptureChanges:false},inputPins,rows};
await fs.writeFile(dir+'/raster-evaluation.json',JSON.stringify(evaluation,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({state:r.state,measurement:r.newMeasurementStatus,support:r.support,changedSupport:r.changedSupportPixels,redAdjacentContour:r.foregroundEvidence.contourAmbiguity.redAdjacentContourPixels,boundarySupport:r.foregroundEvidence.boundarySeparation.boundarySupportPixels,externalContinuation:r.foregroundEvidence.boundarySeparation.externalContinuationPixels,qualification:r.qualification.status})),null,2));
