import * as T from './vendor/three/build/three.module.js';
import {ease,steadyPace} from './handoff-sequence.js';
export const duration=22;
export const gates={roadEnd:.12,deckStart:.12,transfer:.44,pullback:.44,reveal:.84,copy:.73};
const blend=(p,a,b)=>ease((p-a)/(b-a));
export function createShipSequence({legacy,rig,ship,cargo,road,floor,water,scene,camera,viewport}){
  const anchor=new T.Vector3(-4.9,9.816,-1.269),scale=legacy.scale;
  const roadClip=new T.Plane(),deckClip=new T.Plane();
  for(const group of [road,floor,legacy.truck])group.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.clippingPlanes=[roadClip];n.material.clipShadows=true;}});
  ship.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.clippingPlanes=[deckClip];}});
  water.material.clippingPlanes=[deckClip];
  scene.add(ship,water);rig.root.visible=false;
  let endCamera,endTarget,endQuaternion,endDirection,finalDistance,trace;
  function resize(){
    legacy.resize();const r=legacy.apply(1);endCamera=camera.position.clone();endTarget=new T.Vector3(...r.target);endQuaternion=camera.quaternion.clone();endDirection=endCamera.clone().sub(endTarget).normalize();
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov)/2);
    // One static authoring envelope; never a moving bounds fit.
    finalDistance=Math.max(r.distance,110*scale/(2*tan*.70),13.65*scale/(2*tan*camera.aspect*.65));
  }
  resize();
  function apply(p){
    const old=legacy.apply(p<=gates.roadEnd?.97+.03*p/gates.roadEnd:1);
    const distance=p<=gates.roadEnd?0:steadyPace*.25*(p-gates.roadEnd)*scale;
    const heading=new T.Vector3(1,0,0).applyQuaternion(legacy.truck.quaternion),travel=heading.multiplyScalar(distance);
    legacy.truck.position.add(travel);legacy.truck.updateMatrixWorld(true);
    cargo.updateWorldMatrix(true,false);
    const carried=cargo.matrixWorld.clone(),position=cargo.getWorldPosition(new T.Vector3()),rotation=cargo.getWorldQuaternion(new T.Quaternion()),worldScale=cargo.getWorldScale(new T.Vector3());
    ship.quaternion.copy(rotation);ship.scale.copy(worldScale);ship.position.copy(position).sub(anchor.clone().multiply(worldScale).applyQuaternion(rotation));ship.updateMatrixWorld(true);
    const owner=p>=gates.transfer?'deck':'trailer';
    if(owner==='deck'){ship.add(cargo);cargo.position.copy(anchor);cargo.quaternion.identity();cargo.scale.set(1,1,1);cargo.updateMatrixWorld(true);}
    const residual=Math.max(...cargo.matrixWorld.elements.map((v,i)=>Math.abs(v-carried.elements[i])));
    const pull=blend(p,gates.pullback,gates.reveal),u=T.MathUtils.clamp((p-gates.pullback)/(1-gates.pullback),0,1),retreat=u*u*(2-u),cameraDistance=T.MathUtils.lerp(endCamera.distanceTo(endTarget),finalDistance,retreat);
    if(p>gates.roadEnd){
      const rootCentre=ship.localToWorld(new T.Vector3(0,6.6,0)),target=endTarget.clone().add(travel).lerp(rootCentre,pull),d=cameraDistance;
      camera.position.copy(target).addScaledVector(endDirection,d);camera.quaternion.copy(endQuaternion);camera.updateMatrixWorld(true);
    }
    const up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion),centre=(p<=gates.roadEnd?new T.Vector3(...old.target):camera.position.clone().addScaledVector(endDirection,-cameraDistance));
    const d=camera.position.distanceTo(centre),wipe=blend(p,gates.deckStart,gates.transfer),cut=T.MathUtils.lerp(-1.22,1.4,wipe),score=up.dot(centre)+cut*d*Math.tan(T.MathUtils.degToRad(camera.fov)/2);
    roadClip.set(up.clone(),-score);deckClip.set(up.clone().negate(),score);
    road.visible=p<gates.transfer;floor.visible=p<gates.transfer;legacy.truck.visible=p<gates.transfer;ship.visible=p>gates.deckStart;water.visible=p>gates.deckStart;
    const seaY=ship.position.y+.30*scale;water.position.set(position.x,seaY,position.z);water.material.uniforms.scale.value=scale;water.material.uniforms.shipInverse.value.copy(ship.matrixWorld).invert();
    const seams=ship.localToWorld(anchor.clone());const cargoBase=cargo.localToWorld(new T.Vector3());
    const roof=cargo.localToWorld(new T.Vector3(0,2.896,0)).project(camera);
    trace={progress:p,phase:p<gates.roadEnd?'Accepted road · downward travel':p<gates.transfer?'Deck rises · road clears':p<gates.reveal?'Continuous vessel pullback':'Vessel and capability chapter',owner,sourceProgress:p<=gates.roadEnd?.97+.03*p/gates.roadEnd:1,roadVisible:road.visible,truckVisible:legacy.truck.visible,cutNDC:cut,wipe,pull,distance:d,camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:centre.toArray(),cargoMatrix:cargo.matrixWorld.toArray(),cargoScale:worldScale.toArray(),cargoRoofNDC:roof.toArray(),shipMatrix:ship.matrixWorld.toArray(),ownershipMatrixResidual:residual,supportGap:seams.distanceTo(cargoBase),travel:distance,shipPosition:ship.position.toArray(),seaY,drawCalls:0};return trace;
  }
  return {apply,resize,tickWater(seconds){water.material.uniforms.storyTime.value=seconds*.65;return water.visible;},get trace(){return trace},get scale(){return scale}};
}
