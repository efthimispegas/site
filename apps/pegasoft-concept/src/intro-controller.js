import {createGlobe} from './hero-globe.js';
import {GLOBE_DEFAULTS,clamp} from './hero-opening-sequence.js';
import {createCounter} from './hero-odometer.js';
import {OUTCOME_METRICS,metricLayout,createMetricPlayback} from './outcome-metrics.js';
import {LOADER_DEFAULTS,loaderState} from './loader-sequence.js';
import {introState} from './intro-sequence.js';
import {createScope} from '../review/runtime-lifecycle.js';

/** Scoped chapter lifecycle. The homepage owns its single frame scheduler. */
export function createIntroController({stage,settings=LOADER_DEFAULTS}){
 const scope=createScope(),$=s=>stage.querySelector(s),lines=[...stage.querySelectorAll('.line>span')];
 const counters=[...stage.querySelectorAll('.metric-value')].map((el,i)=>createCounter(el,{...OUTCOME_METRICS[i],fontSize:null,gap:0,horizontalPadding:0,gradientFrom:'#edf2f7'}));
 const playback=createMetricPlayback();let resolveOpened;const whenOpened=new Promise(resolve=>resolveOpened=resolve);
 let loaderSettings={...LOADER_DEFAULTS,...settings},reduced=false,running=true,speed=1;
 let globe,task,ready=false,progress=0,openingTime=0,sceneTime=0,rotationTime=0,last=null,active=true;
 function render(dt=0){
  if(!ready||scope.disposed)return;
  const state=introState(progress),opening=loaderState(openingTime,loaderSettings,reduced),w=stage.clientWidth,h=stage.clientHeight,radius=Math.hypot(w/2,h/2)+2;
  const hero=$('#hero');hero.style.clipPath=`circle(${opening.aperture*radius}px at 50% 50%)`;
  hero.style.transform=`translateY(${state.heroY*h}px)`;
  const maskOrigin=(state.horizonY-state.heroY)*h;
  // Keep the entire region above the bowl opaque. Only its lower curved edge
  // merges with the incoming atmosphere; a full ellipse would clip the top.
  hero.style.maskImage=state.wipe===0?'none':`linear-gradient(180deg,#000 ${Math.max(0,maskOrigin)}px,transparent ${Math.max(0,maskOrigin)}px),radial-gradient(ellipse ${Math.max(.90*w,1.20*h)}px ${h}px at 50% ${maskOrigin}px,#000 48%,transparent 66%)`;
  hero.inert=progress>.20||opening.aperture<.95;hero.setAttribute('aria-hidden',String(state.wipe===1));
  $('#radar').style.opacity=opening.ringOpacity;$('#radar').style.transform=`scale(${opening.ringScale})`;$('#mark').style.opacity=opening.markOpacity;
  $('#pulse').style.visibility=opening.pulseVisible?'visible':'hidden';$('#pulse').style.width=$('#pulse').style.height=`${radius*2*(.08+.94*opening.pulseScale)}px`;
  const nav=$('.hero-nav');if(nav){nav.style.opacity=opening.nav*(1-state.utilityExit);nav.style.transform=`translateY(${(1-opening.nav)*-12-state.utilityExit*16}px)`;nav.inert=progress>.12||opening.nav<.95;}
  lines.forEach((el,i)=>{el.style.transform=`translateY(${(1-opening.lines[i])*108-state.lineExit[i]*115}%)`;el.style.opacity=clamp(opening.lines[i]*4);});
  $('#kicker').style.opacity=opening.lines[0]*(1-state.utilityExit);$('#kicker').style.transform=`translateY(${(1-opening.lines[0])*10-state.utilityExit*20}px)`;
  $('.hero-body').style.opacity=opening.body*(1-state.utilityExit);$('.hero-body').style.transform=`translateY(${(1-opening.body)*20-state.utilityExit*20}px)`;
  $('.hero-actions').style.opacity=opening.cta*(1-state.utilityExit);$('.hero-actions').style.transform=`translateY(${(1-opening.cta)*20-state.utilityExit*20}px)`;$('.hero-actions').inert=progress>.12||opening.cta<.95;
  const bottom=$('.hero-bottom');if(bottom)bottom.style.opacity=opening.body*(1-state.utilityExit);
  $('.horizon').style.transform=`translateY(${state.horizonY*h}px)`;$('.outcome').hidden=!state.outcomeActive;
  const titleY=w<680&&progress>=.19?.88-.80*clamp((progress-.19)/(.50-.19)):state.titleY,metrics=metricLayout(progress,w,h),metricsY=metrics.metricsY;
  $('.outcome-title').style.transform=`translateY(${titleY*h}px)`;$('.metrics').style.transform=`translateY(${metricsY*h}px)`;
  const targets=playback.update(metrics.rowPositions,dt);counters.forEach((counter,i)=>counter.render(targets[i],dt,reduced));
  const geometry=globe.render(rotationTime,sceneTime);
  stage.dataset.motion=JSON.stringify({progress,openingTime,sceneTime,rotationTime,opening,loaderSettings,counterPlayback:playback.state,state,layout:{titleY,...metrics},geometry});if(opening.complete)resolveOpened();
 }
 function resize(){
  if(!globe||scope.disposed)return;globe.resize(stage.clientWidth,stage.clientHeight);
  const outcome=$('.outcome'),wasHidden=outcome.hidden;outcome.hidden=false;
  const values=[...stage.querySelectorAll('.metric-value')];values.forEach(el=>el.style.fontSize='');
  const base=parseFloat(getComputedStyle(values[0]).fontSize),width=$('.metrics').clientWidth,max=Math.max(...values.map(el=>el.getBoundingClientRect().width));
  const size=base*Math.min(1,(width-4)/max);values.forEach(el=>el.style.fontSize=size+'px');counters.forEach(counter=>counter.resize());outcome.hidden=wasHidden;render();
 }
 function mount(){
  if(scope.disposed)throw Error('Intro controller disposed');if(task)return task;
  task=createGlobe($('#globe'),{assetUrl:new URL(import.meta.env.BASE_URL+'assets/generation/hero-globe/land-dots.json',stage.ownerDocument.location.origin).href,signal:scope.signal}).then(async instance=>{
   globe=instance;await stage.ownerDocument.fonts.ready;if(scope.disposed){globe.dispose();return;}
   scope.defer(()=>{counters.forEach(counter=>counter.dispose());globe.dispose();$('#globe').dataset.disposed='true';});globe.configure(GLOBE_DEFAULTS);ready=true;stage.dataset.loaded='true';resize();
  });return task;
 }
 return {mount,update({progress:value=progress,inView=true}={}){progress=clamp(value);active=inView;render();},resize,
  tick(now){const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;if(!ready||scope.disposed)return;const step=dt*speed;if(running){openingTime=reduced?loaderState(0,loaderSettings).end:Math.min(openingTime+step,loaderState(openingTime,loaderSettings).end);if(active){sceneTime+=step;rotationTime+=step*GLOBE_DEFAULTS.speed;}render(step);}},
  configureLoader(values){loaderSettings={...loaderSettings,...values};stage.style.setProperty('--loader-beat-duration',loaderSettings.beatDuration+'s');stage.style.setProperty('--loader-beat-amount',loaderSettings.beatAmount);stage.style.setProperty('--loader-ring-from',loaderSettings.ringFrom);render();},
  setPlayback(values){if('running'in values)running=values.running;if('speed'in values)speed=values.speed;if('reduced'in values)reduced=values.reduced;last=null;render();},
  seek(time){openingTime=clamp(time,0,loaderState(0,loaderSettings).end);running=false;render();},
  restart(){openingTime=0;sceneTime=0;rotationTime=0;running=true;last=null;render();},
  get whenOpened(){return whenOpened;},pause(){last=null;},dispose(){scope.dispose();ready=false;stage.dataset.loaded='false';},get ready(){return ready}};
}
