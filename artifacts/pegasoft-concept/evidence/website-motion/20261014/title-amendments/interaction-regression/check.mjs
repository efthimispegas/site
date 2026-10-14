import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir=import.meta.dirname,workspace=resolve(dir,'../../../../../../..'),app=resolve(workspace,'apps/pegasoft-concept');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),manifestSha256:sha(resolve(app,'website-motion-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function wheel(page,delta){const old=await page.evaluate(()=>window.scrollY);await page.mouse.wheel(0,delta);await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,old+delta);await frame(page);}
async function pose(page){return page.locator('#closing-cursor').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,opacity:getComputedStyle(e).opacity,text:e.textContent,active:e.parentElement.dataset.pointer};});}
function at(p,x,y){assert.ok(Math.abs(p.x-x)<1.5&&Math.abs(p.y-y)<1.5,`Pointer drift: ${JSON.stringify(p)} vs ${x},${y}`);assert.equal(p.opacity,'1');}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:resolve(dir,'recording'),size:{width:1280,height:900}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8771/?revision=cta-pointer-20261014');await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 const top=await page.locator('#closing-cta').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);await wheel(page,top-250);await page.mouse.move(700,100);await frame(page);assert.equal((await pose(page)).opacity,'0');
 await page.mouse.move(700,300);await frame(page);const enter=await pose(page);at(enter,700,300);assert.ok(!enter.text.includes('↗'));await page.screenshot({path:resolve(dir,'enter.png')});
 await page.mouse.move(700,100);await frame(page);const leave=await pose(page);assert.equal(leave.opacity,'0');
 await page.mouse.move(300,450);await frame(page);const reenter=await pose(page);at(reenter,300,450);
 const scrolling=[];for(const delta of [60,60,60]){await wheel(page,delta);const p=await pose(page);at(p,300,450);scrolling.push(p);}await page.screenshot({path:resolve(dir,'scroll-stationary-pointer.png')});
 await wheel(page,-500);await frame(page);assert.equal((await pose(page)).opacity,'0');await wheel(page,600);const scrollEntry=await pose(page);at(scrollEntry,300,450);
 await page.mouse.move(930,410);await frame(page);const next=await pose(page);at(next,930,410);await page.screenshot({path:resolve(dir,'reentry-and-move.png')});
 const currentTop=await page.locator('#closing-cta').evaluate(e=>e.getBoundingClientRect().top);await wheel(page,currentTop);await page.mouse.move(10,880);await frame(page);await page.locator('#closing-cursor').focus();await frame(page);assert.equal((await pose(page)).opacity,'1');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.id==='contact');
 await page.locator('#particle-wordmark').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.points)>500);const canvas=page.locator('#particle-wordmark'),width=await canvas.evaluate(e=>e.clientWidth),radius=Number(await canvas.getAttribute('data-interaction-radius'));assert.ok(Math.abs(radius-.8*Math.min(95,width*.17))<1e-8);const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.displacement)>10);await page.screenshot({path:resolve(dir,'particles-radius-76.png')});await page.mouse.move(0,0);await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.displacement)<.01);
 assert.equal(await page.locator('#stage').evaluate(s=>s.journey.activeFrameLoops),1);assert.deepEqual(errors,[]);report.observations.push({enter,leave,reenter,scrolling,scrollEntry,next,keyboardContact:true,particleRadius:radius,previousRadius:Math.min(95,width*.17),particleReassembly:true,errors});const video=page.video();await context.close();report.recording=await video.path();
 for(const reduced of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,...(reduced?{reducedMotion:'reduce'}:{})});await page.goto('http://127.0.0.1:8771/?revision=cta-pointer-20261014');if(reduced)await page.waitForFunction(()=>document.body.classList.contains('static-journey'));else await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');await page.locator('#closing-cta').scrollIntoViewIfNeeded();await frame(page);assert.equal((await pose(page)).opacity,'1');assert.equal(await page.locator('#closing-cta').getAttribute('data-pointer-mode'),'false');await page.locator('#closing-cursor').tap();await page.waitForFunction(()=>document.activeElement?.id==='contact');await page.screenshot({path:resolve(dir,reduced?'reduced.png':'touch.png')});report.observations.push({mobile:true,reduced,stationaryCta:true,touchContact:true});await page.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
