import {createGlobe} from './hero-globe.js';
import {DEFAULTS,GLOBE_DEFAULTS,openingState,clamp} from './hero-opening-sequence.js';
import {createCounter} from './hero-odometer.js';
import {OUTCOME_METRICS,metricLayout} from './outcome-metrics.js';
import {introState} from './intro-sequence.js';
import {createScope} from '../review/runtime-lifecycle.js';

/** Scoped chapter lifecycle. The homepage owns its single frame scheduler. */
export function createIntroController({stage}){
 const scope=createScope(),$=s=>stage.querySelector(s),lines=[...stage.querySelectorAll('.line>span')];
 const counters=[...stage.querySelectorAll('.metric-value')].map((el,i)=>createCounter(el,{...OUTCOME_METRICS[i],fontSize:null,gap:0,horizontalPadding:0,gradientFrom:'#edf2f7'}));
 let globe,task,ready=false,progress=0,openingTime=0,sceneTime=0,rotationTime=0,last=null,active=true;
 function render(dt=0){
  if(!ready||scope.disposed)return;
  const state=introState(progress),opening=openingState(openingTime),w=stage.clientWidth,h=stage.clientHeight,radius=Math.hypot(w/2,h/2)+2;
  const hero=$('#hero');hero.style.clipPath=`circle(${opening.aperture*radius}px at 50% 50%)`;
  hero.style.transform=`translateY(${state.heroY*h}px)`;
  const maskOrigin=(state.horizonY-state.heroY)*h;
  // Keep the entire region above the bowl opaque. Only its lower curved edge
  // merges with the incoming atmosphere; a full ellipse would clip the top.
  hero.style.maskImage=state.wipe===0?'none':`linear-gradient(180deg,#000 ${Math.max(0,maskOrigin)}px,transparent ${Math.max(0,maskOrigin)}px),radial-gradient(ellipse ${Math.max(.90*w,1.20*h)}px ${h}px at 50% ${maskOrigin}px,#000 48%,transparent 66%)`;
  hero.inert=progress>.20||opening.aperture<.95;hero.setAttribute('aria-hidden',String(state.wipe===1));
  $('#radar').style.opacity=opening.ringOpacity;$('#radar').style.transform=`scale(${opening.ringScale})`;$('#mark').style.opacity=opening.markOpacity;
  $('#pulse').style.visibility=opening.pulseVisible?'visible':'hidden';$('#pulse').style.width=$('#pulse').style.height=`${radius*2*(.08+.94*opening.pulseScale)}px`;
  $('.hero-nav').style.opacity=opening.nav*(1-state.utilityExit);$('.hero-nav').style.transform=`translateY(${(1-opening.nav)*-12-state.utilityExit*16}px)`;$('.hero-nav').inert=progress>.12||opening.nav<.95;
  lines.forEach((el,i)=>{el.style.transform=`translateY(${(1-opening.lines[i])*108-state.lineExit[i]*115}%)`;el.style.opacity=clamp(opening.lines[i]*4);});
  $('#kicker').style.opacity=opening.lines[0]*(1-state.utilityExit);$('#kicker').style.transform=`translateY(${(1-opening.lines[0])*10-state.utilityExit*20}px)`;
  $('.hero-body').style.opacity=opening.body*(1-state.utilityExit);$('.hero-body').style.transform=`translateY(${(1-opening.body)*20-state.utilityExit*20}px)`;
  $('.hero-actions').style.opacity=opening.cta*(1-state.utilityExit);$('.hero-actions').style.transform=`translateY(${(1-opening.cta)*20-state.utilityExit*20}px)`;$('.hero-actions').inert=progress>.12||opening.cta<.95;
  $('.hero-bottom').style.opacity=opening.body*(1-state.utilityExit);
  $('.horizon').style.transform=`translateY(${state.horizonY*h}px)`;$('.outcome').hidden=!state.outcomeActive;
  const titleY=w<680&&progress>=.285?.94-.86*clamp((progress-.285)/(.59-.285)):state.titleY,metrics=metricLayout(progress,w,h),metricsY=metrics.metricsY;
  $('.outcome-title').style.transform=`translateY(${titleY*h}px)`;$('.metrics').style.transform=`translateY(${metricsY*h}px)`;
  counters.forEach((counter,i)=>counter.render(metrics.counts[i],dt));
  const geometry=globe.render(rotationTime,sceneTime);
  stage.dataset.motion=JSON.stringify({progress,openingTime,sceneTime,rotationTime,opening,state,layout:{titleY,...metrics},geometry});
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
   scope.defer(()=>{counters.forEach(counter=>counter.dispose());globe.dispose();$('#globe').dataset.disposed='true';});globe.configure(GLOBE_DEFAULTS);ready=true;resize();stage.dataset.loaded='true';
  });return task;
 }
 return {mount,update({progress:value=progress,inView=true}={}){progress=clamp(value);active=inView;render();},resize,
  tick(now){const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;if(!ready||!active||scope.disposed)return;sceneTime+=dt;rotationTime+=dt*GLOBE_DEFAULTS.speed;openingTime=Math.min(openingTime+dt,openingState(openingTime,DEFAULTS).end);render(dt);},
  pause(){last=null;},dispose(){scope.dispose();ready=false;stage.dataset.loaded='false';},get ready(){return ready}};
}
