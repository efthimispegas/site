import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { measureBeamCrossSectionDiagnostic } from './snapshots/screen-profile-diagnostics.mjs';

const root = '.superpowers/sdd/pegasoft-hero-baseline-plan/task2-beam-full-route-qualification';
const hash = b => createHash('sha256').update(b).digest('hex');
const json = async p => JSON.parse(await readFile(p));
const inputPins = await json(`${root}/input-pins.json`);
for (const p of inputPins) {
  const b = await readFile(p.path);
  assert.equal(hash(b), p.sha256, `Input changed: ${p.path}`);
  assert.equal(b.length, p.bytes);
}
const frames = await json(`${root}/frames.json`);
const labelled = await json(`${root}/labels.json`);
const anchors = await json('docs/hero-reference/recording-anchors.json');
const capture = await json('apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6/capture-manifest.json');
const outputs = {}, results = [];
function residualComponents(samples, threshold) {
  const components = [];
  let current = null;
  for (const s of samples) {
    if (s.maxChannelResidual >= threshold) {
      if (!current) {
        current = { rasterBounds: [s.coordinate, s.coordinate], maximumResidual: 0,
          maximumMeanRgbExcess: -Infinity, minimumMeanRgbExcess: Infinity };
        components.push(current);
      }
      current.rasterBounds[1] = s.coordinate;
      current.maximumResidual = Math.max(current.maximumResidual, s.maxChannelResidual);
      current.maximumMeanRgbExcess = Math.max(current.maximumMeanRgbExcess, s.brightExcess);
      current.minimumMeanRgbExcess = Math.min(current.minimumMeanRgbExcess, s.brightExcess);
    } else current = null;
  }
  return { threshold, components };
}
for (const f of frames) {
  const raw = await readFile(f.path);
  assert.equal(hash(raw), f.sha256);
  const historicalSha = f.role === 'source'
    ? anchors.states.find(s => s.key === f.state).anchor.captureSha256
    : capture.states.find(s => s.key === f.state).implementation.sha256;
  assert.equal(f.sha256, historicalSha, 'Historical image authority pin changed');
  const { data, info: image } = await sharp(raw).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([image.width, image.height], [3016, 1522]);
  const theseLabels = labelled.labels.filter(l => l.state === f.state && l.role === f.role);
  for (const label of theseLabels) {
    const diagnostic = measureBeamCrossSectionDiagnostic({ data, image, dpr: 2,
      section: label.section, peakFractions: [0.5, 0.8, 0.9],
      residualThresholds: [3, 5, 10], maximumSidebandNoise: 3, minimumPeakExcess: 5 });
    assert.equal(diagnostic.qualification.status, 'blocked');
    const red = diagnostic.samples.reduce((best, s) =>
      !best || s.rgb[0] - s.rgb[1] > best.rgb[0] - best.rgb[1] ? s : best, null);
    results.push({ label,
      strongestRedContrastSample: red ? { coordinate: red.coordinate, rgb: red.rgb,
        redMinusGreen: red.rgb[0] - red.rgb[1], meanRgbExcess: red.brightExcess ?? null } : null,
      residualComponents: [3, 5, 10].map(t => residualComponents(diagnostic.samples, t)),
      diagnostic });
  }
  const elements = theseLabels.map((l, index) => {
    const s = l.section, vertical = s.axis === 'vertical';
    const x1 = vertical ? s.fixedCoordinate : s.range[0], y1 = vertical ? s.range[0] : s.fixedCoordinate;
    const x2 = vertical ? s.fixedCoordinate : s.range[1], y2 = vertical ? s.range[1] : s.fixedCoordinate;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d000d0" stroke-width="5"/><circle cx="${x1}" cy="${Math.max(12,y1)}" r="22" fill="white" stroke="#d000d0" stroke-width="3"/><text x="${x1}" y="${Math.max(12,y1)+8}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#222">${index+1}</text>`;
  }).join('');
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}">${elements}</svg>`;
  const smallOverlay = await sharp(Buffer.from(overlay)).resize({ width: 1000 }).png().toBuffer();
  outputs[`previews/${f.state}-${f.role}.png`] = await sharp(raw).resize({ width: 1000 }).png().toBuffer();
  outputs[`previews/${f.state}-${f.role}-sections.png`] = await sharp(raw).resize({ width: 1000 })
    .composite([{ input: smallOverlay }]).png().toBuffer();
}
const compact = results.map(r => ({ id: r.label.id, state: r.label.state, role: r.label.role,
  challenge: r.label.challenge, status: r.diagnostic.status, reasons: r.diagnostic.reasons,
  sidebandNoise: r.diagnostic.uncertainty.measuredSidebandNoise,
  redSample: r.strongestRedContrastSample,
  peak: r.diagnostic.peak,
  peakWidths: r.diagnostic.peakWidths,
  residualEnvelopes: r.diagnostic.residualEnvelopes,
  residualComponents: r.residualComponents,
  qualification: r.diagnostic.qualification.status }));
