import {chromium} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/node_modules/@playwright/test/index.mjs';
import {scrollAtProgress} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/apps/pegasoft-concept/src/transport-timeline.js';
import {introScrollAtProgress} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/apps/pegasoft-concept/src/intro-sequence.js';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const out='/Users/whiskey/.codex/worktrees/pegasoft-concept/site/artifacts/pegasoft-concept/evidence/mobile-startup/20261019',result={errors:[],checks:[],parity:[]};const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:1505,height:749}}),p=await ctx.newPage();p.on('pageerror',e=>result.errors.push(e.message));let t=Date.now();await p.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.documentElement.classList.contains('journey-booting'));result.desktopOpeningMs=Date.now()-t;await p.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),introScrollAtProgress(.5,749));await p.waitForTimeout(350);assert.equal(await p.locator('.outcome').getAttribute('hidden'),null);await p.screenshot({path:out+'/outcome-counters.png'});result.checks.push('Outcome and counter reels render after startup');
 const keys=['camera','quaternion','target','cargoMatrix','shipMatrix','shipPosition','hullScreen','clouds','jet','grabberMatrix','grabberScale'];
 for(const progress of [0,.18,.36,.5,.72,.93]){
  const traces=[];
  for(const url of ['http://127.0.0.1:8780/','http://127.0.0.1:8771/']){
   // Browser contexts are isolated; use the same viewport and exact rounded native scroll offset.
   const c=await browser.newContext({viewport:{width:1505,height:749}}),q=await c.newPage();await q.goto(url,{waitUntil:'domcontentloaded'});await q.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
   await q.evaluate(y=>{const track=document.querySelector('#story-track');scrollTo({top:track.getBoundingClientRect().top+scrollY+y,behavior:'instant'});},scrollAtProgress(progress,749));await q.waitForTimeout(150);
   traces.push(await q.locator('#stage').evaluate((e,keys)=>{const trace=JSON.parse(e.dataset.motion);return Object.fromEntries(keys.filter(k=>k in trace).map(k=>[k,trace[k]]));},keys));await c.close();
  }
  assert.deepEqual(traces[0],traces[1]);result.parity.push({progress,passed:true,keys:Object.keys(traces[0])});
 }
 await ctx.close();
 const slow=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await slow.route('**/*.glb',async route=>{await new Promise(resolve=>setTimeout(resolve,6500));await route.continue();});
 const q=await slow.newPage();q.on('pageerror',e=>result.errors.push(e.message));t=Date.now();await q.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await q.waitForFunction(()=>!document.documentElement.classList.contains('journey-booting'));result.slowModelOpeningMs=Date.now()-t;
 assert.equal(await q.locator('#stage').getAttribute('data-loaded'),'false');await q.evaluate(()=>scrollTo({top:50000,behavior:'instant'}));await q.waitForTimeout(150);
 result.pending=await q.evaluate(()=>({y:scrollY,storyStart:document.querySelector('#story-track').getBoundingClientRect().top+scrollY,progress:document.querySelector('#stage').journey.progress,canvasVisibility:getComputedStyle(document.querySelector('#stage canvas')).visibility}));assert(result.pending.y<=result.pending.storyStart+1);assert.equal(result.pending.canvasVisibility,'hidden');result.checks.push('Slow model downloads do not extend opening; fast scroll holds at pending chapter without exposing warmup');await q.screenshot({path:out+'/pending-chapter.png'});
 await q.setViewportSize({width:844,height:390});await q.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true',{},{timeout:22000});assert.equal(await q.evaluate(()=>document.body.classList.contains('static-journey')),false);result.checks.push('Viewport rotation during preparation retains live journey');
 await q.reload({waitUntil:'domcontentloaded'});assert.equal(await q.evaluate(()=>scrollY),0);assert(await q.evaluate(()=>document.documentElement.classList.contains('journey-booting')));await q.waitForFunction(()=>!document.documentElement.classList.contains('journey-booting'));result.checks.push('Refresh from journey resets to loader/top');await slow.close();
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),r=await reduced.newPage();await r.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});await r.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='static');assert.equal(await r.evaluate(()=>document.documentElement.classList.contains('journey-booting')),false);result.checks.push('Reduced-motion fallback unlocks immediately');await reduced.close();assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=e.stack;process.exitCode=1;}finally{await browser.close();await writeFile(out+'/boundaries.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
