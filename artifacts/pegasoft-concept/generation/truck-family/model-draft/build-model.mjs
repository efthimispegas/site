import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as T from '../../../review/vendor/three/build/three.module.js';
import {makeTruck,applyRig,steeringAngles} from './truck-model.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const bytes=fs.readFileSync(path.join(directory,'wordmark.rgba'));
const lettering=new T.DataTexture(new Uint8Array(bytes),1024,256,T.RGBAFormat);lettering.name='external_Pegasoft_Manrope_650';lettering.colorSpace=T.SRGBColorSpace;lettering.magFilter=T.LinearFilter;lettering.minFilter=T.LinearMipmapLinearFilter;lettering.generateMipmaps=true;lettering.needsUpdate=true;
const model=makeTruck(lettering);
function audit(mesh){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,vertices=new Map(),ids=[],edges=new Map();let volume=0,triangles=0,degenerate=0;
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);ids.push(vertices.get(key));for(const v of [p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)])if(!Number.isFinite(v))throw Error('Nonfinite '+mesh.name);}
  const at=i=>index?index.getX(i):i,count=index?index.count:p.count;
  for(let i=0;i<count;i+=3){const raw=[at(i),at(i+1),at(i+2)],a=new T.Vector3().fromBufferAttribute(p,raw[0]),b=new T.Vector3().fromBufferAttribute(p,raw[1]),c=new T.Vector3().fromBufferAttribute(p,raw[2]);if(new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).lengthSq()<1e-20){degenerate++;continue;}volume+=a.dot(b.clone().cross(c))/6;triangles++;
    const v=raw.map(i=>ids[i]);for(let j=0;j<3;j++){const x=v[j],y=v[(j+1)%3],key=Math.min(x,y)+':'+Math.max(x,y),e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=x<y?1:-1;edges.set(key,e);}}
  const bad=[...edges.values()].filter(e=>e.count!==2||e.winding!==0).length;
  if(bad||volume<=0||degenerate)throw Error(`${mesh.name}: edges=${bad}, volume=${volume}, degenerate=${degenerate}`);
  return {name:mesh.name,triangles,weldedVertices:vertices.size,boundaryOrWindingEdges:bad,positiveVolumeM3:volume,degenerateTriangles:degenerate};
}
const meshes=[];model.root.traverse(n=>{if(n.isMesh)meshes.push(n);});
const componentChecks=meshes.map(audit),box=new T.Box3().setFromObject(model.root),size=box.getSize(new T.Vector3());
if(model.wheels.length!==12)throw Error('Tire count must be 12');
if(model.steeringPivots.length!==2)throw Error('Front steering count must be 2');
const containerChecks=JSON.parse(fs.readFileSync(path.join(directory,'../../container-family/model-draft/model-checks.json')));
const supportChecks=model.supports.map(s=>{
 const source=containerChecks.landmarks.find(l=>l.id===s.id&&l.role==='support rim');if(!source)throw Error('Missing C01 witness '+s.id);
 const seated=source.point.map((v,i)=>v+[model.dimensions.containerCenterX,model.dimensions.supportHeight,0][i]);
 const residual=seated.map((v,i)=>v-s.rimWitness[i]);if(residual.some(v=>Math.abs(v)>1e-6))throw Error('Support rim mismatch');
 const caster=model.root.getObjectByName(s.pad);const bounds=new T.Box3().setFromObject(caster);
 if(Math.abs(bounds.max.y-1.35)>1e-6||seated[0]<bounds.min.x||seated[0]>bounds.max.x||seated[2]<bounds.min.z||seated[2]>bounds.max.z)throw Error('Rim witness outside support pad');
 return {id:s.id,C01SeatedRim:seated,trailerSeat:s.rimWitness,residual,padBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
});
// Inspect cab/frame and seated C01 clearance through the manual articulation envelope.
const cabMeshes=[];model.cab.traverse(n=>{if(n.isMesh)cabMeshes.push(n);});
const cabBoxes=cabMeshes.map(n=>({name:n.name,box:new T.Box3().setFromObject(n)}));
const trailerMeshes=[];model.trailer.traverse(n=>{if(n.isMesh)trailerMeshes.push(n);});
const articulationChecks=[];
for(const degrees of [-10,0,10]){
 model.trailer.rotation.y=T.MathUtils.degToRad(degrees);model.root.updateMatrixWorld(true);
 for(const frame of trailerMeshes){const b=new T.Box3().setFromObject(frame);for(const c of cabBoxes)if(c.box.intersectsBox(b))throw Error('Cab/trailer overlap '+degrees+' '+c.name+' / '+frame.name);}
 const cb=containerChecks.boundingBox,containerMatrix=model.trailer.matrixWorld.clone().multiply(new T.Matrix4().makeTranslation(model.dimensions.containerCenterX,.2,0));
 const cargoBox=new T.Box3(new T.Vector3(...cb.min),new T.Vector3(...cb.max)).applyMatrix4(containerMatrix);
 for(const c of cabBoxes)if(c.box.intersectsBox(cargoBox))throw Error('Cab/C01 overlap '+degrees+' '+c.name);
 const rims=model.supports.map(s=>{const source=containerChecks.landmarks.find(l=>l.id===s.id&&l.role==='support rim'),rim=new T.Vector3(...source.point).applyMatrix4(containerMatrix),seat=new T.Vector3(s.rimWitness[0],.2,s.rimWitness[2]).applyMatrix4(model.trailer.matrixWorld);if(rim.distanceTo(seat)>1e-6)throw Error('Articulated support mismatch');return {id:s.id,residualMeters:rim.distanceTo(seat)};});
 articulationChecks.push({degrees,cabFrameAABBIntersections:0,cabCargoAABBIntersections:0,contactRims:rims});
}
// Evaluate the actual generated rig over the full review range, including rolled tires.
const rigChecks=[];
for(const steer of [-20,-10,0,10,20])for(const yaw of [-10,-5,0,5,10])for(const roll of [0,10,45,90,180,270,360]) {
  const angles=applyRig(model.root,steer,yaw,roll),contacts=[];
  for(const w of model.wheels){
    const tire=w.children.find(n=>n.name.endsWith('_closed_tire')),bounds=new T.Box3().setFromObject(tire,true),center=w.getWorldPosition(new T.Vector3()),radius=tire.userData.contactRadius;
    if(Math.abs(center.y-radius)>1e-7||bounds.min.y<-.00001||bounds.min.y>.001)throw Error('Floating tire '+w.name);
    const knuckle=w.parent.getObjectByName(w.parent.name.replace('_steering','_steering_knuckle'));
    if(!knuckle||center.distanceTo(knuckle.getWorldPosition(new T.Vector3()))>1e-7)throw Error('Disconnected wheel hub');
    contacts.push({wheel:w.name,groundGapMeters:bounds.min.y,hubResidualMeters:0});
  }
  const pin=model.root.getObjectByName('attached_kingpin').getWorldPosition(new T.Vector3());
  if(Math.hypot(pin.x,pin.z)>1e-8)throw Error('Kingpin left socket');
  const skid=model.root.getObjectByName('trailer_bearing_skid'),seatY=new T.Box3().setFromObject(skid).min.y;
  if(Math.abs(seatY-1.15)>1e-7)throw Error('Trailer skid left fifth-wheel plate');
  if(steer){
    const centers=angles.map((angle,i)=>[-1,1][i]*1.095-3.8/Math.tan(angle));
    if(Math.abs(centers[0]-centers[1])>1e-7)throw Error('Ackermann intersection mismatch');
  }
  const flexibleConnections=[];
  model.root.traverse(n=>{if(n.userData.role==='flexible service line'){
    const p=n.geometry.attributes.position,start=new T.Vector3().fromBufferAttribute(p,p.count-2),end=new T.Vector3().fromBufferAttribute(p,p.count-1),expected=model.trailer.localToWorld(new T.Vector3(...n.userData.trailerAnchor));
    const residual=Math.max(start.distanceTo(new T.Vector3(...n.userData.tractorAnchor)),end.distanceTo(expected));if(residual>1e-6)throw Error('Disconnected hose '+n.name);flexibleConnections.push({name:n.name,endpointResidualMeters:residual});
  }});
  rigChecks.push({flexibleConnections,steerDegrees:steer,yawDegrees:yaw,rollDegrees:roll,frontWheelDegrees:angles.map(T.MathUtils.radToDeg),kingpinHorizontalResidualMeters:Math.hypot(pin.x,pin.z),bearingGapMeters:seatY-1.15,tireContacts:contacts});
}
applyRig(model.root,0,0,0);

function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function png(texture){const {width:w,height:h,data}=texture.image,header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const rows=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)Buffer.from(data.buffer,data.byteOffset+y*w*4,w*4).copy(rows,y*(w*4+1)+1);const chunk=(name,payload)=>{const type=Buffer.from(name),out=Buffer.alloc(payload.length+12);out.writeUInt32BE(payload.length);type.copy(out,4);payload.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([type,payload])),out.length-4);return out;};return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
const gltf={asset:{version:'2.0',generator:'Pegasoft local dimensioned truck v2'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[],images:[],textures:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497},{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}]};
const chunks=[];let length=0;
function view(bytes,target){const buffer=Buffer.from(bytes),padding=(4-buffer.length%4)%4,id=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:buffer.length,...(target?{target}:{} )});chunks.push(buffer,Buffer.alloc(padding));length+=buffer.length+padding;return id;}
for(let i=0;i<model.textures.length;i++){gltf.images.push({bufferView:view(png(model.textures[i])),mimeType:'image/png',name:model.textures[i].name});gltf.textures.push({sampler:model.textures[i].wrapS===T.RepeatWrapping?0:1,source:i});}
gltf.extensionsUsed=['KHR_materials_transmission','KHR_materials_volume','KHR_materials_ior','KHR_materials_anisotropy'];
for(const m of model.materials)gltf.materials.push({name:m.name,pbrMetallicRoughness:{baseColorFactor:[...m.color.toArray(),m.opacity],metallicFactor:m.metalness,roughnessFactor:m.roughness,...(m.map?{baseColorTexture:{index:model.textures.indexOf(m.map)}}:{})},...(m.normalMap?{normalTexture:{index:model.textures.indexOf(m.normalMap),scale:m.normalScale.x}}:{}),...(m.transparent?{alphaMode:'BLEND'}:{}),...(m.emissive?{emissiveFactor:m.emissive.clone().multiplyScalar(m.emissiveIntensity).toArray()}:{}),...(m.anisotropy?{extensions:{KHR_materials_anisotropy:{anisotropyStrength:m.anisotropy,anisotropyRotation:m.anisotropyRotation}}}:{}),...(m.transmission?{extensions:{KHR_materials_transmission:{transmissionFactor:m.transmission},KHR_materials_volume:{thicknessFactor:m.thickness},KHR_materials_ior:{ior:m.ior}}}:{}),doubleSided:false});
const accessorCache=new Map();
function accessor(attribute,type,target){const raw=Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength),key=type+":"+target+":"+attribute.array.constructor.name+":"+createHash("sha256").update(raw).digest("hex");if(accessorCache.has(key))return accessorCache.get(key);const arr=attribute.array,componentType=arr instanceof Float32Array?5126:arr instanceof Uint16Array?5123:5125,entry={bufferView:view(Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength),target),componentType,count:attribute.count,type};if(type==='VEC3'&&target===34962&&attribute.itemSize===3){entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<attribute.count;i++)for(let c=0;c<3;c++){const v=arr[i*3+c];entry.min[c]=Math.min(entry.min[c],v);entry.max[c]=Math.max(entry.max[c],v);}}const id=gltf.accessors.length;gltf.accessors.push(entry);accessorCache.set(key,id);return id;}
function node(object){const id=gltf.nodes.length;object.updateMatrix();gltf.nodes.push({name:object.name,matrix:object.matrix.toArray(),extras:object.userData});if(object.isMesh){const g=object.geometry,primitive={attributes:{POSITION:accessor(g.attributes.position,'VEC3',34962),NORMAL:accessor(g.attributes.normal,'VEC3',34962),TEXCOORD_0:accessor(g.attributes.uv,'VEC2',34962)},material:model.materials.indexOf(object.material)};if(g.index)primitive.indices=accessor(g.index,'SCALAR',34963);gltf.nodes[id].mesh=gltf.meshes.length;gltf.meshes.push({name:object.name,primitives:[primitive]});}if(object.children.length)gltf.nodes[id].children=object.children.map(node);return id;}
node(model.root);gltf.buffers[0].byteLength=length;let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const binary=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,jh,json,bh,binary]);
const outputJSON=JSON.parse(glb.subarray(20,20+json.length).toString()),outputBIN=glb.subarray(28+json.length);
let compared=0;
for(const mesh of meshes){const primitive=outputJSON.meshes.find(m=>m.name===mesh.name).primitives[0];for(const [name,attribute] of [['POSITION',mesh.geometry.attributes.position],['NORMAL',mesh.geometry.attributes.normal],['TEXCOORD_0',mesh.geometry.attributes.uv],...(mesh.geometry.index?[['indices',mesh.geometry.index]]:[])]){const a=outputJSON.accessors[name==='indices'?primitive.indices:primitive.attributes[name]],v=outputJSON.bufferViews[a.bufferView],original=Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength);if(!original.equals(outputBIN.subarray(v.byteOffset,v.byteOffset+v.byteLength)))throw Error('GLB readback differs '+mesh.name+' '+name);compared++;}}
fs.writeFileSync(path.join(directory,'T01-truck.glb'),glb);
const suspensionChecks=[];
for(let i=0;i<3;i++)for(const sign of [-1,1]){
 const air=new T.Box3().setFromObject(model.root.getObjectByName('air_spring_'+i+'_'+sign)),top=new T.Box3().setFromObject(model.root.getObjectByName('air_spring_upper_pedestal_'+i+'_'+sign)),bottom=new T.Box3().setFromObject(model.root.getObjectByName('air_spring_lower_seat_'+i+'_'+sign));
 const gaps=[top.min.y-air.max.y,air.min.y-bottom.max.y];if(gaps.some(v=>Math.abs(v)>1e-6))throw Error('Air spring disconnected');suspensionChecks.push({axle:i,side:sign,upperSeatGapMeters:gaps[0],lowerSeatGapMeters:gaps[1]});
}
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report={status:'technical_model_checks_passed_interactive_user_review_pending',units:'meters',dimensions:model.dimensions,boundingBox:{min:box.min.toArray(),max:box.max.toArray()},meshCount:meshes.length,triangles:componentChecks.reduce((n,c)=>n+c.triangles,0),closedSolidPrimitiveChecks:componentChecks,tireCount:model.wheels.length,steeringPivotCount:model.steeringPivots.length,tractorAxles:2,trailerAxles:3,articulationPivot:[0,1.15,0],supportChecks,articulationChecks,rigChecks,suspensionChecks,fenderRadialClearanceMeters:{tractor:.0335,trailer:.0435},exportedAttributeReadbacks:compared,glbBytes:glb.length,glbSha256:sha(path.join(directory,'T01-truck.glb')),C01Sha256:sha(path.join(directory,'../../container-family/model-draft/C01-container.glb')),staticApproval:'../static-family-approval.json',sourceHashes:Object.fromEntries(['truck-model.mjs','build-model.mjs','wordmark.rgba','wordmark.png','build-wordmark.py'].map(name=>[name,sha(path.join(directory,name))])),acceptanceLimits:'Closed primitive checks do not certify a Boolean union. Cab shape and finish require rendered review. Four support rim witnesses checked; Rigid yaw and Ackermann steering are evaluated on level ground; this is not a tire-force or suspension-travel simulation. Dynamic lift handoff, road trajectory and final motion remain a later review.'};
fs.writeFileSync(path.join(directory,'model-checks.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({meshCount:report.meshCount,triangles:report.triangles,closedSolids:componentChecks.length,tireCount:report.tireCount,contactWitnesses:supportChecks.length,glbBytes:glb.length,sha256:report.glbSha256}));
