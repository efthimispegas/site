import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const cwd=process.cwd(), root=path.join(cwd,'.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-audit');
const sharp=createRequire(path.join(cwd,'package.json'))('sharp');
const sourcePath='apps/pegasoft-e2e/src/visual/screen-structural-features.mjs';
const source=await fs.readFile(sourcePath);
const sha=b=>createHash('sha256').update(b).digest('hex');
const snapshotPath=path.join(root,'retained-extractor-with-audit-exports.mjs');
// Preserve the implementation bytes unchanged; expose existing private helpers
// in an artifact copy only. No production code or selection rule is changed.
const suffix='\nexport { normalizedRoiToPixels, createPredicateMask, connectedComponents };\n';
await fs.writeFile(snapshotPath,Buffer.concat([source,Buffer.from(suffix)]));
const api=await import(snapshotPath);
const run='apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6';
const reportPath=run+'/comparisons/040854b4-8609-4319-8d88-ee708c76406c/comparison-report.json';
const report=JSON.parse(await fs.readFile(reportPath));const rows=[];
const pin=async p=>{const b=await fs.readFile(p);return {path:path.relative(cwd,p),bytes:b.length,sha256:sha(b)}};
for (const key of ['activation-route','activation-contact','arrival-lockup']) {
 const file=run+'/implementation/'+key+'.png';const b=await fs.readFile(file);const {data,info:image}=await sharp(b).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const config=api.IMPLEMENTATION_SEMANTIC_LANDMARK_CONFIG_BY_STATE[key];
 const roi=api.normalizedRoiToPixels(config.roi,image.width,image.height);
 const mask=api.createPredicateMask(data,image,roi,config.predicate);
 const {components,labels}=api.connectedComponents(mask,image.width,image.height,roi);
 const rejectionReasons=c=>[
  ...(c.pixels<config.minimumComponentPixels?['below minimum component pixels']:[]),
  ...(c.pixels>config.maximumComponentPixels?['above maximum component pixels']:[]),
  ...(c.bounds.width>config.maximumComponentWidth?['above maximum component width']:[]),
  ...(c.bounds.height>config.maximumComponentHeight?['above maximum component height']:[]),
  ...(c.pixels/(c.bounds.width*c.bounds.height)<config.minimumComponentFillRatio?['below minimum fill ratio']:[])
 ];
 const result=api.measureLandmarkFeature({data,image,dpr:2,config});
 const quality=api.assessChromaSelection({data,image,config,mask:result.debug.mask,bounds:result.debug.bounds});
 const historic=report.states.find(x=>x.key===key).structuralAccuracy.landmarkMaskEvidence;
 const selectedPixels=result.debug.mask.reduce((a,b)=>a+b,0);
 assert.equal(selectedPixels,historic.implementation.pixelSupport);
 assert.deepEqual(quality,historic.classification.implementation);
 const sorted=components.slice().sort((a,b)=>b.pixels-a.pixels);
 const dominant=sorted[0];const samples=[];
 for (const [name,x,y] of [['topLeft',roi.x,roi.y],['topRight',roi.x+roi.width-1,roi.y],['bottomLeft',roi.x,roi.y+roi.height-1],['bottomRight',roi.x+roi.width-1,roi.y+roi.height-1]]) {
  const idx=y*image.width+x,off=idx*image.channels;const rgb=[...data.subarray(off,off+3)];
  samples.push({name,pixel:[x,y],rgb,predicateMatches:config.predicate.test(...rgb),componentLabel:labels[idx],belongsToDominant:labels[idx]===dominant.label});
 }
 const foreground=new Uint8Array(image.width*image.height*3);
 for(let i=0;i<mask.length;i++){foreground[i*3]=result.debug.mask[i]?255:0;foreground[i*3+1]=labels[i]===dominant.label?180:0;foreground[i*3+2]=mask[i]?120:0;}
 const overlay=path.join(root,key+'-component-support.png');await sharp(foreground,{raw:{width:image.width,height:image.height,channels:3}}).png().toFile(overlay);
 rows.push({state:key,input:await pin(file),image:[image.width,image.height],roi,config:{method:config.method,predicate:{id:config.predicate.id,description:config.predicate.description},roiNormalized:config.roi,minimumSelectedPixels:config.minimumSelectedPixels,maximumComponentPixels:config.maximumComponentPixels,maximumComponentWidth:config.maximumComponentWidth,maximumComponentHeight:config.maximumComponentHeight},totalComponents:components.length,totalPredicatePixels:mask.reduce((a,b)=>a+b,0),dominantPredicateComponent:{...dominant,rejectionReasons:rejectionReasons(dominant)},largestComponents:sorted.slice(0,8).map(c=>({...c,rejectionReasons:rejectionReasons(c)})),roiCornerSamples:samples,selectedPixels,measurementStatus:result.measurement.status,quality,historicalReproduction:'exact selected support and quality agreement',overlay:await pin(overlay),sourceMask:historic.method.sourceSemanticMask,sourceArtifact:await pin(historic.reference.artifactPath)});
}
const out={date:'2026-10-01',status:'historical packet diagnostic audit; no current-provenance or silhouette qualification',sourceExtractor:await pin(sourcePath),snapshot:{path:path.relative(cwd,snapshotPath),originalPrefixBytes:source.length,originalPrefixSha256:sha(source),onlyAppendedCode:suffix},historicalReport:await pin(reportPath),rows,overlayLegend:{red:'selected eligible component',green:'dominant raw predicate component rejected by geometry gates',blue:'all raw predicate support inside unchanged ROI',black:'outside predicate/ROI'},ruling:'Boundary contact by a tiny selected residual is not proof that the intended landmark is clipped. Raw support admits pale background at ROI corners; dominant components reach ROI extent and fail existing size gates. Do not widen ROI, loosen gates, borrow source masks, or convert this ambiguous support to geometry failure/pass.',nextAction:'Specify an independently justified implementation silhouette extractor that excludes background and binds the intended building/arrow role; validate it against background-admission and neighboring-object challenges before independent qualification.',runtimeEdits:false,newCaptures:0};
await fs.writeFile(path.join(root,'checkpoint.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({state:r.state,totalPredicatePixels:r.totalPredicatePixels,dominantPixels:r.dominantPredicateComponent.pixels,dominantBounds:r.dominantPredicateComponent.bounds,dominantRejections:r.dominantPredicateComponent.rejectionReasons,selected:r.selectedPixels,cornerPredicateMatches:r.roiCornerSamples.filter(x=>x.predicateMatches).length,history:r.historicalReproduction}))));
