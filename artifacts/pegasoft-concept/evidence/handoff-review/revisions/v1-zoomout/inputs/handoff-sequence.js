import * as T from './vendor/three/build/three.module.js';
import {applyRig} from '../generation/truck-family/model-draft/truck-model.mjs';

export const gates={pickup:.40,entry:.55,lower:.67,release:.75,upper:.93};
export const duration=30;
export const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*x*(10+x*(-15+6*x));};
const phase=(p,a,b)=>ease((p-a)/(b-a));
const forward=a=>new T.Vector3(Math.cos(a),0,-Math.sin(a));

// Ground-plane bicycle kinematics. The effective trailer axle is the centre
// of its three-axle bogie; tyre scrub within that rigid bogie is not simulated.
export function roadSamples(){
 const out=[];let x=0,z=0,theta=0,phi=0;const ds=.10,length=202;
 for(let i=0;i<=length/ds;i++){
  const s=i*ds,k=s<12||s>192?0:Math.PI/180*Math.sin(Math.PI*(s-12)/180)**2;
  const curvature=k,steer=Math.atan(3.8*curvature);
  out.push({s,x,z,theta,phi,curvature,steer});
  // Hitch sits .25m ahead of the tractor rear axle. This overhang contributes
  // lateral hitch velocity; trailer yaw follows travel rather than a keyframe.
  phi+=ds*(Math.sin(theta-phi)+.25*curvature*Math.cos(theta-phi))/8.61;
  const mid=theta+ds*curvature/2;x+=ds*Math.cos(mid);z-=ds*Math.sin(mid);theta+=ds*curvature;
 }
 return out;
}
export const road=roadSamples();
export function roadAt(distance){
 const i=T.MathUtils.clamp(distance/.1,0,road.length-1),a=road[Math.floor(i)],b=road[Math.min(Math.floor(i)+1,road.length-1)],t=i-Math.floor(i);
 return Object.fromEntries(Object.keys(a).map(k=>[k,T.MathUtils.lerp(a[k],b[k],t)]));
}

