/** Exact accepted truck hose/steering geometry; regenerate only if articulation changes. */
import * as T from '../review/vendor/three/build/three.module.js';
import {steeringAngles} from '../generation/truck-family/model-draft/truck-model.mjs';
function serviceHose(a,b) {
  const A=new T.Vector3(...a),B=new T.Vector3(...b),axis=B.clone().sub(A).normalize(),u=new T.Vector3(0,1,0).cross(axis).normalize(),v=axis.clone().cross(u),points=[];
  for(let i=0;i<=48;i++){const t=i/48,r=.024*Math.sin(Math.PI*t),angle=t*Math.PI*12;points.push(A.clone().lerp(B,t).addScaledVector(u,r*Math.cos(angle)).addScaledVector(v,r*Math.sin(angle)));}
  const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,96,.008,8,false),p=Array.from(g.attributes.position.array),n=Array.from(g.attributes.normal.array),uv=Array.from(g.attributes.uv.array),idx=Array.from(g.index.array);
  for(const [row,end] of [[0,false],[96,true]]){const center=p.length/3,P=end?B:A,N=curve.getTangent(end?1:0).multiplyScalar(end?1:-1);p.push(...P.toArray());n.push(...N.toArray());uv.push(.5,.5);for(let j=0;j<8;j++){const a=row*9+j,b=row*9+j+1;idx.push(...(end?[center,b,a]:[center,a,b]));}}
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}
const articulation=new WeakMap();
function updateServiceLines(root){const tr=root.getObjectByName('trailer_fifth_wheel_pivot');const key=tr.position.toArray().concat(tr.quaternion.toArray(),tr.scale.toArray()).join(',');if(articulation.get(root)===key)return;articulation.set(root,key);root.traverse(n=>{if(n.userData.role==='flexible service line'){const end=tr.localToWorld(new T.Vector3(...n.userData.trailerAnchor));root.worldToLocal(end);n.geometry.dispose();n.geometry=serviceHose(n.userData.tractorAnchor,end.toArray());n.userData.currentEnd=end.toArray();}});}
export function applyRig(root,degrees,yaw,roll=0) {
  const angles=steeringAngles(degrees);
  [-1,1].forEach((s,i)=>root.getObjectByName('tractor_front_'+s+'_steering').rotation.y=angles[i]);
  root.getObjectByName('trailer_fifth_wheel_pivot').rotation.y=T.MathUtils.degToRad(yaw);
  root.traverse(n=>{if(n.name.endsWith('_rotation'))n.rotation.z=T.MathUtils.degToRad(roll);});
  root.updateMatrixWorld(true);updateServiceLines(root);return angles;
}
