import {fetchModelBytes} from './model-download.js';
import {assets} from '../review/runtime-assets.js';
import {createShipJetController} from '../review/ship-jet-controller.js';
import {loadShipJetScene} from '../review/ship-jet-scene.js';
import {gates,ease,storySpanScale,roadContentLayout} from '../review/handoff-sequence.js';
import {createTransportSequence} from './transport-sequence.js';

export function createTransportController({root,stage}){
  let modelBuffers;
  const controller=createShipJetController({root,stage,prepareVariants:true,contentSpacing:.85,loadScene:params=>loadShipJetScene({...params,modelBuffers,alpha:true,pickupConfig:{addBehind:true},sequenceFactory:createTransportSequence})});
  function update(input){
    const r=controller.update(input);if(!r)return;
    const $=selector=>root.querySelector(selector),p=r.progress,h=stage.clientHeight;
    const handoff=r.chapter==='handoff';
    const services=handoff?ease((p-gates.release)/(.03/storySpanScale))*(1-ease((p-gates.services)/(gates.upper-gates.services))):0;
    const overlay=$('#services-overlay'),rail=$('#services-rail');
    overlay.style.opacity=String(services);overlay.style.top=(50-34*ease((p-gates.services)/(gates.upper-gates.services)))+'%';
    rail.style.transform='translateX('+(-Math.max(0,rail.scrollWidth-stage.clientWidth)*Math.max(0,Math.min(1,(p-(gates.release+.02/storySpanScale))/(.08/storySpanScale))))+'px)';
    $('#services-title').style.opacity=String(services);$('#services-title').style.transform='translateX('+(2.5*(1-Math.max(0,Math.min(1,(p-(gates.release+.02/storySpanScale))/(.08/storySpanScale)))))+'vw)';
    overlay.setAttribute('aria-hidden',String(services<.01));
    $('#road-copy ol').style.setProperty('--road-row-gap',.36*h*.85+'px');
    const road=roadContentLayout(handoff?p:.97+p*.25,h,$('#road-copy ol').offsetHeight);
    $('#road-copy h2').style.transform='translateY('+road.leftY+'px)';$('#road-copy ol').style.transform='translateY('+road.rightY+'px)';
    $('#road-copy').style.clipPath=handoff?'none':'inset(0 0 '+(Math.max(0,Math.min(1,(r.cutNDC+1)/2))*100)+'% 0)';
    $('#road-copy').setAttribute('aria-hidden',String(handoff?!road.visible:r.chapter==='crossing'||p>=.44));
    r.roadCopy=road;r.servicesOpacity=services;
    stage.dataset.motion=JSON.stringify(r);return r;
  }
  function preload({signal}={}){
    if(modelBuffers)return;
    modelBuffers=new Map(Object.entries(assets).filter(([key])=>key.endsWith('.glb')).map(([,url])=>{
      const bytes=fetchModelBytes(url,{signal});
      // Errors remain observable by the model loader; background prefetch never
      // creates an unhandled rejection or owns a frame/scroll clock.
      bytes.catch(()=>{});return [url,bytes];
    }));
  }
  return {...controller,preload,mount:()=>controller.mount(),update,resize(){controller.resize();if(controller.trace)update();},render:()=>controller.render(),tick:t=>controller.tick(t),dispose:()=>controller.dispose(),
    get dirty(){return controller.dirty},get trace(){return controller.trace},get state(){return controller.state}};
}
