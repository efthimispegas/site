import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),source=resolve(workspace,'artifacts/pegasoft-concept/evidence/homepage-opening-outcome');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const m=JSON.parse(readFileSync(resolve(app,'homepage-integration-manifest.json')));
if(m.previousTransportManifestSha256!==sha(resolve(app,'transport-integration-manifest.json')))throw Error('Accepted transport pin drift');
if(m.transportApprovalSha256!==sha(resolve(source,'transport-approval.json')))throw Error('Transport approval drift');
const motionPath=resolve(app,'website-motion-manifest.json'),motion=existsSync(motionPath)?JSON.parse(readFileSync(motionPath)).files:[];
for(const row of m.files){const next=motion.find(r=>r.path===row.path);if(next&&next.previousSha256!==row.sha256)throw Error('Motion accepted homepage drift');if(sha(resolve(source,'accepted-transport',row.path))!==row.previousSha256||sha(resolve(app,row.path))!==(next?.sha256||row.sha256))throw Error('Homepage integration drift: '+row.path);}
const changes=existsSync(motionPath)?JSON.parse(readFileSync(motionPath)).homepageAmendments||[]:[];
for(const row of m.addedFiles){const next=changes.find(r=>r.path===row.path);if(next&&next.previousSha256!==row.sha256)throw Error('Homepage amendment input drift');if(sha(resolve(app,row.path))!==(next?.sha256||row.sha256))throw Error('Homepage module drift: '+row.path);}
if(m.openingPackagingSha256!==sha(resolve(app,'opening-packaging-manifest.json')))throw Error('Opening packaging pin drift');
console.log(JSON.stringify({status:'homepage_input_and_output_pins_verified'}));
