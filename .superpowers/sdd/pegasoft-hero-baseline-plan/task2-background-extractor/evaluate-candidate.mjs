import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {measureBackgroundSeparatedLandmark, IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE} from '../../../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';
const sharp=createRequire(path.join(process.cwd(),'package.json'))('sharp');
const root='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor';
const audit=JSON.parse(await fs.readFile('.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-audit/checkpoint.json'));
const rows=[];const pin=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};
for(const prior of audit.rows){
 const input=await pin(prior.input.path);assert.deepEqual(input,prior.input);
 const {data,info:image}=await sharp(await fs.readFile(input.path)).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const config=IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[prior.state];
 assert.deepEqual(config.roi,prior.config.roiNormalized);
 for(const k of ['minimumSelectedPixels','maximumComponentPixels','maximumComponentWidth','maximumComponentHeight'])assert.equal(config[k],prior.config[k]);
 const r=measureBackgroundSeparatedLandmark({data,image,dpr:2,config});
 const support=r.debug.mask.reduce((a,b)=>a+b,0);
 const negatives=prior.roiCornerSamples.filter(s=>s.predicateMatches).map(s=>({...s,candidateSelected:Boolean(r.debug.mask[s.pixel[1]*image.width+s.pixel[0]])}));
 assert(negatives.every(s=>s.candidateSelected===false));
 const pixels=Buffer.alloc(image.width*image.height*3);
 for(let i=0;i<r.debug.mask.length;i++){pixels[i*3]=r.debug.mask[i]?255:0;pixels[i*3+1]=r.debug.mask[i]?255:0;pixels[i*3+2]=r.debug.mask[i]?255:0;}
 const file=root+'/'+prior.state+'-candidate-support.png';await sharp(pixels,{raw:{width:image.width,height:image.height,channels:3}}).png().toFile(file);
 rows.push({state:prior.state,input,priorSelectedPixels:prior.selectedPixels,candidateSelectedPixels:support,candidateMeasurement:r.measurement,backgroundModel:r.backgroundModel,foregroundEvidence:r.foregroundEvidence,quality:r.debug.quality,qualification:r.qualification,negativeSamples:negatives,overlay:await pin(file)});
}
await fs.writeFile(root+'/candidate-evaluation.json',JSON.stringify({status:'owner candidate diagnostic; no current comparison or independent qualification',configPolicy:'ROIs and all min/max support/geometry gates unchanged; source masks not used',rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({state:r.state,priorSupport:r.priorSelectedPixels,candidateSupport:r.candidateSelectedPixels,measurement:r.candidateMeasurement.status,reason:r.candidateMeasurement.reason??null,backgroundFraction:r.backgroundModel.dominantFraction,eligibleSubjects:r.foregroundEvidence?.eligibleSubjectCount,quality:r.quality?.status,qualification:r.qualification.status}))));
