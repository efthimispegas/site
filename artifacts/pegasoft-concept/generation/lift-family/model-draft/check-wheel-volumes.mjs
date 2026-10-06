import {rig,meshes,hash,here} from './check-motion.mjs';
import * as THREE from '../../../review/vendor/three/build/three.module.js';
import fs from 'node:fs';
const assert=(x,msg)=>{if(!x)throw Error(msg);};
rig.motionApply(.57);const report=[];
function topology(g){
 const p=g.attributes.position,ix=g.index,edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e7)).join(','),v=i=>new THREE.Vector3().fromBufferAttribute(p,i);let volume=0,degenerate=0;
 for(let i=0;i<(ix?.count??p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix.getX(i+k):i+k),[a,b,c]=ids.map(v);if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-22){degenerate++;continue;}volume+=a.dot(b.clone().cross(c))/6;const keys=ids.map(key);for(let k=0;k<3;k++){const edge=[keys[k],keys[(k+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}
 return {volume,degenerate,open_or_nonmanifold_edges:[...edges.values()].filter(n=>n!==2).length};
}
for(const w of rig.wheels){
 const parts=w.children.filter(m=>m.userData.wheelAmendment),tire=parts.find(m=>m.name.endsWith('closed tire')),rim=parts.find(m=>m.name.endsWith('closed rim barrel')),hubs=parts.filter(m=>m.name.includes(' · hub '));
 assert(parts.length>=40,'Missing solid wheel parts');assert(!w.children[0].visible,'Fragmented comparison input visible');
 const solids=parts.map(m=>({name:m.name,...topology(m.geometry)}));for(const s of solids)assert(s.volume>1e-12&&s.open_or_nonmanifold_edges===0&&s.degenerate===0,'Wheel core not a closed positive volume: '+JSON.stringify(s));
 assert(parts.every(m=>m.parent===w&&!m.material.map&&!m.material.alphaMap&&m.material.side===THREE.FrontSide),'Wheel uses imagery or detached part');
 assert(hubs.every(m=>m.material.name==='Wheel hub · approved shared satin carbon'&&m.material.metalness===.35&&m.material.roughness===.5),'Hub carbon recipe drift');
 w.updateWorldMatrix(true,true);const ray=(origin,dir)=>new THREE.Raycaster(w.localToWorld(origin),dir.transformDirection(w.matrixWorld),0,2).intersectObjects(parts,false).length;
 const profile=JSON.parse(rig.stage.dataset.wheelPatches).find(p=>p.name===w.children[0].name),mid=profile.axial_midpoint,half=profile.tire_width_model_units/2;let radial=0,axial=0,misses=0;
 // Across the entire barrel depth, from 360 circumferential directions.
 for(let i=0;i<360;i++){const a=i/360*Math.PI*2,c=Math.cos(a),s=Math.sin(a);for(const depth of [-.7,-.4,0,.4,.7]){radial++;if(!ray(new THREE.Vector3(c*.25,s*.25,mid+half*depth),new THREE.Vector3(-c,-s,0)))misses++;}
  // Both faces: hub, rim and sidewall. Rays must hit front-facing exterior
  // geometry, not backfaces of a paper shell.
  for(const side of [-1,1])for(const radius of [.015,.04,.058,.075,.10,.12]){axial++;if(!ray(new THREE.Vector3(c*radius,s*radius,mid+side*.3),new THREE.Vector3(0,0,-side)))misses++;}
 }
 assert(misses===0,'Wheel depth coverage missing');report.push({wheel:w.children[0].name,closed_solids:solids,radial_barrel_probes:radial,both_face_probes:axial,misses,independent_axle_children:parts.length,photographic_color_maps:0});
}
// Changing only wheel rotation must not change any non-wheel transform.
const stationary=()=>{rig.root.updateMatrixWorld(true);const out=[];rig.root.traverse(m=>{if(!m.isMesh)return;for(let p=m;p;p=p.parent)if(rig.wheels.includes(p))return;out.push(...m.matrixWorld.elements);});return out;};const base=stationary();let bodyError=0;for(let a=0;a<=360;a+=5){rig.ui['#wheel'].value=String(a);rig.apply();stationary().forEach((v,i)=>bodyError=Math.max(bodyError,Math.abs(v-base[i])));}assert(bodyError===0,'Body spins with wheels');
// Evaluate the actual rendered camera's projected marker, not just an angle
// sign. Exterior view: negative screen angle = clockwise (screen Y upward).
const screen=[];for(const p of [.04,.05,.06]){rig.motionApply(p);const w=rig.wheels.find(w=>w.children[0].name==='front_wheel_right'),center=w.localToWorld(new THREE.Vector3()),marker=w.localToWorld(new THREE.Vector3(.044,0,-.06)),A=center.project(rig.camera),B=marker.project(rig.camera);screen.push({progress:p,angle:Math.atan2(B.y-A.y,B.x-A.x),local_roll_degrees:Number(rig.ui['#wheel'].value)});}
const signedDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));const forward=screen.slice(1).map((s,i)=>signedDelta(screen[i].angle,s.angle));assert(forward.every(n=>n<0),'Forward scroll not clockwise in exterior camera');assert([...forward].reverse().map(n=>-n).every(n=>n>0),'Reverse not counterclockwise');
const direction={forward_exterior:'clockwise',reverse_exterior:'counterclockwise',forward_projected_angle_deltas_radians:forward,samples:screen,camera_note:'A rigid wheel appears to reverse from the opposite side; this is physical perspective, not an inverted wheel spin.'};
const out={date_local:'2026-10-06',status:'closed_wheel_volume_and_direction_checks_passed_user_visual_approval_pending',source_js_sha256:hash(fs.readFileSync(new URL('../../../review/lift-motion.js',here))),wheel_module_sha256:hash(fs.readFileSync(new URL('../../../review/lift-wheels.js',here))),checks:{wheels:report,body_matrix_max_displacement_over_73_angles:bodyError,scroll_direction:direction},limits:'Geometric closure, actual-camera direction and scope checks do not grant user visual acceptance. Original GLB and previous accepted rig remain immutable.'};fs.writeFileSync(new URL('../../../evidence/lift-wheel-volume-checks.json',here),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
