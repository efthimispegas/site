import * as T from './vendor/three/build/three.module.js';
import {progressForFrame} from './lift-motion-contract.js';
import {applyRig} from '../generation/truck-family/model-draft/truck-model.mjs';

export const gates={lift:.20,reverse:.25,pickup:.35,entry:.45,lower:.55,release:.60,services:.76,upper:.824,aerial:.836,zoomStart:.84,zoomEnd:.872,turn:.83,vertical:.93,central:.91,roadCopy:.91,roadCopyEnd:.97};
// Keep the compact opening and 10% reverse. Later motion retains its fixed
// camera; the user now requests steady road pace from 63% and a 10% turn.
export const storySpanScale=5/8;
export const duration=30*storySpanScale;
export const acceptedProgress=p=>.75+(p-gates.release)*storySpanScale;
const pickupKnots=[0,progressForFrame(40),progressForFrame(80),1],pickupTimes=[0,gates.lift,gates.reverse,gates.pickup];
const slopes=pickupKnots.slice(1).map((v,i)=>(v-pickupKnots[i])/(pickupTimes[i+1]-pickupTimes[i]));
const tangents=[slopes[0],2/(1/slopes[0]+1/slopes[1]),2/(1/slopes[1]+1/slopes[2]),0];
export function pickupProgress(p){
 p=T.MathUtils.clamp(p,0,gates.pickup);let i=0;while(i<2&&p>pickupTimes[i+1])i++;
 const span=pickupTimes[i+1]-pickupTimes[i],u=(p-pickupTimes[i])/span,u2=u*u,u3=u2*u;
 return (2*u3-3*u2+1)*pickupKnots[i]+(u3-2*u2+u)*span*tangents[i]+(-2*u3+3*u2)*pickupKnots[i+1]+(u3-u2)*span*tangents[i+1];
}
export const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*x*(10+x*(-15+6*x));};
// Content passes the truck at full opacity; the title then pins near the top.
export function roadContentLayout(p,height,rightHeight){
 const start=height+24,top=.08*height;
 // One runway translation drives both columns. The left title pins on contact
 // with the top inset; the right groups keep passing at the same road pace.
 const speed=(start-top)/(gates.roadCopyEnd-gates.roadCopy),travel=Math.max(0,p-gates.roadCopy)*speed;
 const worldY=start-travel,softness=.035*height,delta=worldY-top;
 const leftY=delta>=softness?worldY:delta<=-softness?top:top+(delta+softness)**2/(4*softness);
 return {leftY,rightY:worldY,opacity:1,visible:p>gates.roadCopy};
}
const phase=(p,a,b)=>ease((p-a)/(b-a));
const forward=a=>new T.Vector3(Math.cos(a),0,-Math.sin(a));

// Quintic Hermite distance: position, velocity and acceleration agree at the
// straight/turn boundary. The truck keeps moving while the camera settles.
function travelSegment(p,a,b,start,end,v0,v1){
 const t=T.MathUtils.clamp((p-a)/(b-a),0,1),t3=t*t*t,t4=t3*t,t5=t4*t;
 return start+(end-start)*ease(t)+(b-a)*(v0*(t-6*t3+8*t4-3*t5)+v1*(-4*t3+7*t4-3*t5));
}
export const steadyPace=1530;
export const departureLag=1.5;
export const turnLength=steadyPace*(gates.vertical-gates.turn);
const departureLead=steadyPace*(.63-gates.release)/2;
export const straightDistance=departureLead+steadyPace*(gates.turn-.63);
export const roadLength=departureLead+steadyPace*(1-.63);
export const roadForkIndex=Math.round((straightDistance+turnLength/2)/.1);
export function departureDistance(p){
 if(p<=.63)return travelSegment(p,gates.release,.63,0,departureLead,0,steadyPace);
 return departureLead+steadyPace*(p-.63);
}

