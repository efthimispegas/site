import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),dir=resolve(workspace,'artifacts/pegasoft-concept/evidence/loader-reassessment/20261013');
mkdirSync(dir,{recursive:true});const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifestSha256:sha(resolve(app,'homepage-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const motion=page=>page.locator('#opening-stage').evaluate(s=>JSON.parse(s.dataset.motion));
try{
 const cold=await browser.newPage({viewport:{width:1280,height:900}});let releaseModules;let modules=new Promise(resolve=>releaseModules=resolve);
 await cold.route('**/*.js',async route=>{await modules;await route.continue();});
 const refreshSamples=[];
 for(const refresh of [false,true]){
  if(refresh){modules=new Promise(resolve=>releaseModules=resolve);await cold.reload({waitUntil:'commit'});}else await cold.goto('http://127.0.0.1:8771/',{waitUntil:'commit'});
  await cold.waitForSelector('#mark');await cold.waitForFunction(()=>getComputedStyle(document.querySelector('.outcome-world')).visibility==='hidden');
  const samples=await cold.evaluate(()=>new Promise(resolve=>{const frames=[];function next(){frames.push({bounds:document.querySelector('#opening-stage').getBoundingClientRect().toJSON(),viewport:innerHeight,horizon:getComputedStyle(document.querySelector('.outcome-world')).visibility,radar:getComputedStyle(document.querySelector('#radar')).transform});if(frames.length===20)resolve(frames);else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  assert.ok(samples.every(f=>f.horizon==='hidden'&&f.bounds.top===0&&f.bounds.bottom===f.viewport),'Loading stage moved or leaked atmosphere');assert.ok(new Set(samples.map(f=>f.radar)).size>10);await cold.screenshot({path:resolve(dir,refresh?'refresh-before-js.png':'cold-before-js.png')});releaseModules();await cold.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');refreshSamples.push({refresh,samples});
 }
 await cold.close();report.observations.push({initialStylesBeforeJavaScript:true,refreshSamples});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,...(viewport.width===1280?{recordVideo:{dir:resolve(dir,'recording'),size:viewport}}:{})}),page=await context.newPage(),errors=[],transportRequests=[];
  page.on('pageerror',e=>errors.push(e.message));let release;const held=new Promise(r=>release=r);
  await page.route('**/land-dots.json',async route=>{await held;await route.continue();});
  await page.route('**/*.glb',async route=>{transportRequests.push(await page.evaluate(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion||'{}').opening?.complete));await route.continue();});
  await page.goto('http://127.0.0.1:8771/?revision=loader-outcome-20261013',{waitUntil:'domcontentloaded'});
  const waiting=[];for(let i=0;i<24;i++){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));waiting.push(await page.locator('#opening-stage').evaluate(s=>({ring:getComputedStyle(s.querySelector('#radar')).transform,horizon:getComputedStyle(s.querySelector('.outcome-world')).visibility,position:getComputedStyle(s.querySelector('.horizon')).transform})));}
  assert.ok(new Set(waiting.map(s=>s.ring)).size>12,'Loading rings froze');assert.ok(waiting.every(s=>s.horizon==='hidden'));assert.ok(transportRequests.length===0,'Transport competed with initial loader');assert.equal(await page.locator('#aircraft').evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.screenshot({path:resolve(dir,`loading-beat-${viewport.width}.png`)});release();
  await page.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');
  const frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[];function next(now){const m=JSON.parse(document.querySelector('#opening-stage').dataset.motion);frames.push({now,openingTime:m.openingTime,ring:m.opening.ringScale,pulse:m.opening.pulseScale,complete:m.opening.complete});if(m.opening.complete)resolve(frames);else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  assert.ok(frames.length>30);const gaps=frames.slice(1).map((f,i)=>f.now-frames[i].now);assert.ok(Math.max(...gaps)<300,'Opening has a long frame stall');
  assert.ok(frames.filter(f=>f.openingTime<1.6).slice(1).every((f,i)=>f.ring>frames[i].ring),'Ring recession stopped mid-track');
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');assert.ok(transportRequests.length>0&&transportRequests.every(Boolean),'Heavy transport initialized before opening completion');
  await page.mouse.wheel(0,.26*4.2*viewport.height);await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).progress>.259);
  const entry=await page.locator('.outcome-title h2').boundingBox();assert.ok(entry.y<viewport.height,'Outcome remains below view at 26%');await page.screenshot({path:resolve(dir,`outcome-26-${viewport.width}.png`)});
  await page.mouse.wheel(0,.20*4.2*viewport.height);await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).progress>.459);
  // Hold the scroll: the once-only spring must keep rolling and bounce to rest.
  const wheels=await page.evaluate(()=>new Promise(resolve=>{const frames=[];function next(){frames.push(JSON.parse(document.querySelector('.metric-value').dataset.wheels));if(frames.length===180)resolve(frames);else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  assert.ok(wheels.some(v=>v[0]>2.01),'No counter bounce at rest');assert.ok(Math.abs(wheels.at(-1)[0]-2)<.001);
  const first=await motion(page);assert.equal(first.counterPlayback[0].plays,1);
  await page.mouse.wheel(0,-.44*4.2*viewport.height);await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).progress<.03);
  await page.mouse.wheel(0,.44*4.2*viewport.height);await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).progress>.45);
  const after=await motion(page);assert.equal(after.counterPlayback[0].plays,1);assert.deepEqual(await page.locator('.metric-value').first().evaluate(e=>JSON.parse(e.dataset.wheels)),[2]);
  await page.screenshot({path:resolve(dir,`counter-return-${viewport.width}.png`)});
  assert.deepEqual(errors,[]);report.observations.push({viewport,waiting,openingFrames:frames,maxFrameGapMs:Math.max(...gaps),transportRequests,entry,heldScrollBounce:wheels,counterPlaysBefore:first.counterPlayback,counterPlaysAfter:after.counterPlayback,errors});const video=page.video();await context.close();if(video)report.recording=await video.path();
 }
 const early=await browser.newPage({viewport:{width:1280,height:900}});await early.goto('http://127.0.0.1:8771/');await early.mouse.wheel(0,7000);await early.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');assert.ok((await motion(early)).opening.complete);await early.close();report.observations.push({earlyScrollDoesNotBlockTransport:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto('http://127.0.0.1:8771/review/loader.html#viewer');await page.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');
 await page.locator('#play').click();const frozen=await motion(page);await page.waitForTimeout(100);assert.equal((await motion(page)).openingTime,frozen.openingTime);
 const settings=[];for(const control of await page.locator('[data-setting]').all()){
  const value=await control.evaluate(e=>{e.value=Number(e.value)+Number(e.step);e.dispatchEvent(new Event('input',{bubbles:true}));return {key:e.dataset.setting,value:Number(e.value)};});assert.equal((await motion(page)).loaderSettings[value.key],value.value);settings.push(value);
 }
 await page.locator('#reset').click();await page.locator('#timeline').evaluate(e=>{e.value='1.5';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await motion(page)).openingTime,1.5);
 await page.locator('#frame-next').click();assert.ok(Math.abs((await motion(page)).openingTime-1.5-1/60)<.001);
 await page.locator('#waiting').check();assert.equal(await page.locator('#radar').evaluate(e=>getComputedStyle(e).opacity),'1');await page.waitForTimeout(100);const a=await page.locator('#radar').evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(180);const b=await page.locator('#radar').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(a,b);await page.locator('#waiting').uncheck();
 await page.locator('#reduced').check();assert.equal((await motion(page)).opening.aperture,1);await page.locator('#reduced').uncheck();
 await page.locator('#control-bounce').evaluate(e=>{e.value='.2';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#timeline').evaluate(e=>{e.value='1.85';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.ok((await motion(page)).opening.pulseScale>1);
 await page.locator('#reset').click();await page.locator('#restart').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);
 await page.locator('#opening-stage').screenshot({path:resolve(dir,'loader-review.png')});await page.locator('.inspection').screenshot({path:resolve(dir,'loader-controls.png')});report.observations.push({inspectorControls:settings.length,pause:true,scrub:true,frameStep:true,loadingBeatPreview:true,reduced:true,bounceControl:true,restart:true});await page.close();
 report.status='passed_pending_personal_review';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
