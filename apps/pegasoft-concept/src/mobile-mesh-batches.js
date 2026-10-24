import * as T from '../review/vendor/three/build/three.module.js';
import {mergeGeometries} from '../review/vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

/** Join static siblings only. Articulation parents, materials and original meshes remain owned. */
export function createMobileMeshBatches(roots){
 const batches=[],seen=new Set();
 for(const root of roots){
  const parents=[];root.traverse(parent=>{if(parent.children.some(n=>n.isMesh))parents.push(parent);});
  for(const parent of parents){
   if(seen.has(parent))continue;seen.add(parent);
   const buckets=new Map();
   for(const node of parent.children){
    if(!node.isMesh||node.isSkinnedMesh||node.isInstancedMesh||node.children.length||!node.visible||Array.isArray(node.material)||node.material.transparent||node.morphTargetInfluences||/hose|hydraulic|piston|boom|spreader|grabber|cylinder|steer/i.test(node.name))continue;
    const g=node.geometry;if(Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.usage===T.DynamicDrawUsage)||Object.keys(g.morphAttributes).length)continue;
    const signature=Object.entries(g.attributes).map(([k,a])=>`${k}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
    const key=[node.material.uuid,!!g.index,node.castShadow,node.receiveShadow,node.renderOrder,signature].join(':');
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);
   }
   for(const originals of buckets.values()){
    if(originals.length<2)continue;
    const parts=originals.map(node=>{node.updateMatrix();return node.geometry.clone().applyMatrix4(node.matrix);});
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;
    const sample=originals[0],mesh=new T.Mesh(geometry,sample.material);mesh.name='mobile_static_siblings';mesh.castShadow=sample.castShadow;mesh.receiveShadow=sample.receiveShadow;mesh.renderOrder=sample.renderOrder;mesh.visible=false;parent.add(mesh);batches.push({mesh,originals});
   }
  }
 }
 let active=false;
 return {setActive(value){if(value===active)return;active=value;for(const {mesh,originals}of batches){mesh.visible=value;for(const node of originals)node.visible=!value;}},get count(){return batches.length;},dispose(){for(const {mesh,originals}of batches){for(const node of originals)node.visible=true;mesh.removeFromParent();mesh.geometry.dispose();}}};
}
