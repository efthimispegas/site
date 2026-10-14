import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),dir=resolve(workspace,'artifacts/pegasoft-concept/evidence/outcome-amendments/20261013');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={homepageManifestSha256:sha(resolve(app,'homepage-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),samples:[],viewports:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});await page.goto('http://127.0.0.1:8771/');await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);
  const seek=async p=>{const offset=p*4.2*viewport.height;await page.mouse.wheel(0,offset-await page.evaluate(()=>window.scrollY));await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,offset);};
  await seek(viewport.width<680?.50:.38);const samples=[];
  for(let i=0;i<100;i++){
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
   samples.push(await page.locator('.metric-value').first().evaluate(e=>({value:JSON.parse(e.dataset.wheels)[0],target:Number(e.dataset.target),glyph:getComputedStyle(e.querySelectorAll('.counter-number')[2]).transform})));
   if(samples.at(-1).value>2.08&&!report.peakCaptured){await page.screenshot({path:resolve(dir,'bounce-peak.png')});report.peakCaptured=true;}
  }
  assert.ok(samples.some(s=>s.value>2.08),'No visible rest overshoot');assert.ok(Math.abs(samples.at(-1).value-2)<.01,'Counter failed to settle');
  for(const p of [.50,.65,.79,.94]){
   await seek(p);await page.waitForFunction(()=>[...document.querySelectorAll('.metric-value')].every(e=>JSON.parse(e.dataset.wheels).every((v,j)=>Math.abs(v-JSON.parse(e.dataset.wheelTargets)[j])<.001)));
   const boxes=await page.locator('.metrics').evaluate(e=>{const parent=e.getBoundingClientRect();return [...e.querySelectorAll('.metric-value')].map(n=>{const r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label'),left:r.left,right:r.right,parentLeft:parent.left,parentRight:parent.right};});});
   assert.ok(boxes.every(b=>b.left>=b.parentLeft-1&&b.right<=b.parentRight+1),'Counter exceeds its reading column');
   await page.screenshot({path:resolve(dir,`metric-${viewport.width}-${Math.round(p*100)}.png`)});
  }
  report.viewports.push({viewport,bounceSamples:samples});await page.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'bounce-checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
