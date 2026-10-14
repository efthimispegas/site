import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),evidence=resolve(workspace,process.env.PEGASOFT_HOMEPAGE_EVIDENCE_DIR||'artifacts/pegasoft-concept/evidence/homepage-opening-outcome');
mkdirSync(evidence,{recursive:true});const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),homepageManifestSha256:sha(resolve(app,'homepage-integration-manifest.json')),openingManifestSha256:sha(resolve(app,'opening-packaging-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const state=page=>page.locator('#opening-stage').evaluate(s=>JSON.parse(s.dataset.motion));
async function seek(page,p){
 const target=await page.evaluate(p=>p*4.2*innerHeight,p),old=await page.evaluate(()=>window.scrollY);
 await page.mouse.wheel(0,target-old);await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,target);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return state(page);
}
async function open(viewport,options={}){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,...options}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await page.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});return {context,page,errors};
}
function bounds(page,selector='#opening-stage'){return page.locator(selector).evaluate(s=>{
 const selectors=['.logo','.hero-copy','.hero-copy h2','.hero-body','.hero-actions','.hero-bottom'];
 return selectors.map(q=>{const e=s.querySelector(q),r=e.getBoundingClientRect(),p=s.getBoundingClientRect(),style=getComputedStyle(e);return {selector:q,x:r.x-p.x,y:r.y-p.y,width:r.width,height:r.height,fontSize:style.fontSize,lineHeight:style.lineHeight,fontWeight:style.fontWeight};});
});}
try{
 let acceptedBounds,acceptedGeometry;
 const reference=await browser.newPage({viewport:{width:1280,height:900}});
 await reference.goto('http://127.0.0.1:8767/review/hero-opening.html#viewer');
 await reference.waitForFunction(()=>document.querySelector('#stage').dataset.status==='ready');
 if(await reference.locator('#play').textContent()==='Pause')await reference.locator('#play').click();
 await reference.addStyleTag({content:'#stage{width:1280px!important;height:900px!important;aspect-ratio:auto!important;border:0!important;min-height:0!important}'});
 await reference.locator('#timeline').evaluate(e=>{e.value='3.8';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await reference.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).geometry.height===900);
 acceptedBounds=await bounds(reference,'#stage');acceptedGeometry=await reference.locator('#stage').evaluate(s=>JSON.parse(s.dataset.motion).geometry);
 await reference.locator('#stage').screenshot({path:resolve(evidence,'accepted-opening-normalized.png')});await reference.close();
 for(const viewport of [{width:1280,height:900},{width:1506,height:753},{width:390,height:844}]){
  const {page,context,errors}=await open(viewport);
  await page.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).openingTime>=1.4);
  await page.screenshot({path:resolve(evidence,`opening-middle-${viewport.width}.png`)});
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);
  await page.evaluate(()=>document.fonts.ready);const opening=await state(page);
  assert.equal(opening.openingTime,3.8);assert.equal(opening.geometry.cityNodes,13);assert.equal(opening.geometry.connections.length,8);
  assert.deepEqual(opening.geometry.settings,{speed:1.52,dots:1.5,rim:.48,arcs:1.21});
  if(viewport.width===1280){assert.deepEqual(await bounds(page),acceptedBounds);assert.deepEqual(opening.geometry.camera,acceptedGeometry.camera);assert.deepEqual(opening.geometry.connections,acceptedGeometry.connections);}
  await page.screenshot({path:resolve(evidence,`opening-complete-${viewport.width}.png`)});
  const before=await state(page), samples=[],entryWheels=[];
  await seek(page,.46);for(let i=0;i<40;i++){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));entryWheels.push(await page.locator('.metric-value').first().evaluate(e=>JSON.parse(e.dataset.wheels)));}
  assert.ok(entryWheels.some(values=>values.some(v=>Math.abs(v-Math.round(v))>.01)),'First entry did not roll');await seek(page,0);
  for(const p of [0,.10,.14,.18,.22,.24,.26,.27,.29,.34,.48,.59,.69,.86,1]){
   const r=await seek(page,p);samples.push(r);
   if(p===.10)assert.ok(r.state.wipe<1e-5);if(p>=.27)assert.ok(r.state.wipe>1-1e-5);
   if(p===.18)assert.ok(r.state.lineExit.every(v=>v>1-1e-5));
   if(p===.24)assert.equal(r.state.outcomeActive,false);if(p===.26){assert.equal(r.state.outcomeActive,true);const box=await page.locator('.outcome-title h2').boundingBox();assert.ok(box.y<viewport.height,'Heading is still below the viewport at 29%');}
   await page.screenshot({path:resolve(evidence,`intro-${viewport.width}-${Math.round(p*100)}.png`)});
  }
  const after=await state(page);assert.equal(after.openingTime,before.openingTime);assert.ok(after.rotationTime>before.rotationTime);
  const forward=await seek(page,.18),savedY=await page.evaluate(()=>window.scrollY);await seek(page,.27);
  await page.mouse.wheel(0,savedY-await page.evaluate(()=>window.scrollY));await page.waitForFunction(y=>window.scrollY===y,savedY);
  const reverse=await state(page);assert.deepEqual(reverse.state,forward.state);
  // Genuine wheel progression through all counter entries, retaining rendered
  // glyph positions rather than inferring animation from target values.
  const roll=[];await seek(page,.34);
  for(let n=0;n<32;n++){
   await page.mouse.wheel(0,viewport.height*4.2*.017);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   roll.push(await page.locator('.metrics').evaluate(e=>[...e.querySelectorAll('.metric-value')].map(x=>({target:x.dataset.target,wheels:JSON.parse(x.dataset.wheels),glyphs:[...x.querySelectorAll('.counter-number')].map(g=>getComputedStyle(g).transform)}))));
  }
  assert.ok((await state(page)).counterPlayback.every(row=>row.plays===1),'Scroll replayed a counter');
  await seek(page,1);await page.waitForFunction(()=>[...document.querySelectorAll('.metric-value')].every(e=>JSON.parse(e.dataset.wheels).every((v,j)=>Math.abs(v-JSON.parse(e.dataset.wheelTargets)[j])<.001)));
  await page.screenshot({path:resolve(evidence,`counters-settled-${viewport.width}.png`)});
  assert.deepEqual(await page.locator('.metric-value').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('aria-label'))),['2+','98.5%','15+','5+','50+']);
  const resizeBefore=await state(page);await page.setViewportSize({width:viewport.width,height:viewport.height-60});
  await page.waitForFunction(p=>Math.abs(JSON.parse(document.querySelector('#opening-stage').dataset.motion).progress-p)<.002,resizeBefore.progress);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  report.observations.push({viewport,acceptedOpeningBounds:viewport.width===1280,opening,scrollSamples:samples,reverseStateRestored:true,independentOpeningAndRotationClocks:true,rollingFrames:roll,resizePreservedProgress:true,noHorizontalOverflow:true});
  assert.deepEqual(errors,[]);await context.close();
 }
 const reduced=await open({width:390,height:844},{reducedMotion:'reduce'});
 await reduced.page.waitForFunction(()=>document.body.classList.contains('static-journey'));
 assert.equal(await reduced.page.locator('#static-story').isVisible(),true);assert.equal(await reduced.page.locator('body>video').count(),0);assert.equal(await reduced.page.locator('#stage').evaluate(s=>s.dataset.loaded),'static');assert.equal(await reduced.page.locator('#stage').evaluate(s=>s.journey.activeFrameLoops),0);
 report.observations.push({reducedMotionStatic:true});await reduced.context.close();
 const cleanup=await open({width:1280,height:900});await cleanup.page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 const result=await cleanup.page.locator('#stage').evaluate(async s=>{const host=s.journey;await host.mount();const before=host.activeFrameLoops;host.dispose();host.dispose();return {before,after:host.activeFrameLoops,transportCanvas:s.querySelectorAll('canvas').length,globeDisposed:document.querySelector('#globe').dataset.disposed,videos:document.querySelectorAll('body>video').length};});
 assert.deepEqual(result,{before:1,after:0,transportCanvas:0,globeDisposed:'true',videos:0});report.observations.push({cleanup:result});await cleanup.context.close();
 report.status='checks_passed_pending_personal_review';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(evidence,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
