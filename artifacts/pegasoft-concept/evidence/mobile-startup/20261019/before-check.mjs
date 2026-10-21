import {chromium,webkit} from '/Users/whiskey/.codex/worktrees/pegasoft-concept/site/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const out='/Users/whiskey/.codex/worktrees/pegasoft-concept/site/artifacts/pegasoft-concept/evidence/mobile-startup/20261019';
const results=[];
for(const mode of ['chromium-swipe','webkit-swipe','blocked-video']){
 let browser;
 try{
 browser=await(mode==='webkit-swipe'?webkit:chromium).launch(mode==='webkit-swipe'?{headless:true}:{channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 if(mode==='blocked-video')await context.addInitScript(()=>{const load=HTMLMediaElement.prototype.load;HTMLMediaElement.prototype.load=function(){if(this.src.includes('ocean-motion'))return;return load.call(this);};});
 const page=await context.newPage(),errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
 let cdp;if(mode!=='webkit-swipe'){cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 const begin=Date.now();await page.goto('http://127.0.0.1:8771/',{waitUntil:'domcontentloaded'});
 if(cdp){for(let j=0;j<3;j++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:690}]});for(let y=650;y>100;y-=90)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}else await page.mouse.wheel(0,1600);
 const afterSwipe=await page.evaluate(()=>({y:scrollY,locked:getComputedStyle(document.documentElement).overflow,opening:document.querySelector('#opening-stage').dataset.preparing}));
 await page.waitForFunction(()=>['true','error','static'].includes(document.querySelector('#stage')?.dataset.loaded),{},{timeout:28000}).catch(()=>{});
 results.push({mode,elapsedMs:Date.now()-begin,afterSwipe,final:await page.evaluate(()=>({y:scrollY,state:document.querySelector('#stage').dataset.loaded,static:document.body.classList.contains('static-journey'),loops:document.querySelector('#stage').journey?.activeFrameLoops,video:[...document.querySelectorAll('video')].map(v=>({ready:v.readyState,network:v.networkState,error:v.error?.message}))})),errors});
 await page.screenshot({path:out+'/before-'+mode+'.png'});
 }catch(e){results.push({mode,failure:e.message});}finally{await browser?.close();}
}
await writeFile(out+'/before.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