export function createSequence({rig,truck,cargo,scene,camera}){
 rig.finishSetup();rig.pickup(1);truck.updateMatrixWorld(true);
 const trailer=truck.getObjectByName('trailer_fifth_wheel_pivot'),model=truck.getObjectByName('T01_Pegasoft_truck');
 const scale=cargo.getWorldScale(new T.Vector3()).x,rotation=cargo.getWorldQuaternion(new T.Quaternion()),base=rig.endpoint.center.clone();
 const startYaw=new T.Euler().setFromQuaternion(rotation,'YXZ').y;
 const dock=base.clone().sub(new T.Vector3(-5.0575,0,0).multiplyScalar(scale).applyQuaternion(rotation));dock.y=0;
 truck.scale.setScalar(scale);truck.quaternion.copy(rotation);truck.position.copy(dock);scene.add(truck);
 const supportY=1.35*scale,seat=rig.lowerTo(supportY),seatBase=seat.base.clone();
 rig.pickup(1);const original={position:cargo.position.clone(),quaternion:cargo.quaternion.clone(),scale:cargo.scale.clone()};
 const pickupCamera=rig.endpoint.camera,handTarget=new T.Vector3(base.x,1.9*scale,base.z).addScaledVector(forward(startYaw),1.3*scale);
 const wheels=[];truck.traverse(n=>{if(n.name.endsWith('_rotation'))wheels.push(n);});
 // Use one static envelope, including tractor nose and lifted cargo. No rotating
 // bounding boxes, controls damping or per-frame fit can affect this camera.
 const envelope=new T.Box3().setFromObject(truck).union(new T.Box3().setFromObject(rig.root)).union(new T.Box3().setFromObject(cargo));
 const corners=[];for(const x of [envelope.min.x,envelope.max.x])for(const y of [envelope.min.y,envelope.max.y])for(const z of [envelope.min.z,envelope.max.z])corners.push(new T.Vector3(x,y,z));
 function frameDistance(){
  const d=new T.Vector3(Math.sin(startYaw),.085,Math.cos(startYaw)).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),d).normalize(),up=new T.Vector3().crossVectors(d,right),tan=Math.tan(T.MathUtils.degToRad(6));let distance=pickupCamera.distance;
  for(const c of corners){const v=c.clone().sub(handTarget);distance=Math.max(distance,v.dot(d)+1.14*Math.max(Math.abs(v.dot(right))/(tan*camera.aspect),Math.abs(v.dot(up))/tan));}
  // This envelope also fits the long chassis when viewed from overhead.
  return Math.max(distance,20*scale/(2*tan*Math.min(camera.aspect,1)));
 }
 const restore=()=>{rig.load.add(cargo);cargo.position.copy(original.position);cargo.quaternion.copy(original.quaternion);cargo.scale.copy(original.scale);};
 let trace={};
 function apply(p){
  p=T.MathUtils.clamp(p,0,1);restore();truck.position.copy(dock);truck.quaternion.copy(rotation);trailer.rotation.y=0;
  const entry=phase(p,.42,gates.entry),departure=phase(p,gates.release,1),distance=road.at(-1).s*departure,travel=roadAt(distance);
  truck.position.addScaledVector(forward(startYaw),30*scale*(1-entry));truck.visible=p>.40;
  if(p<=gates.pickup){rig.pickup(p/gates.pickup);applyRig(truck,0,0,-30*entry/.5265*180/Math.PI);}
  else{
   const lowering=phase(p,gates.entry,gates.lower),foot=T.MathUtils.lerp(rig.endpoint.bottom,supportY,lowering);
   const currentSeat=rig.lowerTo(foot);
   applyRig(truck,0,0,-30*entry/.5265*180/Math.PI);
   if(p>=gates.lower){
    trailer.add(cargo);cargo.position.set(-5.0575,.2,0);cargo.quaternion.identity();cargo.scale.setScalar(1);
    rig.clearHead({...seat,base:seatBase},phase(p,gates.lower,gates.release));
   }
   if(p>=gates.release){
    // Rear axle is the path reference; convert its motion to the hitch origin.
    const local=new T.Vector3(travel.x+.25*Math.cos(travel.theta)-.25,0,travel.z-.25*Math.sin(travel.theta));
    truck.position.copy(dock).add(local.multiplyScalar(scale).applyQuaternion(rotation));truck.rotation.y=startYaw+travel.theta;
    applyRig(truck,T.MathUtils.radToDeg(travel.steer),T.MathUtils.radToDeg(travel.phi-travel.theta));
   }
   // Each wheel's travel is integrated from its own centre velocity and radius.
   for(const w of wheels){const name=w.name,front=name.includes('front'),tractor=name.startsWith('tractor'),radius=tractor?.5265:.5065;
    const z=w.parent.position.z,axleX=w.parent.position.x;
    const bodyRate=tractor?travel.curvature:(Math.sin(travel.theta-travel.phi)+.25*travel.curvature*Math.cos(travel.theta-travel.phi))/8.61;
    const rate=tractor?Math.hypot(1+z*bodyRate,front?3.8*bodyRate:0):Math.hypot(Math.cos(travel.theta-travel.phi)-.25*travel.curvature*Math.sin(travel.theta-travel.phi)+z*bodyRate,(axleX+8.61)*bodyRate);
    // Wheel phase is deterministic; integration table is populated below.
    w.rotation.z=-(-30*entry+(wheelTravel.get(name)?.(distance)||distance*rate))/radius;
   }
   const blend=phase(p,gates.pickup,.56),follow=phase(p,gates.release,.84),pitch=T.MathUtils.lerp(Math.atan(.085),Math.PI/2-.001,phase(p,.79,gates.upper));
   const truckTarget=trailer.localToWorld(new T.Vector3(-3.4,1.15,0));truckTarget.y=1.9*scale;
   const target=new T.Vector3(...pickupCamera.target).lerp(handTarget,blend).lerp(truckTarget,follow);
   const d=T.MathUtils.lerp(pickupCamera.distance*Math.sqrt(1+.085**2),frameDistance(),blend);
   camera.fov=12;camera.up.set(0,1,0);camera.position.copy(target).add(new T.Vector3(Math.sin(startYaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(startYaw)*Math.cos(pitch)).multiplyScalar(d));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   trace={progress:p,phase:p<gates.entry?'Truck alignment':p<gates.lower?'Lowering to chassis':p<gates.release?'Seated · head release':'Truck departure',owner:p<gates.lower?'spreader':'trailer',distance:d,target:target.toArray(),camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),pitch,steering:travel.steer,articulation:travel.phi-travel.theta,travel:distance,elevation:currentSeat.elevation};
  }
  // End the stack's chapter only at its already-offscreen accepted endpoint.
  // Restore it symmetrically on reverse; it never re-enters the handoff shot.
  rig.attachment.support.visible=p<=gates.pickup;
  scene.updateMatrixWorld(true);
  if(p<=gates.pickup){const c=JSON.parse(rig.stage.dataset.camera);trace={progress:p,phase:'Approved stacked pickup',owner:JSON.parse(rig.stage.dataset.motion).load_owner==='support'?'stack':'spreader',distance:c.distance*Math.sqrt(1+.085**2),target:c.target,camera:c.position,quaternion:c.quaternion,pitch:Math.atan(.085),travel:0};}
  const witness=model.userData.supports.map(s=>({id:s.id,pad:trailer.localToWorld(new T.Vector3(s.rimWitness[0],.2,s.rimWitness[2])),rim:cargo.localToWorld(new T.Vector3(s.rimWitness[0]+5.0575,0,s.rimWitness[2]))}));
  trace.contacts=witness.map(w=>({id:w.id,gap:w.rim.distanceTo(w.pad)}));trace.cargoMatrix=cargo.matrixWorld.toArray();trace.grabberScale=rig.spreader.scale.toArray();trace.stackVisible=rig.attachment.support.visible;trace.ground=wheels.map(w=>w.getWorldPosition(new T.Vector3()).y-(w.name.startsWith('tractor')?.5265:.5065)*scale);
  return trace;
 }
 const wheelTravel=new Map();
 for(const w of wheels){const values=[0],tractor=w.name.startsWith('tractor'),front=w.name.includes('front'),z=w.parent.position.z,x=w.parent.position.x;
  for(let i=1;i<road.length;i++){const r=road[i-1],k=tractor?r.curvature:(Math.sin(r.theta-r.phi)+.25*r.curvature*Math.cos(r.theta-r.phi))/8.61;
   const speed=tractor?Math.hypot(1+z*k,front?3.8*k:0):Math.hypot(Math.cos(r.theta-r.phi)-.25*r.curvature*Math.sin(r.theta-r.phi)+z*k,(x+8.61)*k);values.push(values.at(-1)+.1*speed);}
  wheelTravel.set(w.name,d=>{const i=T.MathUtils.clamp(d/.1,0,values.length-1);return T.MathUtils.lerp(values[Math.floor(i)],values[Math.min(Math.floor(i)+1,values.length-1)],i%1);});
 }
 return {apply,resize(){rig.refreshEndpointCamera();},truck,trailer,wheels,scale,dock,startYaw,get trace(){return trace},road};
}
