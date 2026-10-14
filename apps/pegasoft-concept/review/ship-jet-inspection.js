import * as T from './vendor/three/build/three.module.js';
import {duration,storyTime,progressAtTime} from './ship-jet-sequence.js';
import {createShipJetController} from './ship-jet-controller.js';
import {createScope,createFrameLoop} from './runtime-lifecycle.js';

/** Inspection-only playback/scroll controls; the scene controller owns no frame loop. */
export function createShipJetInspection(root){
 const $=selector=>root.querySelector(selector),stage=$('#stage'),document=root.ownerDocument||root,window=document.defaultView;
 const media=window.matchMedia('(prefers-reduced-motion: reduce)'),gentle=()=>media.matches||$('#reduce').checked;
 let sceneController,scope,loop,progress=0,playing=false,reverse=false,speed=1,last=0,frames=[],limit=1,recordStart,
  scrollMode=false,scrollDistance=0,controlProgress=0,scrollGuard=0,cloudPointerDown=false,mountGeneration=0,mountTask;
 const pendingFrames=new Set(),failurePresentation=new Map();
 function clearFallback(){stage.querySelector('#fallback')?.remove();for(const [element,visibility]of failurePresentation)element.style.visibility=visibility;failurePresentation.clear();}
 const render=()=>sceneController.render();
 function schedule(callback){const id=window.requestAnimationFrame(()=>{pendingFrames.delete(id);if(!scope.disposed)callback();});pendingFrames.add(id);}
 function update(){
  const r=sceneController?.update({progress,reducedMotion:gentle()});if(!r)return;
  $('#progress').value=String(progress);$('#progress-value').textContent=(progress*100).toFixed(1)+'%';$('#phase').textContent=r.phase;
  $('#owner').textContent=r.owner==='deck'?'C01 supported by ship':'C01 supported by trailer';$('#contacts').textContent=r.owner==='deck'?'Seat gap '+(r.supportGap*1000).toFixed(4)+' mm':'';
  for(const b of root.querySelectorAll('#play,#reverse,#progress,[data-cue]'))b.disabled=gentle();
  return r;
 }
const storyStart=()=>$('#story-track').getBoundingClientRect().top+window.scrollY;
function sizeStory(){if(scrollMode){const overhead=$('#viewer').offsetHeight-stage.offsetHeight;stage.style.height=Math.max(180,window.innerHeight-overhead-12)+'px';}scrollDistance=Math.max(4200,window.innerHeight*8)*1.04;$('#story-track').style.height=($('#viewer').offsetHeight+scrollDistance)+'px';}
function stop(){stage.dataset.playback=JSON.stringify(frames.map(r=>({progress:r.progress,elapsed:r.elapsed,dt:r.dt,distance:r.distance,camera:r.camera,quaternion:r.quaternion,clouds:r.clouds,supportGap:r.supportGap,copy:r.copyLayout?.items,cloudProgress:r.cloudProgress,jet:r.jet,fifth:r.copyLayout?.items[4]})));playing=false;$('#play').setAttribute('aria-pressed','false');$('#observations').textContent=JSON.stringify(frames.slice(-10),null,2);}
function setScroll(value){scrollGuard=Infinity;stop();const keep=progress;scrollMode=value;document.body.classList.toggle('scroll-mode',value);$('#scroll-mode').setAttribute('aria-pressed',String(value));$('#scroll-hint').hidden=!value;if(value){sizeStory();window.scrollTo({top:storyStart()+storyTime(keep)/duration*scrollDistance,behavior:'instant'});}else{stage.style.height='';$('#story-track').style.height='';window.scrollTo({top:storyStart(),behavior:'instant'});}stage.dataset.driver=value?'scroll':'playback';resize();}
function seek(value){stop();progress=T.MathUtils.clamp(value,0,1);if(scrollMode)window.scrollTo({top:storyStart()+storyTime(progress)/duration*scrollDistance,behavior:'instant'});update();}
function begin(capturing=false){if(gentle())return;if(!capturing)limit=reverse?0:1;if(scrollMode)setScroll(false);if(progress>=1&&!reverse)progress=0;if(progress<=0&&reverse)progress=1;playing=true;frames=[];recordStart=window.performance.now();last=0;$('#play').setAttribute('aria-pressed','true');}
function resize(){sceneController?.resize();update();if(scrollMode){sizeStory();window.scrollTo({top:storyStart()+storyTime(progress)/duration*scrollDistance,behavior:'instant'});}}
 function frame(t){const dt=last?(t-last)/1000:0;last=t;if(playing&&!document.hidden){progress=T.MathUtils.clamp(progressAtTime(storyTime(progress)+(reverse?-1:1)*dt*speed),reverse?limit:0,reverse?1:limit);const r=update();sceneController.tick(t);render();frames.push({...r,waterTime:sceneController.waterTime,elapsed:(t-recordStart)/1000,dt,drawCalls:Number(stage.dataset.drawCalls)});if((reverse&&progress<=limit)||(!reverse&&progress>=limit))stop();}else if((!document.hidden&&sceneController.tick(t))||sceneController.dirty)render();}
 function mount(){
  if(mountTask)return mountTask;
  clearFallback();const generation=++mountGeneration;scope=createScope();progress=0;playing=false;reverse=false;speed=1;last=0;frames=[];scrollMode=false;cloudPointerDown=false;scrollGuard=0;controlProgress=0;
  const ownedScope=scope;
  const originalHeight=stage.style.height,originalTrack=$('#story-track').style.height,originalScrollClass=document.body.classList.contains('scroll-mode');
  scope.defer(()=>{stage.style.height=originalHeight;$('#story-track').style.height=originalTrack;document.body.classList.toggle('scroll-mode',originalScrollClass);});
  scope.defer(()=>{for(const id of pendingFrames)window.cancelAnimationFrame(id);pendingFrames.clear();});
  sceneController=createShipJetController({root,stage,inspection:true,onChange:update});
  const ownedController=sceneController;
  root.querySelectorAll('button,input').forEach(b=>b.disabled=true);stage.dataset.loaded='false';$('#loading').hidden=false;
  mountTask=(async()=>{
   try{
    await ownedController.mount();
    if(ownedScope.disposed||generation!==mountGeneration){ownedController.dispose();return;}
    const observer=new ResizeObserver(()=>{if(!ownedScope.disposed&&generation===mountGeneration)resize();});observer.observe(stage);scope.defer(()=>observer.disconnect());
    $('#loading').hidden=true;$('#status').textContent='Approved ship / clouds / J02 · Connected review';stage.dataset.loaded='true';stage.dataset.driver='playback';
    root.querySelectorAll('button,input').forEach(b=>b.disabled=false);
scope.listen(window,'scroll',()=>{if(scrollMode&&sceneController?.state==='mounted'&&window.performance.now()>scrollGuard){progress=progressAtTime(T.MathUtils.clamp((window.scrollY-storyStart())/scrollDistance,0,1)*duration);update();}},{passive:true});
scope.listen(window,'resize',()=>{if(scrollMode){sizeStory();window.scrollTo({top:storyStart()+storyTime(progress)/duration*scrollDistance,behavior:'instant'});}});
 scope.handler($('#play'),'onclick',()=>begin());scope.handler($('#pause'),'onclick',stop);scope.handler($('#reverse'),'onclick',()=>{reverse=!reverse;$('#reverse').setAttribute('aria-pressed',String(reverse));begin();});scope.handler($('#restart'),'onclick',()=>{reverse=false;$('#reverse').setAttribute('aria-pressed','false');seek(0);});for(const[id,v]of[['normal',1],['slow',.25]])scope.handler($('#'+id),'onclick',()=>{speed=v;$('#normal').setAttribute('aria-pressed',String(speed===1));$('#slow').setAttribute('aria-pressed',String(speed===.25));});scope.handler($('#progress'),'oninput',()=>seek(Number($('#progress').value)));root.querySelectorAll('[data-cue]').forEach(b=>scope.handler(b,'onclick',()=>seek(Number(b.dataset.cue))));scope.handler($('#scroll-mode'),'onclick',()=>setScroll(!scrollMode));const restoreControlScroll=()=>{if(scrollMode)window.scrollTo({top:storyStart()+progress*scrollDistance,behavior:'instant'});};const holdScroll=()=>{if(scrollMode){scrollGuard=Infinity;if(!cloudPointerDown)schedule(restoreControlScroll);}};for(const panel of root.querySelectorAll('#cloud-controls,#shadow-controls'))scope.listen(panel,'pointerdown',()=>{cloudPointerDown=true;scrollGuard=Infinity;},true);scope.listen(window,'pointerup',()=>{if(cloudPointerDown){cloudPointerDown=false;schedule(restoreControlScroll);}});for(const panel of root.querySelectorAll('#cloud-controls,#shadow-controls'))for(const event of ['focusin','keydown','input','click'])scope.listen(panel,event,holdScroll,true);scope.listen(window,'wheel',()=>{scrollGuard=0;},{passive:true});scope.listen(window,'keydown',event=>{if(!event.target.closest('#cloud-controls,#shadow-controls'))scrollGuard=0;});scope.listen(window,'touchmove',()=>{scrollGuard=0;},{passive:true});scope.handler($('#cloud-controls-toggle'),'onclick',()=>{const panel=$('#cloud-params-panel'),open=panel.hidden;controlProgress=progress;panel.hidden=!open;$('#cloud-controls').dataset.open=String(open);$('#cloud-controls-toggle').setAttribute('aria-expanded',String(open));if(scrollMode){progress=controlProgress;resize();}});
 scope.handler($('#shadow-editor-toggle'),'onclick',()=>{const panel=$('#shadow-params-panel'),open=panel.hidden;panel.hidden=!open;$('#shadow-editor-toggle').setAttribute('aria-expanded',String(open));if(scrollMode)resize();});scope.handler($('#reduce'),'onchange',()=>{stop();update();});scope.listen(media,'change',()=>{stop();update();});update();

    scope.listen(document,'visibilitychange',()=>{last=0;});
    loop=createFrameLoop(frame);loop.start();update();
   }catch(error){
    if(ownedScope.disposed||generation!==mountGeneration)return;
    ownedController.dispose();ownedScope.dispose();
    $('#status').textContent='Could not load: '+error.message;$('#loading').textContent='Use the accepted static family.';
    const fallback=document.createElement('img');fallback.id='fallback';fallback.src=new URL('../assets/generation/ship-family/S01/S01-oblique-original.png',location.href).href;fallback.alt='Accepted ship master';stage.append(fallback);
    for(const layer of stage.querySelectorAll('[data-cloud],#aircraft,#shadow-receiver,#trust,#ship-copy,#road-copy')){failurePresentation.set(layer,layer.style.visibility);layer.style.visibility='hidden';}
    root.querySelector('#controller-remount').disabled=false;stage.dataset.loaded='error';throw error;
   }
  })();return mountTask;
 }
 function dispose(){
  ++mountGeneration;loop?.stop();scope?.dispose();sceneController?.dispose();clearFallback();mountTask=null;playing=false;stage.dataset.loaded='false';
 }
 return {mount,dispose,seek,get controller(){return sceneController},get activeFrameLoops(){return loop?.active?1:0}};
}