const backgrounds = results.filter(r => r.label.challenge === 'background-negative');
const summaries = {
  schemaVersion: 1, status: 'review-ready-producer-challenges; qualification blocked',
  rawImagePins: frames.length, labelledSections: results.length,
  labelStatus: 'Producer-proposed independent per-image locations. Root commissions independent review.',
  diagnosticObserved: compact.filter(r => r.status === 'observed-diagnostic').length,
  diagnosticBlocked: compact.filter(r => r.status === 'blocked').length,
  declaredSensitivityOnly: { peakFractions: [0.5, 0.8, 0.9], residualThresholds: [3, 5, 10],
    maximumSidebandNoise: 3, minimumPeakExcess: 5,
    qualification: 'These inherited helper settings are not independently calibrated appearance/edge thresholds.' },
  backgroundChecks: backgrounds.map(r => ({ id: r.label.id, status: r.diagnostic.status,
    sidebandNoise: r.diagnostic.uncertainty.measuredSidebandNoise,
    maximumAbsoluteResidual: r.diagnostic.samples.length
      ? Math.max(...r.diagnostic.samples.map(s => s.maxChannelResidual ?? 0)) : null })),
  empiricalNegativeMaximum: Math.max(...backgrounds.flatMap(r => r.diagnostic.samples.map(s => s.maxChannelResidual ?? 0))),
  negativeMaximumLimit: 'Finite, producer-labelled sections only. This is not a distribution-wide noise calibration or halo edge error bound.',
  challenges: compact,
};
outputs['challenge-results.json'] = JSON.stringify({ schemaVersion: 1, status: 'diagnostic-only-blocked', results }, null, 2) + '\n';
outputs['summary.json'] = JSON.stringify(summaries, null, 2) + '\n';
outputs['challenge-table.csv'] = 'id,challenge,status,sidebandNoise,halfPeakCss,threshold3Css,threshold5Css,threshold10Css\n' + compact.map(r =>
  [r.id,r.challenge,r.status,r.sidebandNoise,r.peakWidths[0]?.cssSpan,
    ...[3,5,10].map(t=>r.residualEnvelopes.find(e=>e.threshold===t)?.cssSpan)].join(',')).join('\n')+'\n';
if (process.argv.includes('--verify')) {
  const packet = await json(`${root}/review-packet.json`);
  for (const p of [...packet.inputs, ...packet.artifacts]) {
    const b = await readFile(p.path);
    assert.equal(hash(b), p.sha256, `Packet pin changed: ${p.path}`);
    assert.equal(b.length, p.bytes);
  }
  for (const [name, content] of Object.entries(outputs)) {
    const expected = typeof content === 'string' ? Buffer.from(content) : content;
    assert.equal(hash(await readFile(`${root}/${name}`)), hash(expected), `Repeatability failed: ${name}`);
  }
  console.log(JSON.stringify({ status: 'pass', inputPins: packet.inputs.length,
    artifactPins: packet.artifacts.length, reproducibleOutputs: Object.keys(outputs).length,
    rawImagePins: frames.length, labelledSections: results.length, qualification: 'blocked' }, null, 2));
} else {
  for (const [name, content] of Object.entries(outputs)) await writeFile(`${root}/${name}`, content);
  console.log(JSON.stringify({ rawImagePins: frames.length, labelledSections: results.length,
    diagnosticObserved: summaries.diagnosticObserved, diagnosticBlocked: summaries.diagnosticBlocked,
    empiricalNegativeMaximum: summaries.empiricalNegativeMaximum }));
  for (const r of compact) console.log(JSON.stringify({ id:r.id,status:r.status,noise:r.sidebandNoise,
    reasons:r.reasons,red:r.redSample,half:r.peakWidths[0]?.cssSpan,
    envelopes:r.residualEnvelopes.map(e=>e.cssSpan),components:r.residualComponents.map(c=>c.components.map(v=>v.rasterBounds)) }));
}
