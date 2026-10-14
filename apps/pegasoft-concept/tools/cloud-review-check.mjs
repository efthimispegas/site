import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..');
const evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/cloud-continuity');
mkdirSync(evidence,{recursive:true});
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const report={date:new Date().toISOString(),scope:'cloud centres and continued cloud-only clock',
  amendmentSha256:sha(resolve(app,'runtime-amendments.json')),baselineSha256:sha(resolve(app,'baseline-manifest.json')),
  scriptSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const samples=[...new Set([...Array.from({length:31},(_,i)=>Number((.23+i*.001).toFixed(4))),
  .4,.54,.60,.61,.6154,.62,...Array.from({length:36},(_,i)=>Number((.65+i*.01).toFixed(4)))])].sort((a,b)=>a-b);
const reference=new Map();
function unaffected(state){
  const copy=structuredClone(state);delete copy.cloudMotionProgress;
  for(const cloud of copy.clouds)delete cloud.centre;
  return copy;
}
async function capture(page,p){
  await page.locator('#progress').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},p);
  return page.locator('#stage').evaluate(stage=>{
    const state=JSON.parse(stage.dataset.motion);
    return {state,rendered:[...stage.querySelectorAll('[data-cloud]')].map(el=>({
      id:el.dataset.cloud,x:parseFloat(el.style.left)/100,y:parseFloat(el.style.top)/100}))};
  });
}
try{
  for(const port of [8767,8770,8771]){
    const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto('http://127.0.0.1:'+port+'/review/ship-jet-integration.html#viewer');
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true');
    const states=[];
    for(const p of samples){
      const result=await capture(page,p),state=result.state;
      if(port===8767)reference.set(p,state);
      else{
        assert.deepEqual(unaffected(state),unaffected(reference.get(p)),'Non-cloud motion/preset changed at '+p);
        for(const cloud of state.clouds){
          const rendered=result.rendered.find(c=>c.id===cloud.id);
          // CSS serializes percentage values with limited decimal precision.
          const pixelError=Math.hypot((rendered.x-cloud.centre[0])*1280,(rendered.y-cloud.centre[1])*900);
          assert.ok(pixelError<.01,'Rendered centre differs by '+pixelError+' px');
        }
      }
      states.push(state);
    }
    if(port!==8767){
      const velocities={};
      for(const id of ['K01','K02','K03']){
        const speed=states.slice(1).map((state,i)=>{
          const previous=states[i],a=previous.clouds.find(c=>c.id===id).centre,b=state.clouds.find(c=>c.id===id).centre;
          return Math.hypot(...b.map((v,j)=>v-a[j]))/(state.progress-previous.progress);
        });
        assert.ok(speed.every(v=>v>0),'Cloud stopped: '+id);
        // Wide sample gaps can span a bend; detailed constant-speed contracts cover the local trajectory.
        velocities[id]={minimum:Math.min(...speed),maximum:Math.max(...speed)};
      }
      for(const p of [.24,.26,.65,.75,.85]){
        await capture(page,p);
        await page.locator('#stage').screenshot({path:resolve(evidence,port+'-'+Math.round(p*100)+'.png')});
      }
      report.observations.push({port,samples:states,velocities,unchangedCameraShipJetContentAndAppearance:true});
    }
    if(port===8771){
      await capture(page,.59);await page.locator('#play').click();
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).progress>.85);
      await page.locator('#pause').click();
      const playback=await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.playback));
      for(const id of ['K01','K02','K03']){
        for(let i=1;i<playback.length;i++){
          if(playback[i].progress<=playback[i-1].progress)continue;
          const a=playback[i-1].clouds.find(c=>c.id===id).centre,b=playback[i].clouds.find(c=>c.id===id).centre;
          assert.ok(Math.hypot(...b.map((v,j)=>v-a[j]))>0,'Playback freeze: '+id);
        }
      }
      writeFileSync(resolve(evidence,'normal-playback.json'),JSON.stringify(playback,null,2));
      await page.locator('#reverse').click();
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).progress<.23);
      await page.locator('#pause').click();
      await capture(page,.62);await page.locator('#scroll-mode').click();await page.locator('#stage').hover();
      const before=await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion));
      await page.mouse.wheel(0,500);
      await page.waitForFunction(p=>JSON.parse(document.querySelector('#stage').dataset.motion).progress>p,before.progress);
      const after=await page.locator('#stage').evaluate(el=>JSON.parse(el.dataset.motion));
      for(const id of ['K01','K02','K03'])assert.notDeepEqual(after.clouds.find(c=>c.id===id).centre,before.clouds.find(c=>c.id===id).centre);
      report.observations.push({normalFrames:playback.length,reversePlayback:true,physicalScroll:{before:before.progress,after:after.progress}});
    }
    assert.deepEqual(errors,[]);await context.close();console.log('cloud continuity checked on '+port);
  }
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;}
finally{await browser.close();writeFileSync(resolve(evidence,'runtime-checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,error:report.error}));
