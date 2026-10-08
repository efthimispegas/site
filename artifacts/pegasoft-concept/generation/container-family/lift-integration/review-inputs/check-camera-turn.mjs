import fs from 'node:fs';import crypto from 'node:crypto';
import {THREE as T,conceptRoot,loadGeometry,compileRig} from './rig-harness.mjs';
import {createContainerAttachment} from '../../../review/lift-container-contact.js';
const code=fs.readFileSync(new URL('review/lift-container.js',conceptRoot),'utf8'),rig=compileRig(code,createContainerAttachment,loadGeometry(new URL('generation/container-family/model-draft/C01-container.glb',conceptRoot)).scene);
rig.build(loadGeometry(new URL('generation/lift-family/model-draft/model-carbon-unified.glb',conceptRoot)));rig.apply();rig.motionSetup();
const results=[];
for(const [width,height]of [[783,378],[470,378],[1370,580],[340,420]]){
 rig.camera.aspect=width/height;rig.stage.clientWidth=width;rig.stage.clientHeight=height;
 const rows=[],forward=[];let turnReversals=0,maxTurnStep=0,groundReentries=0,reverseError=0;
 for(let i=0;i<=1000;i++){
  const progress=.65+.35*i/1000;rig.motionApply(progress);const c=JSON.parse(rig.stage.dataset.camera),hub=rig.wheels.reduce((sum,w)=>sum.add(w.getWorldPosition(new T.Vector3())),new T.Vector3()).multiplyScalar(1/rig.wheels.length),ground=hub.clone().setY(0).project(rig.camera),hubScreen=hub.project(rig.camera),lower=new T.Box3().setFromObject(rig.attachment.lowerScene),corners=[];
  for(const x of [lower.min.x,lower.max.x])for(const y of [lower.min.y,lower.max.y])for(const z of [lower.min.z,lower.max.z])corners.push(new T.Vector3(x,y,z).project(rig.camera));
  const xMin=Math.min(...corners.map(v=>v.x)),xMax=Math.max(...corners.map(v=>v.x)),yMin=Math.min(...corners.map(v=>v.y)),yMax=Math.max(...corners.map(v=>v.y)),groundInView=xMin<=1&&xMax>=-1&&yMin<=1&&yMax>=-1;
  if(!rig.attachment.lowerScene.visible)throw Error('Grounded container was hidden to mask framing');
  if(Math.abs(c.groundAnchorY-(1-ground.y)*height/2)>1e-9||c.supportIntersectsView!==groundInView)throw Error('Renderer camera witness differs from independent projection');
  const row={progress,azimuth:Math.atan2(c.position[0]-c.target[0],c.position[2]-c.target[2]),cameraY:c.position[1],groundAnchorY:(1-ground.y)*height/2,hubAnchorY:(1-hubScreen.y)*height/2,groundInView,groundXMinPixels:(xMin+1)*width/2,lowerVisible:true};rows.push(row);forward.push([...rig.camera.matrixWorld.elements,...rig.camera.projectionMatrix.elements]);
  if(i){const diff=row.azimuth-rows[i-1].azimuth;if(diff<-1e-7)turnReversals++;maxTurnStep=Math.max(maxTurnStep,Math.abs(diff));if(row.groundInView&&!rows[i-1].groundInView)groundReentries++;}
 }
 const bounded=rows.filter(x=>x.progress>=.719&&x.progress<=.937),span=k=>Math.max(...bounded.map(x=>x[k]))-Math.min(...bounded.map(x=>x[k]));
 for(let i=1000;i>=0;i--){rig.motionApply(.65+.35*i/1000);[...rig.camera.matrixWorld.elements,...rig.camera.projectionMatrix.elements].forEach((v,k)=>reverseError=Math.max(reverseError,Math.abs(v-forward[i][k])));}
 const atReentry=rows.find(x=>x.progress>=.921),result={width,height,samples:1001,reportedInterval:[.719,.937],groundAnchorPixelSpan:span('groundAnchorY'),hubAnchorPixelSpan:span('hubAnchorY'),worldCameraYSpan:span('cameraY'),turnReversals,maxTurnStepDegrees:maxTurnStep*180/Math.PI,groundReentries,firstGroundExit:rows.find(x=>!x.groundInView)?.progress??null,supportHidden:false,groundInViewAt921:atReentry.groundInView,reverseError,rows};
 if(result.groundAnchorPixelSpan>1e-8||result.hubAnchorPixelSpan>1e-8||result.worldCameraYSpan>1e-10||turnReversals||groundReentries||maxTurnStep*180/Math.PI>.1||reverseError>1e-10||(width===783&&atReentry.groundInView))throw Error('Camera turn regression '+JSON.stringify({...result,rows:undefined}));
 results.push(result);
}
const report={status:'passed_level_tracking_monotonic_turn_no_support_reentry',input_sha256:crypto.createHash('sha256').update(code).digest('hex'),check_sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),witnesses:'Independent projection of the physical four-wheel hub midpoint and ground below it, plus eight static lower-container bounds corners. No visibility toggle is used.',results};
fs.writeFileSync(new URL('evidence/lift-container-integration/camera-turn-stability.json',conceptRoot),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,results:results.map(({rows,...r})=>r)}));
