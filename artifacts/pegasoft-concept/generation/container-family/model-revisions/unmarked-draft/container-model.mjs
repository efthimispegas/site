import * as T from '../../../review/vendor/three/build/three.module.js';

export const dimensions={length:12.192,width:2.438,height:2.896};
export function makeContainer(){
  const {length:L,width:W,height:H}=dimensions;
  const root=new T.Group(); root.name='C01_silver_container';
  root.userData={units:'meters',axis:'Y up; X length',origin:'base center',staticReference:'C01-silver-oblique-original.png',status:'model draft awaiting approval'};
  const pixels=new Uint8Array(256*256*4), normals=new Uint8Array(pixels.length);
  let seed=7349; const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<256;y++){const row=noise();for(let x=0;x<256;x++){const i=(y*256+x)*4,v=Math.round(185+row*25+noise()*8);pixels.set([255,v,255,255],i);normals.set([128,Math.round(128+(row-.5)*28),254,255],i);}}
  const texture=data=>{const t=new T.DataTexture(data,256,256,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
  const grain=texture(pixels),normal=texture(normals);
  const silver=new T.MeshStandardMaterial({name:'cool_brushed_silver',color:'#c5cdd6',metalness:.88,roughness:.58,roughnessMap:grain,normalMap:normal,normalScale:new T.Vector2(.2,.2)});
  const hardware=new T.MeshStandardMaterial({name:'neutral_titanium_hardware',color:'#bcc4cb',metalness:.91,roughness:.49,roughnessMap:grain,normalMap:normal,normalScale:new T.Vector2(.2,.2)});
  const rubber=new T.MeshStandardMaterial({name:'door_seal_rubber',color:'#17191c',metalness:0,roughness:.92});
  const floorMat=new T.MeshStandardMaterial({name:'floor_structure',color:'#9ca8b1',metalness:.82,roughness:.62,roughnessMap:grain});
  const part=(name,g,m=silver,p=[0,0,0],parent=root)=>{const n=new T.Mesh(g,m);n.name=name;n.position.fromArray(p);n.userData={component:name,construction:'closed solid'};parent.add(n);return n;};
  const box=(name,size,p,m=silver,parent=root)=>part(name,new T.BoxGeometry(...size),m,p,parent);
  const cylinder=(name,r,h,p,m=hardware)=>part(name,new T.CylinderGeometry(r,r,h,24),m,p);
  function strip(width,depth,count,thickness,run){
    const points=[];
    for(let c=0;c<count;c++)for(const [u,v] of [[0,0],[.12,0],[.26,depth],[.74,depth],[.88,0]])points.push(new T.Vector2((c+u)*width/count,v));
    points.push(new T.Vector2(width,0));const shape=new T.Shape(points);
    for(let i=points.length-1;i>=0;i--)shape.lineTo(points[i].x,points[i].y-thickness);
    shape.closePath();return new T.ExtrudeGeometry(shape,{depth:run,bevelEnabled:false,steps:1,curveSegments:12});
  }
  // Solid folded steel strips: front and rear skins, fold ends and edge caps.
  for(const s of [-1,1]){
    const g=strip(L-.4,.035,46,.012,H-.32);g.rotateX(-Math.PI/2);
    if(s===-1)g.rotateY(Math.PI);
    part(`long_wall_${s}`,g,silver,[s===1?-L/2+.2:L/2-.2,.16,s*(W/2-.12)]);
  }
  const roof=strip(W-.24,.018,9,.012,L-.4);roof.rotateY(Math.PI/2);
  part('corrugated_roof',roof,silver,[-L/2+.2,H-.12,W/2-.12]);
  const end=strip(W-.24,.032,8,.012,H-.32);end.rotateX(-Math.PI/2);end.rotateY(Math.PI/2);
  part('closed_far_end',end,silver,[L/2-.1,.16,W/2-.12]);
  box('sealed_floor',[L-.36,.08,W-.22],[0,.13,0],floorMat);
  for(const s of [-1,1]){
    for(const y of [.09,H-.09])box(`long_rail_${s}_${y}`,[L-.4,.14,.1],[0,y,s*(W/2-.065)]);
    for(const x of [-L/2+.1,L/2-.1])box(`corner_post_${s}_${x}`,[.12,H-.32,.12],[x,H/2,s*(W/2-.06)]);
  }
  for(const x of [-L/2+.1,L/2-.1])for(const y of [.09,H-.09])box(`end_rail_${x}_${y}`,[.12,.14,W-.32],[x,y,0]);
  for(let i=0;i<24;i++)box(`floor_crossmember_${i}`,[.075,.075,W-.22],[-L/2+.3+i*(L-.6)/23,.0525,0],floorMat);
  const doorX=-L/2+.115,doorH=H-.36,doorW=(W-.27)/2,gap=.012;
  for(const s of [-1,1]){
    const z=s*(doorW/2+gap/2),lowZ=z-doorW/2;
    box(`door_seal_back_${s}`,[.025,doorH+.04,doorW+.035],[doorX+.038,.18+doorH/2,z],rubber);
    const g=strip(doorH,.026,4,.015,doorW);g.rotateZ(Math.PI/2);
    part(`closed_door_${s}`,g,silver,[doorX,.18,lowZ]);
    for(const side of [-1,1])box(`door_stile_${s}_${side}`,[.023,doorH,.037],[doorX-.028,.18+doorH/2,z+side*(doorW/2-.018)]);
    for(const y of [.2,H-.2])box(`door_horizontal_edge_${s}_${y}`,[.024,.037,doorW],[doorX-.03,y,z]);
    for(const dz of [-.255,.255]){
      const rodZ=z+dz,label=`lock_${s}_${dz}`;
      cylinder(`${label}_rod`,.0175,doorH+.015,[doorX-.065,.18+doorH/2,rodZ]);
      for(const y of [.29,.96,1.72,2.53]){
        box(`${label}_mount_${y}`,[.025,.082,.08],[doorX-.031,y,rodZ],hardware);
        const shape=new T.Shape();shape.absarc(0,0,.027,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,.018,0,Math.PI*2,true);shape.holes.push(hole);
        const ring=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,curveSegments:24});ring.rotateX(-Math.PI/2);
        part(`${label}_sleeve_${y}`,ring,hardware,[doorX-.065,y-.0275,rodZ]);
      }
      for(const y of [.195,H-.195]){box(`${label}_cam_base_${y}`,[.035,.075,.09],[doorX-.045,y,rodZ],hardware);cylinder(`${label}_cam_${y}`,.027,.055,[doorX-.066,y,rodZ]);}
      const handle=cylinder(`${label}_latched_handle`,.012,.18,[doorX-.07,.72,rodZ+.072*s]);handle.rotation.x=Math.PI/2;
      box(`${label}_latch_keeper`,[.035,.042,.063],[doorX-.065,.72,rodZ+.13*s],hardware);
    }
    for(let i=0;i<4;i++){
      const y=.38+i*(H-.76)/3,zhinge=s*(W/2-.10);
      box(`hinge_${s}_${i}_leaf`,[.034,.105,.14],[doorX-.025,y,zhinge-s*.035],hardware);
      cylinder(`hinge_${s}_${i}_pin`,.025,.15,[doorX-.043,y,zhinge]);
      for(const dy of [-.033,.033]){const bolt=cylinder(`hinge_${s}_${i}_bolt_${dy}`,.011,.01,[doorX-.045,y+dy,zhinge-s*.065]);bolt.rotation.z=Math.PI/2;}
    }
  }
  function plate(a,b,t,aperture){
    const shape=new T.Shape();shape.moveTo(-a/2,-b/2);shape.lineTo(a/2,-b/2);shape.lineTo(a/2,b/2);shape.lineTo(-a/2,b/2);shape.closePath();
    if(aperture){const hole=new T.Path();hole.absellipse(0,0,Math.min(a*.24,.048),Math.min(b*.31,.052),0,2*Math.PI,true);shape.holes.push(hole);}
    const g=new T.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false,curveSegments:24});g.translate(0,0,-t/2);return g;
  }
  const castings=[];
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const group=new T.Group();group.name=`corner_casting_${sx}_${sy}_${sz}`;group.position.set(sx*(L/2-.10),sy===1?H-.08:.08,sz*(W/2-.08));
    group.userData={component:'corner casting',construction:'six joined closed solid shell plates; intentional outward apertures',apertures:3};root.add(group);
    for(const axis of ['x','y','z'])for(const sign of [-1,1]){
      const a=axis==='x'?.16:.20,b=axis==='y'?.16:axis==='x'?.16:.16;
      const outward=sign===(axis==='x'?sx:axis==='y'?sy:sz),mesh=part(`${group.name}_${axis}_${sign}`,plate(a,b,.012,outward),hardware,[0,0,0],group);
      if(axis==='x'){mesh.rotation.y=sign*Math.PI/2;mesh.position.x=sign*(.10-.006);}
      else if(axis==='y'){mesh.rotation.x=-sign*Math.PI/2;mesh.position.y=sign*(.08-.006);}
      else{mesh.rotation.y=sign===1?0:Math.PI;mesh.position.z=sign*(.08-.006);}
    }
    castings.push(group);
  }
  root.updateMatrixWorld(true);
  // Rim witnesses are raycast against actual top/bottom casting geometry.
  const landmarks=[];const ray=new T.Raycaster();
  for(const group of castings){
    const top=group.position.y>H/2,point=group.position.clone();point.x+=.077;
    ray.set(new T.Vector3(point.x,top?H+1:-1,point.z),new T.Vector3(0,top?-1:1,0));
    const hit=ray.intersectObject(group,true)[0];if(!hit)throw new Error('Missing casting rim witness '+group.name);
    landmarks.push({id:group.name,role:top?'pickup rim':'support rim',point:hit.point.toArray(),hole_center:[group.position.x,top?H:0,group.position.z]});
  }
  root.userData.landmarks=landmarks;
  return {root,textures:[grain,normal],dimensions,landmarks,materials:[silver,hardware,rubber,floorMat]};
}
