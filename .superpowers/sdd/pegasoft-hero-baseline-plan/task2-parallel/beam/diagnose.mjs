import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { measureRouteAppearanceBands, ROUTE_CONFIG_BY_STATE, IMPLEMENTATION_ROUTE_CONFIG_BY_STATE } from './classifier-snapshot.mjs';

// Run from the workspace root. Frozen input pins are checked before all work.
const dir = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/beam';
const hash = b => createHash('sha256').update(b).digest('hex');
const inputs = JSON.parse(await readFile(`${dir}/input-pins.json`));
for (const p of inputs.pins) {
  const b = await readFile(p.path);
  assert.equal(hash(b), p.sha256, `Input pin changed: ${p.path}`);
  assert.equal(b.length, p.bytes);
}
const report = JSON.parse(await readFile(inputs.reportPath));
const capture = JSON.parse(await readFile(inputs.capturePath));
const anchors = JSON.parse(await readFile(inputs.anchorsPath));
const median = a => [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results = [];
const profileRows = [];
for (const key of inputs.states) {
  const state = report.states.find(s => s.key === key);
  const historical = state.structuralAccuracy.routeCenterlineEvidence;
  const sourceAnchor = anchors.states.find(s => s.key === key).anchor;
  const localPin = capture.states.find(s => s.key === key).implementation;
  const images = [];
  for (const role of ['source','local']) {
    const file = role === 'source' ? historical.reference.artifactPath : state.implementationPath;
    const b = await readFile(file);
    assert.equal(hash(b), role === 'source' ? sourceAnchor.captureSha256 : localPin.sha256);
    const {data, info} = await sharp(b).removeAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width, 3016); assert.equal(info.height, 1522);
    const config = role === 'source' ? ROUTE_CONFIG_BY_STATE[key] : IMPLEMENTATION_ROUTE_CONFIG_BY_STATE[key] ?? ROUTE_CONFIG_BY_STATE[key];
    const bands = measureRouteAppearanceBands({data, image:info, config});
    const saved = historical.classification.appearanceBands[role === 'source' ? 'source' : 'implementation'];
    assert.deepEqual(bands, saved, `Historical bands drifted for ${key}/${role}`);
    const cornerRgb = [];
    for (const [u,v] of [[0.01,0.01],[0.99,0.01],[0.01,0.99],[0.99,0.99]]) {
      const x=Math.floor((config.roi[0]+config.roi[2]*u)*info.width);
      const y=Math.floor((config.roi[1]+config.roi[3]*v)*info.height);
      const i=(y*info.width+x)*3;
      const [r,g,b]=[...data.subarray(i,i+3)];
      cornerRgb.push({x,y,rgb:[r,g,b],broadHueSelected:config.predicate.id.includes('red') ? r-g>=10&&r-b>=10 : b-r>=10&&g-r>=5});
    }
    images.push({role,path:file,predicate:config.predicate.id,roi:config.roi,bands,cornerRgb});
    await sharp(b).resize({width:1000}).toFile(`${dir}/${key}-${role}-overview.png`);
    if (key !== 'arrival-lockup') continue;
    for (const x of [24,80]) {
      const samples=[];
      for(let y=600;y<=900;y++) {
        const rgb=[0,1,2].map(c=>median([-2,-1,0,1,2].map(dx=>data[(y*info.width+x+dx)*3+c])));
        samples.push({y,rgb});
      }
      const sideTop=samples.filter(s=>s.y<=630), sideBottom=samples.filter(s=>s.y>=870);
      const top=[0,1,2].map(c=>median(sideTop.map(s=>s.rgb[c])));
      const bottom=[0,1,2].map(c=>median(sideBottom.map(s=>s.rgb[c])));
      for(const s of samples) {
        const t=(s.y-615)/270;
        const background=top.map((v,c)=>v+(bottom[c]-v)*t);
        s.residual=s.rgb.map((v,c)=>+(v-background[c]).toFixed(6));
        s.brightExcess=+(s.residual.reduce((a,b)=>a+b,0)/3).toFixed(6);
        s.cyanExcess=+((s.residual[1]+s.residual[2])/2-s.residual[0]).toFixed(6);
        s.maxChannelResidual=Math.max(...s.residual.map(Math.abs));
        s.strictCoreSelected=config.predicate.test(...s.rgb);
      }
      const peak=samples.reduce((best,s)=>s.brightExcess>best.brightExcess?s:best,samples[0]);
      const peakIndex=samples.indexOf(peak);
      let lo=peakIndex, hi=peakIndex;
      while(lo>0&&samples[lo-1].brightExcess>=peak.brightExcess/2)lo--;
      while(hi<samples.length-1&&samples[hi+1].brightExcess>=peak.brightExcess/2)hi++;
      const noise=Math.max(...samples.filter(s=>s.y<=630||s.y>=870).map(s=>s.maxChannelResidual));
      const envelopes=[3,5,10].map(threshold=>{
        const supported=samples.filter(s=>s.maxChannelResidual>=threshold);
        const a=supported[0]?.y,b=supported.at(-1)?.y;
        return {threshold,rasterBounds:a===undefined?null:[a,b],cssSpan:a===undefined?null:(b-a+1)/2,endpointClosed:samples[0].maxChannelResidual<threshold&&samples.at(-1).maxChannelResidual<threshold};
      });
      const peakWidths=[0.5,0.8,0.9].map(fraction=>{
        let a=peakIndex,b=peakIndex;
        while(a>0&&samples[a-1].brightExcess>=peak.brightExcess*fraction)a--;
        while(b<samples.length-1&&samples[b+1].brightExcess>=peak.brightExcess*fraction)b++;
        return{fraction,rasterBounds:[samples[a].y,samples[b].y],cssSpan:(b-a+1)/2};
      });
      profileRows.push({state:key,role,x,stripWidth:5,yRange:[600,900],baselineSidebands:[[600,630],[870,900]],baseline:{top,bottom,noiseMax:noise},peak:{y:peak.y,rgb:peak.rgb,brightExcess:peak.brightExcess,strictCoreSelected:peak.strictCoreSelected},brightPeakHalfHeight:{rasterBounds:[samples[lo].y,samples[hi].y],cssSpan:(hi-lo+1)/2},brightPeakWidthSensitivity:peakWidths,residualEnvelopes:envelopes,samples});
    }
    await sharp(b).extract({left:0,top:580,width:180,height:360}).resize({width:360,kernel:'nearest'}).toFile(`${dir}/arrival-lockup-${role}-cross-section-crop.png`);
  }
  results.push({key,images,historicalReproduction:'pass'});
}
const segments=JSON.parse(await readFile(`${dir}/source-segments-snapshot.json`));
let segmentChecks=0;
for(const source of segments.sources)for(const segment of source.segments){assert.equal(hash(Buffer.from(segment.excerpt)),segment.sha256);segmentChecks++;}
const summary={schemaVersion:1,runId:capture.runId,status:'diagnostic-only-blocked',method:{profile:'Independent five-column median RGB strips; per-image linear background from remote sidebands; no source-selected masks or renderer splines.',peak:'Contiguous fractions of positive mean-RGB background residual around independently selected peak; encoded-sRGB diagnostic intensity, apparent screen profile, not physical tube radius.',envelope:'Bounding support of max absolute per-channel residual at fixed 3/5/10 digital levels; exploratory visibility envelopes, not certified bloom layers.',sectionSelection:'Two fixed interior raster x coordinates on the visually isolated horizontal left feed. Equivalent section orientation, independently evaluated y peak. Original route ROI remains unchanged.',units:'8-bit sRGB residual digital levels; CSS spans divide raster spans by accepted screenshot DPR 2.'},checks:{frozenInputPins:inputs.pins.length,historicalImagePins:results.length*2,historicalAppearanceReproductions:results.length*2,sourceExcerptHashes:segmentChecks},results,profiles:profileRows};
await writeFile(`${dir}/diagnostic.json`,JSON.stringify(summary,null,2)+'\n');
const panels=profileRows.map((p,n)=>{
  const ox=60+(n%2)*560,oy=55+Math.floor(n/2)*255;
  const line=(field,color)=>`<polyline fill="none" stroke="${color}" stroke-width="1.5" points="${p.samples.map(s=>`${ox+(s.y-600)*1.6},${oy+160-s[field]*1.25}`).join(' ')}"/>`;
  return `<text x="${ox}" y="${oy-15}">${p.role}, x=${p.x}: bright peak ${p.peak.y}; half-height ${p.brightPeakHalfHeight.cssSpan} CSS px</text><path d="M ${ox} ${oy} v 160 h 480" stroke="#999" fill="none"/>${line('brightExcess','#a43d17')}${line('cyanExcess','#006fba')}<text x="${ox}" y="${oy+190}">600</text><text x="${ox+210}" y="${oy+190}">vertical raster y</text><text x="${ox+465}" y="${oy+190}">900</text>`;
});
await writeFile(`${dir}/profiles.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="565" viewBox="0 0 1180 565"><rect width="1180" height="565" fill="white"/><g font-family="Arial,sans-serif" font-size="13" fill="#222">${panels.join('')}<text x="60" y="550">Orange: mean-RGB bright excess. Blue: cyan excess above local background. Diagnostic profiles; threshold edges remain uncalibrated.</text></g></svg>\n`);
await sharp(`${dir}/profiles.svg`).png().toFile(`${dir}/profiles.png`);
console.log(JSON.stringify({checks:summary.checks,profiles:profileRows.map(({samples,...p})=>p)},null,2));
