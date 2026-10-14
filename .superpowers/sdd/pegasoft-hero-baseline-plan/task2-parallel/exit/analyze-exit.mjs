import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { JOURNEY_EXIT_BOUNDARY_CONFIG as config, measureHorizontalBoundary } from '../../task2-background-extractor/extractor-before.mjs';

const root = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/exit';
const run = 'apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6';
const reportPath = run + '/comparisons/040854b4-8609-4319-8d88-ee708c76406c/comparison-report.json';
const snapshot = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor/extractor-before.mjs';
const sharp = createRequire(path.resolve('package.json'))('sharp');
const hash = b => createHash('sha256').update(b).digest('hex');
const readJson = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const pin = async (p, expectedSha256 = null) => {
  const bytes = await fs.readFile(p);
  const sha256 = hash(bytes);
  if (expectedSha256) assert.equal(sha256, expectedSha256, 'Historical pin mismatch: ' + p);
  return { path: p, bytes: bytes.length, sha256, expectedSha256, historicalPinVerified: expectedSha256 ? true : null };
};
const report = await readJson(reportPath);
const state = report.states.find(s => s.key === 'journey-exit');
const capture = await readJson(run + '/capture-manifest.json');
const captured = capture.states.find(s => s.key === 'journey-exit');
const measurementPath = run + '/' + captured.measurement.path;
const observationPath = run + '/observations/journey-exit.json';
const measurement = await readJson(measurementPath);
const observation = await readJson(observationPath);
const anchors = await readJson('docs/hero-reference/recording-anchors.json');
const anchor = anchors.states.find(s => s.key === 'journey-exit');
const sourceStructural = await readJson('docs/hero-reference/recording-structural-bounds.json');
const sourceState = sourceStructural.states.find(s => s.key === 'journey-exit');
assert.equal(anchor.anchor.captureSha256, state.authority.referenceSha256);
const inputs = await Promise.all([
  pin(reportPath), pin(run + '/capture-manifest.json'),
  pin(state.authority.referencePath, state.authority.referenceSha256),
  pin(state.implementationPath, captured.implementation.sha256),
  pin(measurementPath, captured.measurement.sha256), pin(observationPath),
  pin(snapshot, report.generatedFrom.classifierSha256),
  pin('docs/hero-reference/recording-anchors.json'),
  pin('docs/hero-reference/recording-structural-bounds.json'),
]);

