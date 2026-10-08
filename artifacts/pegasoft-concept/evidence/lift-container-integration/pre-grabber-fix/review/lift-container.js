import {installIntegrationReplay} from './lift-container-replay.js';
import {createContainerAttachment} from './lift-container-contact.js';
import {amendWheels} from './lift-wheels.js';
import {amendCab} from './lift-cab.js';
import {motionAt,progressForFrame,settleWindow,motionSpanVH,reviewDuration} from './lift-motion-contract.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const $=s=>document.querySelector(s),stage=$('#stage'),inputs=['elevation','middle','inner','balance','wheel'];
let scene,camera,renderer,controls,root,object,boom,middle,inner,spreader,load,ready=false,playing=false,elapsed=0,wheelPlaying=false,wheelElapsed=0,recorder=null,replayURL=null;
const pivot=new THREE.Vector3(.669,-.08,0),joint=new THREE.Vector3(-.7421,.327,0),direction=new THREE.Vector3(-1,.3173,0).normalize(),wheels=[],rams=[],hoses=[],fitTarget=new THREE.Vector3();
let attachmentOwnership,wheelOwnership,wordmarkTexture,productionScene,containerAttachment;
const partCounts={};const allButtons=[...document.querySelectorAll('.viewer button,.viewer input')];allButtons.forEach(b=>b.disabled=true);
function role(x,y,z){if(x<-.62&&y>-.08)return 'spreader';if(x>.03&&x<.38&&y>-.31&&y<.19&&Math.abs(z)>.07&&Math.abs(z)<.17&&Math.abs(y-(1.475*x-.307))<.04)return `raising_ram_${z>0?'left':'right'}`;return 'chassis';}
function split(mesh){const overrides=new Set();for(const[a,b]of attachmentOwnership.spreader_triangle_ranges_by_position_count[String(mesh.geometry.attributes.position.count)]||[])for(let i=a;i<=b;i++)overrides.add(i);const wheelRoles=new Map();for(const[label,ranges]of Object.entries(wheelOwnership.wheel_triangle_ranges_by_position_count[String(mesh.geometry.attributes.position.count)]||{}))for(const[a,b]of ranges)for(let i=a;i<=b;i++)wheelRoles.set(i,label);const g=mesh.geometry,p=g.attributes.position,index=g.index,groups=new Map();const count=index?index.count:p.count;for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k),center=new THREE.Vector3();ids.forEach(id=>center.add(new THREE.Vector3().fromBufferAttribute(p,id).multiplyScalar(1/3)));const key=overrides.has(i/3)?'spreader':wheelRoles.get(i/3)||role(center.x,center.y,center.z);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(...ids);}const out=[];for(const[key,ids]of groups){const geometry=new THREE.BufferGeometry();for(const[name,a]of Object.entries(g.attributes)){const arr=[];ids.forEach(id=>{for(let k=0;k<a.itemSize;k++)arr.push(a.array[id*a.itemSize+k]);});geometry.setAttribute(name,new THREE.Float32BufferAttribute(arr,a.itemSize));}const piece=new THREE.Mesh(geometry,mesh.material);piece.name=key;partCounts[key]=(partCounts[key]||0)+ids.length/3;out.push(piece);}return out;}
function rebased(mesh,center){mesh.geometry=mesh.geometry.clone();mesh.geometry.translate(-center.x,-center.y,-center.z);return mesh;}
function capOpening(mesh,frontX){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,keep=[],center=new THREE.Vector3(frontX,.24086-.3173*frontX,0),axis=direction.clone();for(let i=0;i<p.count;i+=3){const c=new THREE.Vector3(),nn=new THREE.Vector3();for(let k=0;k<3;k++){c.add(new THREE.Vector3().fromBufferAttribute(p,i+k).multiplyScalar(1/3));nn.add(new THREE.Vector3().fromBufferAttribute(n,i+k));}if(Math.abs(c.clone().sub(center).dot(axis))<.00001&&Math.abs(nn.normalize().dot(axis))>.95)continue;keep.push(i,i+1,i+2);}const geo=new THREE.BufferGeometry();for(const[name,a]of Object.entries(g.attributes)){const arr=[];for(const i of keep)for(let k=0;k<a.itemSize;k++)arr.push(a.array[i*a.itemSize+k]);geo.setAttribute(name,new THREE.Float32BufferAttribute(arr,a.itemSize));}mesh.geometry=geo;}
function hiddenShaft(a,b,h,w,material,parent){const aa=new THREE.Vector3(a,.24086-.3173*a,0),bb=new THREE.Vector3(b,.24086-.3173*b,0),shaft=new THREE.Mesh(new THREE.BoxGeometry(aa.distanceTo(bb),h,w),material);shaft.position.copy(aa.add(bb).multiplyScalar(.5).sub(pivot));shaft.rotation.z=-Math.atan(.3173);shaft.name='Concealed telescope overlap';parent.add(shaft);}
// Add faces to existing surfaces; never replace or move an original vertex.
// Combine material partitions before finding gaps, so material seams aren't filled.
function localizedFillings(){
 object.updateWorldMatrix(true,true);
 const groups=[],used=new Set(),add=(name,meshes)=>{if(!meshes.length)return;groups.push({name,meshes});meshes.forEach(m=>used.add(m));};
 add('chassis',object.children.filter(m=>m.isMesh&&m.name==='chassis'));
 add('spreader',spreader.children.filter(m=>m.isMesh&&m.name==='spreader'));
 wheels.forEach(g=>add(g.children[0].name,g.children.filter(m=>m.isMesh)));
 for(const side of [-1,1])for(const k of [0,1])add(`raising_ram_${side>0?'left':'right'}_${k?'rod':'sleeve'}`,rams.filter(r=>r.side===side).map(r=>r.pieces[k]));
 object.traverse(m=>{if(m.isMesh&&!used.has(m))add(m.name||'authored_part',[m]);});
 const report=[],frameInverse=object.matrixWorld.clone().invert(),density=6/(.9408590198+.9435049891)*(12/.7);
 const vertexKey=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');
 for(const {name,meshes}of groups){
  // These mouths are intentional; the nested section and overlap sleeve cover them.
  if(['Boom_Main_Carbon_Shell','Boom_Middle_Carbon_Shell'].includes(name)){report.push({name,status:'intentional_telescope_mouth',added_triangles:0});continue;}
  const edges=new Map(),positions=new Map(),transforms=new Map(),patches=new Map();let sourceTriangles=0;
  for(const m of meshes){
   const matrix=frameInverse.clone().multiply(m.matrixWorld);transforms.set(m,matrix);patches.set(m,[]);
   const g=m.geometry,p=g.attributes.position,ix=g.index,uv=g.attributes.uv;
   for(let i=0;i<(ix?ix.count:p.count);i+=3){
    const ids=[0,1,2].map(k=>ix?ix.getX(i+k):i+k),pts=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id).applyMatrix4(matrix)),keys=pts.map(vertexKey);
    sourceTriangles++;keys.forEach((key,k)=>{if(!positions.has(key))positions.set(key,pts[k]);});
    for(let k=0;k<3;k++){
     const a=keys[k],b=keys[(k+1)%3];if(a===b)continue;
     const key=[a,b].sort().join('|');if(!edges.has(key))edges.set(key,{key,a,b,uses:[]});
     edges.get(key).uses.push({m,a,b,uvA:uv?new THREE.Vector2().fromBufferAttribute(uv,ids[k]):new THREE.Vector2(),uvB:uv?new THREE.Vector2().fromBufferAttribute(uv,ids[(k+1)%3]):new THREE.Vector2(),uvC:uv?new THREE.Vector2().fromBufferAttribute(uv,ids[(k+2)%3]):new THREE.Vector2()});
    }
   }
  }
  // Odd-incidence seams include actual holes and the ends of inherited overlapping
  // surfaces. Including those seam ends forms closed cycles without deleting faces.
  const boundary=[...edges.values()].filter(e=>e.uses.length%2===1),adj=new Map();
  for(const e of boundary)for(const v of [e.a,e.b]){if(!adj.has(v))adj.set(v,[]);adj.get(v).push(e);}
  const remaining=new Set(boundary.map(e=>e.key)),loops=[];
  while(remaining.size){
   const initial=edges.get(remaining.values().next().value);let path=[initial.a],walk=[];
   while(path.length){
    const current=path[path.length-1],edge=(adj.get(current)||[]).find(e=>remaining.has(e.key));
    if(!edge)break;remaining.delete(edge.key);
    const next=edge.a===current?edge.b:edge.a,previous=path.indexOf(next);walk.push(edge);
    if(previous>=0){loops.push({keys:path.slice(previous),edges:walk.slice(previous)});path=path.slice(0,previous+1);walk=walk.slice(0,previous);}else path.push(next);
   }
  }
  let added=0,degenerate=0;
  for(const loop of loops){
   if(loop.keys.length<3)continue;
   const center=loop.keys.reduce((p,k)=>p.add(positions.get(k)),new THREE.Vector3()).multiplyScalar(1/loop.keys.length);
   for(let k=0;k<loop.keys.length;k++){
    const edge=loop.edges[k],use=edge.uses[0],a=positions.get(use.a),b=positions.get(use.b),normal=a.clone().sub(b).cross(center.clone().sub(b));
    if(normal.lengthSq()<1e-20){degenerate++;continue;}normal.normalize();
    // Reverse the adjacent original face's edge winding. Retain its material.
    const points=[b,a,center],worldUV=use.m.material.name.includes('approved shared satin');
    let uvs=[use.uvB,use.uvA,use.uvA.clone().add(use.uvB).multiplyScalar(.49).addScaledVector(use.uvC,.02)];
    if(worldUV){const n=normal.toArray(),axis=Math.abs(n[0])>Math.abs(n[1])?(Math.abs(n[0])>Math.abs(n[2])?0:2):(Math.abs(n[1])>Math.abs(n[2])?1:2);uvs=points.map(p=>axis===0?new THREE.Vector2(p.z*density,p.y*density):axis===1?new THREE.Vector2(p.x*density,p.z*density):new THREE.Vector2(p.x*density,p.y*density));}
    const inverse=transforms.get(use.m).clone().invert(),localNormal=normal.clone().transformDirection(inverse);
    patches.get(use.m).push({points:points.map(p=>p.clone().applyMatrix4(inverse)),normal:localNormal,uvs});added++;
   }
  }
  for(const [m,faces]of patches){
   if(!faces.length)continue;
   const original=m.geometry.index?m.geometry.toNonIndexed():m.geometry,newGeometry=new THREE.BufferGeometry();
   for(const [attr,a]of Object.entries(original.attributes)){
    const out=new Float32Array(a.array.length+faces.length*3*a.itemSize);out.set(a.array);let at=a.array.length;
    for(const f of faces)for(let k=0;k<3;k++)for(let j=0;j<a.itemSize;j++)out[at++]=attr==='position'?f.points[k].getComponent(j):attr==='normal'?f.normal.getComponent(j):attr==='uv'?f.uvs[k].getComponent(j):0;
    newGeometry.setAttribute(attr,new THREE.BufferAttribute(out,a.itemSize));
   }
   m.userData.originalTriangles=(original.attributes.position.count/3);m.userData.fillingTriangles=faces.length;m.userData.geometryBeforeFill=original;m.userData.geometryAfterFill=newGeometry;m.geometry=newGeometry;
  }
  report.push({name,source_triangles:sourceTriangles,boundary_edges_before:[...edges.values()].filter(e=>e.uses.length===1).length,inherited_overlap_edges:[...edges.values()].filter(e=>e.uses.length>2).length,cycles:loops.length,added_triangles:added,zero_area_seams:degenerate});
 }
 // The accepted rear plate has a continuous lower blue panel below the hitch.
 // The reconstruction's notch has closed rim edges, so boundary filling alone
 // cannot restore this missing local surface. Add only its small recessed infill.
 const painted=object.children.find(m=>m.isMesh&&m.name==='chassis'&&m.material.name==='Material_0');
 if(painted){
  const panelGeometry=new THREE.BoxGeometry(.036,.073,.096),uv=panelGeometry.attributes.uv;
  // Sample the adjacent accepted blue lower-panel atlas, preserving the existing PBR role.
  for(let i=0;i<uv.count;i++)uv.setXY(i,.073492+(uv.getX(i)-.5)*.001,.460597+(uv.getY(i)-.5)*.001);
  const panel=new THREE.Mesh(panelGeometry,painted.material);panel.position.set(.915,-.4285,0);panel.name='Rear_lower_local_filling';panel.userData.localFillingObject=true;object.add(panel);
  report.push({name:panel.name,status:'localized_missing_rear_panel_infill',source_triangles:0,added_triangles:12,reference:'lift-rear.png',bounds:{min:[.897,-.465,-.048],max:[.933,-.392,.048]}});
 }
 // Include new hose end-cap vertices in the existing deformation; do not leave caps behind.
 hoses.forEach(h=>h.base=h.mesh.geometry.attributes.position.array.slice());
 stage.dataset.fillings=JSON.stringify(report);stage.dataset.fillingTriangles=String(report.reduce((n,r)=>n+r.added_triangles,0));
}
// Local closed wheel volumes; the locked source stays available as comparison.
function wheelVolumeAmendment(carbon){stage.dataset.wheelPatches=JSON.stringify(amendWheels(THREE,wheels,carbon));}

