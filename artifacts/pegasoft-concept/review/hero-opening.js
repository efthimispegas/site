import {createGlobe} from './hero-globe.js';
import {DEFAULTS,GLOBE_DEFAULTS,openingState,clamp} from './hero-opening-sequence.js';
const $=s=>document.querySelector(s),stage=$('#stage'),hero=$('#hero'),play=$('#play'),timeline=$('#timeline');
const lines=[...document.querySelectorAll('.line>span')];let settings={...DEFAULTS},globeSettings={...GLOBE_DEFAULTS};
const media=matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches,running=!reduced,openingTime=0,sceneTime=0,rotationTime=0,speed=1,last=null,globe,ready=false,frame=0;
$('#reduced').checked=reduced;stage.dataset.status='loading';
const trace=[];
function render(){
 const state=openingState(openingTime,settings,reduced),{width,height}=stage.getBoundingClientRect();const maxRadius=Math.hypot(width/2,height/2)+2;
 hero.style.clipPath=`circle(${state.aperture*maxRadius}px at 50% 50%)`;
 $('#radar').style.opacity=state.ringOpacity;$('#radar').style.transform=`scale(${state.ringScale})`;
 $('#mark').style.opacity=state.markOpacity;
 $('#pulse').style.visibility=state.pulseVisible?'visible':'hidden';$('#pulse').style.width=$('#pulse').style.height=`${maxRadius*2*(.08+.94*state.pulseScale)}px`;
 $('.hero-nav').style.opacity=state.nav;$('.hero-nav').style.transform=`translateY(${(1-state.nav)*-12}px)`;
 $('.hero-nav').inert=state.nav<.95;
 lines.forEach((el,i)=>{el.style.transform=`translateY(${(1-state.lines[i])*108}%)`;el.style.opacity=clamp(state.lines[i]*4);});
 $('#kicker').style.opacity=state.lines[0];$('#kicker').style.transform=`translateY(${(1-state.lines[0])*10}px)`;
 $('.hero-body').style.opacity=state.body;$('.hero-body').style.transform=`translateY(${(1-state.body)*20}px)`;
 $('.hero-actions').style.opacity=state.cta;$('.hero-actions').style.transform=`translateY(${(1-state.cta)*20}px)`;$('.hero-actions').inert=state.cta<.95;
 $('.hero-bottom').style.opacity=state.body;
 const geometry=globe?.render(rotationTime,sceneTime,reduced);
 timeline.max=state.end;timeline.value=openingTime;$('#time-label').value=`${openingTime.toFixed(2)}s / ${state.end.toFixed(2)}s`;
 const phase=reduced?'Reduced motion':openingTime<settings.pulseStart?'Radar recession':state.aperture<1?'Pulse → aperture':state.complete?'Hero · rotating globe':'Headline entrance';
 $('#readout').value=`${phase} · ${speed===.25?'¼':'1'}×`;play.textContent=running?'Pause':'Play';play.setAttribute('aria-pressed',String(running));play.disabled=reduced;
 for(const id of['restart','frame-back','frame-next','timeline'])$('#'+id).disabled=reduced||!ready;
 const sample={frame:frame++,wallTimestampMs:Math.round(performance.now()),openingTime:+openingTime.toFixed(5),sceneTime:+sceneTime.toFixed(5),rotationTime:+rotationTime.toFixed(5),aperture:+state.aperture.toFixed(6),apertureRadiusPx:+(state.aperture*maxRadius).toFixed(3),lines:state.lines,body:state.body,cta:state.cta,phase,running,reduced,openingSettings:{...settings},globeSettings:{...globeSettings},geometry};stage.dataset.motion=JSON.stringify(sample);stage.dataset.status=ready?'ready':'loading';
 // Keep the opening and a bounded steady-state tail; an unattended review must
 // not overwrite the transition evidence with minutes of completed rotation.
 if(running&&frame%6===0&&(!state.complete||trace.filter(x=>x.phase==='Hero · rotating globe').length<30)){if(trace.length<512)trace.push(sample);stage.dataset.trace=JSON.stringify(trace);}
}
function tick(now){const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;if(ready&&running&&!reduced){const step=dt*speed;sceneTime+=step;rotationTime+=step*globeSettings.speed;openingTime=Math.min(openingTime+step,openingState(openingTime,settings).end);render();}requestAnimationFrame(tick);}
function refreshValues(){document.querySelectorAll('[data-track],[data-globe]').forEach(el=>{el.nextElementSibling.value=Number(el.value).toFixed(2);});}
play.addEventListener('click',()=>{running=!running;render();});
$('#restart').addEventListener('click',()=>{openingTime=0;sceneTime=0;rotationTime=0;running=true;last=null;trace.length=0;$('#interaction-status').textContent='';render();});
timeline.addEventListener('input',()=>{running=false;openingTime=Number(timeline.value);render();});
for(const [id,delta]of[['frame-back',-1/60],['frame-next',1/60]])$('#'+id).addEventListener('click',()=>{running=false;openingTime=clamp(openingTime+delta,0,openingState(openingTime,settings).end);render();});
$('#speed').addEventListener('change',()=>{speed=Number($('#speed').value);render();});
function setReduced(value){reduced=value;$('#reduced').checked=value;running=!value;render();}
$('#reduced').addEventListener('change',()=>setReduced($('#reduced').checked));media.addEventListener('change',e=>setReduced(e.matches));
document.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('input',()=>{settings[el.dataset.track]=Number(el.value);refreshValues();render();}));
document.querySelectorAll('[data-globe]').forEach(el=>el.addEventListener('input',()=>{globeSettings[el.dataset.globe]=Number(el.value);globe?.configure(globeSettings);refreshValues();render();}));
$('#reset-settings').addEventListener('click',()=>{settings={...DEFAULTS};globeSettings={...GLOBE_DEFAULTS};document.querySelectorAll('[data-track]').forEach(el=>el.value=settings[el.dataset.track]);document.querySelectorAll('[data-globe]').forEach(el=>el.value=globeSettings[el.dataset.globe]);globe?.configure(globeSettings);refreshValues();render();});
document.querySelectorAll('.hero-nav button,.hero-actions button').forEach(button=>button.addEventListener('click',()=>{$('#interaction-status').textContent=`${button.dataset.action||button.textContent.trim()} — destination in final content review.`;}));
document.querySelectorAll('[data-reference]').forEach(button=>button.addEventListener('click',()=>{const video=$('#reference-video');video.pause();video.src=`../evidence/motion/clips/${button.dataset.reference}.mp4`;video.setAttribute('aria-label',`Supplied ${button.dataset.reference} reference`);document.querySelectorAll('[data-reference]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
document.addEventListener('visibilitychange',()=>{last=null;});
const observer=new ResizeObserver(()=>{if(globe){const {width,height}=stage.getBoundingClientRect();globe.resize(width,height);render();}});observer.observe(stage);
refreshValues();
try{globe=await createGlobe($('#globe'));const {width,height}=stage.getBoundingClientRect();globe.resize(width,height);ready=true;render();requestAnimationFrame(tick);}catch(error){stage.dataset.status='error';$('#render-error').hidden=false;$('#render-error').textContent=`The live globe could not load: ${error.message}. Check WebGL and the local geography source, then reload.`;console.error(error);play.disabled=true;}