function profile(data, image) {
  const top = Math.floor(config.roi[1] * image.height);
  const bottom = Math.ceil((config.roi[1] + config.roi[3]) * image.height);
  const rows = [];
  for (let y = top + 1; y < bottom; y++) {
    let total = 0, supported = 0;
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 3;
      const previous = i - image.width * 3;
      const delta = [0,1,2].reduce((a,c) => a + Math.abs(data[i+c] - data[previous+c]), 0) / 3;
      total += delta;
      if (delta >= config.minimumPixelDelta) supported++;
    }
    const meanDelta = total / image.width;
    const rowSupportRatio = supported / image.width;
    rows.push({y, meanDelta, rowSupportRatio, score: meanDelta * rowSupportRatio});
  }
  const ranked = [...rows].sort((a,b) => b.score - a.score || a.y - b.y);
  const peak = ranked[0];
  const runnerUp = ranked.find(r => Math.abs(r.y - peak.y) > config.verticalExclusionRadius);
  const localRows = [];
  for (let x = 0; x < image.width; x++) {
    let best = {delta:-1,y:peak.y};
    for (let y = peak.y-config.localSearchRadius; y <= peak.y+config.localSearchRadius; y++) {
      const i = (y * image.width + x)*3, previous = i - image.width*3;
      const delta = [0,1,2].reduce((a,c) => a + Math.abs(data[i+c]-data[previous+c]),0)/3;
      if (delta > best.delta) best = {delta,y};
    }
    if (best.delta >= config.minimumPixelDelta) localRows.push(best.y);
  }
  const meanY = localRows.reduce((a,b)=>a+b,0)/localRows.length;
  return { rows, peak, runnerUp, dominanceRatio:peak.score/runnerUp.score,
    diagnosticMeanRasterY:meanY, diagnosticMeanCssY:meanY/2,
    localColumnSupportRatio:localRows.length/image.width,
    verticalStandardDeviation:Math.sqrt(localRows.reduce((a,y)=>a+(y-meanY)**2,0)/localRows.length),
    boundaryNeighborhood:rows.filter(r=>Math.abs(r.y-peak.y)<=3),
    adjacentTwoRowMeanDelta:peak.meanDelta+(rows.find(r=>r.y===peak.y-1)?.meanDelta??0),
    diagnosticOnly:true };
}
function samplePatch(data, image, box) {
  const values = [[],[],[]];
  for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++)for(let c=0;c<3;c++)values[c].push(data[(y*image.width+x)*3+c]);
  const medianRgb = values.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]);
  return { rasterBox:box, medianRgb, medianRgbChroma:Math.max(...medianRgb)-Math.min(...medianRgb),
    interpretation:'Manually located visible upper square interior; RGB appearance diagnostic only, not an alpha/opacity estimate or subject mask.' };
}
const frames = [];
for (const [role, p, patch] of [['source',state.authority.referencePath,[1495,494,28,28]],['implementation',state.implementationPath,[1495,525,28,28]]]) {
  const {data,info:image} = await sharp(await fs.readFile(p)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(image.width,3016); assert.equal(image.height,1522);
  const boundary = measureHorizontalBoundary({data,image,dpr:2,config});
  const diagnostic = profile(data,image);
  const rows = diagnostic.rows; delete diagnostic.rows;
  frames.push({role,path:p,raster:[image.width,image.height],classifierMeasurement:boundary.measurement,
    diagnostic, appearanceSample:samplePatch(data,image,patch),rows});
}
assert.equal(frames[0].classifierMeasurement.status,sourceState.boundary.status);
assert.deepEqual(frames[0].classifierMeasurement.bounds, sourceState.boundary.bounds);
assert.equal(frames[1].classifierMeasurement.status,measurement.structuralAccuracy.boundary.status);
assert.equal(frames[1].classifierMeasurement.reason,measurement.structuralAccuracy.boundary.reason);
const rendered = observation.after.record;
const diagnostics = {
  scope:'Historical saved-raster exit diagnostics only; no runtime changes or new captures.',
  unchangedBoundaryConfig:config,
  sourceSemantics:{anchor:anchor.anchor,journeyProgressTarget:anchor.journeyProgressTarget,screenBoundary:anchor.screenBounds.boundary,
    visualComposition:anchor.cameraPose.visualComposition,expectedVisibleContext:anchor.expectedVisibleContext.items},
  frames:frames.map(({rows,...f})=>f),
  diagnosticBoundaryDeltaCss:frames[1].diagnostic.diagnosticMeanCssY-frames[0].diagnostic.diagnosticMeanCssY,
  toleranceCss:report.structuralTolerances.sectionBoundaryBoundsCssPixels,
  telemetry:{classificationEvidence:'Requested/measurement labels and CSS values are input/state evidence, not rendered pixel acceptance.',classification:measurement.state,cssVariables:measurement.cssVariables,canvasSurface:measurement.renderSurface,
    frame: {frameId:rendered.frame.frameId,target:rendered.frame.target,rendered:rendered.frame.rendered,retreat:rendered.frame.ratios.retreat},
    arrivalReadback:{activationRatio:rendered.appliedConsumers.arrival.readback.activationRatio,clockElapsedMs:rendered.appliedConsumers.arrival.readback.clockElapsedMs,visible:rendered.appliedConsumers.arrival.readback.visible},
    wakeOpacityReadback:rendered.appliedConsumers['arrival-wake'].readback.opacity,feedOpacityReadback:rendered.appliedConsumers['arrival-feed'].readback.opacity},
  interpretation:{boundary:'Local horizontal edge is present, but its unchanged mean-delta and dominance gates fail. Diagnostic location is not eligible acceptance geometry.',
    crop:'Both saved rasters show following-section content occluding the lower arrow. Source retains a horizontal shaft and strong blue arrow at the crop; local shows mostly a pale diagonal arm. Equal lifecycle labels do not establish equal projected exit composition.',
    opacity:'Flattened RGB establishes different appearance, not the cause or effective alpha. Canvas opacity 1 and completed CSS progress do not prove whole-world opacity. Arrival activation is still 0.768 in the applied readback.',
    transition:'Local boundary contrast is split across raster rows 740 and 741 (approximately 14.362 and 16.366 mean RGB delta). The existing single-row gate requires 20. Two-row totals are diagnostic only and never substitute for this gate. The runner-up is a following-section text edge at y=1246.',
    provenance:'Source seek is an anchor coordinate. This historical packet does not qualify current code or normal forward/reverse playback.'}
};
const outcome = {status:'blocked',state:'journey-exit',scope:diagnostics.scope,
  checks:{historicalPinsVerified:inputs.filter(i=>i.historicalPinVerified).length,sourceClassifierReproduction:'pass',implementationClassifierReproduction:'pass',unchangedGates:true,newCaptures:0,sharedEdits:0},
  observed: {sourceBoundaryCss:frames[0].classifierMeasurement.bounds.cssPixels,localDiagnosticBoundaryCssY:frames[1].diagnostic.diagnosticMeanCssY,diagnosticDeltaCss:diagnostics.diagnosticBoundaryDeltaCss},
  blockers:['Local boundary classifier fails unchanged contrast/dominance requirements; no qualified local boundary bounds.',
    'Rendered arrow crop and color strength differ despite matching exit labels and DOM envelope.',
    'One flattened frame cannot establish continuous retreat/opacity or forward/reverse handoff.',
    'Historical evidence cannot qualify current capture provenance or visual acceptance.'],
  smallestNextImplementation:'Add an implementation-only boundary/crop diagnostic to the owning measurement path that exposes the existing candidate row scores and applied crop-plane/effective world-opacity readback. Preserve the current boundary gates and blocked result; verify on the two pinned rasters before any runtime geometry change.',
  capturePrerequisite:'Any verification of current runtime or continuous forward/reverse exit needs separately authorized capture inputs.'};
const csv = 'role,rasterY,meanDelta,rowSupportRatio,score\n'+frames.flatMap(f=>f.rows.map(r=>[f.role,r.y,r.meanDelta,r.rowSupportRatio,r.score].join(','))).join('\n')+'\n';
const outputs = {'diagnostics.json':JSON.stringify(diagnostics,null,2)+'\n','row-profile.csv':csv,'outcome.json':JSON.stringify(outcome,null,2)+'\n'};
if(process.argv.includes('--verify')) {
  const manifest = await readJson(root+'/manifest.json');
  for(const p of [...manifest.inputs,...manifest.artifacts]) assert.equal((await pin(p.path)).sha256,p.sha256,'Manifest mismatch: '+p.path);
  for(const [name,bytes] of Object.entries(outputs)) assert.equal(await fs.readFile(root+'/'+name,'utf8'),bytes,'Repeatability mismatch: '+name);
  console.log(JSON.stringify({status:'pass',manifestPins:manifest.inputs.length+manifest.artifacts.length,repeatableOutputs:Object.keys(outputs).length,diagnosticDeltaCss:diagnostics.diagnosticBoundaryDeltaCss}));
} else {
  await fs.mkdir(root,{recursive:true});
  for(const [name,bytes] of Object.entries(outputs))await fs.writeFile(root+'/'+name,bytes);
  const artifacts = await Promise.all(['analyze-exit.mjs',...Object.keys(outputs)].map(n=>pin(root+'/'+n)));
  await fs.writeFile(root+'/manifest.json',JSON.stringify({schemaVersion:1,status:'historical diagnostic packet; exit qualification blocked',inputs,artifacts,reproductionCommand:'node '+root+'/analyze-exit.mjs --verify',unchangedGates:true},null,2)+'\n');
  console.log(JSON.stringify(outcome));
}
