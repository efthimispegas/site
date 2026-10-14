import * as T from './vendor/three/build/three.module.js';
import {createShipSequence as createAcceptedSequence} from './ship-integration-sequence.js';
export const duration=16;
export const storyTime=p=>p*duration;
export const progressAtTime=t=>t/duration;
export const gates={transfer:0};
export function createShipSequence(options){
 const base=options.acceptedSequence||createAcceptedSequence(options),{camera,viewport}=options;let trace;
 // The road/deck wipe is complete before this slice; its old clip plane must
 // not expose the scene background during the additional camera retreat.
 if(options.clearClipOnMount!==false){options.water.material.clippingPlanes=[];options.ship.traverse(n=>{if(n.isMesh)n.material.clippingPlanes=[];});}
 function apply(p){
  // Continue the accepted ending without changing its camera orientation or assets.
  const sourceShipProgress=.84+.16*p,r=base.apply(sourceShipProgress);
  const target=new T.Vector3(...r.target),direction=camera.position.clone().sub(target).normalize();
  const rise=p*p*(2-p),distance=r.distance*(1+3*rise);
  camera.position.copy(target).addScaledVector(direction,distance);camera.updateMatrixWorld(true);
  const shipMatrix=new T.Matrix4().fromArray(r.shipMatrix),points=[];
  for(const x of [-55,55])for(const z of [-6.7,6.7])points.push(new T.Vector3(x,6.6,z).applyMatrix4(shipMatrix).project(camera));
  const hullScreen={left:(Math.min(...points.map(v=>v.x))+1)*viewport.width/2,right:(Math.max(...points.map(v=>v.x))+1)*viewport.width/2,top:(1-Math.max(...points.map(v=>v.y)))*viewport.height/2,bottom:(1-Math.min(...points.map(v=>v.y)))*viewport.height/2};
  trace={...r,progress:p,sourceShipProgress,contentTravel:p*.8,hullScreen,distance,camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),phase:p<.15?'Ship · continuing pullback':p<.40?'First veil · ship recedes':p<.85?'Cloud layers · camera rises':'Cloud banks · central ship gap'};
  return trace;
 }
 return {apply,resize:()=>base.resize(),tickWater:()=>base.tickWater(),get waterTime(){return base.waterTime},get trace(){return trace},get scale(){return base.scale}};
}
