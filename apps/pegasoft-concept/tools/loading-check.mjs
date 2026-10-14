import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chapters,duration,scrollAtProgress} from '../src/transport-timeline.js';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),dir=resolve(workspace,'artifacts/pegasoft-concept/evidence/loading-visibility');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifestSha256:sha(resolve(app,'transport-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let release;const assetsReady=new Promise(r=>release=r);
  await page.route('**/*.glb',async route=>{await assetsReady;await route.continue();});
  await page.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await page.locator('#jet').evaluate(i=>i.decode());
  const loading=await page.locator('#stage').evaluate(s=>({ready:s.dataset.loaded,jet:getComputedStyle(s.querySelector('#aircraft')).opacity,shadow:getComputedStyle(s.querySelector('#shadow-receiver')).opacity,clouds:getComputedStyle(s.querySelector('#cloud-layers')).opacity}));
  assert.equal(loading.ready,'false');for(const key of ['jet','shadow','clouds'])assert.equal(loading[key],'0');
  await page.screenshot({path:resolve(dir,`loading-${viewport.width}.png`)});release();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
  const start=await page.locator('#aircraft').evaluate(e=>({opacity:getComputedStyle(e).opacity,right:e.getBoundingClientRect().right}));assert.equal(start.opacity,'1');assert.ok(start.right<0);
  await page.screenshot({path:resolve(dir,`ready-${viewport.width}.png`)});
  const progress=(chapters[0].duration+chapters[1].duration+.77*26)/duration;
  const trackStart=await page.locator('#story-track').evaluate(t=>t.getBoundingClientRect().top+window.scrollY),target=trackStart+scrollAtProgress(progress,viewport.height);await page.mouse.wheel(0,target);await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,target);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const crossing=await page.locator('#aircraft').evaluate(e=>({visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,bounds:e.getBoundingClientRect().toJSON(),jet:JSON.parse(document.querySelector('#stage').dataset.motion).jetProgress}));
  assert.equal(crossing.visibility,'visible');assert.equal(crossing.opacity,'1');assert.ok(crossing.jet>0&&crossing.jet<1);assert.ok(crossing.bounds.right>0&&crossing.bounds.left<viewport.width);
  await page.screenshot({path:resolve(dir,`crossing-${viewport.width}.png`)});assert.deepEqual(errors,[]);
  report.observations.push({viewport,loading,start,crossing,errors});await page.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
