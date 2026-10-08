import fs from 'node:fs';
import crypto from 'node:crypto';
import {THREE as T,conceptRoot,loadGeometry,compileRig,progressForFrame} from './rig-harness.mjs';
import {createContainerAttachment} from '../../../review/lift-container-contact.js';
const code=fs.readFileSync(new URL('review/lift-container.js',conceptRoot),'utf8');
const rig=compileRig(code,createContainerAttachment,loadGeometry(new URL('generation/container-family/model-draft/C01-container.glb',conceptRoot)).scene);
rig.build(loadGeometry(new URL('generation/lift-family/model-draft/model-carbon-unified.glb',conceptRoot)));rig.apply();rig.motionSetup();
const rows=[];
for(let i=0;i<=960;i++){
 const frame=80+i/10;rig.motionApply(progressForFrame(frame));
 const box=new T.Box3().setFromObject(rig.root).union(new T.Box3().setFromObject(rig.load)),lower=new T.Box3().setFromObject(rig.attachment.lowerScene),d=T.MathUtils.smoothstep(frame,80,128);box.union(lower);const primary=new T.Box3().setFromObject(rig.root).union(new T.Box3().setFromObject(rig.load));box.min.lerp(primary.min,d);box.max.lerp(primary.max,d);
 const state=JSON.parse(rig.stage.dataset.motion),target=state.camera?new T.Vector3().fromArray(state.camera.target):box.getCenter(new T.Vector3()),distance=state.camera?.distance??rig.camera.position.distanceTo(target),wheel=rig.wheels[0],saved=wheel.rotation.z;
 const wheelBox=new T.Box3().setFromObject(wheel);wheel.rotation.z=0;rig.root.updateMatrixWorld(true);const unrolled=new T.Box3().setFromObject(wheel);wheel.rotation.z=saved;
 rows.push({frame,distance,position:rig.camera.position.toArray(),boxMin:box.min.toArray(),boxMax:box.max.toArray(),wheelRoll:state.wheel_roll_degrees,wheelMinY:wheelBox.min.y,unrolledMinY:unrolled.min.y});
}
const flips=[];for(let i=2;i<rows.length;i++){const a=rows[i-1].distance-rows[i-2].distance,b=rows[i].distance-rows[i-1].distance;if(a*b<0&&Math.abs(a)>1e-4&&Math.abs(b)>1e-4)flips.push(rows[i].frame);}
const viewports=[];
for(const [width,height]of [[470,378],[783,378],[1370,580],[340,420]]){
 rig.camera.aspect=width/height;
 const forward=[];let min=Infinity,max=-Infinity,pauseError=0,reverseError=0;
 for(let i=0;i<=480;i++){
  rig.motionApply(progressForFrame(40+i*136/480));const c=JSON.parse(rig.stage.dataset.camera);min=Math.min(min,c.distance);max=Math.max(max,c.distance);forward.push([...rig.camera.matrixWorld.elements,...rig.camera.projectionMatrix.elements]);
  if(i%80===0){const before=forward.at(-1);for(let n=0;n<5;n++)rig.motionApply(progressForFrame(40+i*136/480));[...rig.camera.matrixWorld.elements,...rig.camera.projectionMatrix.elements].forEach((v,k)=>pauseError=Math.max(pauseError,Math.abs(v-before[k])));}
 }
 for(let i=480;i>=0;i--){rig.motionApply(progressForFrame(40+i*136/480));[...rig.camera.matrixWorld.elements,...rig.camera.projectionMatrix.elements].forEach((v,k)=>reverseError=Math.max(reverseError,Math.abs(v-forward[i][k])));}
 if(max-min>1e-10||pauseError>1e-10||reverseError>1e-10)throw Error('Camera stability regression '+JSON.stringify({width,height,min,max,pauseError,reverseError}));
 viewports.push({width,height,postContactSamples:481,minDistance:min,maxDistance:max,pauseError,reverseError});
}
if(flips.length)throw Error('Departure camera reverses zoom direction');
const result={status:'passed_fixed_post_contact_camera_regression',input_sha256:crypto.createHash('sha256').update(code).digest('hex'),check_sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),departureZoomDirectionReversals:flips.length,reversalFrames:flips,viewports,rows};
const out=new URL('evidence/lift-container-integration/camera-stability.json',conceptRoot);fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output:out.pathname,departureZoomDirectionReversals:flips.length,viewports}));
