import {createGlobe} from './hero-globe.js';
import {DEFAULTS,GLOBE_DEFAULTS,openingState,clamp} from './hero-opening-sequence.js';
import {exitState,EXIT_DEFAULTS} from './hero-outcome-sequence.js';
const $=s=>document.querySelector(s),stage=$('#stage'),range=$('#journey'),track=$('#story-track');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let progress=0,playing=false,direction=1,speed=1,reduced=media.matches,scrollMode=false,globe,ready=false,last=null,sceneTime=0,rotationTime=0,openingTime=3.8,replaying=false,frame=0;
const trace=[];let lastTraceWall=-Infinity;
$('#reduced').checked=reduced;
function render(){
 const state=exitState(progress,EXIT_DEFAULTS,reduced),opening=openingState(openingTime,DEFAULTS,reduced),{width,height}=stage.getBoundingClientRect();
 const radius=Math.hypot(width/2,height/2)+2;
 $('#hero').style.clipPath=`circle(${opening.aperture*radius}px at 50% 50%)`;
 stage.style.background=progress>=EXIT_DEFAULTS.wipeEnd||reduced&&progress>0?'#edf2f7':'#05070a';
 $('#radar').style.opacity=opening.ringOpacity;$('#radar').style.transform=`scale(${opening.ringScale})`;
 $('#mark').style.opacity=opening.markOpacity;
 $('#pulse').style.visibility=opening.pulseVisible?'visible':'hidden';$('#pulse').style.width=$('#pulse').style.height=`${radius*2*(.08+.94*opening.pulseScale)}px`;
 $('.hero-nav').style.opacity=opening.nav*(1-state.utilityExit);$('.hero-nav').style.transform=`translateY(${(1-opening.nav)*-12-state.utilityExit*16}px)`;$('.hero-nav').inert=progress>.12||opening.nav<.95;
 document.querySelectorAll('.line>span').forEach((el,i)=>{el.style.transform=`translateY(${(1-opening.lines[i])*108-state.lineExit[i]*115}%)`;el.style.opacity=clamp(opening.lines[i]*4);});
 $('#kicker').style.opacity=opening.lines[0]*(1-state.utilityExit);$('#kicker').style.transform=`translateY(${(1-opening.lines[0])*10-state.utilityExit*20}px)`;
 $('.hero-body').style.opacity=opening.body*(1-state.utilityExit);$('.hero-body').style.transform=`translateY(${(1-opening.body)*20-state.utilityExit*20}px)`;
 $('.hero-actions').style.opacity=opening.cta*(1-state.utilityExit);$('.hero-actions').style.transform=`translateY(${(1-opening.cta)*20-state.utilityExit*20}px)`;$('.hero-actions').inert=progress>.12||opening.cta<.95;
 $('.hero-bottom').style.opacity=opening.body*(1-state.utilityExit);
 $('#hero').style.opacity=state.globeOpacity;$('#hero').inert=progress>.20||opening.aperture<.95;$('#hero').setAttribute('aria-hidden',String(state.globeOpacity===0));
 $('.horizon').style.transform=`translateY(${state.horizonY*height}px)`;
 $('.outcome').hidden=!state.outcomeActive;
 const titleY=width<680&&!reduced?1.10-1.02*clamp((progress-EXIT_DEFAULTS.outcomeStart)/(EXIT_DEFAULTS.titlePin-EXIT_DEFAULTS.outcomeStart)):state.titleY;
 const metricsY=width<680&&!reduced?1.12-2.10*clamp((progress-EXIT_DEFAULTS.outcomeStart)/(1-EXIT_DEFAULTS.outcomeStart)):state.metricsY;
 $('.outcome-title').style.transform=`translateY(${titleY*height}px)`;
 $('.metrics').style.transform=`translateY(${metricsY*height}px)`;
 document.querySelectorAll('.metric-value').forEach((el,i)=>el.textContent=String(state.counts[i]).padStart(2,'0'));
 stage.classList.toggle('reduced',reduced);
 document.querySelectorAll('.progress-arc').forEach(el=>el.style.strokeDashoffset=1-progress);
 const geometry=globe?.render(rotationTime,sceneTime,reduced);
 if(document.activeElement!==range)range.value=progress*100;$('#percent').value=`${(progress*100).toFixed(1)}%`;$('#readout').value=replaying?'Approved opening':state.phase;
 $('#play').textContent=playing?'Pause':'Play forward';$('#play').setAttribute('aria-pressed',String(playing));
 $('#play').disabled=$('#reverse').disabled=reduced||scrollMode||!ready;
 $('#replay-opening').disabled=scrollMode||!ready||reduced;
 const sample={frame:frame++,wallTimestampMs:Math.round(performance.now()),progress,openingTime,sceneTime,rotationTime,playing,direction,speed,reduced,scrollMode,replaying,state,layout:{titleY,metricsY},geometry};
 stage.dataset.motion=JSON.stringify(sample);stage.dataset.status=ready?'ready':'loading';
 if((sample.wallTimestampMs-lastTraceWall>=100||progress===0||progress===1)&&(playing||replaying||progress!==trace.at(-1)?.progress)){trace.push(sample);lastTraceWall=sample.wallTimestampMs;if(trace.length>600)trace.shift();stage.dataset.trace=JSON.stringify(trace);}
}
function tick(now){const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;
 if(ready&&!reduced){sceneTime+=dt;rotationTime+=dt*GLOBE_DEFAULTS.speed;
  if(replaying){openingTime=Math.min(3.8,openingTime+dt);if(openingTime>=3.8)replaying=false;}
  if(playing&&!replaying&&!scrollMode){progress=clamp(progress+direction*dt*speed/9);if(progress===0||progress===1)playing=false;}
 }
 if(ready)render();requestAnimationFrame(tick);
}
function scrollProgress(){if(!scrollMode)return;const rect=track.getBoundingClientRect(),distance=track.offsetHeight-$('.review-stick').offsetHeight;progress=clamp((12-rect.top)/Math.max(1,distance));render();}
$('#play').addEventListener('click',()=>{if(playing)playing=false;else{if(progress===1)progress=0;direction=1;playing=true;}render();});
$('#reverse').addEventListener('click',()=>{if(progress===0)progress=1;direction=-1;playing=true;render();});
range.addEventListener('input',()=>{playing=false;replaying=false;openingTime=3.8;progress=Number(range.value)/100;if(scrollMode){const top=track.getBoundingClientRect().top+scrollY;window.scrollTo({top:top-12+progress*(track.offsetHeight-$('.review-stick').offsetHeight),behavior:'instant'});}render();});
$('#speed').addEventListener('change',()=>{speed=Number($('#speed').value);render();});
$('#replay-opening').addEventListener('click',()=>{progress=0;playing=false;openingTime=0;sceneTime=0;rotationTime=0;replaying=true;last=null;trace.length=0;render();});
$('#restart').addEventListener('click',()=>{progress=0;playing=false;replaying=false;openingTime=3.8;trace.length=0;if(scrollMode){window.scrollTo({top:track.getBoundingClientRect().top+scrollY-12,behavior:'instant'});}render();});
$('#scroll-mode').addEventListener('change',()=>{scrollMode=$('#scroll-mode').checked;playing=false;replaying=false;openingTime=3.8;track.classList.toggle('scroll-mode',scrollMode);if(scrollMode){window.scrollTo({top:track.getBoundingClientRect().top+scrollY-12,behavior:'instant'});}render();});
function setReduced(value){reduced=value;$('#reduced').checked=value;playing=false;replaying=false;openingTime=3.8;render();}
$('#reduced').addEventListener('change',()=>setReduced($('#reduced').checked));media.addEventListener('change',e=>setReduced(e.matches));
window.addEventListener('scroll',scrollProgress,{passive:true});
const cursor=$('.progress-cursor');stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=stage.getBoundingClientRect();cursor.style.left=`${e.clientX-r.left}px`;cursor.style.top=`${e.clientY-r.top}px`;cursor.classList.add('visible');});stage.addEventListener('pointerleave',()=>cursor.classList.remove('visible'));
document.querySelectorAll('.hero-nav button,.hero-actions button').forEach(button=>button.addEventListener('click',()=>{$('#interaction-status').textContent='Navigation destinations remain in the final content review.';}));
document.addEventListener('visibilitychange',()=>{last=null;});
new ResizeObserver(()=>{if(globe){const {width,height}=stage.getBoundingClientRect();globe.resize(width,height);scrollProgress();render();}}).observe(stage);
try{globe=await createGlobe($('#globe'));const {width,height}=stage.getBoundingClientRect();globe.resize(width,height);globe.configure(GLOBE_DEFAULTS);ready=true;render();requestAnimationFrame(tick);}catch(error){stage.dataset.status='error';$('#render-error').hidden=false;$('#render-error').textContent=`The accepted globe could not load: ${error.message}`;console.error(error);}
