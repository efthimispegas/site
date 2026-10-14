import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir=import.meta.dirname,workspace=resolve(dir,'../../../../../..'),app=resolve(workspace,'apps/pegasoft-concept'),preset=JSON.parse(readFileSync(resolve(dir,'current-preset.json'))),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={manifestSha256:sha(resolve(app,'website-motion-manifest.json')),checkSha256:sha(new URL(import.meta.url)),observations:[],userAccepted:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const entry of ['/?revision=ring42-filled-cta-20261014','/review/loader.html?revision=ring42-filled-cta-20261014#viewer']){
   await page.goto('http://127.0.0.1:8771'+entry,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#opening-stage').dataset.loaded==='true');
   assert.deepEqual(await page.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion).loaderSettings),preset);
   if(entry.includes('/review/')){
    assert.equal(Number(await page.locator('#control-ringFrom').inputValue()),.42);await page.locator('#control-ringFrom').focus();await page.locator('#control-ringFrom').press('ArrowRight');await page.locator('#reset').click();assert.deepEqual(JSON.parse(await page.locator('#preset').inputValue()),preset);
    await page.locator('#timeline').focus();await page.locator('#timeline').press('Home');const initial=await page.locator('#opening-stage').evaluate(e=>JSON.parse(e.dataset.motion));assert.equal(initial.opening.ringScale,.42);
    await page.locator('#opening-stage').screenshot({path:resolve(dir,`initial-ring-${viewport.width}.png`)});await page.locator('#restart').click();
   }
   await page.waitForFunction(()=>JSON.parse(document.querySelector('#opening-stage').dataset.motion).opening.complete);
   const button=page.locator('#opening-stage .nav-contact');const style=await button.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,border:getComputedStyle(e).borderTopColor}));assert.deepEqual(style,{background:'rgb(237, 242, 247)',color:'rgb(5, 7, 10)',border:'rgb(237, 242, 247)'});
   await page.locator('#opening-stage').screenshot({path:resolve(dir,`${entry.includes('/review/')?'inspector':'homepage'}-filled-${viewport.width}.png`)});
   await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await button.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 125, 255)');
   report.observations.push({entry,viewport,presetExact:true,startupRing:.42,resetExact:entry.includes('/review/'),style,keyboardFocus:true});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{writeFileSync(resolve(dir,'checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,failure:report.failure}));
