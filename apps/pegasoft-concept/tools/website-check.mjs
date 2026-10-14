import {chromium} from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const app=resolve(import.meta.dirname,'..'), workspace=resolve(app,'../..');
const evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/website-host');
mkdirSync(evidence,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceFiles:Object.fromEntries(['index.html','src/main.js','src/journey-host.js','src/journey.css','tools/website-check.mjs','project.json','controller-refactor-manifest.json','runtime-amendments.json','vite.config.js'].map(path=>[path,hash(readFileSync(resolve(app,path)))])),
  observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open(port,options={},route) {
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'no-preference',...options});
  const page=await context.newPage(),errors=[];
  await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  if(route) await page.route('**/*.glb',r=>r.abort());
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(()=>['true','static','error'].includes(document.querySelector('#stage').dataset.loaded),{},{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  return {context,page,errors};
}
async function freeze(page) {
  await page.evaluate(async()=>{
    for(const video of document.querySelectorAll('body>video')) {
      video.pause();
      if(video.currentTime>.001)await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=0;});
    }
  });
}
async function wheelTo(page,p) {
  const target=await page.evaluate(p=>p*(document.querySelector('#story-track').offsetHeight-document.querySelector('#stage').offsetHeight),p);
  const current=await page.evaluate(()=>window.scrollY);
  await page.mouse.move(640,450);await page.mouse.wheel(0,target-current);
  await page.waitForFunction(target=>Math.abs(window.scrollY-target)<2,target);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
const state=page=>page.locator('#stage').evaluate(stage=>{
  const r=JSON.parse(stage.dataset.motion);
  return {progress:r.progress,camera:r.camera,quaternion:r.quaternion,shipMatrix:r.shipMatrix,cargoMatrix:r.cargoMatrix,
    supportGap:r.supportGap,clouds:r.clouds,jet:r.jet,copy:r.copyLayout};
});
try {
  const {context,page,errors}=await open(8771);
  assert.equal(new URL(page.url()).hash,'');
  assert.equal(await page.locator('input,button,#viewer,#cloud-controls,#shadow-controls').count(),0);
  assert.equal(await page.locator('canvas').count(),1);
  const refContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const reference=await refContext.newPage();
  await reference.goto('http://127.0.0.1:8772/review/ship-jet-integration.html#viewer');
  await reference.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true',{},{timeout:60000});
  await reference.addStyleTag({content:'header,footer,main>h1,main>p,main>.panel,main>details,#viewer>:not(#stage){display:none!important}main{max-width:none;margin:0;padding:0}#viewer{display:contents}#story-track{height:8388px}#stage{position:sticky;top:0;width:100%;height:100vh;border:0;border-radius:0}'});
  await reference.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await freeze(page);await freeze(reference);
  for(const p of [0,.24615385,.53846154,.59615385,.69230769,.84615385,1]) {
    await wheelTo(page,p);
    const actual=await state(page);
    await reference.locator('#progress').evaluate((input,p)=>{input.type='number';input.step='any';input.value=String(p);input.dispatchEvent(new Event('input',{bubbles:true}));},actual.progress);
    await reference.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(actual,await state(reference),'Website scene differs from accepted reference');
    const name=`production-${Math.round(p*10000)}`;
    const png=await page.screenshot({path:resolve(evidence,name+'.png')});
    const original=await reference.locator('#stage').screenshot({path:resolve(evidence,'reference-'+Math.round(p*10000)+'.png')});
    const decoded=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const baseline=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true});
    assert.deepEqual(decoded.info,baseline.info);
    let sum=0,changed=0;
    for(let i=0;i<decoded.data.length;i++){const delta=Math.abs(decoded.data[i]-baseline.data[i]);sum+=delta;if(delta>8)changed++;}
    const comparison={meanChannelDifference:sum/decoded.data.length,channelsDifferingOver8:changed/decoded.data.length};
    assert.ok(comparison.meanChannelDifference<1 && comparison.channelsDifferingOver8<.01,JSON.stringify(comparison));
    report.observations.push({progress:actual.progress,viewport:{width:1280,height:900},trace:'exact_match',screenshot:name+'.png',sha256:hash(png),comparison});
  }
  await refContext.close();
  await wheelTo(page,.62);const before=(await state(page)).progress;
  await page.setViewportSize({width:1100,height:800});
  await page.waitForTimeout(300);
  assert.ok(Math.abs((await state(page)).progress-before)<.001,'Resize changed progress');
  await page.keyboard.press('PageDown');await page.waitForTimeout(300);
  assert.ok((await state(page)).progress>before,'Keyboard scroll did not advance story');
  await page.keyboard.press('PageUp');await page.waitForTimeout(300);
  assert.ok(Math.abs((await state(page)).progress-before)<.01);
  report.observations.push({nativeForwardReverseWheel:true,keyboardScroll:true,resizeProgressPreserved:true,reviewControls:0,runtimeErrors:errors});
  assert.deepEqual(errors,[]);await context.close();
  const mobile=await open(8771,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cdp=await mobile.context.newCDPSession(mobile.page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:720}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:200}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.page.waitForTimeout(300);
  assert.ok((await state(mobile.page)).progress>0,'Touch scroll did not advance');
  assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.page.screenshot({path:resolve(evidence,'mobile.png')});
  assert.deepEqual(mobile.errors,[]);report.observations.push({mobileViewport:{width:390,height:844},nativeTouchScroll:true,horizontalOverflow:false});await mobile.context.close();
  const reduced=await open(8771,{reducedMotion:'reduce'});
  assert.equal(await reduced.page.locator('canvas').count(),0);
  assert.ok(await reduced.page.locator('#static-story').isVisible());
  assert.equal(await reduced.page.locator('#static-story li').count(),5);
  report.observations.push({reducedMotion:'static approved asset and semantic copy, no graphics loop'});await reduced.context.close();
  const fallback=await open(8771,{},true);
  assert.ok(await fallback.page.locator('#static-story').isVisible());
  assert.equal(await fallback.page.locator('canvas').count(),0);
  await fallback.page.screenshot({path:resolve(evidence,'fallback.png')});
  report.observations.push({graphicsLoadFailure:'static approved asset and semantic copy'});await fallback.context.close();
  const dev=await open(8770);
  await wheelTo(dev.page,.69230769);
  const lifecycle=await dev.page.evaluate(async()=>{
    const {journey}=await import('/src/main.js');
    const before={loops:journey.activeFrameLoops,state:journey.controller.state};
    journey.dispose();journey.dispose();
    return {before,after:{loops:journey.activeFrameLoops,state:journey.controller.state,canvas:document.querySelectorAll('canvas').length,media:document.querySelectorAll('body>video').length}};
  });
  assert.deepEqual(lifecycle,{before:{loops:1,state:'mounted'},after:{loops:0,state:'disposed',canvas:0,media:0}});
  report.observations.push({developmentRootLoaded:true,lifecycle});assert.deepEqual(dev.errors,[]);await dev.context.close();
  report.status='checks_passed_pending_personal_review';
} catch(error) { report.status='failed';report.failure=error.stack;throw error; }
finally {writeFileSync(resolve(evidence,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,observations:report.observations.length}));
