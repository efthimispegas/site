import * as T from '../review/vendor/three/build/three.module.js';
import {createShipSequence as createDeckSequence} from '../review/ship-integration-sequence.js';
import {createShipSequence as createCrossingSequence} from '../review/ship-jet-sequence.js';
import {gates,ease} from '../review/handoff-sequence.js';
import {chapterAt} from './transport-timeline.js';

/** One camera and one physical C01 instance across all three accepted chapters. */
export function createTransportSequence(options){
  const {legacy,rig,ship,water,road,floor,scene,camera,viewport,renderer}=options;
  const deck=createDeckSequence(options);
  const crossing=createCrossingSequence({...options,acceptedSequence:deck,clearClipOnMount:false});
  const clips=new Map();
  for(const group of [road,floor,legacy.truck,ship,water])group.traverse(n=>{
    if(n.isMesh)for(const m of [].concat(n.material))clips.set(m,m.clippingPlanes);
  });
  const shipKey=scene.userData.shipLight,hemisphere=scene.children.find(n=>n.isHemisphereLight),fill=scene.children.find(n=>n.isDirectionalLight&&n!==shipKey);
  const handoffKey=new T.DirectionalLight(0xf5f8fc,2.1);handoffKey.position.set(0,12,7);scene.add(handoffKey);
  const shadows=contactShadows(T,scene,legacy,rig);
  let trace;
  function apply(progress){
    const chapter=chapterAt(progress),p=chapter.localProgress;
    const seaBlend=chapter.id==='handoff'?0:chapter.id==='ship'?ease(p/.12):1;
    scene.environmentIntensity=T.MathUtils.lerp(.65,.35,seaBlend);
    hemisphere.intensity=T.MathUtils.lerp(.45,.25,seaBlend);hemisphere.groundColor.set(0x506276).lerp(new T.Color(0x263344),seaBlend);
    fill.intensity=T.MathUtils.lerp(.7,.3,seaBlend);
    handoffKey.intensity=2.1*(1-seaBlend);shipKey.intensity=2.3*seaBlend;
    renderer.shadowMap.enabled=seaBlend>0;
    camera.far=chapter.id==='handoff'?2000:10000;camera.updateProjectionMatrix();
    scene.userData.shipLight=chapter.id==='handoff'?null:shipKey;
    for(const [material,planes]of clips)material.clippingPlanes=chapter.id==='handoff'?[]:planes;
    rig.root.visible=chapter.id==='handoff';
    if(chapter.id==='handoff'){
      ship.visible=false;water.visible=false;
      const r=legacy.apply(p),opacity=ease((p-gates.services)/(gates.upper-gates.services));
      for(const child of road.children)child.material.opacity=opacity;
      road.visible=p>gates.services;
      scene.background=p>=gates.release&&p<gates.upper?null:new T.Color('#EDF2F7');
      floor.visible=!(p>=gates.release&&p<gates.upper);
      trace={...r,chapter:'handoff',sourceShipProgress:-1,contentTravel:0,cloudMotionProgress:0,jetProgress:0,hullScreen:{left:viewport.width/2,right:viewport.width/2,top:0,bottom:0}};
    }else{
      scene.background=new T.Color('#061e3b');
      for(const child of road.children)child.material.opacity=1;
      if(chapter.id==='crossing'){
        water.material.clippingPlanes=[];ship.traverse(n=>{if(n.isMesh)n.material.clippingPlanes=[];});
        trace={...crossing.apply(p),chapter:'crossing'};
      }else{
        trace={...deck.apply(p),chapter:'ship',sourceShipProgress:p,contentTravel:0,cloudMotionProgress:0,jetProgress:0};
      }
      // Track one light target across the connected sea/camera passage, including
      // the crossing's local zero. Avoid resetting it at that chapter boundary.
      if(trace.sourceShipProgress>.12){
        const m=new T.Matrix4().fromArray(trace.shipMatrix),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));
        shipKey.target.position.set(...trace.shipPosition);shipKey.position.copy(shipKey.target.position).add(new T.Vector3(-15,60,55).applyQuaternion(q));shipKey.target.updateMatrixWorld();
      }else{shipKey.position.set(0,12,7);shipKey.target.position.set(0,0,0);shipKey.target.updateMatrixWorld();}
    }
    for(const {wheel,shadow}of shadows){
      const p=wheel.getWorldPosition(new T.Vector3());shadow.position.set(p.x,.006,p.z);
      shadow.quaternion.copy(wheel.parent.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));
      shadow.material.opacity=.5*(1-seaBlend);
      shadow.visible=seaBlend<1&&(chapter.id==='handoff'&&wheel.userData.liftWheel||legacy.truck.visible);
    }
    trace.journeyProgress=progress;trace.localTime=chapter.localTime;
    return trace;
  }
  return {apply,resize:()=>deck.resize(),tickWater:()=>deck.tickWater(),get waterTime(){return deck.waterTime},get trace(){return trace},get scale(){return legacy.scale}};
}

// Accepted soft tyre contact treatment, extracted from the handoff renderer.
function contactShadows(T,scene,sequence,rig){
  const pixels=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)pixels[(y*128+x)*4+3]=Math.round(255*Math.exp(-6*(((x-63.5)/63.5)**2+((y-63.5)/63.5)**2)));
  const map=new T.DataTexture(pixels,128,128,T.RGBAFormat);map.needsUpdate=true;
  return [...sequence.wheels,...rig.wheels].map(wheel=>{
    const isLift=rig.wheels.includes(wheel);wheel.userData.liftWheel=isLift;
    const width=isLift?.70:.65*sequence.scale,height=isLift?.50:.48*sequence.scale;
    const shadow=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,transparent:true,opacity:.50,depthWrite:false}));
    scene.add(shadow);return {wheel,shadow};
  });
}
