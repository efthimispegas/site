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
console.log(JSON.stringify({status:'website_motion_inputs_and_outputs_verified_pending_personal_review'}));
