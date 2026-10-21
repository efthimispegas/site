import {runInSlices,yieldToBrowser} from '../src/cooperative-work.js';
import {assets} from './runtime-assets.js';
import * as T from './vendor/three/build/three.module.js';
import {gates} from './ship-jet-sequence.js';
import {roadContentLayout} from './handoff-sequence.js';
import {shipContentLayout,shipContentCardWidth} from './ship-content.js';
import {createCloudLayers} from './cloud-story-layers.js';
import {createJetCrossing} from './jet-crossing.js';
import {loadShipJetScene} from './ship-jet-scene.js';
import {createScope} from './runtime-lifecycle.js';

/**
 * @param {{root: Document|Element, stage: HTMLElement, inspection?: boolean,
 * assetUrls?: Record<string,string>, onChange?: ()=>void}} options
 * Frame ownership belongs to the caller. Update/resize do not schedule callbacks.
 */
export function createShipJetController({root,stage,inspection=false,prepareVariants=false,contentSpacing=1,assetUrls=assets,onChange=()=>{},loadScene=loadShipJetScene}){
 const scope=createScope(),$=selector=>root.querySelector(selector),viewport={width:stage.clientWidth,height:stage.clientHeight};
 let renderer,scene,camera,sequence,cloudLayers,jetCrossing,progress=0,reducedMotion=false,dirty=true,mounting,state='idle';
function update(){
 const r=sequence.apply(progress),h=stage.clientHeight;const clouds=cloudLayers.apply(r.cloudMotionProgress);r.clouds=clouds;r.jet=jetCrossing.apply(r.jetProgress,reducedMotion);const light=scene.userData.shipLight;if(light&&r.progress>.12){const m=new T.Matrix4().fromArray(r.shipMatrix),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));light.target.position.set(...r.shipPosition);light.position.copy(light.target.position).add(new T.Vector3(-15,60,55).applyQuaternion(q));light.target.updateMatrixWorld();}
 const old=roadContentLayout(.97+progress*.25,h,$('#road-copy ol').offsetHeight);$('#road-copy h2').style.transform='translateY('+old.leftY+'px)';$('#road-copy ol').style.transform='translateY('+old.rightY+'px)';$('#road-copy ol').style.setProperty('--road-row-gap',.36*h+'px');$('#road-copy').style.clipPath='inset(0 0 '+(Math.max(0,Math.min(1,(r.cutNDC+1)/2))*100)+'% 0)';$('#road-copy').setAttribute('aria-hidden',String(progress>=gates.transfer));
 const w=stage.clientWidth,cardWidth=w<=760?Math.max(72,Math.min(w*.40,(w-(r.hullScreen.right-r.hullScreen.left))/2-Math.max(12,w*.022))):Math.min(w*.31,360),cards=[...root.querySelectorAll('#ship-copy li')];
 cards.forEach((li,i)=>{li.style.width=(i===4?Math.min(w*.52,360):shipContentCardWidth(i,w,cardWidth))+'px';li.style.setProperty('--card-width',li.style.width);});
 const layout=shipContentLayout(r.sourceShipProgress,w,h,r.hullScreen,cardWidth,$('#ship-copy h2').offsetHeight,contentSpacing);$('#ship-copy h2').style.transform='translate(-50%,'+(layout.titleY-r.contentTravel*h)+'px)';
 cards.forEach((li,i)=>{const box=layout.items[i],x=i===4?(w-li.offsetWidth)/2:box.x;li.style.transform='translate('+x+'px,'+(box.y-r.contentTravel*h)+'px)';li.style.visibility=box.visible?'visible':'hidden';li.setAttribute('aria-hidden',String(!box.visible));box.x=x;box.width=li.offsetWidth;box.height=li.offsetHeight;box.y-=r.contentTravel*h;});$('#ship-copy').setAttribute('aria-hidden',String(!layout.visible));r.copyLayout=layout;
 stage.dataset.motion=JSON.stringify(r);dirty=true;return r;
}
function resize({width=stage.clientWidth,height=stage.clientHeight}={}){if(scope.disposed||!renderer||!camera)return;viewport.width=width;viewport.height=height;stage.style.setProperty('--story-height',viewport.height+'px');renderer.setSize(viewport.width,viewport.height);camera.aspect=viewport.width/viewport.height;camera.updateProjectionMatrix();if(sequence){sequence.resize();update();}}

 async function mount(){
  if(state==='disposed')throw Error('Disposed scene cannot be mounted again; create a new controller');
  if(mounting)return mounting;
  state='mounting';
  mounting=(async()=>{
   cloudLayers=await createCloudLayers(stage,onChange,{root,scope,inspection,assetUrls});
   jetCrossing=await createJetCrossing(stage,onChange,{root,scope,inspection,assetUrls});
   if(scope.disposed)throw new DOMException('Scene disposed','AbortError');
   const loaded=await loadScene({root,stage,viewport,scope,assetUrls,onRendererReady:values=>{({renderer,scene,camera}=values);resize();}});
   ({renderer,scene,camera,sequence}=loaded);resize();
   const textures=new Set();scene.traverse(object=>{for(const material of [].concat(object.material||[]))for(const value of Object.values(material))if(value?.isTexture&&!value.isVideoTexture)textures.add(value);});
   function* upload(){for(const texture of textures){renderer.initTexture(texture);yield;}}
   await runInSlices(upload(),{signal:scope.signal});await yieldToBrowser();
   await renderer.compileAsync(scene,camera);if(scope.disposed)throw new DOMException('Scene disposed','AbortError');
   state='mounted';
   if(prepareVariants){
    const requested=progress;
    for(const sample of [0,.18,.36,.50,.72,.93,1]){
     if(scope.disposed)throw new DOMException('Scene disposed','AbortError');
     progress=sample;update();await renderer.compileAsync(scene,camera);render();await yieldToBrowser();
    }
    progress=requested;
   }
   return update();
  })();
  return mounting;
 }

 function render(){if(state==='disposed'||!renderer)return;renderer.render(scene,camera);dirty=false;stage.dataset.drawCalls=renderer.info.render.calls;stage.dataset.triangles=renderer.info.render.triangles;}
 function dispose(){if(state==='disposed')return;state='disposed';scope.dispose();}
 return {mount,update(input={}){if(state!=='mounted')return;if(input.progress!==undefined)progress=T.MathUtils.clamp(input.progress,0,1);if(input.reducedMotion!==undefined)reducedMotion=input.reducedMotion;return update();},resize,render,
  tick(time){return state==='mounted'&&sequence.tickWater(time/1000);},dispose,
  get dirty(){return dirty},get trace(){return sequence?.trace},get waterTime(){return sequence?.waterTime},get state(){return state}};
}
