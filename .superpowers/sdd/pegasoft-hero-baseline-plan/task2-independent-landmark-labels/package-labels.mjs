import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const sharp=createRequire(path.resolve('package.json'))('sharp');
const root='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-independent-landmark-labels';
const pin=async file=>{const b=await fs.readFile(file);return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};
const source=JSON.parse(await fs.readFile(root+'/raw-inputs.json','utf8'));
const labels=JSON.parse(await fs.readFile(root+'/labels.json','utf8'));
JSON.parse(await fs.readFile(root+'/method-error-limits.json','utf8'));
const frames=new Map(),samples=[];
for(const input of source.inputs) {
 const actual=await pin(input.path);assert.equal(actual.sha256,input.sha256);assert.equal(actual.bytes,input.bytes);
 const image=await sharp(input.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 frames.set(input.state,image);
 const state=labels.states.find(s=>s.state===input.state);assert.equal(state.rawImageSha256,input.sha256);
 for(const polygon of state.polygons) {
  assert(polygon.vertices.length>=3);
  for(const [x,y] of [...polygon.vertices,polygon.witnessPixel])assert(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<3016&&y>=0&&y<1522);
  polygon.cssVertices=polygon.vertices.map(p=>p.map(n=>n/2));
  const [x,y]=polygon.witnessPixel,i=(y*image.info.width+x)*3;
  polygon.witnessRgb=[...image.data.subarray(i,i+3)];
  samples.push({state:input.state,id:polygon.id,pixel:polygon.witnessPixel,rgb:polygon.witnessRgb});
 }
 for(const segment of state.boundarySegments)segment.locatorBoxCss=segment.locatorBox.map(n=>n/2);
 assert.equal(state.fullSilhouette,null);assert.equal(state.qualification,'blocked');
}
for(const crop of source.crops) {
 const actual=await pin(crop.path);assert.equal(actual.sha256,crop.sha256);assert.equal(actual.bytes,crop.bytes);
 const original=frames.get(crop.state),out=await sharp(crop.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const [left,top,width,height]=crop.rasterBox,scale=crop.magnification;
 assert.equal(out.info.width,width*scale);assert.equal(out.info.height,height*scale);
 for(let y=0;y<out.info.height;y++)for(let x=0;x<out.info.width;x++) {
  const oi=(y*out.info.width+x)*3,si=((top+Math.floor(y/scale))*3016+left+Math.floor(x/scale))*3;
  for(let c=0;c<3;c++)assert.equal(out.data[oi+c],original.data[si+c]);
 }
}
const scanlines=[];
for(const [state,y,left,right] of [['activation-contact',645,1435,1460],['arrival-lockup',761,1160,1230]]) {
 const {data,info}=frames.get(state);const pixels=[];
 for(let x=left;x<=right;x++){const i=(y*info.width+x)*3;pixels.push({x,rgb:[...data.subarray(i,i+3)]});}
 scanlines.push({state,rasterY:y,range:[left,right],pixels,interpretation:'Raw RGB sequence only; no threshold, semantic edge selection or alpha estimate.'});
}
const outputs={
 'labels.json':JSON.stringify(labels,null,2)+'\n',
 'raw-pixel-probes.json':JSON.stringify({samples,scanlines},null,2)+'\n',
 'verification.json':JSON.stringify({status:'pass',scope:'structural packet verification only; no semantic self-review',rawImagePins:2,exactRawCropsVerified:4,polygonCount:labels.states.reduce((n,s)=>n+s.polygons.length,0),boundaryLocatorCount:labels.states.reduce((n,s)=>n+s.boundarySegments.length,0),coordinatesInRaster:true,fullSilhouettes:null,qualification:'blocked'},null,2)+'\n'
};
if(process.argv.includes('--verify')) {
 const manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
 for(const p of [...manifest.inputs,...manifest.artifacts])assert.deepEqual(await pin(p.path),p);
 for(const [name,bytes] of Object.entries(outputs))assert.equal(await fs.readFile(root+'/'+name,'utf8'),bytes);
 console.log(JSON.stringify({status:'pass',manifestPins:manifest.inputs.length+manifest.artifacts.length,repeatableOutputs:Object.keys(outputs).length,semanticSelfReview:false,qualification:'blocked'}));
} else {
 for(const [name,bytes] of Object.entries(outputs))await fs.writeFile(root+'/'+name,bytes);
 const artifacts=await Promise.all(['prepare-raw-crops.mjs','package-labels.mjs','raw-inputs.json','labels.json','method-error-limits.json','raw-pixel-probes.json','verification.json',...source.crops.map(c=>path.basename(c.path))].map(n=>pin(root+'/'+n)));
 await fs.writeFile(root+'/manifest.json',JSON.stringify({date:'2026-10-03',status:'partial witness-label packet; contour identifiability and error calibration blocked',inputs:await Promise.all(source.inputs.map(i=>pin(i.path))),artifacts,reproductionCommand:'node '+root+'/package-labels.mjs --verify',firstExposureBlinded:false,semanticSelfReview:false},null,2)+'\n');
 console.log(JSON.stringify({status:'packaged',rawImagePins:source.inputs.length,artifacts:artifacts.length,qualification:'blocked'}));
}
