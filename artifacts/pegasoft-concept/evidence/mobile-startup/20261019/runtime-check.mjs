import {chromium,webkit} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/node_modules/@playwright/test/index.mjs';
import {scrollAtProgress} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/apps/pegasoft-concept/src/transport-timeline.js';
import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out='/Users/whiskey/.codex/worktrees/pegasoft-concept/site/artifacts/pegasoft-concept/evidence/mobile-startup/20261019';
const results=[];
async function touch(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:690}]});for(let y=650;y>100;y-=90)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
for(const mode of ['chromium-swipe','blocked-video','denied-autoplay','webkit-mobile']){
 let browser;const record={mode,errors:[]};results.push(record);
 try{
 browser=await(mode==='webkit-mobile'?webkit:chromium).launch(mode==='webkit-mobile'?{headless:true}:{channel:'chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 if(mode==='blocked-video')await ctx.route('**/ocean-motion.mp4',()=>{});
 if(mode==='denied-autoplay')await ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Controlled autoplay denial','NotAllowedError'));};});
 const p=await ctx.newPage();p.on('pageerror',e=>record.errors.push(e.message));
 let cdp;if(mode!=='webkit-mobile'){cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 const start=Date.now();await p.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});
 if(cdp)await touch(cdp);else await p.evaluate(()=>scrollTo(0,1800));
 record.early=await p.evaluate(()=>({y:scrollY,locked:document.documentElement.classList.contains('journey-booting'),preparing:document.querySelector('#opening-stage').dataset.preparing}));assert.equal(record.early.y,0);assert.equal(record.early.locked,true);
 await p.waitForFunction(()=>!document.documentElement.classList.contains('journey-booting'),{},{timeout:26000});record.heroUnlockedMs=Date.now()-start;
 await p.waitForFunction(()=>['true','error'].includes(document.querySelector('#stage')?.dataset.loaded),{},{timeout:26000});
 record.elapsedMs=Date.now()-start;record.ready=await p.evaluate(()=>({state:document.querySelector('#stage').dataset.loaded,y:scrollY,locked:document.documentElement.classList.contains('journey-booting'),static:document.body.classList.contains('static-journey'),loops:document.querySelector('#stage').journey.activeFrameLoops}));assert.equal(record.ready.state,'true');assert.equal(record.ready.locked,false);assert.equal(record.ready.y,0);assert.equal(record.ready.static,false);assert.equal(record.ready.loops,1);
 if(mode==='chromium-swipe'||mode==='webkit-mobile')await p.screenshot({path:out+'/after-'+mode+'-hero.png'});
 if(cdp){await touch(cdp);await p.waitForTimeout(500);record.afterReadySwipeY=await p.evaluate(()=>scrollY);assert(record.afterReadySwipeY>0);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:400}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(1000);}
 record.boundaries=[];
 for(const progress of [0,.18,.36,.5,.72,.93,1,.72,.36,0]){
  const offset=scrollAtProgress(progress,844);await p.evaluate(offset=>{const track=document.querySelector('#story-track');scrollTo({top:track.getBoundingClientRect().top+scrollY+offset,behavior:'instant'});},offset);await p.waitForTimeout(mode==='webkit-mobile'?180:110);
  const frame=await p.evaluate(()=>({progress:document.querySelector('#stage').journey.progress,trace:JSON.parse(document.querySelector('#stage').dataset.motion),draws:Number(document.querySelector('#stage').dataset.drawCalls),canvas:[...document.querySelectorAll('canvas')].map(c=>[c.width,c.height])}));record.boundaries.push(frame);assert(Math.abs(frame.progress-progress)<.001,JSON.stringify({wanted:progress,actual:frame.progress,traceChapter:frame.trace.chapter}));assert(frame.draws>0);
  if(['chromium-swipe','blocked-video','webkit-mobile'].includes(mode)&&[.18,.5,.72,.93].includes(progress))await p.screenshot({path:out+'/after-'+mode+'-'+progress+'.png'});
 }
 if(mode==='blocked-video'){await p.waitForTimeout(21500-record.elapsedMs>0?21500-record.elapsedMs:0);assert.equal(await p.locator('#stage').getAttribute('data-loaded'),'true');record.survivesOldDeadline=true;}
 assert.deepEqual(record.errors,[]);record.passed=true;
 }catch(e){record.passed=false;record.failure=e.stack;}finally{await browser?.close();await writeFile(out+'/after.json',JSON.stringify(results,null,2)+'\n');console.log(mode,JSON.stringify({...record,boundaries:record.boundaries?.map(f=>({progress:f.progress,chapter:f.trace.chapter,draws:f.draws}))}));}
}
if(results.some(r=>!r.passed))process.exitCode=1;
