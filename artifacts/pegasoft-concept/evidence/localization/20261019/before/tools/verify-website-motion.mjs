import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const m=JSON.parse(readFileSync(resolve(app,'website-motion-manifest.json'))),approved=resolve(workspace,'artifacts/pegasoft-concept/evidence/loader-reassessment/20261014');
const allowed=['src/journey-host.js','src/main.js','index.html'],added=['src/website-motion-controller.js','src/website-motion.css','src/particle-wordmark.js'];
if(m.files.length!==allowed.length||new Set(m.files.map(r=>r.path)).size!==allowed.length||m.files.some(r=>!allowed.includes(r.path)))throw Error('Unexpected website motion override scope');
if(m.addedFiles.length!==added.length||new Set(m.addedFiles.map(r=>r.path)).size!==added.length||m.addedFiles.some(r=>!added.includes(r.path)))throw Error('Unexpected website motion module scope');
if(m.acceptedHomepageManifestSha256!==sha(resolve(app,'homepage-integration-manifest.json'))||m.approvalSha256!==sha(resolve(approved,'user-approval.json')))throw Error('Accepted homepage/preset pin drift');
for(const row of m.files){if(row.previousSha256!==sha(resolve(approved,'accepted-homepage',row.path))||row.sha256!==sha(resolve(app,row.path)))throw Error('Website motion source drift: '+row.path);}
for(const row of m.addedFiles)if(row.sha256!==sha(resolve(app,row.path)))throw Error('Website motion module drift: '+row.path);
if(m.motionAmendmentRequest&&sha(resolve(workspace,m.motionAmendmentRequest))!==m.motionAmendmentRequestSha256)throw Error('Motion amendment request drift');
for(const key of ['titleAmendmentRequest','outcomeAmendmentRequest','transportAmendmentRequest','spacingAmendmentRequest','headerFooterAmendmentRequest','headerStyleCorrectionRequest'])if(!m[key]||sha(resolve(workspace,m[key]))!==m[key+'Sha256'])throw Error('Commissioned request drift: '+key);
if(m.preDepartureAmendmentRequest&&sha(resolve(workspace,m.preDepartureAmendmentRequest))!==m.preDepartureAmendmentRequestSha256)throw Error('Pre-departure camera/palette request drift');
if(m.truckDetailAmendment){const a=m.truckDetailAmendment;if(sha(resolve(workspace,a.request))!==a.requestSha256||a.files.length!==1||a.files[0].path!=='src/truck-detail-repair.js'||sha(resolve(app,a.files[0].path))!==a.files[0].sha256)throw Error('Truck detail amendment drift');}
if(m.footerParticleAmendment){const a=m.footerParticleAmendment,paths=['review/footer-particles.html','src/footer-particle-review.js','src/footer-particle-review.css'];if(sha(resolve(workspace,a.request))!==a.requestSha256||a.files.length!==paths.length||new Set(a.files.map(r=>r.path)).size!==paths.length||a.files.some(r=>!paths.includes(r.path)||sha(resolve(app,r.path))!==r.sha256))throw Error('Footer particle review drift');}
if(m.contentPhaseAmendment){const a=m.contentPhaseAmendment,paths=['src/content-sections.css','src/content-controller.js','src/contact-form.js','src/partner-wall.js','public/licenses/react-bits.txt'];if(sha(resolve(workspace,a.request))!==a.requestSha256||sha(resolve(workspace,a.acceptedManifest))!==a.acceptedManifestSha256||sha(resolve(workspace,a.approval))!==a.approvalSha256||a.files.length!==paths.length||a.files.some(r=>!paths.includes(r.path)||sha(resolve(app,r.path))!==r.sha256)||new Set(a.files.map(r=>r.path)).size!==paths.length)throw Error('Ordinary content amendment drift');}
if(m.homepageAmendments){
 const paths=['src/approved-loader-preset.js','src/loader.css','src/intro-sequence.js','src/intro-controller.js','src/outcome-metrics.js','src/outcome.css','vite.config.js'],base=JSON.parse(readFileSync(resolve(app,'homepage-integration-manifest.json')));
 if(m.homepageAmendments.length!==paths.length||new Set(m.homepageAmendments.map(r=>r.path)).size!==paths.length||m.homepageAmendments.some(r=>!paths.includes(r.path)))throw Error('Unexpected commissioned homepage amendment');
 if(sha(resolve(workspace,m.homepageAmendmentRequest))!==m.homepageAmendmentRequestSha256)throw Error('Homepage amendment request drift');
 for(const row of m.homepageAmendments)if(base.addedFiles.find(r=>r.path===row.path)?.sha256!==row.previousSha256||sha(resolve(app,row.path))!==row.sha256)throw Error('Commissioned homepage amendment drift');
}
if(m.mobileStartupAmendment){
 const a=m.mobileStartupAmendment,paths=['review/ship-water.js','src/startup-scroll.js','src/assets/ocean-first-frame.png','tools/static-compression.mjs','src/model-download.js'];
 if(sha(resolve(workspace,a.request))!==a.requestSha256||a.files.length!==paths.length||new Set(a.files.map(r=>r.path)).size!==paths.length||a.files.some(r=>!paths.includes(r.path)||sha(resolve(app,r.path))!==r.sha256))throw Error('Mobile startup amendment drift');
 const refactor=JSON.parse(readFileSync(resolve(app,'controller-refactor-manifest.json')));
 if(a.files.find(r=>r.path==='review/ship-water.js').previousSha256!==refactor.files.find(r=>r.path==='review/ship-water.js').sha256)throw Error('Mobile water input pin drift');
}
if(m.performanceAmendment){const a=m.performanceAmendment;if(sha(resolve(workspace,a.request))!==a.requestSha256||a.files.length!==1||a.files[0].path!=='src/truck-motion-rig.js'||sha(resolve(app,a.files[0].path))!==a.files[0].sha256)throw Error('Performance amendment drift');}
if(m.careersAmendment&&sha(resolve(workspace,m.careersAmendment.request))!==m.careersAmendment.requestSha256)throw Error('Careers amendment request drift');
if(m.startupAmendment){const a=m.startupAmendment;if(sha(resolve(workspace,a.request))!==a.requestSha256||a.files.length!==1||a.files[0].path!=='src/cooperative-work.js'||sha(resolve(app,a.files[0].path))!==a.files[0].sha256)throw Error('Startup amendment drift');}
const transport=JSON.parse(readFileSync(resolve(app,'transport-integration-manifest.json')));
const paths=['src/transport-sequence.js','src/transport-controller.js','review/ship-jet-controller.js','review/ship-content.js','review/handoff-lift-rig.js','review/ship-jet-scene.js','review/lift-cab.js','review/ship-road.js','review/handoff-sequence.js','review/ship-integration-sequence.js'],baseline=JSON.parse(readFileSync(resolve(app,'baseline-manifest.json')));
if(m.transportAmendments?.length!==paths.length||new Set(m.transportAmendments.map(r=>r.path)).size!==paths.length||m.transportAmendments.some(r=>!paths.includes(r.path)))throw Error('Unexpected camera/content amendment scope');
for(const row of m.transportAmendments){const base=transport.files.find(r=>r.path===row.path)||transport.addedFiles.find(r=>r.path===row.path);if(row.previousSha256!==(base?.sha256||baseline.sources.find(r=>r.packaged===row.path)?.packagedSha256)||row.sha256!==sha(resolve(app,row.path)))throw Error('Camera/content amendment pin drift');}
console.log(JSON.stringify({status:'website_motion_inputs_and_outputs_verified_pending_personal_review'}));
