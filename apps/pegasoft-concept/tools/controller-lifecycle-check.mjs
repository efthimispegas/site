import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..');
const evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/controller-refactor');mkdirSync(evidence,{recursive:true});
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const report={date:new Date().toISOString(),refactorSha256:hash(resolve(app,'controller-refactor-manifest.json')),scriptSha256:hash(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open(){
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.addInitScript(()=>{
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
  window.requestAnimationFrame=callback=>{const id=request(time=>{pending.delete(id);callback(time);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
  const Original=window.ResizeObserver,observing=new Set();
  window.ResizeObserver=class extends Original{
   observe(...args){observing.add(this);return super.observe(...args);}
   disconnect(){observing.delete(this);return super.disconnect();}
  };
  window.lifecycleProbe=()=>({frames:pending.size,observers:observing.size});
 });
 return page;
}
async function stats(page){
 return page.evaluate(()=>({ ...window.lifecycleProbe(),canvas:document.querySelectorAll('#stage canvas').length,videos:document.querySelectorAll('body>video').length,loops:document.querySelector('#stage').inspection.activeFrameLoops}));
}
async function listeners(cdp){
 const r=await cdp.send('Runtime.evaluate',{expression:'JSON.stringify([window,document,document.querySelector("main")].map(target=>Object.fromEntries(Object.entries(getEventListeners(target)).map(([name,entries])=>[name,entries.filter(entry=>!entry.listener.toString().includes("_hitTargetInterceptor")&&name!=="__playwright_global_listeners_check__").length]))))',includeCommandLineAPI:true,returnByValue:true});
 return JSON.parse(r.result.value);
}
try{
 const page=await open(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8771/review/ship-jet-integration.html#viewer');
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 const cdp=await page.context().newCDPSession(page);
 const mounted=await stats(page),mountedListeners=await listeners(cdp);
 assert.deepEqual(mounted,{frames:1,observers:1,canvas:1,videos:2,loops:1});
 await page.evaluate(()=>document.querySelector('#stage').inspection.mount());
 assert.deepEqual(await stats(page),mounted);
 for(let i=0;i<3;i++){
  await page.evaluate(()=>document.querySelector('#stage').inspection.dispose());
  const disposed=await stats(page),disposedListeners=await listeners(cdp);
  assert.deepEqual(disposed,{frames:0,observers:0,canvas:0,videos:0,loops:0});
  assert.ok(disposedListeners.every(target=>Object.values(target).every(count=>count===0)));
  await page.evaluate(()=>document.querySelector('#stage').inspection.mount());
  assert.deepEqual(await stats(page),mounted);assert.deepEqual(await listeners(cdp),mountedListeners);
  report.observations.push({cycle:i+1,disposed,disposedListeners,remounted:await stats(page),listenerScope:"Native app listeners; Playwright hit-target instrumentation excluded by exact implementation marker"});
 }
 await page.getByRole('button',{name:'Remount scene',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 assert.deepEqual(await stats(page),mounted);assert.deepEqual(await listeners(cdp),mountedListeners);
 report.observations.push({nativeRemountButton:true});
 await page.locator('#progress').evaluate(input=>{input.value='.65';input.dispatchEvent(new Event('input',{bubbles:true}));});
 const before=await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion));
 await page.locator('#cloud-controls-toggle').click();
 await page.locator('#K01-density').evaluate(input=>{input.value='.9';input.dispatchEvent(new Event('input',{bubbles:true}));});
 const changed=await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion));
 assert.equal(changed.clouds.find(c=>c.id==='K01').density,.9);assert.equal(changed.progress,before.progress);
 await page.locator('#cloud-reset').click();
 assert.equal(await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion).clouds.find(c=>c.id==='K01').density),1);
 await page.locator('#cloud-controls-toggle').click();
 await page.locator('#shadow-editor-toggle').click();
 await page.locator('[data-shadow="blur"]').fill('7');await page.locator('[data-shadow="blur"]').dispatchEvent('input');
 assert.equal(await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion).jet.shadow.blur),7);
 await page.locator('#shadow-reset').click();await page.locator('#shadow-editor-toggle').click();
 assert.equal(await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion).jet.shadow.blur),6.72);
 report.observations.push({appearanceControlsAfterRemount:true,progressPreserved:true});
 await page.evaluate(()=>document.querySelector('#stage').inspection.dispose());assert.deepEqual(errors,[]);await page.close();

 const pending=await open();await pending.route('**/S01-ship.glb',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.continue();});
 await pending.goto('http://127.0.0.1:8771/review/ship-jet-integration.html#viewer');
 await pending.waitForSelector('#stage canvas');await pending.evaluate(()=>document.querySelector('#stage').inspection.dispose());
 await pending.waitForTimeout(750);assert.deepEqual(await stats(pending),{frames:0,observers:0,canvas:0,videos:0,loops:0});
 report.observations.push({disposeDuringLoading:true,resources:await stats(pending)});await pending.close();

 const failed=await open();await failed.route('**/S01-ship.glb',route=>route.fulfill({status:404,body:'Deliberate loading failure'}));
 await failed.goto('http://127.0.0.1:8771/review/ship-jet-integration.html#viewer');
 await failed.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='error');
 await failed.locator('#fallback').evaluate(image=>image.decode());assert.deepEqual(await stats(failed),{frames:0,observers:0,canvas:0,videos:0,loops:0});
 assert.equal(await failed.locator('#aircraft').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await failed.locator('#stage').screenshot({path:resolve(evidence,'loading-fallback.png')});
  report.observations.push({loadingFailureFallback:true,resources:await stats(failed)});
 await failed.unroute('**/S01-ship.glb');await failed.getByRole('button',{name:'Remount scene',exact:true}).click();await failed.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');assert.deepEqual(await stats(failed),mounted);assert.equal(await failed.locator('#fallback').count(),0);report.observations.push({retryAfterFailure:true});await failed.close();
 const plain=await open();await plain.goto('http://127.0.0.1:8770/review/ship-jet-integration.html#viewer');
 await plain.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 const reusable=await plain.evaluate(async()=>{
  const stage=document.querySelector('#stage');stage.inspection.dispose();
  for(const element of document.querySelectorAll('#cloud-controls,#shadow-controls,.toolbar,input'))element.remove();
  const {createShipJetController}=await import('/review/ship-jet-controller.js');
  const controller=createShipJetController({root:document.querySelector('main'),stage});
  await controller.mount();const state=controller.update({progress:.65,reducedMotion:false});controller.tick(0);controller.render();
  const result={mounted:controller.state,progress:state.progress,clouds:state.clouds.length,inputs:document.querySelectorAll('input').length,...window.lifecycleProbe()};
  controller.dispose();return {...result,canvasAfterDispose:stage.querySelectorAll('canvas').length,videosAfterDispose:document.querySelectorAll('body>video').length};
 });
 assert.deepEqual(reusable,{mounted:'mounted',progress:.65,clouds:3,inputs:0,frames:0,observers:0,canvasAfterDispose:0,videosAfterDispose:0});
 report.observations.push({productionControllerWithoutReviewControls:reusable});await plain.close();
  report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();writeFileSync(resolve(evidence,'lifecycle-checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
