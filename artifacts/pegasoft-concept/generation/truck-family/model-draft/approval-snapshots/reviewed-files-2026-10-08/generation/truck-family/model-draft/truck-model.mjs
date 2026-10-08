import * as T from '../../../review/vendor/three/build/three.module.js';

function mergeGeometries(geometries){
  const merged=new T.BufferGeometry(),indices=[];let offset=0;
  for(const key of ['position','normal','uv']){
    const count=geometries.reduce((n,g)=>n+g.attributes[key].array.length,0),data=new Float32Array(count);let start=0;
    for(const g of geometries){data.set(g.attributes[key].array,start);start+=g.attributes[key].array.length;}
    merged.setAttribute(key,new T.BufferAttribute(data,key==='uv'?2:3));
  }
  for(const g of geometries){for(const i of g.index.array)indices.push(i+offset);offset+=g.attributes.position.count;}
  merged.setIndex(indices);return merged;
}
export const dimensions = {chassisLength:12.435,supportHeight:1.35,containerCenterX:-5.0575,kingpinX:0,tractorWheelbase:3.8,cabHeight:3.75};
// Rigid level-ground articulation; Ackermann steering about the front kingpins.
export function steeringAngles(degrees) {
  const delta=T.MathUtils.degToRad(degrees);if(Math.abs(delta)<1e-8)return [0,0];
  const radius=dimensions.tractorWheelbase/Math.tan(delta);
  return [-1,1].map(s=>Math.atan(dimensions.tractorWheelbase/(radius+s*1.095)));
}
function serviceHose(a,b) {
  const A=new T.Vector3(...a),B=new T.Vector3(...b),axis=B.clone().sub(A).normalize(),u=new T.Vector3(0,1,0).cross(axis).normalize(),v=axis.clone().cross(u),points=[];
  for(let i=0;i<=48;i++){const t=i/48,r=.024*Math.sin(Math.PI*t),angle=t*Math.PI*12;points.push(A.clone().lerp(B,t).addScaledVector(u,r*Math.cos(angle)).addScaledVector(v,r*Math.sin(angle)));}
  const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,96,.008,8,false),p=Array.from(g.attributes.position.array),n=Array.from(g.attributes.normal.array),uv=Array.from(g.attributes.uv.array),idx=Array.from(g.index.array);
  for(const [row,end] of [[0,false],[96,true]]){const center=p.length/3,P=end?B:A,N=curve.getTangent(end?1:0).multiplyScalar(end?1:-1);p.push(...P.toArray());n.push(...N.toArray());uv.push(.5,.5);for(let j=0;j<8;j++){const a=row*9+j,b=row*9+j+1;idx.push(...(end?[center,b,a]:[center,a,b]));}}
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}
function updateServiceLines(root){const tr=root.getObjectByName('trailer_fifth_wheel_pivot');root.traverse(n=>{if(n.userData.role==='flexible service line'){const end=tr.localToWorld(new T.Vector3(...n.userData.trailerAnchor));root.worldToLocal(end);n.geometry.dispose();n.geometry=serviceHose(n.userData.tractorAnchor,end.toArray());n.userData.currentEnd=end.toArray();}});}
export function applyRig(root,degrees,yaw,roll=0) {
  const angles=steeringAngles(degrees);
  [-1,1].forEach((s,i)=>root.getObjectByName('tractor_front_'+s+'_steering').rotation.y=angles[i]);
  root.getObjectByName('trailer_fifth_wheel_pivot').rotation.y=T.MathUtils.degToRad(yaw);
  root.traverse(n=>{if(n.name.endsWith('_rotation'))n.rotation.z=T.MathUtils.degToRad(roll);});
  root.updateMatrixWorld(true);updateServiceLines(root);return angles;
}
export function makeTruck(lettering) {
  const root=new T.Group();root.name='T01_Pegasoft_truck';root.userData={units:'meters',axis:'X forward; Y up; Z transverse',origin:'ground below fifth wheel',staticApproval:'../static-family-approval.json'};
  // Deterministic microstructure maps alter surface response, never the base paint.
  function micro(name,kind) {
    const N=256,data=new Uint8Array(N*N*4);let seed=7391;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;const q=(seed>>>24)/255;
      let a,b,c;
      if(kind==='brush'){a=128+Math.sin(y*1.7)*8+q*3;b=128;c=254;}
      else if(kind==='tread'){const tread=y>70&&y<185,groove=tread&&([85,110,145,170].some(v=>Math.abs(y-v)<2)||Math.abs(x%16-8+(y%32-16)*.3)<1.3);a=128+(groove?10:0);b=128+(groove?8:0);c=254;}
      else {a=128+(q-.5)*12;b=128+(((seed>>>16)&255)/255-.5)*12;c=254;}
      data.set([a,b,c,255],(y*N+x)*4);
    }
    const tex=new T.DataTexture(data,N,N,T.RGBAFormat);tex.name=name;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.needsUpdate=true;return tex;
  }
  const paintNormal=micro('fine_paint_microstructure','paint'),brushNormal=micro('directional_brushed_metal','brush'),treadNormal=micro('rubber_tread_and_sipes','tread');
  const carbon=new T.MeshStandardMaterial({name:'Pegasoft_carbon_11151B',color:'#11151B',metalness:.32,roughness:.36,normalMap:paintNormal,normalScale:new T.Vector2(.055,.055)});
  const blue=new T.MeshStandardMaterial({name:'Pegasoft_blue_147DFF',color:'#147DFF',metalness:.25,roughness:.32,normalMap:paintNormal,normalScale:new T.Vector2(.055,.055)});
  const metal=new T.MeshPhysicalMaterial({name:'neutral_brushed_titanium',color:'#a7b2bd',metalness:.92,roughness:.46,normalMap:brushNormal,normalScale:new T.Vector2(.025,.025)});
  const rubber=new T.MeshStandardMaterial({name:'natural_matte_rubber',color:'#121416',metalness:0,roughness:.86,normalMap:treadNormal,normalScale:new T.Vector2(.18,.18)});
  const interior=new T.MeshStandardMaterial({name:'shared_cab_interior',color:'#242a30',metalness:.05,roughness:.88});
  const glass=new T.MeshPhysicalMaterial({name:'clear_cool_glass',color:'#879fae',metalness:0,roughness:.10,transmission:.88,thickness:.012,ior:1.46});
  const lamp=new T.MeshStandardMaterial({name:'clear_white_lamps',color:'#e9f4ff',metalness:.2,roughness:.28,emissive:'#b9e7ff',emissiveIntensity:.22});
  const amber=new T.MeshStandardMaterial({name:'amber_indicators',color:'#f4a923',roughness:.35});
  const red=new T.MeshStandardMaterial({name:'red_rear_lamps',color:'#a91124',roughness:.35});
  const label=new T.MeshStandardMaterial({name:'external_Pegasoft_Manrope_650',color:'#ffffff',map:lettering,transparent:true,depthWrite:false,roughness:.65});
  const roofPixels=new Uint8Array(256*4);for(let i=0;i<256;i++)roofPixels.set(i<45?[20,125,255,255]:[17,21,27,255],i*4);
  const roofPaint=new T.DataTexture(roofPixels,256,1,T.RGBAFormat);roofPaint.name='approved_roof_carbon_blue_paint';roofPaint.colorSpace=T.SRGBColorSpace;roofPaint.magFilter=T.NearestFilter;roofPaint.minFilter=T.NearestFilter;roofPaint.needsUpdate=true;
  const roofMaterial=new T.MeshStandardMaterial({name:'Pegasoft_roof_carbon_11151B_blue_147DFF',color:'#ffffff',map:roofPaint,metalness:.32,roughness:.36,normalMap:paintNormal,normalScale:new T.Vector2(.055,.055)});
  const bodyPixels=new Uint8Array(256*4);for(let i=0;i<256;i++)bodyPixels.set(i<26?[20,125,255,255]:[17,21,27,255],i*4);
  const bodyPaint=new T.DataTexture(bodyPixels,256,1,T.RGBAFormat);bodyPaint.name='cab_flush_carbon_blue_paint';bodyPaint.colorSpace=T.SRGBColorSpace;bodyPaint.magFilter=bodyPaint.minFilter=T.NearestFilter;bodyPaint.needsUpdate=true;
  const bodyMaterial=roofMaterial.clone();bodyMaterial.name='Pegasoft_flush_cab_carbon_blue';bodyMaterial.map=bodyPaint;
  const materials=[carbon,blue,metal,rubber,interior,glass,lamp,amber,red,label,roofMaterial,bodyMaterial];
  const tractor=new T.Group();tractor.name='tractor';root.add(tractor);
  const trailer=new T.Group();trailer.name='trailer_fifth_wheel_pivot';trailer.position.y=1.15;root.add(trailer);
  const cab=new T.Group();cab.name='approved_cab_assembly';cab.position.x=.35;tractor.add(cab);let activeParent=cab;
  const part=(name,g,m,p,parent=activeParent)=>{const n=new T.Mesh(g,m);n.name=name;n.position.fromArray(p);n.userData={construction:'closed solid primitive',role:name};parent.add(n);return n;};
  function softBox(name,size,p,m=carbon,parent=activeParent,r=.025){
    const [w,h,d]=size,edge=Math.min(r,w*.20,h*.20,d*.20),s=new T.Shape();
    s.moveTo(-w/2+edge,-h/2);s.lineTo(w/2-edge,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+edge);s.lineTo(w/2,h/2-edge);s.quadraticCurveTo(w/2,h/2,w/2-edge,h/2);s.lineTo(-w/2+edge,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-edge);s.lineTo(-w/2,-h/2+edge);s.quadraticCurveTo(-w/2,-h/2,-w/2+edge,-h/2);
    const g=new T.ExtrudeGeometry(s,{depth:d-2*edge,bevelEnabled:true,bevelSize:edge*.45,bevelThickness:edge,bevelSegments:3,curveSegments:8,steps:1});g.translate(0,0,-d/2+edge);return part(name,g,m,p,parent);
  }
  const box=(name,size,p,m=carbon,parent=activeParent)=>part(name,new T.BoxGeometry(...size),m,p,parent);
  const cylinder=(name,r,h,p,m=metal,parent=activeParent)=>part(name,new T.CylinderGeometry(r,r,h,24),m,p,parent);
  function shape(name,points,depth,z,m=carbon,parent=activeParent){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const bevel=name==='contoured_closed_lower_cab'?.075:name.includes('panel')?.012:0;const g=new T.ExtrudeGeometry(s,{depth:depth-2*bevel,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,curveSegments:16});g.translate(0,0,z+bevel);return part(name,g,m,[0,0,0],parent);}
  function rod(name,a,b,r,m=metal,parent=activeParent){const d=new T.Vector3(...b).sub(new T.Vector3(...a)),n=cylinder(name,r,d.length(),new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray(),m,parent);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return n;}
  function roundedRect(x0,x1,zhalf,r){const out=[];for(const [x,z,a] of [[x1-r,zhalf-r,0],[x0+r,zhalf-r,Math.PI/2],[x0+r,-zhalf+r,Math.PI],[x1-r,-zhalf+r,Math.PI*1.5]])for(let i=0;i<=5;i++){const q=a+i*Math.PI/10;out.push([x+r*Math.cos(q),z+r*Math.sin(q)]);}return out;}
  function loft(name,sections,m=carbon){const pos=[],idx=[],N=24;for(const [y,x0,x1,w,r] of sections)for(const [x,z] of roundedRect(x0,x1,w/2,r))pos.push(x,y,z);for(let k=0;k<sections.length-1;k++)for(let i=0;i<N;i++){const a=k*N+i,b=k*N+(i+1)%N,c=b+N,d=a+N;idx.push(a,c,b,a,d,c);}for(const [row,reverse] of [[0,false],[sections.length-1,true]]){const start=pos.length/3;for(let i=0;i<N;i++)pos.push(...pos.slice((row*N+i)*3,(row*N+i)*3+3));const center=pos.length/3,points=sections[row];pos.push((points[1]+points[2])/2,points[0],0);for(let i=0;i<N;i++){const a=start+i,b=start+(i+1)%N;idx.push(...(reverse?[center,b,a]:[center,a,b]));}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const normals=g.attributes.normal;
    for(let k=0;k<sections.length;k++)for(let i=0;i<N;i++){
      const here=new T.Vector3().fromArray(pos,(k*N+i)*3),u=new T.Vector3().fromArray(pos,(k*N+(i+1)%N)*3).sub(new T.Vector3().fromArray(pos,(k*N+(i+N-1)%N)*3)),v=new T.Vector3().fromArray(pos,(Math.min(k+1,sections.length-1)*N+i)*3).sub(new T.Vector3().fromArray(pos,(Math.max(k-1,0)*N+i)*3));
      const normal=v.cross(u).normalize(),radial=new T.Vector3(here.x-(sections[k][1]+sections[k][2])/2,0,here.z);if(normal.dot(radial)<0)normal.negate();normals.setXYZ(k*N+i,...normal.toArray());
    }
    g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));return part(name,g,m,[0,0,0]);}
  // Curved high roof and sculpted lower shell follow the accepted reference family.
  const lower=[[1.12,.75],[2.57,.75]];
  for(let i=0;i<=20;i++){const a=2.795-i*(2.795-.347)/20;lower.push([3.2+.68*Math.cos(a),.52+.68*Math.sin(a)]);}
  lower.push([4.20,.75],[4.25,1.05],[4.21,1.92],[4.13,2.09],[1.19,2.09],[1.10,1.87]);
  shape('contoured_closed_lower_cab',lower,2.38,-1.19,bodyMaterial);
  const roof=loft('rounded_high_roof',[[3.04,1.12,4.00,2.43,.24],[3.18,1.13,3.98,2.43,.24],[3.36,1.18,3.94,2.40,.25],[3.53,1.25,3.85,2.33,.26],[3.67,1.34,3.72,2.25,.28],[3.74,1.45,3.59,2.17,.29],[3.75,1.49,3.55,2.12,.29]],roofMaterial);
  const rp=roof.geometry.attributes.position,ruv=roof.geometry.attributes.uv;for(let i=0;i<rp.count;i++)ruv.setXY(i,(rp.getX(i)-1.12)/2.88,.5);
  box('cab_floor',[2.82,.12,2.16],[2.62,1.98,0],interior);
  box('rear_cab_wall',[.10,1.17,2.20],[1.20,2.47,0]);
  for(const s of [-1,1]){
    // Compact front side glazing and the opaque sleeper shell, as in T01.
    shape('sleeper_side_shell_'+s,[[1.17,2.07],[2.61,2.07],[2.50,2.39],[2.50,2.92],[2.63,3.04],[1.20,3.10]],.11,s===1?1.10:-1.21,bodyMaterial);
    shape('front_window_pillar_'+s,[[3.80,2.06],[4.14,2.06],[3.98,3.05],[3.80,3.05]],.095,s===1?1.10:-1.195);
    shape('side_window_bottom_frame_'+s,[[2.61,2.04],[3.86,2.04],[3.85,2.16],[2.66,2.16]],.08,s===1?1.12:-1.20);
    shape('deep_side_glass_'+s,[[2.64,2.18],[3.81,2.18],[3.70,3.00],[2.63,3.00],[2.58,2.90],[2.58,2.39]],.012,s===1?1.133:-1.145,glass);
    rod('window_rear_seal_'+s,[2.56,2.42,s*1.155],[2.59,2.97,s*1.155],.012,rubber);
    // Door shutlines, recessed latch and entry steps sit inside the cab envelope.
    shape('sculpted_door_panel_'+s,[[2.05,1.31],[2.47,1.31],[2.55,1.53],[2.77,1.73],[3.32,1.88],[3.50,1.96],[2.05,2.035]],.035,s===1?1.17:-1.205);
    rod('door_rear_shutline_'+s,[2.07,1.34,s*1.213],[2.07,2.06,s*1.213],.006,rubber);
    softBox('door_handle_recess_'+s,[.17,.13,.020],[2.28,1.71,s*1.214],rubber);
    softBox('door_handle_'+s,[.077,.020,.018],[2.28,1.728,s*1.230]);
    softBox('step_well_'+s,[.46,.54,.030],[2.39,1.00,s*1.211],rubber);
    for(const [i,y] of [[0,.80],[1,1.035],[2,1.265]]){
      softBox('recessed_access_step_'+s+'_'+i,[.42,.028,.10],[2.39,y,s*1.199],metal);
      for(let j=0;j<8;j++)box('step_grip_'+s+'_'+i+'_'+j,[.016,.004,.07],[2.23+j*.045,y+.016,s*1.201],rubber);
    }
    softBox('tractor_side_fairing_'+s,[2.78,.44,.16],[.89,.83,s*1.05]);
    softBox('fairing_lower_blue_trim_'+s,[2.78,.06,.17],[.89,.605,s*1.05],blue);
    rod('sleeper_horizontal_seam_'+s,[1.36,3.18,s*1.215],[3.65,3.18,s*1.215],.005,rubber);
    rod('door_upper_shutline_'+s,[2.07,2.07,s*1.212],[3.83,2.07,s*1.212],.005,rubber);
    // Mirror brackets connect the two housings to the front window pillars.
    rod('mirror_arm_top_'+s,[3.84,2.99,s*1.14],[3.89,2.94,s*1.55],.025,carbon);
    rod('mirror_arm_bottom_'+s,[4.06,2.12,s*1.17],[4.11,2.19,s*1.53],.025,carbon);
    for(const [i,y,h] of [[0,2.78,.27],[1,2.43,.40]]){
      softBox('mirror_housing_'+s+'_'+i,[.18,h,.17],[3.94,y,s*1.53]);
      softBox('mirror_glass_'+s+'_'+i,[.018,h-.035,.125],[3.846,y,s*1.53],glass);
    }
    const f=new T.Shape();for(let i=0;i<=28;i++){const a=i*Math.PI/28;const x=3.2+.70*Math.cos(a),y=.52+.70*Math.sin(a);if(i===0)f.moveTo(x,y);else f.lineTo(x,y);}for(let i=28;i>=0;i--){const a=i*Math.PI/28;f.lineTo(3.2+.61*Math.cos(a),.52+.61*Math.sin(a));}f.closePath();const fg=new T.ExtrudeGeometry(f,{depth:.17,bevelEnabled:false});fg.translate(0,0,s===1?1.12:-1.29);part('wheel_arch_'+s,fg,carbon,[0,0,0]);
  }
  // Windshield is a real thin solid slanted pane above the dashboard.
  const wind=softBox('continuous_front_glass',[.022,.876,2.10],[4.045,2.58,0],glass);wind.rotation.z=.179;
  box('windshield_bottom_seal',[.08,.045,2.20],[4.142,2.14,0],rubber);
  loft('contoured_blue_roof_visor',[[3.045,3.87,4.13,2.40,.12],[3.063,3.86,4.14,2.43,.13],[3.127,3.86,4.11,2.42,.12],[3.141,3.87,4.10,2.39,.11]],blue);
  loft('contoured_visor_lower_return',[[2.995,3.94,4.11,2.31,.075],[3.043,3.88,4.12,2.38,.080]],carbon);
  softBox('front_label_panel',[.11,.24,1.86],[4.208,1.96,0]);
  function face(name,points,x,m=carbon,depth=.025,bevel=.006){
    const sh=new T.Shape();sh.moveTo(...points[0]);for(const p of points.slice(1))sh.lineTo(...p);sh.closePath();
    const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3});g.rotateY(Math.PI/2);return part(name,g,m,[x,0,0]);
  }
  face('contoured_deep_grille',[[-.99,1.85],[.99,1.85],[.83,1.40],[.71,.87],[-.71,.87],[-.83,1.40]],4.275,rubber);
  // A continuous honeycomb insert carries real recess depth behind tapered ribs.
  const cells=[];
  for(let y=.91;y<1.85;y+=.035)for(let z=-.92;z<.93;z+=.039){
    const width=.69+(y-.91)*.24;if(Math.abs(z)>width)continue;
    const g=new T.TorusGeometry(.020,.0022,4,6);g.rotateY(Math.PI/2);g.translate(4.308,y,z+(Math.round(y/.035)%2)*.0195);cells.push(g);
  }
  part('deep_honeycomb_grille_insert',mergeGeometries(cells),carbon,[0,0,0]);cells.forEach(g=>g.dispose());
  face('sculpted_upper_grille_nose',[[-.91,2.047],[.91,2.047],[.805,1.755],[.65,1.657],[-.65,1.657],[-.805,1.755]],4.297,carbon,.023,.013);
  for(let i=0;i<5;i++){
    const y=.98+i*.168,w=1.33+i*.105;
    face('sculpted_titanium_grille_rib_'+i,[[-w/2-.10,y+.023],[-w/2+.06,y-.023],[w/2-.06,y-.023],[w/2+.10,y+.023],[w/2+.10,y+.050],[w/2-.055,y+.005],[-w/2+.055,y+.005],[-w/2-.10,y+.050]],4.323,metal,.012,.002);
  }
  for(const s of [-1,1])face('sculpted_front_cheek_'+s,[[s*.91,1.88],[s*1.10,2.03],[s*1.205,1.90],[s*1.21,.76],[s*.85,.76],[s*.86,1.31]],4.21,carbon,.057,.016);
  softBox('blue_front_bumper',[.14,.062,2.39],[4.20,.705,0],blue);
  for(const s of [-1,1]){
    const poly=(z,y,w,h)=>[[s*z-w/2,y-h/2],[s*z+w/2,y-h/2+.015],[s*z+w/2-.045,y+h/2],[s*z-w/2+.015,y+h/2-.012]];
    face('headlamp_rubber_surround_'+s,poly(1.00,1.05,.37,.24),4.265,rubber,.035,.010);
    face('headlamp_titanium_bezel_'+s,poly(1.00,1.05,.33,.194),4.314,metal,.012,.004);
    face('headlamp_clear_lens_'+s,poly(1.00,1.05,.30,.164),4.335,glass,.012,.003);
    for(const z of [.93,1.045]){
      const g=new T.TorusGeometry(.045,.009,8,24);g.rotateY(Math.PI/2);part('projector_reflector_'+s+'_'+z,g,metal,[4.341,1.07,s*z]);
      const n=cylinder('projector_lens_'+s+'_'+z,.033,.013,[4.346,1.07,s*z],lamp);n.rotation.z=Math.PI/2;
    }
    softBox('lower_running_light_'+s,[.018,.018,.28],[4.354,.994,s*.995],lamp);
    softBox('front_indicator_'+s,[.025,.136,.028],[4.355,1.05,s*1.139],amber);
    face('upper_lamp_bezel_'+s,poly(.90,1.81,.30,.115),4.288,rubber,.02,.006);
    face('upper_running_lens_'+s,poly(.90,1.82,.245,.055),4.318,lamp,.01,.003);
    face('foglamp_bezel_'+s,poly(1.00,.827,.28,.080),4.265,rubber,.028,.004);
    softBox('foglamp_lens_'+s,[.015,.036,.205],[4.307,.836,s*1.00],lamp);
    rod('wiper_arm_'+s,[4.174,2.16,s*.89],[4.171,2.205,s*.61],.009,rubber);
    rod('wiper_blade_'+s,[4.174,2.205,s*.89],[4.165,2.22,s*.17],.012,rubber);
    face('roof_lamp_surround_'+s,poly(.95,3.34,.26,.145),3.938,rubber,.027,.007);
    face('roof_marker_bezel_'+s,poly(.95,3.34,.211,.099),3.978,metal,.01,.002);
    face('roof_marker_lens_'+s,poly(.95,3.34,.178,.066),3.996,lamp,.008,.002);
  }
  cylinder('antenna_base',.035,.025,[2.9,3.77,0],rubber);rod('cab_antenna',[2.9,3.78,0],[2.85,4.01,0],.003,rubber);
  // Single coherent interior visible through all panes.
  for(const s of [-1,1]){
    softBox('seat_cushion_'+s,[.50,.14,.58],[2.06,2.16,s*.64],interior);
    const seat=softBox('seat_back_'+s,[.13,.62,.58],[1.79,2.48,s*.64],interior);seat.rotation.z=-.13;
    softBox('headrest_'+s,[.13,.18,.30],[1.74,2.90,s*.64],interior);
  }
  softBox('dashboard',[.52,.25,2.07],[3.61,2.16,0],interior);
  const steering=part('steering_wheel',new T.TorusGeometry(.18,.025,8,24),rubber,[3.30,2.38,-.63]);steering.rotation.y=Math.PI/2;steering.rotation.z=-.40;
  rod('steering_column',[3.29,2.34,-.63],[3.58,2.17,-.63],.025,rubber);
  box('central_console',[.54,.28,.36],[2.99,2.14,0],interior);
  // Author-created lettering applied externally, never painted into input images.
  function decal(name,size,p,axis,flip=false){const g=new T.BoxGeometry(...size),a=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<a.count;i++){const u=axis==='x'?.5+(flip?-1:1)*a.getZ(i)/size[2]:.5+(flip?-1:1)*a.getX(i)/size[0];uv.setXY(i,u,.5-a.getY(i)/size[1]);}return part(name,g,label,p);}
  decal('front_Pegasoft_wordmark',[.002,.155,.73],[4.340,1.99,0],'x',true);
  for(const s of [-1,1])decal('door_Pegasoft_wordmark_'+s,[.42,.090,.002],[2.63,1.89,s*1.217],'z',s===-1);
  activeParent=tractor;
  // Tractor chassis, dual rear tires, fifth wheel and attached kingpin.
  for(const s of [-1,1])box('tractor_rail_'+s,[5.2,.20,.12],[1.10,.82,s*.48]);
  for(const x of [-1.32,-.60,.3,1.42,2.48])box('tractor_crossmember_'+x,[.09,.14,1.05],[x,.80,0]);
  for(const s of [-1,1]){const tank=cylinder('fuel_tank_'+s,.22,1.15,[.70,.62,s*.81]);tank.rotation.z=Math.PI/2;archFender('rear_tractor_fender_'+s,-.25,.5265,s*.95,.56,.59,.54,tractor);}
    box('fifth_wheel_mounting_crossplate',[.97,.10,1.10],[0,.965,0]);
  for(const s of [-1,1])box('fifth_wheel_trunnion_'+s,[.30,.10,.15],[0,1.065,s*.30]);
  // Rear entry throat and closed socket, on a plate bearing directly on the skid.
  const hitch=new T.Shape();hitch.moveTo(-.49,-.25);hitch.lineTo(-.49,-.095);hitch.lineTo(-.05,-.055);hitch.quadraticCurveTo(.10,0,-.05,.055);hitch.lineTo(-.49,.095);hitch.lineTo(-.49,.25);hitch.quadraticCurveTo(-.45,.46,0,.46);hitch.quadraticCurveTo(.51,.46,.51,0);hitch.quadraticCurveTo(.51,-.46,0,-.46);hitch.quadraticCurveTo(-.45,-.46,-.49,-.25);hitch.closePath();
  const hp=new T.ExtrudeGeometry(hitch,{depth:.065,bevelEnabled:false,curveSegments:20});hp.rotateX(Math.PI/2);part('slotted_fifth_wheel_bearing_plate',hp,metal,[0,1.15,0]);
  const latch=box('fifth_wheel_lock_jaws',[.16,.045,.14],[0,1.105,0],carbon);latch.userData.role='locked socket around kingpin';
  box('trailer_bearing_skid',[.88,.024,1.06],[0,.012,0],metal,trailer);
  for(const s of [-1,1])box('kingpin_skid_frame_bracket_'+s,[.92,.102,.29],[0,.063,s*.42],carbon,trailer);
  cylinder('attached_kingpin',.0254,.155,[0,-.055,0],metal,trailer);
  function archFender(name,x,y,z,inner,outer,depth,parent){
    const sh=new T.Shape();for(let i=0;i<=48;i++){const a=i*Math.PI/48;if(i===0)sh.moveTo(x+outer*Math.cos(a),y+outer*Math.sin(a));else sh.lineTo(x+outer*Math.cos(a),y+outer*Math.sin(a));}for(let i=48;i>=0;i--){const a=i*Math.PI/48;sh.lineTo(x+inner*Math.cos(a),y+inner*Math.sin(a));}sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:false});g.translate(0,0,z-depth/2);part(name,g,carbon,[0,0,0],parent);
  }
  const wheels=[],steeringPivots=[];
  function wheel(name,x,z,r=.52,w=.25,parent=tractor,steer=false,y=r+.0065){
    const pivot=new T.Group();pivot.name=name+'_steering';pivot.position.set(x,y,z);parent.add(pivot);if(steer)steeringPivots.push(pivot);
    const roll=new T.Group();roll.name=name+'_rotation';pivot.add(roll);roll.userData={role:'wheel rotation',radius:r};wheels.push(roll);
    const R=r+.0065;
    const profile=[[.295,-w*.50],[r-.080,-w*.50],[r-.036,-w*.46],[r-.011,-w*.37],[R,-w*.26],[R,-w*.15],[R-.004,-w*.135],[R-.004,-w*.11],[R,-w*.09],[R,w*.09],[R-.004,w*.11],[R-.004,w*.135],[R,w*.15],[R,w*.26],[r-.011,w*.37],[r-.036,w*.46],[r-.080,w*.50],[.295,w*.50],[.295,-w*.50]].map(([a,b])=>new T.Vector2(a,b));
    const tire=new T.LatheGeometry(profile,64);tire.rotateX(Math.PI/2);const tireMesh=part(name+'_closed_tire',tire,rubber,[0,0,0],roll);tireMesh.userData.contactRadius=R;
    const barrelProfile=[[.28,-w*.43],[.311,-w*.43],[.311,w*.43],[.28,w*.43],[.28,-w*.43]].map(([a,b])=>new T.Vector2(a,b));
    const barrel=new T.LatheGeometry(barrelProfile,48);barrel.rotateX(Math.PI/2);part(name+'_hollow_rim_barrel',barrel,metal,[0,0,0],roll);
    for(const s of [-1,1]){
      part(name+'_rim_lip_'+s,new T.TorusGeometry(.306,.014,8,48),metal,[0,0,s*w*.43],roll);
      const disc=new T.Shape();disc.absarc(0,0,.300,0,Math.PI*2,false);
      const central=new T.Path();central.absarc(0,0,.108,0,Math.PI*2,true);disc.holes.push(central);
      for(let i=0;i<10;i++){const a=i*Math.PI/5,h=new T.Path();h.absarc(.235*Math.cos(a),.235*Math.sin(a),.029,0,Math.PI*2,true);disc.holes.push(h);}
      const dg=new T.ExtrudeGeometry(disc,{depth:.016,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:12});part(name+'_vented_rim_face_'+s,dg,metal,[0,0,s>0?w*.22:-w*.22-.016],roll);
      const cap=cylinder(name+'_hub_'+s,.107,.080,[0,0,s*w*.20],carbon,roll);cap.rotation.x=Math.PI/2;
      for(let i=0;i<10;i++){const a=i*Math.PI/5,n=cylinder(name+'_bolt_'+s+'_'+i,.011,.020,[.156*Math.cos(a),.156*Math.sin(a),s*w*.28],metal,roll);n.geometry.dispose();n.geometry=new T.CylinderGeometry(.011,.011,.020,6);n.rotation.x=Math.PI/2;}
      part(name+'_sidewall_mould_rib_'+s,new T.TorusGeometry(r-.065,.0018,4,64),rubber,[0,0,s*w*.501],roll);
    }
    const knuckle=cylinder(name+'_steering_knuckle',.064,w*.95,[0,0,0],carbon,pivot);knuckle.rotation.x=Math.PI/2;
  }
  for(const s of [-1,1]){wheel('tractor_front_'+s,3.55,s*1.095,.52,.25,tractor,true);for(const [j,z] of [[0,.76],[1,1.045]])wheel('tractor_rear_'+s+'_'+j,-.25,s*z);}
  for(const x of [3.55,-.25]){for(const s of [-1,1]){box('tractor_spring_mount_'+x+'_'+s,[.65,.08,.13],[x,.745,s*.47]);rod('tractor_suspension_link_'+x+'_'+s,[x+.27,.74,s*.47],[x,.5265,s*.47],.040,carbon);cylinder('tractor_air_spring_'+x+'_'+s,.09,.18,[x-.17,.615,s*.47],rubber);}
    const axle=cylinder('tractor_axle_'+x,.085,2.03,[x,.5265,0]);axle.rotation.x=Math.PI/2;}
  // Fixed 40 ft chassis with real I-beam sections and crossmembers.
  const cy=.09;
  for(const s of [-1,1]){
    box('trailer_Ibeam_web_'+s,[12.435,.18,.025],[-5.0575,cy,s*.79],carbon,trailer);
    for(const y of [cy-.105,cy+.105])box('trailer_Ibeam_flange_'+s+'_'+y,[12.435,.03,.18],[-5.0575,y,s*.79],carbon,trailer);
  }
  for(let i=0;i<18;i++)box('trailer_crossmember_'+i,[.08,.10,1.77],[1.08-i*12.27/17,.09,0],carbon,trailer);
  for(const x of [1.07,-11.185])box('trailer_end_bolster_'+x,[.18,.14,2.43],[x,.105,0],carbon,trailer);
  const supports=[];
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=-5.0575+sx*5.996,z=sz*1.139;
    box('corner_support_outreach_'+sx+'_'+sz,[.21,.11,.58],[x,.11,sz*.945],carbon,trailer);
    const pad=box('C01_support_pad_'+sx+'_'+sz,[.20,.055,.16],[x,.1725,z],metal,trailer);
    pad.userData={role:'C01 bottom rim seat',holeCenter:[x,1.35,z],supportPlane:1.35};
    const lock=cylinder('corner_lock_'+sx+'_'+sz,.022,.035,[x,.218,z],metal,trailer);lock.userData.role='visual twistlock pin within casting aperture';
    supports.push({id:'corner_casting_'+sx+'_-1_'+sz,holeCenter:[x,1.35,z],rimWitness:[x+.077,1.35,z],pad:pad.name});
  }
  for(const s of [-1,1]){
    box('stowed_landing_leg_'+s,[.14,.49,.14],[-1.55,-.31,s*.69],metal,trailer);
    box('landing_leg_foot_'+s,[.28,.035,.24],[-1.55,-.5725,s*.69],metal,trailer);
    box('side_guard_top_'+s,[4.72,.06,.075],[-4.00,-.39,s*1.12],metal,trailer);
    box('side_guard_bottom_'+s,[4.72,.06,.075],[-4.00,-.66,s*1.12],metal,trailer);
    for(const x of [-1.68,-4,-6.32])box('side_guard_post_'+s+'_'+x,[.06,.28,.075],[x,-.525,s*1.12],metal,trailer);
    for(let i=0;i<3;i++){const x=-7.2-[0,1.41,2.72][i];archFender('trailer_fender_'+s+'_'+i,x,-.6435,s*1.055,.55,.58,.43,trailer);box('fender_frame_bracket_'+s+'_'+i,[.10,.12,.20],[x,-.07,s*.81],carbon,trailer);}
    for(const x of [-2,-5,-8,-10.7])box('amber_chassis_marker_'+s+'_'+x,[.065,.035,.025],[x,.16,s*1.22],amber,trailer);
  }
  for(const [i,x] of [[0,-7.2],[1,-8.61],[2,-9.92]]){
    const axle=cylinder('trailer_axle_'+i,.075,2.10,[x,-.6435,0],metal,trailer);axle.rotation.x=Math.PI/2;
    for(const s of [-1,1]){wheel('trailer_'+i+'_'+s,x,s*1.055,.50,.32,trailer,false,-.6435);box('suspension_hanger_'+i+'_'+s,[.11,.28,.15],[x+.36,-.155,s*.79],carbon,trailer);
      rod('trailing_suspension_arm_'+i+'_'+s,[x+.36,-.28,s*.80],[x,-.64,s*.80],.055,carbon,trailer);
      box('air_spring_upper_pedestal_'+i+'_'+s,[.30,.21,.26],[x-.13,-.12,s*.80],carbon,trailer);
      cylinder('air_spring_'+i+'_'+s,.11,.26,[x-.13,-.355,s*.80],rubber,trailer);
      box('air_spring_lower_seat_'+i+'_'+s,[.32,.045,.27],[x-.13,-.5075,s*.80],metal,trailer);
      rod('air_spring_axle_bridge_'+i+'_'+s,[x-.13,-.50,s*.80],[x,-.64,s*.80],.040,carbon,trailer);
      rod('damper_'+i+'_'+s,[x+.22,-.12,s*.70],[x-.12,-.63,s*.70],.025,metal,trailer);}
  }
  box('rear_underrun_bar',[.10,.09,2.40],[-11.24,-.65,0],metal,trailer);
  for(const s of [-1,1])box('rear_lamp_'+s,[.025,.085,.32],[-11.382,.045,s*.92],red,trailer);
  box('tractor_service_socket_block',[.045,.13,.53],[1.45,1.73,0],carbon,tractor);
  box('trailer_service_socket_block',[.050,.12,.53],[1.145,.205,0],carbon,trailer);
  root.updateMatrixWorld(true);
  for(const z of [-.16,0,.16]){
    const a=[1.435,1.73,z],b=[1.163,.205,z],end=trailer.localToWorld(new T.Vector3(...b)).toArray();
    const line=part('flexible_service_line_'+z,serviceHose(a,end),rubber,[0,0,0],root);line.userData={role:'flexible service line',tractorAnchor:a,trailerAnchor:b,currentEnd:end};
  }
  root.traverse(n=>{if(n.isMesh&&n.material===bodyMaterial){const pos=n.geometry.attributes.position,uv=n.geometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-1.10)/3.3,.5);}});
  root.updateMatrixWorld(true);
  root.userData.supports=supports;
  return {root,tractor,cab,trailer,wheels,steeringPivots,supports,dimensions,materials,textures:[lettering,roofPaint,bodyPaint,paintNormal,brushNormal,treadNormal]};
}
