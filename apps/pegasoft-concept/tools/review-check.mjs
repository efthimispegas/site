import { chromium } from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const app = resolve(import.meta.dirname, '..'), workspace = resolve(app, '../..');
const evidence = resolve(workspace, 'artifacts/pegasoft-concept/evidence/application-packaging');
mkdirSync(evidence, {recursive:true});
const mode = process.argv[2] || 'frames';
const hash = data => createHash('sha256').update(data).digest('hex');
const configurations = [
  {name:'approved-source',port:8767}, {name:'development',port:8770}, {name:'production',port:8771},
];
const report = {
  mode, date:new Date().toISOString(), sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:workspace,encoding:'utf8'}).trim(),
  baselineSha256:hash(readFileSync(resolve(app,'baseline-manifest.json'))),
  configSha256:hash(readFileSync(resolve(app,'vite.config.js'))),
  checkSha256:hash(readFileSync(new URL(import.meta.url))),
  viewport:{width:1280,height:900}, observations:[], userAccepted:false,
};
const browser = await chromium.launch({channel:'chrome',headless:true});
async function open(config,viewport=report.viewport) {
  const context = await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page = await context.newPage(), failures=[];
  // The frozen static server has no favicon; this unrelated browser request is not a scene asset.
  await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  page.on('pageerror',error=>failures.push(error.message));
  page.on('console',message=>{if(message.type()==='error')failures.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  await page.goto(`http://127.0.0.1:${config.port}/review/ship-jet-integration.html#viewer`);
  await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.loaded==='true',{},{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  return {context,page,failures};
}
async function seek(page,progress) {
  // Exercise the existing inspection slider; physical scrolling is checked separately.
  const cue=page.locator(`[data-cue="${progress.toFixed(8)}"]`);
  let applied=progress;
  if(await cue.count()) await cue.click();
  else applied=await page.locator('#progress').evaluate((input,value)=>{
    input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return Number(input.value);
  },progress);
  await page.waitForFunction(value=>Math.abs(JSON.parse(document.querySelector('#stage').dataset.motion).progress-value)<1e-8,applied);
}
async function trace(page) {
  return page.locator('#stage').evaluate(stage=>{
    const r=JSON.parse(stage.dataset.motion);
    return {progress:r.progress,phase:r.phase,camera:r.camera,quaternion:r.quaternion,
      shipMatrix:r.shipMatrix,cargoMatrix:r.cargoMatrix,supportGap:r.supportGap,
      clouds:r.clouds,jet:r.jet,copy:r.copyLayout,drawCalls:Number(stage.dataset.drawCalls)};
  });
}
try {
  if(mode==='frames') {
    const reference = new Map();
    for(const config of configurations) {
      const {context,page,failures}=await open(config);
      // Fixed ocean sample isolates packaging differences from elapsed video time.
      await page.evaluate(async()=>{
        for(const video of [...document.querySelectorAll('body>video')]) {
          video.pause();
          if(video.currentTime>.001) await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=0;});
        }
      });
      for(const progress of [0,.24615385,.53846154,.59615385,.69230769,.84615385,1]) {
        await seek(page,progress);
        await page.locator('#stage').scrollIntoViewIfNeeded();
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const state=await trace(page),name=`${config.name}-${Math.round(progress*10000)}`;
        const png=await page.locator('#stage').screenshot({path:resolve(evidence,name+'.png')});
        const decoded=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
        let comparison;
        if(config.name==='approved-source') reference.set(progress,{state,...decoded});
        else {
          const original=reference.get(progress);
          assert.deepEqual(state,original.state,`${config.name} scene trace differs at ${progress}`);
          assert.deepEqual(decoded.info,original.info);
          let sum=0,changed=0;
          for(let i=0;i<decoded.data.length;i++){const delta=Math.abs(decoded.data[i]-original.data[i]);sum+=delta;if(delta>8)changed++;}
          comparison={meanChannelDifference:sum/decoded.data.length,channelsDifferingOver8:changed/decoded.data.length};
          assert.ok(comparison.meanChannelDifference<1 && comparison.channelsDifferingOver8<.01,`${config.name} rendered mismatch: ${JSON.stringify(comparison)}`);
        }
        report.observations.push({config:config.name,progress,screenshot:name+'.png',sha256:hash(png),state,comparison});
      }
      assert.deepEqual(failures,[],config.name+' network/runtime failure');
      report.observations.push({config:config.name,networkAndRuntimeErrors:failures});
      await context.close();console.log(config.name+' matched frames passed');
    }
  } else if(mode==='motion') {
    const {context,page,failures}=await open(configurations[2]);
    await page.locator('#play').click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).progress===1,{},{timeout:60000});
    const normal=await page.locator('#stage').evaluate(stage=>JSON.parse(stage.dataset.playback));
    assert.ok(normal.length>20);assert.ok(normal.every((frame,i)=>!i||frame.progress>=normal[i-1].progress));
    report.observations.push({normalFrames:normal.length,start:normal[0].progress,end:normal.at(-1).progress});
    writeFileSync(resolve(evidence,'normal-playback.json'),JSON.stringify(normal,null,2));
    console.log('production normal playback passed');
    await page.locator('#reverse').click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).progress===0,{},{timeout:60000});
    const reverse=await page.locator('#stage').evaluate(stage=>JSON.parse(stage.dataset.playback));
    assert.ok(reverse.length>20);assert.ok(reverse.every((frame,i)=>!i||frame.progress<=reverse[i-1].progress));
    report.observations.push({reverseFrames:reverse.length,start:reverse[0].progress,end:reverse.at(-1).progress});
    writeFileSync(resolve(evidence,'reverse-playback.json'),JSON.stringify(reverse,null,2));
    console.log('production reverse playback passed');
    await page.locator('#scroll-mode').click();
    const before=await trace(page);
    await page.locator('#stage').hover();await page.mouse.wheel(0,1100);
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#stage').dataset.motion).progress>.02);
    const down=await trace(page);await page.mouse.wheel(0,-450);
    await page.waitForFunction(value=>JSON.parse(document.querySelector('#stage').dataset.motion).progress<value,down.progress);
    const up=await trace(page);assert.ok(down.progress>before.progress && up.progress<down.progress);
    report.observations.push({physicalScroll:{before:before.progress,down:down.progress,up:up.progress}});
    await page.locator('#scroll-mode').click();await seek(page,.69230769);
    await page.setViewportSize({width:1100,height:800});
    assert.ok(Math.abs((await trace(page)).progress-.69230769)<1e-8);
    await page.locator('#reduce').check();
    assert.equal(await page.locator('#play').isDisabled(),true);
    assert.deepEqual(failures,[]);report.observations.push({resizePreservedProgress:true,reducedMotionControls:true,networkAndRuntimeErrors:failures});
    await context.close();
    const mobile=await open(configurations[2],{width:390,height:844});
    await seek(mobile.page,.59615385);
    await mobile.page.locator('#stage').screenshot({path:resolve(evidence,'production-mobile.png')});
    assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(mobile.failures,[]);report.observations.push({mobileViewport:{width:390,height:844},horizontalOverflow:false});
    await mobile.context.close();
  } else throw Error('Unknown check mode: '+mode);
  report.status='passed';
} catch(error) {
  report.status='failed';report.failure=error.stack;process.exitCode=1;
} finally {
  await browser.close();writeFileSync(resolve(evidence,mode+'-checks.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({mode,status:report.status,failure:report.failure,evidence}));
