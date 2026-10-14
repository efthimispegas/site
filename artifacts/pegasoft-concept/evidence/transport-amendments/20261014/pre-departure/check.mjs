import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {Color} from '../../../../../../apps/pegasoft-concept/review/vendor/three/build/three.module.js';
const dir=import.meta.dirname,workspace=resolve(dir,'../../../../../..'),app=resolve(workspace,'apps/pegasoft-concept'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const glb=readFileSync(resolve(app,'public/assets/generation/container-family/model-draft/C01-container.glb')),j=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString()),paint=j.materials.find(m=>m.name==='cool_brushed_silver'),silver=new Color().fromArray(paint.pbrMetallicRoughness.baseColorFactor).getHexString();
const report={date:new Date().toISOString(),manifestSha256:sha(resolve(app,'website-motion-manifest.json')),scriptSha256:sha(new URL(import.meta.url)),c01Sha256:createHash('sha256').update(glb).digest('hex'),approvedSilver:silver,observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
async function wheel(p,y){await p.mouse.wheel(0,y-await p.evaluate(()=>window.scrollY));await p.waitForFunction(y=>Math.abs(window.scrollY-y)<2,y);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
try{
 for(const viewport of [{width:1503,height:655},{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,...(viewport.width===1503?{recordVideo:{dir:resolve(dir,'recording'),size:viewport}}:{})}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8771/?revision=pre-departure-20261014');await p.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
  const top=await p.locator('#story-track').evaluate(e=>e.getBoundingClientRect().top+window.scrollY),span=Math.max(3600,viewport.height*8)*.625;
  const poses=[];for(const local of [0,.20,.35,.49]){await wheel(p,top+span*local);const r=await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion));assert.deepEqual(r.contextFinishes.map(x=>x.paint),['#061e3b','#147dff']);assert.ok(r.contextFinishes.every(x=>x.panels>0));assert.ok(r.c01Paint.every(x=>x===silver));poses.push(r);if(local===0||local===.35)await p.screenshot({path:resolve(dir,viewport.width+'-pickup-'+local+'.png')});}
  for(let local=.50;local<=.70;local+=.005){await wheel(p,top+span*local);const r=await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion));if(r.progress>=.60){assert.equal(r.framing,1);assert.deepEqual(r.camera,r.acceptedCamera);assert.ok(Math.abs(r.target[1])<1e-7);assert.ok(Math.abs(r.truckScreen[1])<.04,'Truck ground anchor crossed services boundary');assert.ok(r.contacts.every(x=>x.gap<1e-5));}assert.ok(r.contextPoseResidual<1e-8);assert.ok(r.c01Paint.every(x=>x===silver));poses.push(r);}
  for(const local of [.60,.63,.65]){await wheel(p,top+span*local);await p.screenshot({path:resolve(dir,viewport.width+'-services-'+local+'.png')});}
  for(let local=.70;local>=.48;local-=.005){await wheel(p,top+span*local);const r=await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion));if(r.progress>=.60)assert.equal(r.framing,1);poses.push(r);}
  await wheel(p,top+span*.49);await p.screenshot({path:resolve(dir,viewport.width+'-reverse-close-framing.png')});assert.deepEqual(errors,[]);assert.equal(await p.locator('#stage').evaluate(s=>s.journey.activeFrameLoops),1);
  report.observations.push({viewport,poses,errors});const v=p.video();await context.close();if(v)report.recording=await v.path();
 }
 report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
