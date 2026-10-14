import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),dir=resolve(workspace,process.env.PEGASOFT_HOMEPAGE_EVIDENCE_DIR||'artifacts/pegasoft-concept/evidence/homepage-opening-outcome'),videoDir=resolve(dir,'recording');mkdirSync(videoDir,{recursive:true});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),homepageManifestSha256:sha(resolve(app,'homepage-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),forward:[],reverse:[]};
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:videoDir,size:{width:1280,height:900}}}),page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:8771/');await page.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);
 const read=()=>page.locator('#opening-stage').evaluate(s=>JSON.parse(s.dataset.motion));
 for(const direction of [1,-1])for(let i=0;i<95;i++){
  await page.mouse.wheel(0,direction*4.2*900/95);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  report[direction===1?'forward':'reverse'].push(await read());
 }
 assert.ok(report.forward.every((r,i)=>!i||r.progress>=report.forward[i-1].progress));assert.ok(report.reverse.every((r,i)=>!i||r.progress<=report.reverse[i-1].progress));
 assert.ok(report.forward.at(-1).progress>.99);assert.ok(report.reverse.at(-1).progress<.001);
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{const video=page.video();await context.close();report.recording=await video.path();await browser.close();writeFileSync(resolve(dir,'motion.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,failure:report.failure,recording:report.recording}));