// Ground-plane bicycle kinematics. The effective trailer axle is the centre
// of its three-axle bogie; tyre scrub within that rigid bogie is not simulated.
const curvatureAt=s=>s<=straightDistance||s>=straightDistance+turnLength?0:-Math.PI/turnLength*Math.sin(Math.PI*(s-straightDistance)/turnLength)**2;
export function roadSamples(){
 const out=[];let x=0,z=0,theta=0,phi=0;const ds=.10,length=roadLength;
 for(let i=0;i<=Math.ceil(length/ds);i++){
  const s=i*ds,k=curvatureAt(s);
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
 const sample=Object.fromEntries(Object.keys(a).map(k=>[k,T.MathUtils.lerp(a[k],b[k],t)]));
 sample.curvature=curvatureAt(distance);sample.steer=Math.atan(3.8*sample.curvature);return sample;
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
 const pickupCamera=rig.endpoint.camera,handTarget=new T.Vector3(base.x,0,base.z).addScaledVector(forward(startYaw),1.3*scale);
 const aerialDistance=()=>{const base=frameDistance(),previous=Math.max(base,90*scale/(2*Math.tan(T.MathUtils.degToRad(6))*camera.aspect),50*scale/(2*Math.tan(T.MathUtils.degToRad(6))));return base+.8*(previous-base);};
 const contextMaterials=[];rig.attachment.support.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.transparent=true;contextMaterials.push(n.material);}});
 const stackBox=new T.Box3().setFromObject(rig.attachment.support),stackWorldCorners=[];for(const x of [stackBox.min.x,stackBox.max.x])for(const y of [stackBox.min.y,stackBox.max.y])for(const z of [stackBox.min.z,stackBox.max.z])stackWorldCorners.push(new T.Vector3(x,y,z));
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
  const entry=phase(p,gates.pickup,gates.entry),distance=departureDistance(p),travel=roadAt(distance);
  truck.position.addScaledVector(forward(startYaw),30*scale*(1-entry));truck.visible=p>gates.pickup;
  if(p<=gates.pickup){rig.pickup(pickupProgress(p));const baseline=JSON.parse(rig.stage.dataset.camera),target=new T.Vector3(...baseline.target).setY(0),direction=new T.Vector3(...baseline.position).sub(new T.Vector3(...baseline.target)).normalize();camera.position.copy(target).addScaledVector(direction,frameDistance());camera.lookAt(target);camera.updateMatrixWorld(true);applyRig(truck,0,0,-30*entry/.5265*180/Math.PI);}
  else{
   const lowering=phase(p,gates.entry,gates.lower),foot=T.MathUtils.lerp(rig.endpoint.bottom,supportY,lowering);
   const currentSeat=rig.lowerTo(foot);
   // Finish a small roof release as seating completes, then hold the entire
   // lift in this pose. Preserve the cargo lowering path independently.
   if(p> .50 && p<gates.lower){scene.attach(cargo);rig.clearHead(currentSeat,.32*phase(p,.50,gates.lower),0);}
   applyRig(truck,0,0,-30*entry/.5265*180/Math.PI);
   if(p>=gates.lower){
    trailer.add(cargo);cargo.position.set(-5.0575,.2,0);cargo.quaternion.identity();cargo.scale.setScalar(1);
    rig.clearHead({...seat,base:seatBase},.32,0);
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
   const blend=phase(p,gates.pickup,gates.entry),follow=phase(p,.63,gates.services),pitch=T.MathUtils.lerp(Math.atan(.085),Math.PI/2-.001,phase(p,gates.services,gates.upper));
   const trackingLag=forward(startYaw).multiplyScalar(scale*departureLag*phase(p,gates.release,.63));
   const truckTarget=trailer.localToWorld(new T.Vector3(-3.4,1.15,0)).sub(trackingLag);truckTarget.y=0;
   const target=new T.Vector3(...pickupCamera.target).setY(0).lerp(handTarget,blend);
   if(p>=gates.release){target.add(truck.position.clone().sub(dock)).sub(trackingLag);target.lerp(truckTarget,follow);}
   // The reference finishes its overhead rotation on a straight road, then
   // holds the truck in frame. Target lead accompanies the delayed
   // widening at 84%, avoiding an offscreen truck before that zoom.
   const widen=phase(p,gates.zoomStart,gates.zoomEnd);
   const lane=phase(p,gates.turn,gates.vertical),offset=new T.Vector3(18*(1-lane),0,-15*lane).multiplyScalar(scale).applyQuaternion(rotation),aerialTarget=truck.position.clone().add(offset);
   target.lerp(aerialTarget,widen);
   const d=T.MathUtils.lerp(frameDistance(),aerialDistance(),phase(p,gates.zoomStart,gates.zoomEnd));
   camera.fov=12;camera.up.set(0,1,0);camera.position.copy(target).add(new T.Vector3(Math.sin(startYaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(startYaw)*Math.cos(pitch)).multiplyScalar(d));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   trace={progress:p,phase:p<gates.entry?'Truck alignment':p<gates.lower?'Lowering to chassis':p<gates.release?'Seated · lift holds':p<gates.services?'Truck departure':p<gates.upper?'Camera overhead · straight road':p<gates.aerial?'Junction reveal · straight road':p<gates.turn?'Overhead · straight approach':p<gates.central?'Downward road turn':'Central lane · downward travel',owner:p<gates.lower?'spreader':'trailer',distance:d,target:target.toArray(),camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),pitch,heading:travel.theta,steering:travel.steer,articulation:travel.phi-travel.theta,travel:distance,elevation:currentSeat.elevation};
  }
  // The wider opening exposes more background. Retire the stack context once,
  // smoothly at the chapter boundary; never flash it back into the truck shot.
  const stackOpacity=1-phase(p,.29,gates.pickup);contextMaterials.forEach(m=>m.opacity=stackOpacity);rig.attachment.support.visible=stackOpacity>0;
  scene.updateMatrixWorld(true);
  if(p<=gates.pickup){const c=JSON.parse(rig.stage.dataset.camera);trace={progress:p,phase:p<gates.lift?'Stacked pickup':p<gates.reverse?'Lift and retract':'Short reverse · camera reveal',owner:JSON.parse(rig.stage.dataset.motion).load_owner==='support'?'stack':'spreader',distance:frameDistance(),target:[c.target[0],0,c.target[2]],camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),pitch:Math.atan(.085),travel:0};}
  const witness=model.userData.supports.map(s=>({id:s.id,pad:trailer.localToWorld(new T.Vector3(s.rimWitness[0],.2,s.rimWitness[2])),rim:cargo.localToWorld(new T.Vector3(s.rimWitness[0]+5.0575,0,s.rimWitness[2]))}));
  const stackCorners=stackWorldCorners.map(v=>v.clone().project(camera));trace.stackInView=rig.attachment.support.visible&&Math.min(...stackCorners.map(v=>v.x))<=1&&Math.max(...stackCorners.map(v=>v.x))>=-1&&Math.min(...stackCorners.map(v=>v.y))<=1&&Math.max(...stackCorners.map(v=>v.y))>=-1;trace.stackOpacity=stackOpacity;
  trace.truckScreen=truck.getWorldPosition(new T.Vector3()).project(camera).toArray();trace.truckPosition=truck.position.toArray();trace.liftPosition=rig.object.getWorldPosition(new T.Vector3()).toArray();trace.contacts=witness.map(w=>({id:w.id,gap:w.rim.distanceTo(w.pad)}));trace.cargoMatrix=cargo.matrixWorld.toArray();trace.grabberScale=rig.spreader.scale.toArray();trace.grabberMatrix=rig.spreader.matrixWorld.toArray();trace.stackVisible=rig.attachment.support.visible;trace.ground=wheels.map(w=>w.getWorldPosition(new T.Vector3()).y-(w.name.startsWith('tractor')?.5265:.5065)*scale);
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
