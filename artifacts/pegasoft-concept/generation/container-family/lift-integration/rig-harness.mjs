import fs from 'node:fs';
import * as THREE from '../../../review/vendor/three/build/three.module.js';
import {amendWheels} from '../../../review/lift-wheels.js';
import {amendCab} from '../../../review/lift-cab.js';
import {motionAt,progressForFrame,settleWindow,motionSpanVH,reviewDuration} from '../../../review/lift-motion-contract.js';

export {THREE,motionAt,progressForFrame,settleWindow};
export const conceptRoot=new URL('../../../',import.meta.url);
export function loadGeometry(url){
 const b=fs.readFileSync(url),len=b.readUInt32LE(12),start=28+len,j=JSON.parse(b.subarray(20,20+len));
 const attr=id=>{const a=j.accessors[id],v=j.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];return new THREE.BufferAttribute(new Type(b.buffer,b.byteOffset+start+(v.byteOffset||0)+(a.byteOffset||0),a.count*size).slice(),size);};
 const materials=j.materials.map(p=>{const m=new THREE.MeshStandardMaterial(),r=p.pbrMetallicRoughness||{};m.name=p.name||'';if(r.baseColorFactor)m.color.fromArray(r.baseColorFactor);m.metalness=r.metallicFactor??1;m.roughness=r.roughnessFactor??1;m.side=p.doubleSided?THREE.DoubleSide:THREE.FrontSide;return m;});
 const nodes=j.nodes.map(n=>{const group=new THREE.Group();group.name=n.name||'';group.userData=n.extras||{};if(n.matrix)new THREE.Matrix4().fromArray(n.matrix).decompose(group.position,group.quaternion,group.scale);else{if(n.translation)group.position.fromArray(n.translation);if(n.rotation)group.quaternion.fromArray(n.rotation);if(n.scale)group.scale.fromArray(n.scale);}if(n.mesh!==undefined)for(const [pi,p]of j.meshes[n.mesh].primitives.entries()){const g=new THREE.BufferGeometry();for(const [name,id]of Object.entries(p.attributes))g.setAttribute({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[name],attr(id));if(p.indices!==undefined)g.setIndex(attr(p.indices));const m=new THREE.Mesh(g,materials[p.material]);m.name=n.name+(j.meshes[n.mesh].primitives.length>1?'_'+pi:'');group.add(m);}return group;});
 j.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>nodes[i].add(nodes[child])));const scene=new THREE.Group();(j.scenes[j.scene||0].nodes||[]).forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);return {scene,json:j,bytes:b};
}
export function compileRig(text,createContainerAttachment,productionScene){
 const f=new URL('generation/lift-family/model-draft/',conceptRoot),attachment=JSON.parse(fs.readFileSync(new URL('attachment-ownership.json',f))),wheel=JSON.parse(fs.readFileSync(new URL('wheel-ownership-motion-amended.json',f)));
 const functions=text.slice(text.indexOf('function role('),text.indexOf('function cameraReset('))+'function cameraReset(){}\n'+text.slice(text.indexOf('function build('),text.indexOf('async function init('));
 return new Function('amendWheels','amendCab','THREE','attachmentOwnership','wheelOwnership','motionAt','progressForFrame','settleWindow','motionSpanVH','reviewDuration','createContainerAttachment','productionScene',`
 let root=new THREE.Group(),object,boom,middle,inner,spreader,load,containerAttachment,ready=true,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1.33,.01,150),controls={};const pivot=new THREE.Vector3(.669,-.08,0),joint=new THREE.Vector3(-.7421,.327,0),direction=new THREE.Vector3(-1,.3173,0).normalize(),wheels=[],rams=[],hoses=[],fitTarget=new THREE.Vector3(),partCounts={},wordmarkTexture=new THREE.Texture(),stage={dataset:{},clientWidth:470,clientHeight:378},ui={};scene.add(root);
 const $=id=>ui[id]||(ui[id]={value:'0',checked:false,textContent:'',style:{setProperty(){}},addEventListener(){},setAttribute(){}}),document={querySelector(){return{click(){}}},querySelectorAll(){return[]}};
 ${functions}
 return {build,apply,motionSetup,motionApply,root,rams,wheels,ui,stage,scene,camera,get object(){return object},get spreader(){return spreader},get load(){return load},get attachment(){return containerAttachment}};
 `)(amendWheels,amendCab,THREE,attachment,wheel,motionAt,progressForFrame,settleWindow,motionSpanVH,reviewDuration,createContainerAttachment,productionScene);
}
