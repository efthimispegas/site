import {chromium} from '@playwright/test';
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir=import.meta.dirname,workspace=resolve(dir,'../../../../../..'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),manifestSha256:sha(resolve(workspace,'apps/pegasoft-concept/website-motion-manifest.json')),scriptSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const b=await chromium.launch({channel:'chrome',headless:true});
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function wheel(p,y){await p.mouse.wheel(0,y-await p.evaluate(()=>window.scrollY));await p.waitForFunction(y=>Math.abs(window.scrollY-y)<2,y);await frame(p);}
async function styles(p){return p.evaluate(()=>Object.fromEntries(['#stage .trust h2','#ship-copy h2','.editorial-heading h2'].map(s=>{const c=getComputedStyle(document.querySelector(s));return[s,{size:c.fontSize,family:c.fontFamily,weight:c.fontWeight,line:c.lineHeight,tracking:c.letterSpacing,color:c.color,case:c.textTransform}]})));}
const errors=[];
try{
 for(const viewport of [{width:1506,height:753},{width:1280,height:900},{width:390,height:844}]){
  const context=await b.newContext({viewport,...(viewport.width===1506?{recordVideo:{dir:resolve(dir,'recording'),size:viewport}}:{})}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8771/?revision=homepage-amendments-20261014');await p.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');await frame(p);
  const type=await styles(p),before=JSON.parse(readFileSync(resolve(workspace,'artifacts/pegasoft-concept/evidence/outcome-amendments/20261014/before/playback.json'))).find(x=>x.size.width===viewport.width&&x.fonts)?.fonts;
  if(before){assert.deepEqual(type['#ship-copy h2'],before['#ship-copy h2']);assert.equal(type['#stage .trust h2'].size,before['#stage .trust h2'].size);}
  assert.equal(type['#stage .trust h2'].case,'none');
  const colors=await p.locator('#opening-stage .hero-copy .line>span').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.deepEqual(colors,['rgb(84, 99, 113)','rgb(245, 248, 252)','rgb(245, 248, 252)']);await p.screenshot({path:resolve(dir,viewport.width+'-hero.png')});
  const horizon=[];
  for(const progress of [.10,.18,.20,.22,.24,.27,.38]){
   const y=viewport.height*4.2*(progress+Math.max(0,Math.min(.17,progress-.10)));await wheel(p,y);const m=await p.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion));assert.ok(Math.abs(m.progress-progress)<.001);horizon.push({progress,state:m.state,layout:m.layout});if([.20,.24,.27].includes(progress))await p.screenshot({path:resolve(dir,viewport.width+'-outcome-'+progress+'.png')});
  }
  const trackTop=await p.locator('#story-track').evaluate(e=>e.getBoundingClientRect().top+window.scrollY),introHeight=await p.locator('#intro-track').evaluate(e=>e.getBoundingClientRect().height);assert.ok(Math.abs(trackTop-(introHeight-100))<1);
  await wheel(p,trackTop-viewport.height+50);await p.screenshot({path:resolve(dir,viewport.width+'-outcome-lift-edge.png')});
  const poses=[];
  for(const local of [0,.20,.30,.35,.45,.55,.60,.615,.63,.68,.76,.84,.93]){
   const y=trackTop+local*Math.max(3600,viewport.height*8)*.625;await wheel(p,y);const m=await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion));assert.equal(m.chapter,'handoff');assert.ok(Math.abs(m.progress-local)<.002);if(local<.60)assert.ok(Math.abs(m.framing-(viewport.width/viewport.height>=1.4?.60:.84))<1e-8);if(local>=.68)assert.ok(Math.abs(m.framing-1)<1e-6);if(local>=.55)assert.ok(m.contacts.every(c=>c.gap<1e-4));assert.ok(m.contextPoseResidual<1e-8);poses.push(m);if([0,.20,.35,.55,.60,.63].includes(local))await p.screenshot({path:resolve(dir,viewport.width+'-lift-'+local+'.png')});
  }
  const tail=await p.locator('#after-journey').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);await wheel(p,tail-viewport.height-10);await p.screenshot({path:resolve(dir,viewport.width+'-trust.png')});
  const trustColors=await p.locator('#stage .trust h2 span').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.deepEqual(trustColors,['rgb(113, 131, 151)','rgb(5, 7, 10)','rgb(5, 7, 10)']);
  const insights=await p.locator('#insights').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);await wheel(p,insights);await p.screenshot({path:resolve(dir,viewport.width+'-insights.png')});const clip=await p.locator('.editorial-heading').evaluate(e=>{const a=e.getBoundingClientRect(),h=e.querySelector('h2').getBoundingClientRect();return{bottom:a.bottom,titleBottom:h.bottom,padding:getComputedStyle(e).paddingBottom,title:h.toJSON()};});assert.ok(clip.bottom-clip.titleBottom>=11.5);
  const counts=await p.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion).counterPlayback.map(r=>r.plays));assert.ok(counts.every(x=>x===1));
  // Genuine reload from a scrolled section and a deep fragment must start at top.
  await p.evaluate(()=>history.replaceState(history.state,'',location.pathname+location.search+'#closing-cta'));await p.reload();await p.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');const restart=await p.evaluate(()=>({y:window.scrollY,hash:location.hash,m:JSON.parse(document.querySelector('#opening-stage').dataset.motion)}));assert.equal(restart.y,0);assert.equal(restart.hash,'');assert.equal(restart.m.progress,0);assert.ok(restart.m.openingTime<1.7);await p.screenshot({path:resolve(dir,viewport.width+'-reload-loader.png')});await p.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);await wheel(p,viewport.height*4.2*.2);await wheel(p,0);assert.equal(await p.locator('#stage').evaluate(s=>s.journey.activeFrameLoops),1);
  report.observations.push({viewport,type,colors,trustColors,horizon,poses,clip,restart:{y:restart.y,hash:restart.hash,openingTime:restart.m.openingTime},countersOnce:counts,tailTrim:100});const video=p.video();await context.close();if(video)report.recording=await video.path();
 }
 assert.deepEqual(errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{report.errors=errors;writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await b.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
