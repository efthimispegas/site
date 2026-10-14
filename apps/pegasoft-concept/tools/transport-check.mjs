import {chromium} from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chapters,duration,scrollAtProgress} from '../src/transport-timeline.js';
import {storyTime as shipTime} from '../review/ship-integration-sequence.js';

const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/transport-assembly');
mkdirSync(evidence,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  inputManifestSha256:hash(readFileSync(resolve(app,'transport-integration-manifest.json'))),checkSha256:hash(readFileSync(new URL(import.meta.url))),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open(url,options={}){
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'no-preference',...options});
  const page=await context.newPage(),errors=[];
  await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  if(url.includes(':8767/')){await page.route('**/watch/**',r=>r.abort());await page.route('**/evidence/**',r=>r.abort());}
  await page.goto(url,{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.loaded==='true',{},{timeout:30000});}
  catch(error){report.observations.push({initializationFailure:{url,errors,status:await page.locator('#status').textContent().catch(()=>null)}});throw error;}
  await page.evaluate(()=>document.fonts.ready);
  return {context,page,errors};
}
async function freeze(page){await page.evaluate(async()=>{for(const v of document.querySelectorAll('body>video')){v.pause();if(v.currentTime>.001)await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=0;});}});}
const state=page=>page.locator('#stage').evaluate(stage=>JSON.parse(stage.dataset.motion));
async function toProgress(page,p){
  const height=await page.evaluate(()=>window.innerHeight),offset=scrollAtProgress(p,height),current=await page.evaluate(()=>window.scrollY);
  await page.mouse.move(640,450);await page.mouse.wheel(0,offset-current);
  await page.waitForFunction(offset=>Math.abs(window.scrollY-offset)<2,offset);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return state(page);
}
function fullProgress(chapter,p){return chapter==='handoff'?p*18.75/duration:chapter==='ship'?(chapters[0].duration+shipTime(p))/duration:(chapters[0].duration+chapters[1].duration+p*26)/duration;}
async function reference(url){
  const result=await open(url);
  await result.page.addStyleTag({content:'header,footer,main>h1,main>p,main>.panel,main>details,#viewer>:not(#stage){display:none!important}main{max-width:none;margin:0;padding:0}#viewer{display:contents}#story-track{height:19000px}#stage{position:sticky;top:0;width:100%;height:100vh;border:0;border-radius:0}'});
  if(url.includes('/ship-integration.html')){
    // The accepted root/cloud review supersedes the older ship inspector's
    // viewport font sizing. Reuse only those four frozen approved copy rules.
    const css=readFileSync(resolve(evidence,'accepted-inputs/src/journey.css'),'utf8');
    const rules=css.match(/#ship-copy(?: h2| ol| li p| li span)\{font-size:min[^}]+\}/g).join('\n');
    await result.page.addStyleTag({content:rules});
    await result.page.locator('#stage').evaluate(stage=>stage.style.setProperty('--story-height','900px'));
  }
  await result.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await freeze(result.page);return result;
}
function near(a,b,name,tolerance=1e-9){
  assert.equal(a.length,b.length,name);
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<tolerance),`${name} differs`);
}
try{
  const root=await open('http://127.0.0.1:8771/');await freeze(root.page);
  assert.equal(await root.page.locator('canvas').count(),1);assert.equal(await root.page.locator('input,button,#viewer').count(),0);
  for(const [chapter,url,points]of [
    ['handoff','http://127.0.0.1:8767/review/handoff.html#viewer',[0,.20,.30,.40,.55,.63,.80,.87,.95]],
    ['ship','http://127.0.0.1:8767/review/ship-integration.html#viewer',[.12,.32,.44,.60,.80]],
    ['crossing','http://127.0.0.1:8772/review/ship-jet-integration.html#viewer',[.24615385,.53846154,.69230769,.84615385,1]],
  ]){
    const ref=await reference(url);
    for(const p of points){
      const r=await toProgress(root.page,fullProgress(chapter,p));assert.equal(r.chapter,chapter);
      await ref.page.locator('#progress').evaluate((i,p)=>{i.type='number';i.step='any';i.value=String(p);i.dispatchEvent(new Event('input',{bubbles:true}));},r.progress);
      await ref.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const baseline=await state(ref.page);
      for(const key of ['camera','quaternion','cargoMatrix'])near(r[key],baseline[key],chapter+':'+p+':'+key);
      if(chapter==='handoff'){
        near(r.grabberScale,baseline.grabberScale,'Rigid grabber');near(r.truckPosition,baseline.truckPosition,'Truck position');
        if(r.progress>=.55)assert.ok(Math.max(...r.contacts.map(c=>c.gap))<1e-8);
        assert.ok(Math.max(...r.ground.map(Math.abs))<1e-8);
      }else{near(r.shipMatrix,baseline.shipMatrix,'Ship transform');assert.ok(r.ownershipMatrixResidual<1e-8);assert.ok(r.supportGap<1e-8);}
      const name=chapter+'-'+Math.round(p*10000),png=await root.page.screenshot({path:resolve(evidence,name+'.png')}),refPng=await ref.page.locator('#stage').screenshot({path:resolve(evidence,'reference-'+name+'.png')});
      const a=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(refPng).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(a.info,b.info);
      let sum=0,changed=0;for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);sum+=d;if(d>8)changed++;}
      const comparison={meanChannelDifference:sum/a.data.length,channelsDifferingOver8:changed/a.data.length};
      report.observations.push({chapter,localProgress:r.progress,journeyProgress:r.journeyProgress,screenshot:name+'.png',sha256:hash(png),comparison,transforms:'matched within 1e-9'});
      assert.ok(comparison.meanChannelDifference<1&&comparison.channelsDifferingOver8<.01,chapter+':'+p+' '+JSON.stringify(comparison));
    }
    assert.deepEqual(ref.errors,[]);await ref.context.close();console.log(chapter+' source comparisons passed');
  }
  for(const boundary of [chapters[0].duration/duration,(chapters[0].duration+chapters[1].duration)/duration]){
    const states=[];
    for(const p of [boundary-.0001,boundary,boundary+.0001,boundary,boundary-.0001])states.push(await toProgress(root.page,p));
    const jumps=states.slice(1).map((r,i)=>({camera:Math.hypot(...r.camera.map((v,k)=>v-states[i].camera[k])),cargo:Math.hypot(...r.cargoMatrix.slice(12,15).map((v,k)=>v-states[i].cargoMatrix[k+12]))}));
    assert.ok(jumps.every(j=>j.camera<1&&j.cargo<1),'Boundary transform jump');
    near(states[0].camera,states.at(-1).camera,'Reverse camera restoration');near(states[0].cargoMatrix,states.at(-1).cargoMatrix,'Reverse container restoration');
    report.observations.push({boundary,forwardReverse:true,jumps});
  }
  // Genuine steady wheel scrolling through the transport departure and camera turn.
  await toProgress(root.page,fullProgress('handoff',.58));const motion=[];
  for(let i=0;i<32;i++){await root.page.mouse.wheel(0,55);await root.page.waitForTimeout(40);motion.push(await state(root.page));}
  assert.ok(motion.every((r,i)=>!i||r.journeyProgress>=motion[i-1].journeyProgress));
  writeFileSync(resolve(evidence,'scroll-playback.json'),JSON.stringify(motion,null,2)+'\n');
  await toProgress(root.page,.53);const before=(await state(root.page)).journeyProgress;
  await root.page.setViewportSize({width:1100,height:800});await root.page.waitForTimeout(300);
  assert.ok(Math.abs((await state(root.page)).journeyProgress-before)<.001,'Resize changed story time');
  await root.page.keyboard.press('PageDown');await root.page.waitForTimeout(300);assert.ok((await state(root.page)).journeyProgress>before);
  assert.deepEqual(root.errors,[]);report.observations.push({nativeScrollPlayback:motion.length,resizePreserved:true,keyboard:true,canvasCount:1,inspectionControls:0,runtimeErrors:root.errors});await root.context.close();
  const mobile=await open('http://127.0.0.1:8771/',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cdp=await mobile.context.newCDPSession(mobile.page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:720}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:200}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.page.waitForTimeout(1200);
  await mobile.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok((await state(mobile.page)).journeyProgress>0);assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.page.screenshot({path:resolve(evidence,'mobile.png')});assert.deepEqual(mobile.errors,[]);report.observations.push({mobileTouch:true,horizontalOverflow:false});await mobile.context.close();
  const reducedContext=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const reduced=await reducedContext.newPage();await reduced.goto('http://127.0.0.1:8771/');
  await reduced.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='static');
  assert.equal(await reduced.locator('canvas').count(),0);assert.ok(await reduced.locator('#static-story').isVisible());
  report.observations.push({reducedMotion:'approved static asset with semantic copy, no renderer'});await reducedContext.close();
  const failedContext=await browser.newContext({viewport:{width:1280,height:900}}),failed=await failedContext.newPage();
  await failed.route('**/*.glb',r=>r.abort());await failed.goto('http://127.0.0.1:8771/');
  await failed.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='error');
  assert.equal(await failed.locator('canvas').count(),0);assert.ok(await failed.locator('#static-story').isVisible());
  report.observations.push({initializationFailure:'approved static fallback, canvas cleaned up'});await failedContext.close();
  const dev=await open('http://127.0.0.1:8770/');
  const cleanup=await dev.page.evaluate(async()=>{const journey=document.querySelector('#stage').journey;await journey.mount();const before=journey.activeFrameLoops;journey.dispose();journey.dispose();return {before,after:journey.activeFrameLoops,canvas:document.querySelectorAll('canvas').length,videos:document.querySelectorAll('body>video').length};});
  assert.deepEqual(cleanup,{before:1,after:0,canvas:0,videos:0});report.observations.push({cleanup});assert.deepEqual(dev.errors,[]);await dev.context.close();
  report.status='checks_passed_pending_personal_review';
}catch(error){report.status='failed';report.failure=error.stack;throw error;}
finally{writeFileSync(resolve(evidence,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,observations:report.observations.length}));
