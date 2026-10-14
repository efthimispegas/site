import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {measureBackgroundSeparatedLandmark, measureLandmarkFeature, IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE as configs} from '../../../../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';

// Run from the workspace root. Read only implementation rasters/support, never source masks.
const dir='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/landmarks';
const old='.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor';
const sharp=createRequire(path.join(process.cwd(),'package.json'))('sharp');
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:sha(b)}};
if(process.argv.includes('--verify')){
 const runs=[];
 for(let attempt=0;attempt<2;attempt++){
  const execution=spawnSync(process.execPath,[dir+'/diagnose-contours.mjs'],{cwd:process.cwd(),encoding:'utf8'});
  assert.equal(execution.status,0,execution.stderr);const manifest=JSON.parse(await fs.readFile(dir+'/manifest.json'));
  for(const p of [...manifest.inputPins,...manifest.artifacts])assert.deepEqual(await pin(p.path),p);
  runs.push({manifest:await pin(dir+'/manifest.json'),artifacts:manifest.artifacts});
 }
 assert.deepEqual(runs[0],runs[1]);
 const verification={status:'pass',inputPinsVerified:9,artifactPinsVerified:runs[1].artifacts.length,byteIdenticalReruns:2,baseManifest:runs[1].manifest,artifactHashes:runs[1].artifacts,checks:['3/3 historical masks reproduced pixel-for-pixel','3/3 filled-interior counts agree','3/3 uncertainty counts agree','2 runs have identical artifact and base-manifest hashes'],qualification:'diagnostics only; no semantic or contour-error qualification'};
 await fs.writeFile(dir+'/verification.json',JSON.stringify(verification,null,2)+'\n');
 const manifest=JSON.parse(await fs.readFile(dir+'/manifest.json'));manifest.artifacts.push(await pin(dir+'/verification.json'));manifest.repeatability={status:'pass',byteIdenticalReruns:2,verification:dir+'/verification.json',baseManifestSha256:runs[1].manifest.sha256};
 await fs.writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({status:'pass',inputPins:9,artifacts:manifest.artifacts.length,repeatability:'2 byte-identical diagnostic runs',manifest:await pin(dir+'/manifest.json')}));
 process.exit(0);
}
const packetBytes=await fs.readFile(old+'/review-packet.json');
assert.equal(sha(packetBytes),'c80f6c1923b224cc6a709e03f64c9b3672dc3ddc04789b9f35600d6fa66b4162');
const packet=JSON.parse(packetBytes), inputPins=[await pin(old+'/review-packet.json'),await pin(old+'/independent-review.json')];
const extractorPin=packet.inputs.find(p=>p.path.endsWith('screen-structural-features.mjs'));
assert.deepEqual(await pin(extractorPin.path),extractorPin);inputPins.push(extractorPin);
const bbox=(ids,w)=>{if(!ids.length)return null;let l=Infinity,t=Infinity,r=-1,b=-1;for(const i of ids){const x=i%w,y=Math.floor(i/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}return [l,t,r-l+1,b-t+1]};
const connected=(mask,w,h)=>{const seen=new Uint8Array(mask.length), out=[];for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;const q=[i];seen[i]=1;for(let j=0;j<q.length;j++){const x=q[j]%w,y=Math.floor(q[j]/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&mask[k]&&!seen[k]){seen[k]=1;q.push(k)}}}out.push({pixels:q.length,bounds:bbox(q,w),sample:[q[0]%w,Math.floor(q[0]/w)]})}return out.sort((a,b)=>b.pixels-a.pixels)};
const crops={
 'activation-route':{left:1580,top:900,width:680,height:560},
 'activation-contact':{left:1360,top:590,width:270,height:240},
 'arrival-lockup':{left:1020,top:420,width:740,height:600},
};
const rows=[];
for(const state of Object.keys(crops)){
 const input=packet.inputs.find(p=>p.path.endsWith('/implementation/'+state+'.png'));
 const saved=packet.artifacts.find(p=>p.path.endsWith('/'+state+'-candidate-support.png'));
 for(const p of [input,saved]){assert.deepEqual(await pin(p.path),p);inputPins.push(p)}
 const {data,info:image}=await sharp(input.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {data:binary}=await sharp(saved.path).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=image,config=configs[state];
 const result=measureBackgroundSeparatedLandmark({data,image,dpr:2,config}),mask=result.debug.mask;
 for(let i=0;i<mask.length;i++)assert.equal(mask[i],binary[3*i]===255?1:0);
 const model=result.backgroundModel;
 const distance=(rgb)=>Math.sqrt(rgb.reduce((s,v,c)=>s+Math.max(model.minimum[c]-v,0,v-model.maximum[c])**2,0));
 const rgb=i=>Array.from(data.subarray(i*c,i*c+3));
 const pre=measureLandmarkFeature({data,image,dpr:2,config:{...config,predicate:{...config.predicate,test:(...v)=>config.predicate.test(...v)&&distance(v)>4}}}).debug.mask;
 const fill=new Uint8Array(mask.length),edge=new Uint8Array(mask.length),uncertain=new Uint8Array(mask.length);
 let support=0,preSupport=0,filled=0,edgeCount=0;
 for(let i=0;i<mask.length;i++){
  if(pre[i]){assert(mask[i]);preSupport++}if(mask[i])support++;
  if(mask[i]&&!pre[i]){fill[i]=1;filled++}
  if(!mask[i])continue;const x=i%w,y=Math.floor(i/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx<0||x+dx>=w||y+dy<0||y+dy>=h||!mask[(y+dy)*w+x+dx])edge[i]=1;
  if(edge[i])edgeCount++;
 }
 assert.equal(filled,result.foregroundEvidence.filledInteriorPixels);
 const roi=result.measurement.method?.roiRasterPixels??[Math.round(config.roi[0]*w),Math.round(config.roi[1]*h),Math.round(config.roi[2]*w),Math.round(config.roi[3]*h)];
 // Chebyshev distance to selected contour, on the unchanged ROI. This locates policy uncertainty; it is not an accuracy bound.
 const distances=new Int16Array(mask.length).fill(-1),queue=[];
 for(let i=0;i<edge.length;i++)if(edge[i]){distances[i]=0;queue.push(i)}
 for(let j=0;j<queue.length;j++){const i=queue[j],x=i%w,y=Math.floor(i/w);if(distances[i]>=8)continue;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx>=roi[0]&&xx<roi[0]+roi[2]&&yy>=roi[1]&&yy<roi[1]+roi[3]&&distances[k]<0){distances[k]=distances[i]+1;queue.push(k)}}}
 const uncertainty={roiTotal:0,selected:0,unselected:0,distanceToSelectedContour:{'0':0,'1':0,'2':0,'3-4':0,'5-8':0,'greater-than-8-or-no-contour':0},nearContourBounds:null};const near=[];
 for(let y=roi[1];y<roi[1]+roi[3];y++)for(let x=roi[0];x<roi[0]+roi[2];x++){const i=y*w+x,v=rgb(i),d=distance(v);if(config.predicate.test(...v)&&d>0&&d<=4){uncertain[i]=1;uncertainty.roiTotal++;uncertainty[mask[i]?'selected':'unselected']++;const n=distances[i],key=n<0?'greater-than-8-or-no-contour':n<=2?String(n):n<=4?'3-4':'5-8';uncertainty.distanceToSelectedContour[key]++;if(n>=0)near.push(i)}}
 uncertainty.nearContourBounds=bbox(near,w);assert.equal(uncertainty.roiTotal,result.foregroundEvidence.uncertaintyBandPixels);
 const box=crops[state],colored=Buffer.alloc(box.width*box.height*3);for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++){const i=(box.top+y)*w+box.left+x,o=(y*box.width+x)*3,v=rgb(i);let a=v;if(mask[i])a=v.map(k=>Math.round(k*.55+255*.45));if(fill[i])a=[255,194,0];if(uncertain[i]&&distances[i]>=0)a=[0,220,255];if(edge[i])a=[255,0,180];if(box.left+x===roi[0])a=[0,0,255];for(let c=0;c<3;c++)colored[o+c]=a[c]}
 await sharp(input.path).extract(box).png().toFile(dir+'/'+state+'-inspection.png');
 await sharp(colored,{raw:{width:box.width,height:box.height,channels:3}}).png().toFile(dir+'/'+state+'-contour-accounting.png');
 if(state.startsWith('activation-')){
  const ids=[];for(let i=0;i<mask.length;i++)if(mask[i])ids.push(i);
  const [sx,sy,sw,sh]=bbox(ids,w),margin=12,fullBox={left:Math.max(0,sx-margin),top:Math.max(0,sy-margin),width:Math.min(w,sx+sw+margin)-Math.max(0,sx-margin),height:Math.min(h,sy+sh+margin)-Math.max(0,sy-margin)};
  const full=Buffer.alloc(fullBox.width*fullBox.height*3);
  for(let y=0;y<fullBox.height;y++)for(let x=0;x<fullBox.width;x++){const i=(fullBox.top+y)*w+fullBox.left+x,o=(y*fullBox.width+x)*3;let a=rgb(i);if(fill[i])a=[255,194,0];if(edge[i])a=[255,0,180];for(let c=0;c<3;c++)full[o+c]=a[c]}
  await sharp(full,{raw:{width:fullBox.width,height:fullBox.height,channels:3}}).png().toFile(dir+'/'+state+'-filled-interiors.png');
 }
 const record={state,image:{width:w,height:h,dpr:2},roiRasterPixels:roi,unchangedConfig:JSON.parse(JSON.stringify(config)),backgroundModel:model,support,preFillSupport:preSupport,filledInteriorPixels:filled,filledComponents:connected(fill,w,h),selectedContourPixels:edgeCount,uncertainty,qualification:'blocked; diagnostic raster accounting only',crop:{...box,legend:{magenta:'8-neighbor selected contour',yellow:'enclosed support added by fill',cyan:'candidate RGB uncertainty within 8 raster pixels of selected contour',blue:'unchanged ROI left boundary',lightened:'selected support'}}};
 const sample=(x,y)=>({pixel:[x,y],rgb:rgb(y*w+x),selected:Boolean(mask[y*w+x]),preFillSelected:Boolean(pre[y*w+x]),filled:Boolean(fill[y*w+x]),candidateColorDistance:distance(rgb(y*w+x)),contourDistanceUpTo8:distances[y*w+x]});
 if(state==='activation-contact'){
  record.railJunctionRows=[634,659,665,686].map(y=>({y,samples:Array.from({length:31},(_,n)=>sample(1425+n,y))}));
 record.reviewWitness=sample(1438,634);
  const start=634*w+1438,seen=new Int32Array(mask.length).fill(-1),q=[start];seen[start]=start;let end=null;
  for(let j=0;j<q.length;j++){const i=q[j],x=i%w,y=Math.floor(i/w);if(x>=1445){end=i;break}for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&mask[k]&&seen[k]<0){seen[k]=i;q.push(k)}}}
  assert(end!==null);const pixels=[];for(let i=end;;i=seen[i]){pixels.push([i%w,Math.floor(i/w)]);if(i===start)break}
  record.witnessToBuildingSideConnection={method:'shortest 8-neighbor selected-support path from reviewed fringe witness to x>=1445; endpoint semantic role remains visually interpreted',steps:pixels.length-1,pixels:pixels.reverse()};
 }
 if(state==='arrival-lockup'){
  record.feedShaftRows=[740,750,760,770,780].map(y=>({y,samples:Array.from({length:71},(_,n)=>sample(1165+n,y))}));
  record.leftBoundarySupport=[];for(let y=roi[1];y<roi[1]+roi[3];y++)if(mask[y*w+roi[0]])record.leftBoundarySupport.push(y);
  record.rowSelectedIntervals=[740,750,760,770,780].map(y=>{const intervals=[];let start=null;for(let x=1165;x<=1250;x++){if(mask[y*w+x]&&start===null)start=x;if(start!==null&&(!mask[y*w+x]||x===1250)){intervals.push([start,mask[y*w+x]?x:x-1]);start=null}}return {y,intervals}});
  record.brightEndpointOutsideRoi=[sample(1188,760),sample(1190,760),sample(1193,760),sample(1194,760),sample(1218,760),sample(1220,760)];
 }
 rows.push(record);
}
const result={scope:'Pinned historical implementation rasters only; no source-mask consumption, capture, build, runtime edits or gate changes',methodLimits:['RGB four-unit exclusion is fixed candidate policy, not calibrated contour error.','An 8-neighbor selected-contour map is the candidate contour, not ground truth.','Filled-component accounting establishes exactly which pixels were added, not their semantic correctness.','Rows/crops expose feed and rail junctions; semantic interpretation requires independent review.'],inputPins,rows};
await fs.writeFile(dir+'/contour-evidence.json',JSON.stringify(result,null,2)+'\n');
const summary={date:'2026-10-02',status:'bounded diagnostic checkpoint; all semantic and contour-error qualification remains blocked',findings:[
 {state:'activation-contact',finding:'Reviewed neutral rail fringe (1438,634), RGB [213,201,213], is selected before hole fill. Its distance from the measured background interval is 28.0357, far beyond the four-unit exclusion band. The saved row has a six-pixel unselected gap x1439..1444 before building support begins at x1445; selected-support connectivity reaches the building by another route.',evidence:'contour-evidence.json#rows[1].railJunctionRows and witnessToBuildingSideConnection',nextImplementation:'Add a conservative connected-contaminant ambiguity gate using independently identified rail-edge evidence; test this pinned witness and preserved building edge. Do not solve by increasing the RGB exclusion distance or cutting a hardcoded crop.'},
 {state:'arrival-lockup',finding:'The selected ROI edge x1194 has 29 selected pixels y747..775. At y760, the bright rounded endpoint RGB [244,253,255] continues outside the ROI at x1190..1193; it is selected inside x1194..1218. A color transition at x1219 leads to the flat gray shaft RGB [219,224,226] at x1220. The mask merges both. This boundary contact does not establish that the gray arrow shaft extends outside the ROI.',evidence:'contour-evidence.json#rows[2].feedShaftRows and brightEndpointOutsideRoi; arrival-lockup-contour-accounting.png',nextImplementation:'Implement candidate-only connected feed-endpoint exclusion with explicit ambiguity rejection, keeping the current ROI/support gates. Validate endpoint exclusion and shaft retention separately on the pinned raster before seeking independent semantic review.'},
 {state:'all-three',finding:'ROI-wide RGB uncertainty is not a contour-error estimate: only 584/6995 route, 716/8976 contact and 342/605 arrival uncertain pixels are within eight raster pixels of the selected contour. The remaining counts are far from that contour. These distances describe candidate support, not a conservative error bound.',nextImplementation:'Retain edge-located uncertainty counts and require independently labeled implementation-only inner/outer edge envelopes to calibrate missed/extra support before qualification.'},
 {state:'activation-interiors',finding:'Exact reproduced fill adds 3878 route pixels in 13 components and 3943 contact pixels in 13 components. Largest components are 1597 and 1615 pixels; 12 smaller enclosed components account for 2281 and 2328 pixels. Arrival adds zero. Filled-interior overlays expose the logo/window pattern for independent semantic inspection; no interior touches the reported rail witness.',nextImplementation:'Keep enclosed fill and its accounting; validate the 13 component roles independently together with corrected outer contours.'}
],checks:{pinnedInputs:'9/9 verified; three image and three saved mask pins plus extractor/review/review-packet',candidateMaskReproduction:'3/3 pixel-identical',filledCounts:'3/3 exact agreement with prior packet',uncertaintyCounts:'3/3 exact agreement with prior packet',roiAndSupportGates:'unchanged',sourceMasksConsumed:false,currentCaptureQualification:false,activeCandidateIntegration:false},artifacts:['contour-evidence.json','activation-contact-inspection.png','activation-contact-contour-accounting.png','activation-contact-filled-interiors.png','arrival-lockup-inspection.png','arrival-lockup-contour-accounting.png','activation-route-inspection.png','activation-route-contour-accounting.png','activation-route-filled-interiors.png'],stoppingCondition:'Evidence checkpoint produced; no shared implementation changes or independent semantic acceptance.'};
await fs.writeFile(dir+'/outcome.json',JSON.stringify(summary,null,2)+'\n');
const names=['diagnose-contours.mjs','contour-evidence.json','outcome.json',...summary.artifacts.filter(p=>p.endsWith('.png'))].sort();
await fs.writeFile(dir+'/manifest.json',JSON.stringify({scope:summary.status,inputPins,artifacts:await Promise.all(names.map(n=>pin(dir+'/'+n))),repeatabilityMethod:'Run diagnose-contours.mjs twice from workspace root and compare every listed artifact hash plus manifest bytes; verification result is stored separately.'},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({state:r.state,support:r.support,preFill:r.preFillSupport,filled:r.filledInteriorPixels,filledComponents:r.filledComponents.length,edge:r.selectedContourPixels,uncertainty:r.uncertainty,leftBoundary:r.leftBoundarySupport?.[0]!==undefined?[r.leftBoundarySupport[0],r.leftBoundarySupport.at(-1),r.leftBoundarySupport.length]:null})),null,2));
