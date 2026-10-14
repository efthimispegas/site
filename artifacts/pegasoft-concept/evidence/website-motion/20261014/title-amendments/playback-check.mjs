import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {resolve} from 'node:path';
const dir=import.meta.dirname,workspace=resolve(dir,'../../../../../..'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),out={date:new Date().toISOString(),manifestSha256:sha(resolve(workspace,'apps/pegasoft-concept/website-motion-manifest.json')),scriptSha256:sha(new URL(import.meta.url)),userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});let context;
async function wheel(p,y){await p.mouse.wheel(0,y-await p.evaluate(()=>window.scrollY));await p.waitForFunction(y=>Math.abs(window.scrollY-y)<2,y);await p.waitForTimeout(60);}
try{
 context=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:resolve(dir,'normal-playback'),size:{width:1366,height:768}}});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8771/?revision=homepage-amendments-20261014');await p.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
 const start=await p.locator('#story-track').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);
 for(let y=160;y<start;y+=160)await wheel(p,y);await wheel(p,start);
 const poses=[],span=768*8*.625;
 for(let local=0;local<=.70;local+=.008){await wheel(p,start+span*local);poses.push(await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion)));}
 const zoom=poses.filter(r=>r.progress>=.60);for(let i=1;i<zoom.length;i++)assert.ok(zoom[i].framing>=zoom[i-1].framing-1e-8);assert.equal(zoom.at(-1).framing,1);assert.ok(poses.every(r=>r.grabberScale.every((v,i)=>Math.abs(v-poses[0].grabberScale[i])<1e-9)));assert.ok(poses.filter(r=>r.progress>=.55).every(r=>r.contacts.every(c=>c.gap<1e-4)));
 for(let local=.70;local>=.20;local-=.012)await wheel(p,start+span*local);await p.screenshot({path:resolve(dir,'1366-reverse-pickup.png')});
 // Joined ship block motion uses the same equations with smaller row offsets.
 const handoffSpan=span*.97,shipSpan=768*8*1.04,ship=[];
 for(const local of [.68,.75,.80]){await wheel(p,start+handoffSpan+local*shipSpan);const r=await p.locator('#stage').evaluate(e=>JSON.parse(e.dataset.motion));assert.equal(r.chapter,'ship');assert.ok(Math.abs(r.copyLayout.rowSpacing-.42768*.85)<1e-10);ship.push(r);await p.screenshot({path:resolve(dir,'1366-ship-'+local+'.png')});}
 const crossingStart=start+handoffSpan+shipSpan*.84;for(const local of [.1,.25,.4,.7,1])await wheel(p,crossingStart+shipSpan*local);
 const insights=await p.locator('#insights').evaluate(e=>e.getBoundingClientRect().top+window.scrollY);await wheel(p,insights);await p.screenshot({path:resolve(dir,'1366-insights.png')});const clip=await p.locator('.editorial-heading').evaluate(e=>({space:e.getBoundingClientRect().bottom-e.querySelector('h2').getBoundingClientRect().bottom}));assert.ok(clip.space>=11.5);
 // Resize in the horizon's remapped span retains its local progress.
 await wheel(p,768*4.2*.34);const before=await p.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion).progress);await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(150);const after=await p.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion).progress);assert.ok(Math.abs(before-after)<.001);assert.deepEqual(errors,[]);out.status='passed';out.zoom=zoom.map(r=>({p:r.progress,framing:r.framing,camera:r.camera}));out.ship=ship.map(r=>({p:r.progress,copy:r.copyLayout}));out.resize={before,after};out.clip=clip;out.errors=errors;const v=p.video();await context.close();context=null;out.recording=await v.path();
}catch(e){out.status='failed';out.failure=e.stack;process.exitCode=1;}
finally{if(context)await context.close();writeFileSync(resolve(dir,'playback-checks.json'),JSON.stringify(out,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:out.status,failure:out.failure}));