function diagnosticContact(){
 const geometryMeshes=spreader.children.filter(m=>m.isMesh&&m!==load),contacts=[];
 spreader.updateWorldMatrix(true,true);
 for(const x of [-.088,.088])for(const z of [-.296,.296]){
  const start=load.localToWorld(new THREE.Vector3(x,.08-.0001,z)),ray=new THREE.Raycaster(start,new THREE.Vector3(0,1,0),0,.4),hits=ray.intersectObjects(geometryMeshes,false);
  if(!hits.length){contacts.push({x,z,status:'missing_geometry_contact'});continue;}
  const end=load.worldToLocal(hits[0].point.clone()),length=Math.max(.0001,end.y-.08),material=load.material.clone();material.wireframe=false;
  const connector=new THREE.Mesh(new THREE.CylinderGeometry(.0016,.0016,length,8),material);connector.position.set(x,.08+length/2,z);connector.name='Diagnostic pickup contact';connector.userData.diagnosticProxy=true;load.add(connector);
  const mark=new THREE.Mesh(new THREE.SphereGeometry(.003,8,6),material);mark.position.copy(end);mark.name='Diagnostic pickup marker';mark.userData.diagnosticProxy=true;load.add(mark);
  contacts.push({x,z,status:'surface_contact',attachment_local_point:spreader.worldToLocal(hits[0].point.clone()).toArray(),connector_length:length});
 }
 stage.dataset.proxyContacts=JSON.stringify(contacts);
}
// Physical right boom face; lettering inherits only the main boom hinge.
function boomBranding(){
 const width=.43,height=width/8,center=new THREE.Vector3(.04,.24086-.3173*.04,.0657);
 const material=new THREE.MeshBasicMaterial({map:wordmarkTexture,transparent:true,depthWrite:false,side:THREE.FrontSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mark=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mark.name='PEGASOFT Solutions · right boom inscription';mark.userData.branding=true;mark.position.copy(center.sub(pivot));mark.rotation.z=-Math.atan(.3173);boom.add(mark);
 stage.dataset.inscription=JSON.stringify({text:'PEGASOFT Solutions',color:'#B9E7FF',font:'Manrope upright 650',face:'right exterior main boom',model_z:.0657,width,height});
}
async function prepareWordmark(){
 await document.fonts.load('650 160px Manrope');
 if(!document.fonts.check('650 160px Manrope'))throw Error('Approved inscription font unavailable');
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d');ctx.font='650 160px Manrope';ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing='4.92px';ctx.fillStyle='#B9E7FF';ctx.strokeStyle='rgba(6,30,59,.72)';ctx.lineWidth=4.3;ctx.strokeText('PEGASOFT Solutions',1024,128,1900);ctx.fillText('PEGASOFT Solutions',1024,128,1900);
 wordmarkTexture=new THREE.CanvasTexture(canvas);wordmarkTexture.colorSpace=THREE.SRGBColorSpace;wordmarkTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
}
function cameraReset(view='perspective'){root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),radius=size.length()/2;const vf=THREE.MathUtils.degToRad(camera.fov/2),hf=Math.atan(Math.tan(vf)*camera.aspect),distance=radius/Math.sin(Math.min(vf,hf))*1.05;controls.target.copy(center);camera.position.copy(center).add((view==='left'?new THREE.Vector3(0,.05,10):view==='right'?new THREE.Vector3(0,.05,-10):new THREE.Vector3(3.8,2.5,9.7)).normalize().multiplyScalar(distance));controls.update();}
function build(gltf){
 object=new THREE.Group();root.add(object);boom=new THREE.Group();boom.position.copy(pivot);object.add(boom);middle=new THREE.Group();inner=new THREE.Group();boom.add(middle);middle.add(inner);spreader=new THREE.Group();spreader.position.copy(joint.clone().sub(pivot));inner.add(spreader);
 const source=[];gltf.scene.traverse(n=>{if(n.isMesh)source.push(n);});let carbon;
 for(const mesh of source){if(mesh.material.name.includes('approved shared satin'))carbon=mesh.material;if([67979,100020].includes(mesh.geometry.attributes.position.count)){for(const piece of split(mesh)){if(piece.name==='spreader')spreader.add(rebased(piece,joint));else if(piece.name.includes('wheel')){const axle=wheelOwnership.axles[piece.name.startsWith('front')?'front':'rear'],z=piece.name.endsWith('left')?.20:-.20,c=new THREE.Vector3(axle.x,axle.y,z),group=new THREE.Group();group.position.copy(c);group.add(rebased(piece,c));object.add(group);wheels.push(group);}else if(piece.name.startsWith('raising_ram'))rams.push({source:piece,side:piece.name.endsWith('left')?1:-1});else object.add(piece);}continue;}
  const name=mesh.name;mesh.geometry=mesh.geometry.clone();
  if(name==='Boom_Main_Carbon_Shell'){capOpening(mesh,-.373);boom.add(rebased(mesh,pivot));}
  else if(name==='Boom_Middle_Carbon_Shell'){capOpening(mesh,-.574);middle.add(rebased(mesh,pivot));}
  else if(name==='Boom_End_Carbon_Shell'||name==='Boom_Graphite_Front_Head')inner.add(rebased(mesh,pivot));
  else if(name==='End_telescopic_shoulder')middle.add(rebased(mesh,pivot));
  else if(name.startsWith('Boom_')||name==='Main_telescopic_shoulder'||name==='Pivot_Coverage_Repair')boom.add(rebased(mesh,pivot));
  else if(name.startsWith('Rear_Hydraulic_Hoses_Repair')){const p=mesh.geometry.attributes.position;let min=Infinity,max=-Infinity;for(let i=0;i<p.count;i++){min=Math.min(min,p.getY(i));max=Math.max(max,p.getY(i));}if(mesh.material.name.includes('rubber')){hoses.push({mesh,base:p.array.slice(),min,max,upper:new THREE.Vector3(.74,max,0)});object.add(mesh);}else if((min+max)/2>-.10)boom.add(rebased(mesh,pivot));else object.add(mesh);}
  else object.add(mesh);
 }
 hiddenShaft(-.336,.01,.115,.109,carbon,middle);hiddenShaft(-.544,-.344,.103,.09,carbon,inner);
 for(const ram of rams){const base=new THREE.Vector3(.005,-.30,ram.side*.115),end=new THREE.Vector3(.325,.172,ram.side*.115),axis=end.clone().sub(base),length=axis.length(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());const orient=new THREE.Group();orient.position.copy(base);object.add(orient);const g=ram.source.geometry,p=g.attributes.position,groups=[[],[]];for(let i=0;i<p.count;i+=3){let t=0;for(let k=0;k<3;k++)t+=new THREE.Vector3().fromBufferAttribute(p,i+k).sub(base).dot(axis)/axis.lengthSq()/3;groups[t<.52?0:1].push(i,i+1,i+2);}const pieces=[];groups.forEach((ids,k)=>{const geo=new THREE.BufferGeometry();for(const[name,a]of Object.entries(g.attributes)){const data=[];ids.forEach(id=>{for(let z=0;z<a.itemSize;z++)data.push(a.array[id*a.itemSize+z]);});geo.setAttribute(name,new THREE.Float32BufferAttribute(data,a.itemSize));}geo.translate(-base.x,-base.y,-base.z);geo.applyQuaternion(q.clone().invert());if(k)geo.translate(0,-length*.52,0);const m=new THREE.Mesh(geo,ram.source.material);if(k)m.position.y=length*.52;orient.add(m);pieces.push(m);});Object.assign(ram,{orient,base,end,length,pieces});}
 localizedFillings();wheelVolumeAmendment(carbon);stage.dataset.cabAmendment=JSON.stringify(amendCab(THREE,object,carbon,rams));
 spreader.updateWorldMatrix(true,true);containerAttachment=createContainerAttachment(THREE,productionScene,spreader,carbon);load=containerAttachment.load;stage.dataset.productionFit=JSON.stringify(containerAttachment.profile);

 // Keep the accepted lift normalization independent of the larger C01 footprint.
 root.scale.setScalar(3.1840981746971435);object.position.set(.001322984504699698,.5612589448690415,.00012150406837463379);root.rotation.y=Math.PI;fitTarget.set(0,3,0);boomBranding();
 root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});cameraReset();
}
function apply(){if(!ready)return;const angle=-THREE.MathUtils.degToRad(Number($('#elevation').value)),ext=Number($('#middle').value),end=Number($('#inner').value),balance=THREE.MathUtils.degToRad(Number($('#balance').value));boom.rotation.z=angle;middle.position.copy(direction).multiplyScalar(ext);inner.position.copy(direction).multiplyScalar(end);spreader.rotation.z=-angle+balance;wheels.forEach(g=>g.rotation.z=THREE.MathUtils.degToRad(Number($('#wheel').value)));load.visible=$('#proxy').checked;for(const r of rams){const top=r.end.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),angle).add(pivot),delta=top.sub(r.base),length=delta.length();r.orient.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());r.pieces[1].scale.y=Math.max(.01,(length-r.length*.52)/(r.length*.48));}for(const h of hoses){const target=h.upper.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),angle).add(pivot),delta=target.sub(h.upper),p=h.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=h.base[i*3+1],t=THREE.MathUtils.smoothstep(y,h.min,h.max);p.setXYZ(i,h.base[i*3]+delta.x*t,y+delta.y*t,h.base[i*3+2]);}p.needsUpdate=true;h.mesh.geometry.computeVertexNormals();}
 $('#elevation-value').textContent=`${$('#elevation').value}° above approved pose`;$('#middle-value').textContent=ext.toFixed(3);$('#inner-value').textContent=end.toFixed(3);$('#balance-value').textContent=`${$('#balance').value}°`;$('#wheel-value').textContent=`${$('#wheel').value}°`;$('#mechanical-readout').textContent=`${rams.length} ram surfaces · ${wheels.length} wheel surfaces\nInscription: main boom attached\nSettling: not calibrated`;stage.dataset.sourceTriangles=String(Object.values(partCounts).reduce((s,n)=>s+n,0));stage.dataset.elevation=$('#elevation').value;stage.dataset.middle=String(ext);stage.dataset.inner=String(end);}
