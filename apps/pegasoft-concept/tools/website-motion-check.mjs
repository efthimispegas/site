import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),dir=resolve(workspace,'artifacts/pegasoft-concept/evidence/website-motion/20261014');mkdirSync(dir,{recursive:true});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),preset=JSON.parse(readFileSync(resolve(workspace,'artifacts/pegasoft-concept/evidence/loader-reassessment/20261014/ring42-cta/current-preset.json')));
const report={date:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),motionManifestSha256:sha(resolve(app,'website-motion-manifest.json')),homepageManifestSha256:sha(resolve(app,'homepage-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function wheelTo(page,y){await page.mouse.wheel(0,y-await page.evaluate(()=>window.scrollY));await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,y);await frame(page);}
const top=(page,selector)=>page.locator(selector).evaluate(e=>e.getBoundingClientRect().top+window.scrollY);
async function open(viewport,extra={}){const context=await browser.newContext({viewport,...extra}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8771/?revision=website-motion-20261014');return {context,page,errors};}
try{
 // Exact user preset reaches both entry points and the compositor loading beat.
 const held=await browser.newPage({viewport:{width:1280,height:900}});let release;const data=new Promise(r=>release=r);await held.route('**/land-dots.json',async route=>{await data;await route.continue();});await held.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});
 const beat=await held.locator('#radar').evaluate(e=>({period:getComputedStyle(e).animationDuration,horizon:getComputedStyle(document.querySelector('.outcome-world')).visibility}));assert.deepEqual(beat,{period:'1.74s',horizon:'hidden'});release();await held.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');assert.deepEqual(await held.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion).loaderSettings),preset);await held.close();
 const loader=await browser.newPage();await loader.goto('http://127.0.0.1:8771/review/loader.html');await loader.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');assert.deepEqual(await loader.locator('#preset').evaluate(e=>JSON.parse(e.value)),preset);await loader.locator('#control-bounce').focus();await loader.locator('#control-bounce').press('ArrowRight');await loader.locator('#reset').click();assert.deepEqual(await loader.locator('#preset').evaluate(e=>JSON.parse(e.value)),preset);await loader.close();report.observations.push({approvedPresetExact:true,resetExact:true,loadingBeat:beat});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const {context,page,errors}=await open(viewport,viewport.width===1280?{recordVideo:{dir:resolve(dir,'recording'),size:viewport}}:{hasTouch:true,isMobile:true});
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');assert.equal(await page.locator('#section-contact').isVisible(),false);
  const entry=await top(page,'#insights');await wheelTo(page,entry-viewport.height*.65);await page.screenshot({path:resolve(dir,`boundary-${viewport.width}.png`)});
  const arriving=await page.locator('main').evaluate(e=>JSON.parse(e.dataset.websiteMotion));assert.ok(arriving.editorial>0&&arriving.editorial<1);await wheelTo(page,entry);assert.equal(await page.locator('#section-contact').isVisible(),true);await page.screenshot({path:resolve(dir,`editorial-${viewport.width}.png`)});
  const previews=[];const buttons=await page.locator('button[data-preview]').all();for(let i=0;i<buttons.length;i++){
   if(viewport.width===1280){await buttons[i].hover();}else await buttons[i].tap();await frame(page);
   assert.equal(await page.locator('#insights').getAttribute('data-preview'),String(i));const shown=await page.locator('[data-preview-image]:visible').getAttribute('src');previews.push(shown);await page.screenshot({path:resolve(dir,`preview-${viewport.width}-${i}.png`)});
  }
  assert.equal(new Set(previews).size,3);await buttons[0].focus();await frame(page);assert.equal(await page.locator('#insights').getAttribute('data-preview'),'0');
  const cta=await top(page,'#closing-cta');await wheelTo(page,cta);assert.equal(await page.locator('#section-contact').isVisible(),false);await page.screenshot({path:resolve(dir,`cta-${viewport.width}.png`)});
  if(viewport.width===1280){await page.mouse.move(1000,570);await page.waitForTimeout(180);await page.mouse.move(720,450);await frame(page);assert.equal(await page.locator('#closing-cta').getAttribute('data-pointer'),'true');assert.ok((await page.locator('.closing-trail').first().evaluate(e=>Number(getComputedStyle(e).opacity)))>0);await page.screenshot({path:resolve(dir,'cursor-trails.png')});await page.mouse.move(10,10);await page.locator('#closing-cursor').focus();await page.keyboard.press('Enter');}else await page.locator('#closing-cursor').tap();
  await page.waitForFunction(()=>document.activeElement?.id==='contact');await page.waitForTimeout(700);assert.equal(await page.locator('#contact').isVisible(),true);
  await page.locator('[data-footer-mode="services"]').click();assert.equal(await page.locator('#website-footer').getAttribute('data-mode'),'services');assert.match(await page.locator('[data-marquee-group]').first().textContent(),/Web engineering/);
  await page.mouse.move(0,0);await frame(page);const first=await page.locator('#marquee-track').evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(150);const second=await page.locator('#marquee-track').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(first,second,'Marquee is frozen');
  await page.locator('[data-footer-mode="industries"]').click();await page.locator('#particle-wordmark').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.points)>500);await frame(page);
  const canvas=page.locator('#particle-wordmark'),rest=await canvas.evaluate(e=>e.toDataURL());
  if(viewport.width===1280){const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.54,box.y+box.height*.47);}else await canvas.focus();
  await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.displacement)>20);const dispersed=await canvas.evaluate(e=>e.toDataURL());assert.notEqual(rest,dispersed);await page.screenshot({path:resolve(dir,`footer-disperse-${viewport.width}.png`)});
  await page.mouse.move(0,0);await canvas.evaluate(e=>e.blur());await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.displacement)<.01);await page.screenshot({path:resolve(dir,`footer-${viewport.width}.png`)});
  const before=await page.locator('#website-footer').evaluate(e=>({fraction:-e.getBoundingClientRect().top/e.getBoundingClientRect().height}));await page.setViewportSize({width:viewport.width,height:viewport.height-80});await page.waitForFunction(()=>Math.abs(document.querySelector('#intro-track').getBoundingClientRect().height-innerHeight*5.2)<2);await frame(page);const after=await page.locator('#website-footer').evaluate(e=>({fraction:-e.getBoundingClientRect().top/e.getBoundingClientRect().height}));assert.ok(Math.abs(before.fraction-after.fraction)<.03,'Footer resize jumped to transport');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Reverse physically across the new chapter boundary; appearance and prior
  // object transforms remain owned by their accepted controllers.
  await wheelTo(page,await top(page,'#closing-cta'));await wheelTo(page,await top(page,'#insights'));assert.equal(await page.locator('#section-contact').isVisible(),true);assert.equal(await page.locator('#insights').getAttribute('data-preview'),'0');
  const cleanup=await page.locator('#stage').evaluate(e=>{const h=e.journey,before=h.activeFrameLoops;h.dispose();h.dispose();return {before,after:h.activeFrameLoops,wordmark:document.querySelector('#particle-wordmark').dataset.disposed,transportCanvases:e.querySelectorAll('canvas').length};});assert.deepEqual(cleanup,{before:1,after:0,wordmark:'true',transportCanvases:0});assert.deepEqual(errors,[]);
  report.observations.push({viewport,arrival:arriving,previews,keyboardOrTouchContact:true,marqueeRuns:true,particleDispersesAndReforms:true,resize:{before,after},reverse:true,cleanup,errors});const video=page.video();await context.close();if(video)report.recording=await video.path();
 }
 const {context,page}=await open({width:390,height:844},{reducedMotion:'reduce'});await page.waitForFunction(()=>document.body.classList.contains('static-journey'));await page.locator('#website-footer').scrollIntoViewIfNeeded();await frame(page);assert.equal(await page.locator('#stage').evaluate(e=>e.journey.activeFrameLoops),0);const before=await page.locator('#marquee-track').evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(120);assert.equal(await page.locator('#marquee-track').evaluate(e=>getComputedStyle(e).transform),before);await page.waitForFunction(()=>Number(document.querySelector('#particle-wordmark').dataset.points)>500);await page.screenshot({path:resolve(dir,'reduced-motion.png')});report.observations.push({reducedMotionStatic:true,loops:0});await context.close();
 report.status='passed_pending_personal_review';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
