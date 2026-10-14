import {chromium} from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {duration,chapters,scrollAtProgress} from '../src/transport-timeline.js';

const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/transport-amendments');
mkdirSync(evidence,{recursive:true});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={date:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifestSha256:sha(resolve(app,'transport-integration-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const state=p=>p.locator('#stage').evaluate(s=>JSON.parse(s.dataset.motion));
const full=(chapter,p)=>chapter==='handoff'?p*18.75/duration:chapter==='ship'?(chapters[0].duration+p*22)/duration:(chapters[0].duration+chapters[1].duration+p*26)/duration;
async function seek(page,chapter,p){
  const h=await page.evaluate(()=>window.innerHeight),offset=scrollAtProgress(full(chapter,p),h),old=await page.evaluate(()=>window.scrollY);
  await page.mouse.wheel(0,offset-old);await page.waitForFunction(y=>Math.abs(window.scrollY-y)<2,offset);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return state(page);
}
async function open(viewport,port=8771){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/');await page.waitForFunction(()=>document.querySelector('#stage').dataset.loaded==='true',{},{timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{for(const v of document.querySelectorAll('body>video')){v.pause();if(v.currentTime>.001)await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=0;});}});
  return {context,page,errors};
}
function edges(data,width,height,y,bounds){
  // Independent raster check: road/hull edges are neutral dark surfaces,
  // against pale pavement above and blue generated sea below the wipe.
  const neutral=(x,y)=>{const i=(Math.max(0,Math.min(height-1,y))*width+x)*3,r=data[i],g=data[i+1],b=data[i+2];return Math.max(r,g,b)-Math.min(r,g,b)<15&&(r+g+b)/3<90;};
  const hits=[];
  for(let x=Math.max(0,Math.floor(bounds[0]));x<Math.min(width,Math.ceil(bounds[1]));x++)if([-1,0,1].every(d=>neutral(x,y+d)))hits.push(x);
  assert.ok(hits.length>0,'No rendered strip edge found');return [hits[0],hits.at(-1)];
}
try{
  for(const viewport of [{width:1506,height:753},{width:1280,height:900},{width:390,height:844}]){
    const {page,context,errors}=await open(viewport);
    const initial=await state(page);
    assert.equal(initial.contextMatrices.length,2);
    assert.ok(initial.cargoMatrix[13]>1.5,'Original stacked pickup height was lost');
    assert.ok(Math.abs(initial.cargoMatrix[12]-initial.contextMatrix[12])<1e-6);
    assert.ok(initial.contextMatrices.every(m=>Math.abs(m[13])<1e-6));
    assert.ok(initial.contextMatrices[1][12]-initial.contextMatrix[12]>2,'Rear container overlaps the original stack');
    const stationary=initial.contextMatrices;
    const opening=await page.screenshot({path:resolve(evidence,`opening-${viewport.width}.png`)});
    report.observations.push({viewport,layout:'original two-high approved C01 stack plus a grounded container behind',openingSha256:createHash('sha256').update(opening).digest('hex')});
    const reverse=[];
    for(const p of [.18,.23,.25,.28,.32,.35,.55,.63,.87,.95]){
      const r=await seek(page,'handoff',p);
      assert.ok(r.contextMatrices.every((m,j)=>m.every((v,i)=>Math.abs(v-stationary[j][i])<1e-9)));assert.equal(r.contextPoseResidual,0);
      if(r.progress>=.25){assert.equal(r.stackVisible,false);assert.equal(r.stackOpacity,0);}
      if(p===.32)await page.screenshot({path:resolve(evidence,`reverse-turn-${viewport.width}.png`)});
      assert.deepEqual(r.grabberScale,[1,1,1]);
      if(r.progress>=.55)assert.ok(Math.max(...r.contacts.map(c=>c.gap))<1e-8);
      assert.ok(Math.max(...r.ground.map(Math.abs))<1e-8);
      reverse.push({progress:r.progress,contextVisible:r.stackVisible,contextOpacity:r.stackOpacity,camera:r.camera,cargo:r.cargoMatrix});
    }
    await page.screenshot({path:resolve(evidence,`reverse-${viewport.width}.png`)});
    report.observations.push({viewport,stationaryContext:true,hiddenByReverse:true,grabberRigid:true,contactsGrounded:true,samples:reverse});
    for(const p of [.20,.24,.276,.32,.36,.40]){
      const r=await seek(page,'ship',p);assert.ok(r.roadRegistration.active,'Registration unavailable during wipe');
      assert.ok(r.roadRegistration.maxErrorNDC*viewport.width/2<.01,'Projected edges diverged');
      assert.ok(r.ownershipMatrixResidual<1e-8);assert.ok(r.supportGap<1e-8);
      const name=`wipe-${viewport.width}-${Math.round(p*1000)}`,png=await page.screenshot({path:resolve(evidence,name+'.png')});
      const raw=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true}),line=Math.round((1-r.cutNDC)*viewport.height/2);
      let raster;
      if(line>8&&line<viewport.height-8&&r.roadRegistration.rimRegion==='parallel_body'){
        const hull=r.roadRegistration.hullEdgesNDC.map(x=>(x+1)*viewport.width/2);
        const upper=edges(raw.data,raw.info.width,raw.info.height,line-4,[hull[0]-30,hull[1]+30]);
        const lower=edges(raw.data,raw.info.width,raw.info.height,line+4,[hull[0]-30,hull[1]+30]);
        raster={road:upper,hull:lower,maxDifference:Math.max(...upper.map((x,i)=>Math.abs(x-lower[i])))};
        assert.ok(raster.maxDifference<=3,'Rendered seam differs: '+JSON.stringify(raster));
      }
      report.observations.push({viewport,progress:r.progress,registration:r.roadRegistration,raster,screenshot:name+'.png',sha256:createHash('sha256').update(png).digest('hex')});
    }
    const forward=await seek(page,'ship',.276),forwardY=await page.evaluate(()=>window.scrollY);await seek(page,'ship',.4);
    await page.mouse.wheel(0,forwardY-await page.evaluate(()=>window.scrollY));
    await page.waitForFunction(y=>window.scrollY===y,forwardY);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const back=await state(page);
    report.observations.push({reverseInputs:{forward:forward.journeyProgress,back:back.journeyProgress,scrollY:forwardY}});
    assert.ok(forward.camera.every((v,i)=>Math.abs(v-back.camera[i])<1e-8));
    assert.ok(forward.cargoMatrix.every((v,i)=>Math.abs(v-back.cargoMatrix[i])<1e-8));
    const type=await page.evaluate(()=>{
      const style=s=>getComputedStyle(document.querySelector(s)).fontSize;
      return {titles:['#ship-copy .block-title','#road-copy li','#services-overlay li'].map(style),descriptions:['#ship-copy li p','#road-copy li p','#services-overlay li small','.trust p'].map(style)};
    });
    assert.equal(new Set(type.titles).size,1);assert.equal(new Set(type.descriptions).size,1);
    await seek(page,'ship',.8);await page.screenshot({path:resolve(evidence,`content-${viewport.width}.png`)});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    report.observations.push({viewport,type,reverseWipeRestored:true,horizontalOverflow:false});
    assert.deepEqual(errors,[]);await context.close();
  }
  const dev=await open({width:1280,height:900},8770);
  const cleanup=await dev.page.evaluate(async()=>{const journey=document.querySelector('#stage').journey;await journey.mount();const before=journey.activeFrameLoops;journey.dispose();journey.dispose();return {before,after:journey.activeFrameLoops,canvas:document.querySelectorAll('canvas').length,videos:document.querySelectorAll('body>video').length};});
  assert.deepEqual(cleanup,{before:1,after:0,canvas:0,videos:0});report.observations.push({cleanup});await dev.context.close();
  report.status='checks_passed_pending_personal_review';
}catch(error){report.status='failed';report.failure=error.stack;throw error;}
finally{writeFileSync(resolve(evidence,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,observations:report.observations.length}));
