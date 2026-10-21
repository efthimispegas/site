import {chromium} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await ctx.route('**/ocean-motion.mp4',()=>{});const page=await ctx.newPage();const start=Date.now();await page.goto('http://127.0.0.1:8780/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>scrollTo(0,1800));await page.waitForTimeout(21500);
const r={fault:'Ocean response held indefinitely; models/globe available',elapsedMs:Date.now()-start,...await page.evaluate(()=>({y:scrollY,loaded:document.querySelector('#stage').dataset.loaded,static:document.body.classList.contains('static-journey'),loops:document.querySelector('#stage').journey.activeFrameLoops}))};
await writeFile('/Users/whiskey/.codex/worktrees/pegasoft-concept/site/artifacts/pegasoft-concept/evidence/mobile-startup/20261019/before-media-fault.json',JSON.stringify(r,null,2)+'\n');console.log(r);await browser.close();