let integrationElevationOffset=0,integrationStackRoof=0;
let motionProgress=0,motionPlaying=false,motionReverse=false,motionSpeed=1,motionFocus=false,motionRepeat=false,motionHome,payloadPose,groundPose,motionTarget,motionDistance,wheelRadius,motionSupport,motionWheelFocus=null,motionWheelAngle=0,motionCabFocus=null,motionVisibility=new Map(),cameraShot=null;
// Retain the reference's phase timing, camera curve and settling measurements.
// Recalibrate absolute reach/height for the real-size stack, then drive backing
// travel and telescope retraction from the same reversible frame coordinate.
function integrationTrajectory(state){
 const ease=(a,b)=>THREE.MathUtils.smoothstep(state.frame,a,b);
 const turn=THREE.MathUtils.degToRad(70*ease(80,176)),heading=-turn,radius=2,arcDistance=radius*turn;return {retreat:.8*ease(52,80),arcX:radius*Math.sin(turn),arcZ:radius*(1-Math.cos(turn)),heading,arcDistance,rearSteer:Math.atan(1.02/radius)*ease(80,88)*(1-ease(168,176)),middle:.30-.14*ease(60,104),balance:state.balance*ease(40,41)};
}
function applyIntegrationPose(state){
 const trajectory=integrationTrajectory(state);object.position.copy(motionHome);object.position.x+=state.approachOffset+trajectory.retreat+trajectory.arcX;object.position.z+=trajectory.arcZ;object.rotation.y=trajectory.heading;
 const setPose=elevation=>{for(const[id,value]of [['elevation',elevation],['middle',trajectory.middle],['inner',state.inner],['balance',trajectory.balance],['wheel',-(state.approachOffset+trajectory.retreat+trajectory.arcDistance)/wheelRadius*180/Math.PI]])$('#'+id).value=String(value);apply();wheels.forEach(w=>w.rotation.y=w.children[0].name.startsWith('rear')?trajectory.rearSteer:0);root.updateMatrixWorld(true);load.updateWorldMatrix(true,true);};
 const desired=state.elevation+integrationElevationOffset;setPose(desired);let clearanceCorrection=0;
 if(state.attached){
  const floor=integrationStackRoof+.06*THREE.MathUtils.smoothstep(state.frame,40,48),clearance=()=>Math.min(...containerAttachment.bottomWorld().map(p=>p.y));
  if(clearance()<floor-1e-10){let low=desired,high=desired+10;setPose(high);if(clearance()<floor)throw Error('Stack clearance cannot be reached');for(let i=0;i<38;i++){const middle=(low+high)/2;setPose(middle);if(clearance()<floor)low=middle;else high=middle;}setPose(high);clearanceCorrection=high-desired;}
 }
 return {...trajectory,elevation:desired+clearanceCorrection,clearanceCorrection};
}
function motionSetup(){
 $('#scroll-track').style?.setProperty('--motion-span',motionSpanVH+'vh');motionHome=object.position.clone();payloadPose={position:load.position.clone(),quaternion:load.quaternion.clone(),scale:load.scale.clone()};
 const geometry=wheels[0].children.find(m=>m.userData.wheelAmendment&&m.name.endsWith('closed tire')).geometry;geometry.computeBoundingBox();const wheelSize=geometry.boundingBox.getSize(new THREE.Vector3());wheelRadius=Math.max(wheelSize.x,wheelSize.y)/2;
 integrationStackRoof=containerAttachment.profile.height*containerAttachment.profile.scale*root.scale.x;
 const contact=motionAt(progressForFrame(40));object.position.copy(motionHome);object.rotation.y=0;$('#middle').value='.30';$('#inner').value='0';$('#balance').value='0';
 let low=0,high=50;for(let i=0;i<45;i++){const elevation=(low+high)/2;$('#elevation').value=String(elevation);apply();root.updateMatrixWorld(true);if(Math.min(...containerAttachment.bottomWorld().map(p=>p.y))<integrationStackRoof)low=elevation;else high=elevation;}
 integrationElevationOffset=high-contact.elevation;$('#elevation').value=String(high);apply();root.updateMatrixWorld(true);groundPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()};load.matrixWorld.decompose(groundPose.position,groundPose.quaternion,groundPose.scale);
 motionSupport=containerAttachment.createSupport(scene);containerAttachment.profile.pickupCalibration={elevationOffset:integrationElevationOffset,contactElevation:high,middleAtPickup:.30,lowerStackRoof:integrationStackRoof,lowerContainerBase:containerAttachment.lowerScene.position.y,clearancePolicy:'Solve boom elevation against the stationary casting plane; no compression or container penetration.',trajectory:{backingStartFrame:52,backingEndFrame:80,backingDistanceLiftUnits:.8,reverseArcFrames:[80,176],reverseArcRadiusLiftUnits:2,headingChangeDegrees:-70,retractFrames:[60,104],middleAfterRetraction:.16},referenceLimit:'Absolute reach, retreat distance and stack clearance are integration interpretations; original phase/camera/settling sources remain unchanged.'};stage.dataset.productionFit=JSON.stringify(containerAttachment.profile);
 // Pin the framing once. Rotating wheel AABBs must never drive a dolly.
 // Camera distance after contact is constant for the current viewport; targets
 // remain in the chassis frame, so scrubbing and reverse use the same path.
 // Use the chassis center on the ground as the stable screen-height anchor.
 cameraShot=null;const shots=[];
 for(const p of [0,...[40,60,80,104,128,152,176].map(progressForFrame)]){
  motionApply(p);const state=motionAt(p),yaw=integrationCameraYaw(state,integrationTrajectory(state).heading);
  const box=integrationCameraBounds(state),size=box.getSize(new THREE.Vector3()),target=box.getCenter(new THREE.Vector3());
  shots.push({target,targetLocal:object.worldToLocal(target.clone()),width:Math.abs(Math.cos(yaw))*size.x+Math.abs(Math.sin(yaw))*size.z,height:size.y,depth:Math.abs(Math.sin(yaw))*size.x+Math.abs(Math.cos(yaw))*size.z});
 }
 cameraShot={start:shots[0],contact:shots[1].targetLocal,follow:new THREE.Vector3((wheelOwnership.axles.front.x+wheelOwnership.axles.rear.x)/2,shots[4].targetLocal.y,0),supportCorners:integrationSupportCorners(),width:Math.max(...shots.slice(1).map(s=>s.width)),height:Math.max(...shots.slice(1).map(s=>s.height)),depth:Math.max(...shots.slice(1).map(s=>s.depth))};

 document.querySelector('[data-surface="porcelain"]').click();controls.enabled=false;controls.enableDamping=false;motionApply(0);
 $('#play-motion').addEventListener('click',()=>{if(motionProgress>=1&&!motionReverse)motionProgress=0;if(motionProgress<=0&&motionReverse)motionProgress=1;motionPlaying=true;$('#play-motion').setAttribute('aria-pressed','true');});
 $('#pause-motion').addEventListener('click',()=>{motionPlaying=false;$('#play-motion').setAttribute('aria-pressed','false');});
 $('#reverse-motion').addEventListener('click',()=>{motionReverse=!motionReverse;$('#reverse-motion').setAttribute('aria-pressed',String(motionReverse));if(motionProgress<=0&&motionReverse)motionProgress=1;motionPlaying=true;$('#play-motion').setAttribute('aria-pressed','true');});
 $('#restart-motion').addEventListener('click',()=>{motionPlaying=false;motionReverse=false;motionProgress=motionRepeat?settleWindow[0]:0;$('#play-motion').setAttribute('aria-pressed','false');$('#reverse-motion').setAttribute('aria-pressed','false');motionApply(0);});
 for(const[id,speed]of [['normal-speed',1],['slow-speed',.25]])$('#'+id).addEventListener('click',()=>{motionSpeed=speed;$('#normal-speed').setAttribute('aria-pressed',String(speed===1));$('#slow-speed').setAttribute('aria-pressed',String(speed===.25));});
 $('#focus-motion').addEventListener('click',()=>{motionCabFocus=null;motionWheelFocus=null;motionFocus=true;$('#focus-motion').setAttribute('aria-pressed','true');$('#full-motion').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 $('#full-motion').addEventListener('click',()=>{motionCabFocus=null;motionWheelFocus=null;motionFocus=false;motionRepeat=false;$('#focus-motion').setAttribute('aria-pressed','false');$('#full-motion').setAttribute('aria-pressed','true');$('#repeat-settling').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 $('#repeat-settling').addEventListener('click',()=>{motionCabFocus=null;motionWheelFocus=null;motionRepeat=!motionRepeat;motionFocus=motionRepeat;motionReverse=false;$('#reverse-motion').setAttribute('aria-pressed','false');motionProgress=settleWindow[0];motionPlaying=motionRepeat;$('#repeat-settling').setAttribute('aria-pressed',String(motionRepeat));$('#focus-motion').setAttribute('aria-pressed',String(motionFocus));$('#full-motion').setAttribute('aria-pressed',String(!motionFocus));$('#play-motion').setAttribute('aria-pressed',String(motionPlaying));motionApply(motionProgress);});
 for(const[id,yaw]of [['cab-side-focus',0],['cab-quarter-focus',45],['cab-opposite-focus',180],['cab-rear-focus',225]])$('#'+id).addEventListener('click',()=>{motionCabFocus=yaw;$('#inspection-cab-angle').value=String(yaw);motionWheelFocus=null;motionFocus=false;motionPlaying=false;motionRepeat=false;$('#play-motion').setAttribute('aria-pressed','false');$('#repeat-settling').setAttribute('aria-pressed','false');$('#focus-motion').setAttribute('aria-pressed','false');$('#full-motion').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 for(const[id,which]of [['front-wheel-focus','front_wheel_right'],['rear-wheel-focus','rear_wheel_right'],['front-inner-focus','front_wheel_left'],['rear-inner-focus','rear_wheel_left']])$('#'+id).addEventListener('click',()=>{motionCabFocus=null;motionWheelFocus=which;motionFocus=false;motionPlaying=false;motionRepeat=false;$('#play-motion').setAttribute('aria-pressed','false');$('#repeat-settling').setAttribute('aria-pressed','false');$('#focus-motion').setAttribute('aria-pressed','false');$('#full-motion').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 for(const id of ['inspection-wheel-orbit','inspection-wheel-isolate'])$('#'+id).addEventListener('input',()=>motionApply(motionProgress));
 $('#inspection-cab-angle').addEventListener('input',()=>{motionCabFocus=Number($('#inspection-cab-angle').value);motionWheelFocus=null;motionPlaying=false;motionRepeat=false;$('#play-motion').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 $('#inspection-wheel-angle').addEventListener('input',()=>{motionWheelAngle=Number($('#inspection-wheel-angle').value);motionPlaying=false;$('#play-motion').setAttribute('aria-pressed','false');motionApply(motionProgress);});
 $('#sequence-progress').addEventListener('input',()=>{motionPlaying=false;motionRepeat=false;$('#play-motion').setAttribute('aria-pressed','false');$('#repeat-settling').setAttribute('aria-pressed','false');motionProgress=Number($('#sequence-progress').value);motionApply(motionProgress);});
 document.querySelectorAll('[data-cue]').forEach(b=>b.addEventListener('click',()=>{motionPlaying=false;motionRepeat=false;$('#play-motion').setAttribute('aria-pressed','false');$('#repeat-settling').setAttribute('aria-pressed','false');motionProgress=progressForFrame(Number(b.dataset.cue));motionApply(motionProgress);}));
 $('#scroll-drive').addEventListener('change',()=>{document.querySelector('.inspection-tools').open=false;motionPlaying=false;$('#play-motion').setAttribute('aria-pressed','false');document.body.classList.toggle('scroll-driven',$('#scroll-drive').checked);if($('#scroll-drive').checked)window.scrollTo({top:$('#scroll-track').getBoundingClientRect().top+window.scrollY+motionProgress*motionSpanVH/100*window.innerHeight,behavior:'instant'});});
 const ordered=$('#ordered-reference'),native=$('#native-reference');const close=$('#settling-reference');$('#pause-reference').addEventListener('click',()=>{ordered.pause();native.pause();close.pause();});$('#settling-reference-normal').addEventListener('click',()=>{close.currentTime=0;close.playbackRate=1;close.play();});$('#settling-reference-slow').addEventListener('click',()=>{close.currentTime=0;close.playbackRate=.25;close.play();});$('#reference-play').addEventListener('click',()=>{ordered.currentTime=0;ordered.play();});$('#reference-normal').addEventListener('click',()=>{ordered.playbackRate=1;ordered.play();});$('#reference-slow').addEventListener('click',()=>{ordered.playbackRate=.25;ordered.currentTime=1.2;ordered.play();});$('#native-play').addEventListener('click',()=>{native.currentTime=0;native.playbackRate=1;native.play();});$('#native-slow').addEventListener('click',()=>{native.currentTime=8;native.playbackRate=.25;native.play();});
}
// Measured raster yaw samples contain plateaus and a sharp late jump. Combining
// them with the continuous reverse arc makes world-camera azimuth turn backward.
// One shared phase preserves the end-to-side reveal without those reversals.
function integrationCameraYaw(state,heading){
 return (motionFocus?0:THREE.MathUtils.degToRad(90*THREE.MathUtils.smoothstep(state.frame,80,176)))+heading;
}
function integrationCameraBounds(state){
 const primary=new THREE.Box3().setFromObject(root).union(new THREE.Box3().setFromObject(load)),box=primary.clone().union(new THREE.Box3().setFromObject(motionSupport)),departure=THREE.MathUtils.smoothstep(state.frame,80,128);
 box.min.lerp(primary.min,departure);box.max.lerp(primary.max,departure);return box;
}
function integrationSupportCorners(){
 const b=new THREE.Box3().setFromObject(motionSupport),out=[];
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])out.push(new THREE.Vector3(x,y,z));return out;
}
function integrationCameraWitnesses(){
 const hub=wheels.reduce((sum,w)=>sum.add(w.getWorldPosition(new THREE.Vector3())),new THREE.Vector3()).multiplyScalar(1/wheels.length),ground=hub.clone().setY(0).project(camera),hubScreen=hub.clone().project(camera),corners=(cameraShot?.supportCorners||integrationSupportCorners()).map(v=>v.clone().project(camera));
 const rect={minX:Math.min(...corners.map(v=>v.x)),maxX:Math.max(...corners.map(v=>v.x)),minY:Math.min(...corners.map(v=>v.y)),maxY:Math.max(...corners.map(v=>v.y))};
 return {groundAnchorY:(1-ground.y)*stage.clientHeight/2,hubAnchorY:(1-hubScreen.y)*stage.clientHeight/2,supportRectNDC:rect,supportIntersectsView:rect.minX<=1&&rect.maxX>=-1&&rect.minY<=1&&rect.maxY>=-1,supportVisible:motionSupport.visible};
}
function motionApply(progress){
 for(const [m,visible]of motionVisibility)m.visible=visible;motionVisibility.clear();
 const state=motionAt(progress);
 $('#proxy').checked=true;
 if(state.attached){if(load.parent!==spreader)spreader.add(load);load.position.copy(payloadPose.position);load.quaternion.copy(payloadPose.quaternion);load.scale.copy(payloadPose.scale);}else{if(load.parent!==scene)scene.add(load);load.position.copy(groundPose.position);load.quaternion.copy(groundPose.quaternion);load.scale.copy(groundPose.scale);}
 const appliedPose=applyIntegrationPose(state);if(motionWheelFocus)wheels.forEach(w=>w.rotation.z=THREE.MathUtils.degToRad(motionWheelAngle));root.updateMatrixWorld(true);load.updateWorldMatrix(true,true);stage.dataset.supportContact=JSON.stringify(containerAttachment.updateSupport());
 camera.fov=motionWheelFocus||motionCabFocus!==null?36:12;camera.updateProjectionMatrix();
 const yaw=integrationCameraYaw(state,appliedPose.heading),vf=THREE.MathUtils.degToRad(camera.fov/2),hf=Math.atan(Math.tan(vf)*camera.aspect);
 const fit=s=>Math.max(s.width/(2*Math.tan(hf)),s.height/(2*Math.tan(vf)))*1.12+s.depth/2;
 let target;
 if(cameraShot){
  const postContactDistance=fit(cameraShot),follow=object.localToWorld(cameraShot.contact.clone().lerp(cameraShot.follow,THREE.MathUtils.smoothstep(state.frame,40,80))),attach=THREE.MathUtils.smoothstep(state.progress,0,progressForFrame(40));
  target=cameraShot.start.target.clone().lerp(follow,attach);motionDistance=THREE.MathUtils.lerp(fit(cameraShot.start),postContactDistance,attach);
 }else{
  const box=integrationCameraBounds(state),size=box.getSize(new THREE.Vector3());target=box.getCenter(new THREE.Vector3());
  motionDistance=fit({width:Math.abs(Math.cos(yaw))*size.x+Math.abs(Math.sin(yaw))*size.z,height:size.y,depth:Math.abs(Math.sin(yaw))*size.x+Math.abs(Math.cos(yaw))*size.z});
 }

 // A small horizontal composition bias keeps the departed stack beyond the
 // frame edge at wide aspects. Camera-right has no vertical/depth component,
 // so this changes horizontal framing without moving the chassis screen height.
 if(cameraShot&&!motionFocus)target.addScaledVector(new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),-.6*THREE.MathUtils.smoothstep(state.frame,80,128));
 if(motionFocus)target=new THREE.Box3().setFromObject(load).getCenter(new THREE.Vector3());
 const distance=motionFocus?Math.max(13,motionDistance*.55):motionDistance;

 camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw)*distance,distance*.085,Math.cos(yaw)*distance));camera.up.set(0,1,0);camera.lookAt(target);if(motionWheelFocus){const wheel=wheels.find(w=>w.children[0].name===motionWheelFocus),box=new THREE.Box3().setFromObject(wheel),center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2,a=THREE.MathUtils.degToRad(Number($('#inspection-wheel-orbit').value)),side=motionWheelFocus.endsWith('right')?1:-1;camera.up.set(0,1,0);camera.position.copy(center).add(new THREE.Vector3(Math.sin(a),.15,Math.cos(a)*side).normalize().multiplyScalar(radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.15));camera.lookAt(center);if($('#inspection-wheel-isolate').checked){root.traverse(m=>{if(!m.isMesh)return;let parent=m,belongs=false;while(parent){if(parent===wheel){belongs=true;break;}parent=parent.parent;}if(!belongs){motionVisibility.set(m,m.visible);m.visible=false;}});for(const m of [load,motionSupport]){motionVisibility.set(m,m.visible);m.visible=false;}}}if(motionCabFocus!==null){const center=object.localToWorld(new THREE.Vector3(.018,-.117,.05875)),a=THREE.MathUtils.degToRad(motionCabFocus);camera.up.set(0,1,0);camera.position.copy(center).add(new THREE.Vector3(Math.sin(a),.14,Math.cos(a)).normalize().multiplyScalar(1.65));camera.lookAt(center);}camera.updateMatrixWorld(true);
 $('#sequence-progress').value=String(state.progress);$('#progress-value').textContent=(state.progress*100).toFixed(1)+'%';$('#phase-readout').textContent=state.phase;$('#ownership-readout').textContent=state.attached?'C01 attached to spreader':'C01 on lower container';$('#balance-readout').textContent='Sway '+appliedPose.balance.toFixed(2)+'°';stage.dataset.camera=JSON.stringify({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:target.toArray(),distance,fov:camera.fov,aspect:camera.aspect,azimuth:yaw,rollDegrees:0,...integrationCameraWitnesses(),framing:cameraShot?'level_chassis_tracking':'setup'});stage.dataset.motion=JSON.stringify({...state,camera:JSON.parse(stage.dataset.camera),applied_pose:appliedPose,speed:motionSpeed,playing:motionPlaying,focus:motionFocus,cab_focus:motionCabFocus,wheel_focus:motionWheelFocus,wheel_inspection_angle:motionWheelAngle,wheel_roll_degrees:-(state.approachOffset+appliedPose.retreat+appliedPose.arcDistance)/wheelRadius*180/Math.PI,wheel_orbit:Number($('#inspection-wheel-orbit').value),wheel_isolated:$('#inspection-wheel-isolate').checked,scroll_driven:$('#scroll-drive').checked,load_owner:state.attached?'spreader':'support',load_world_center:load.getWorldPosition(new THREE.Vector3()).toArray()});
}
function motionTick(dt){
 if($('#scroll-drive').checked){const start=$('#scroll-track').getBoundingClientRect().top+window.scrollY;motionProgress=Math.max(0,Math.min(1,(window.scrollY-start)/(motionSpanVH/100*window.innerHeight)));}
 else if(motionPlaying&&!document.hidden){motionProgress+=(motionReverse?-1:1)*dt*motionSpeed/reviewDuration;if(motionRepeat){if(motionProgress>settleWindow[1])motionProgress=settleWindow[0];if(motionProgress<settleWindow[0])motionProgress=settleWindow[1];}else if(motionProgress>=1||motionProgress<=0){motionProgress=Math.max(0,Math.min(1,motionProgress));motionPlaying=false;$('#play-motion').setAttribute('aria-pressed','false');}}
 motionApply(motionProgress);
}
async function init(){renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;stage.append(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color('#11151B');const pm=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pm.fromScene(room,.04).texture;scene.environmentIntensity=.8;room.dispose();pm.dispose();scene.add(new THREE.HemisphereLight(0xf5f8fc,0x506276,2));const key=new THREE.DirectionalLight(0xf5f8fc,3);key.position.set(7,10,6);scene.add(key);const fill=new THREE.DirectionalLight(0xb9e7ff,1);fill.position.set(-6,4,-5);scene.add(fill);camera=new THREE.PerspectiveCamera(36,1,.01,150);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=25;root=new THREE.Group();scene.add(root);const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshBasicMaterial({color:'#11151B',toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(stage);resize();const ownershipResponse=await fetch('../generation/lift-family/model-draft/attachment-ownership.json');if(!ownershipResponse.ok)throw Error('Attachment map unavailable');attachmentOwnership=await ownershipResponse.json();if(attachmentOwnership.approved_input_sha256!=='d9fd9e83480be86d3b5ab7568e583f9a54341ad20769ea75a23a3fa5919c7067')throw Error('Attachment map input mismatch');const wheelResponse=await fetch('../generation/lift-family/model-draft/wheel-ownership-motion-amended.json');if(!wheelResponse.ok)throw Error('Wheel ownership map unavailable');wheelOwnership=await wheelResponse.json();if(wheelOwnership.approved_input_sha256!==attachmentOwnership.approved_input_sha256)throw Error('Wheel map input mismatch');const loader=new GLTFLoader();const [gltf,containerGLTF]=await Promise.all([loader.loadAsync('../generation/lift-family/model-draft/model-carbon-unified.glb'),loader.loadAsync('../generation/container-family/model-draft/C01-container.glb')]);productionScene=containerGLTF.scene;await prepareWordmark();build(gltf);ready=true;stage.dataset.loaded='true';$('#load-message').hidden=true;$('#mesh-status').textContent='Approved lift + C01 · Integration review';allButtons.forEach(b=>b.disabled=false);apply();
 inputs.forEach(id=>$('#'+id).addEventListener('input',()=>{playing=false;wheelPlaying=false;$('#cycle').setAttribute('aria-pressed','false');$('#wheel-cycle').setAttribute('aria-pressed','false');apply();}));$('#proxy').addEventListener('change',apply);$('#fillings').addEventListener('change',()=>{const enabled=$('#fillings').checked;object.traverse(m=>{if(m.userData.geometryAfterFill)m.geometry=enabled?m.userData.geometryAfterFill:m.userData.geometryBeforeFill;if(m.userData.localFillingObject)m.visible=enabled;});stage.dataset.fillingsEnabled=String(enabled);apply();});$('#wheel-cycle').addEventListener('click',()=>{wheelPlaying=!wheelPlaying;$('#wheel-cycle').setAttribute('aria-pressed',String(wheelPlaying));});$('#rest').addEventListener('click',()=>{playing=false;wheelPlaying=false;$('#wheel-cycle').setAttribute('aria-pressed','false');inputs.forEach(id=>$('#'+id).value=0);$('#proxy').checked=false;$('#cycle').setAttribute('aria-pressed','false');apply();});$('#camera-reset').addEventListener('click',()=>cameraReset());document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>cameraReset(b.dataset.view)));$('#cycle').addEventListener('click',()=>{playing=!playing;$('#cycle').setAttribute('aria-pressed',String(playing));});document.querySelectorAll('[data-surface]').forEach(b=>b.addEventListener('click',()=>{const c=b.dataset.surface==='carbon'?'#11151B':'#EDF2F7';scene.background.set(c);floor.material.color.set(c);document.querySelectorAll('[data-surface]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
 $('#record').addEventListener('click',()=>{
 if(!renderer.domElement.captureStream||typeof MediaRecorder==='undefined'){$('#replay-status').textContent='Recording is unavailable in this browser. Use the live controls.';return;}
 const stream=renderer.domElement.captureStream(30),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
 if(!mime){stream.getTracks().forEach(t=>t.stop());$('#replay-status').textContent='WebM recording is unavailable in this browser.';return;}
 $('#rest').click();elapsed=0;playing=true;$('#cycle').setAttribute('aria-pressed','true');$('#record').disabled=true;$('#replay-status').textContent='Recording one raise and return cycle…';
 const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(replayURL)URL.revokeObjectURL(replayURL);replayURL=URL.createObjectURL(new Blob(chunks,{type:mime}));$('#replay-video').src=replayURL;$('#replay-panel').hidden=false;$('#record').disabled=false;$('#replay-status').textContent='Test replay ready · Browser render, no reference calibration';recorder=null;};recorder.start();
 });
 motionSetup();const replay=installIntegrationReplay({stage,renderer,start(){motionCabFocus=null;motionWheelFocus=null;$('#scroll-drive').checked=false;document.body.classList.remove('scroll-driven');motionProgress=motionRepeat?settleWindow[motionReverse?1:0]:motionReverse?1:0;motionPlaying=true;$('#play-motion').setAttribute('aria-pressed','true');return {scope:motionRepeat?'settling':'full',reverse:motionReverse,speed:motionSpeed};},state(){return JSON.parse(stage.dataset.motion);},pause(){motionPlaying=false;$('#play-motion').setAttribute('aria-pressed','false');},witnesses(){return containerAttachment.contacts.flatMap(c=>[c.rimModel,[c.rimModel[0],0,c.rimModel[2]]]).map(p=>{const v=productionScene.localToWorld(new THREE.Vector3(...p)).project(camera);return {x:(v.x+1)/2*stage.clientWidth,y:(1-v.y)/2*stage.clientHeight,z:v.z};});}});let last=0;function frame(t){requestAnimationFrame(frame);const dt=Math.min((t-last)/1000,.05);last=t;motionTick(dt);renderer.render(scene,camera);replay.frame(t);}requestAnimationFrame(frame);
}init().catch(e=>{$('#mesh-status').textContent='Mechanical preview unavailable';$('#load-message').textContent=e.message;console.error(e);});
