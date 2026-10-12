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


// Authoring dimensions derived from six unchanged 40 ft high-cube cargo bays.
// X = bow, Y = height above keel, Z = port. No journey transforms live here.
export const dimensions = {
  length:110, beam:13.4, deckHeight:6.6, container:[12.192,2.896,2.438],
  bayPitch:13.8, bayCenters:[-32.5,-18.7,-4.9,8.9,22.7,36.5],
  columnCenters:[3.807,1.269,-1.269,-3.807], cargoBase:6.92,
  hero:{bay:2,column:2,tier:1,position:[-4.9,9.816,-1.269],scale:[1,1,1]},
};
export function makeShip(){
  const root=new T.Group();root.name='S01_S02_ship';
  const materials=[],textures=[],buckets=new Map(),solids=[];
  const mat=(name,color,metalness,roughness,extra={})=>{const m=new T.MeshPhysicalMaterial({color,metalness,roughness,...extra});m.name=name;materials.push(m);return m;};
  const carbon=mat('Pegasoft_carbon_marine_paint',0x11151b,.56,.38);
  const navy=mat('Cargo_deep_navy',0x061e3b,.43,.38);
  const blue=mat('Pegasoft_blue',0x147dff,.42,.32);
  const silver=mat('Cargo_satin_silver',0xc5cdd4,.76,.43);
  const porcelain=mat('Bridge_porcelain',0xedf2f7,.25,.35);
  const metal=mat('Brushed_titanium',0xa7b2bc,.88,.3);
  const dark=mat('Recess_and_rubber',0x090d13,.1,.64);
  const orange=mat('Approved_safety_lifeboat',0xef570f,.18,.39);
  const brass=mat('Propeller_bronze',0x987331,.87,.3);
  const glass=mat('Bridge_clear_cool_glazing',0x267d99,.02,.12,{transmission:.55,thickness:.035,ior:1.47});
  const glow=mat('Navigation_lamp',0xf4f8ff,.1,.3,{emissive:0xb4d8ef,emissiveIntensity:.18});
  const edge=mat('Marine_panel_seams',0x171e27,.6,.5);
  const screen=mat('Bridge_instrument_glass',0x123047,.4,.18,{emissive:0x174264,emissiveIntensity:.25});
  // Fine physical grain normal maps, not image facades or generated lettering.
  const grain=(name,strength)=>{const n=128,data=new Uint8Array(n*n*4);let state=4189;for(let i=0;i<n*n;i++){state=(state*1664525+1013904223)>>>0;const v=((state>>>24)/255-.5)*strength;data[i*4]=128+v;data[i*4+1]=128+v*.45;data[i*4+2]=255;data[i*4+3]=255;}const t=new T.DataTexture(data,n,n);t.name=name;t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;textures.push(t);return t;};
  const paintedGrain=grain('fine_paint_grain',18),metalGrain=grain('fine_metal_grain',30);
  for(const m of [carbon,navy,blue,porcelain,orange]){m.normalMap=paintedGrain;m.normalScale.set(.16,.16);}
  for(const m of [metal,silver,brass]){m.normalMap=metalGrain;m.normalScale.set(.22,.22);}
  function put(name,g,m,position=[0,0,0],rotation=[0,0,0]){
    if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
    if(name.startsWith('foredeck')||name.startsWith('anchor_chain_link')){const a=g.attributes.position;for(let k=0;k<a.count;k++){const x=a.getX(k)+position[0];if(x>43)a.setY(k,a.getY(k)+Math.min(1.1,(x-43)/6*1.1));}}
    if(['windlass','bollard'].some(n=>name.startsWith(n))&&position[0]>43)position=[position[0],position[1]+Math.min(1.1,(position[0]-43)/6*1.1),position[2]];
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));
    solids.push({name,geometry:g,material:m.name});if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);return g;
  }
  const box=(name,size,p,m=carbon,r)=>put(name,new T.BoxGeometry(...size),m,p,r);
  const cylinder=(name,r,h,p,m=metal,rotation=[0,0,0],r2=r,segments=16)=>put(name,new T.CylinderGeometry(r2,r,h,segments),m,p,rotation);
  const sphere=(name,r,p,m=metal,scale=[1,1,1])=>{const g=new T.SphereGeometry(r,16,10);g.scale(...scale);return put(name,g,m,p);};
  const tube=(name,points,r,m=metal,segments=24)=>{
    const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,8,false),ix=Array.from(g.index.array);
    for(let j=1;j<7;j++){ix.push(0,j,j+1);const a=segments*9;ix.push(a,a+j+1,a+j);}g.setIndex(ix);g.computeVertexNormals();return put(name,g,m);
  };
  const rod=(name,a,b,r=.025,m=metal)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,v.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));return put(name,g,m,av.add(bv).multiplyScalar(.5).toArray());};
  const ring=(name,r,t,p,m=metal,rotation=[0,0,0])=>put(name,new T.TorusGeometry(r,t,8,24),m,p,rotation);
  function loft(name,sections,profile,m){
    const points=[],ix=[],n=profile.length;for(const [x,b,y] of sections)for(const [z,h] of profile){
      const hull=name.includes('hull')||name==='closed_blue_waterline_band'||name==='steel_main_deck';
      const rise=hull&&x>43?Math.min(1.1,(x-43)/6*1.1)*Math.max(0,Math.min(1,(h-5.9)/.7)):0;
      const sternRise=hull&&x<-48?(-48-x)/7*1.8*Math.max(0,(2.4-h)/2.4):0;
      const bowRake=hull&&x>48?(x-48)/7*2.7*Math.max(0,(6.6-h)/6.6):0;
      points.push(x-bowRake,h+y+rise+sternRise,z*b);
    }
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;ix.push(a,b,c,b,d,c);}
    for(const end of [0,sections.length-1]){const base=end*n;for(let j=1;j<n-1;j++)end===0?ix.push(base,base+j+1,base+j):ix.push(base,base+j,base+j+1);}
    let volume=0;for(let i=0;i<ix.length;i+=3){const a=new T.Vector3().fromArray(points,ix[i]*3),b=new T.Vector3().fromArray(points,ix[i+1]*3),c=new T.Vector3().fromArray(points,ix[i+2]*3);volume+=a.dot(b.cross(c))/6;}if(volume<0)for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap((_,i)=>i%3===0?[points[i]/12,points[i+1]/4]:[]),2));g.setIndex(ix);g.computeVertexNormals();return put(name,g,m);
  }
  const stations=[[-55,4.55,0],[-54,5.4,0],[-51,6.15,0],[-46,6.65,0],[-39,6.7,0],[39,6.7,0],[44,6.2,0],[48,4.9,0],[51,3.55,0],[53.5,1.9,0],[55,.09,0]];
  loft('closed_shaped_carbon_hull',stations,[[1,6.6],[.997,5.9],[.97,2],[.75,.5],[-.75,.5],[-.97,2],[-.997,5.9],[-1,6.6]],carbon);
  loft('closed_blue_waterline_band',stations,[[.75,.5],[.72,.12],[.29,0],[-.29,0],[-.72,.12],[-.75,.5]],blue);
  loft('steel_main_deck',stations.map(([x,b])=>[x,b*.995,0]),[[1,6.64],[1,6.6],[-1,6.6],[-1,6.64]],carbon);
  for(const side of [-1,1]){
    const bowRise=x=>x>43?Math.min(1.1,(x-43)/6*1.1):0;
    const edgePoints=stations.map(([x,b])=>[x,6.72+bowRise(x),side*b*.985]);
    for(const h of [.48,1.06])for(let i=0;i<edgePoints.length-1;i++)rod('continuous_deck_rail',edgePoints[i].map((v,k)=>v+(k===1?h:0)),edgePoints[i+1].map((v,k)=>v+(k===1?h:0)),.023);
    for(let i=0;i<stations.length-1;i++){const [a,aw]=stations[i],[b,bw]=stations[i+1],count=Math.ceil((b-a)/1.8);for(let j=0;j<count;j++){const t=j/count,x=a+(b-a)*t,z=side*(aw+(bw-aw)*t)*.985;rod('deck_rail_stanchion',[x,6.64+bowRise(x),z],[x,7.82+bowRise(x),z],.025);}}
    for(let x=-37;x<40;x+=6.8){box('hull_plate_vertical_seam',[.012,4.7,.009],[x,3.4,side*6.68],edge);}
    for(const y of [1.65,3.2,4.7])box('hull_plate_longitudinal_weld',[76,.012,.012],[0,y,side*6.68],edge);
    for(const x of [-51.5,-50.4,-49.3,-29,-2,15,29,39]){
      const z=Math.abs(x)>49?side*6.03:side*6.7;
      cylinder('recessed_hull_port',.21,.035,[x,5.1,z],dark,[Math.PI/2,0,0]);ring('port_rim',.23,.019,[x,5.1,z+side*.025],metal);
    }
    for(const x of [-5.7,26.5]){const z=side*6.71;for(const dx of [-.21,.21])rod('hull_access_ladder',[x+dx,.65,z],[x+dx,6.6,z],.024);for(let y=.85;y<6.55;y+=.32)rod('hull_access_rung',[x-.21,y,z],[x+.21,y,z],.024);}
  }
  const topOrder=[[navy,blue,silver,blue],[silver,blue,silver,navy],[navy,blue,silver,navy],[navy,silver,blue,navy],[silver,blue,silver,navy],[navy,silver,blue,silver]];
  const bottomOrder=[[silver,navy,blue,silver],[blue,navy,silver,blue],[silver,navy,blue,silver],[blue,navy,silver,blue],[navy,silver,blue,silver]];
  const cargo=[];let heroSupport;
  function container(bay,col,tier,m){
    const x=dimensions.bayCenters[bay],z=dimensions.columnCenters[col],y=dimensions.cargoBase+tier*2.896,hero=bay===2&&col===2&&tier===1;
    cargo.push({bay,column:col,tier,material:hero?'exact_C01_GLB':m.name,position:[x,y,z],dimensions:dimensions.container,hero});
    if(hero){heroSupport=[x,y,z];for(const end of [-1,1])for(const side of [-1,1])box('C01_intertier_seat',[.26,.05,.22],[x+end*5.996,y-.025,z+side*1.139],metal);return;}
    const L=12.192,H=2.896,W=2.438;
    box('cargo_closed_envelope',[L-.13,H-.13,W-.13],[x,y+H/2,z],m);
    for(const s of [-1,1]){
      for(let u=-5.91;u<=5.92;u+=.255)box('cargo_vertical_corrugation',[.08,H-.29,.074],[x+u,y+H/2,z+s*(W/2-.035)],m);
      for(const dy of [.08,H-.08])box('cargo_side_rail',[L,.14,.12],[x,y+dy,z+s*(W/2-.065)],metal);
      for(const dx of [-L/2+.08,L/2-.08])box('cargo_corner_post',[.16,H,.14],[x+dx,y+H/2,z+s*(W/2-.065)],metal);
    }
    for(let u=-5.91;u<5.92;u+=.255)box('cargo_roof_rib',[.08,.041,W-.26],[x+u,y+H-.04,z],m);
    for(const end of [-1,1]){
      for(const side of [-1,1]){
        const zz=z+side*.585;box('cargo_door',[.06,H-.28,W/2-.13],[x+end*(L/2-.04),y+H/2,zz],m);
        for(const d of [-.34,.34])rod('cargo_door_lock',[x+end*(L/2+.018),y+.19,zz+d],[x+end*(L/2+.018),y+H-.19,zz+d],.022,metal);
        for(const dy of [.55,1.52,2.46])box('cargo_door_hinge',[.08,.06,.22],[x+end*L/2,y+dy,zz+side*.48],metal);
      }
      for(const side of [-1,1])for(const dy of [.08,H-.08]){box('cargo_casting',[.17,.16,.15],[x+end*(L/2-.085),y+dy,z+side*(W/2-.075)],metal);box('cargo_casting_aperture',[.015,.055,.078],[x+end*(L/2+.008),y+dy,z+side*(W/2-.075)],dark);box('cargo_corner_warning',[.011,.07,.07],[x+end*(L/2+.02),y+dy+.035,z+side*(W/2-.075)],brass);}
    }
  }
  for(let bay=0;bay<6;bay++){
    const x=dimensions.bayCenters[bay];
    box('raised_hatch_coaming',[12.63,.2,10.4],[x,6.74,0],edge);
    for(let col=0;col<4;col++){
      const z=dimensions.columnCenters[col];box('hatch_cover_panel',[12.38,.1,2.46],[x,6.89,z],carbon);
      for(const end of [-1,1])for(const side of [-1,1])box('lower_cargo_corner_seat',[.23,.06,.22],[x+end*5.996,6.89,z+side*1.139],metal);
      if(bay===5)container(bay,col,0,topOrder[bay][col]);else for(let tier=0;tier<2;tier++)container(bay,col,tier,tier?topOrder[bay][col]:bottomOrder[bay][col]);
    }
    // Open lashing structures occupy the gap, rather than stretching the cargo.
    const lx=x+6.68;
    box('lashing_bridge_platform',[.7,.12,10.76],[lx,8.1,0],metal);
    for(const side of [-1,1]){
      for(const zz of [5.1,3.84,1.3]){box('lashing_bridge_column',[.18,1.5,.18],[lx,7.38,side*zz],carbon);rod('lashing_diagonal',[lx-.25,6.95,side*zz],[lx+.25,8.16,side*(zz-.4)],.035);}
      for(const yy of [8.6,9.2])rod('lashing_bridge_rail',[lx,yy,side*.1],[lx,yy,side*5.35],.025);
      for(let z=.3;z<5.4;z+=1.25)rod('lashing_bridge_rail_post',[lx,8.14,side*z],[lx,9.23,side*z],.025);
      for(const dx of [-.22,.22])rod('lashing_ladder',[lx+dx,6.7,side*5.37],[lx+dx,9.2,side*5.37],.025);
      for(let y=6.95;y<9.21;y+=.3)rod('lashing_ladder_rung',[lx-.22,y,side*5.37],[lx+.22,y,side*5.37],.024);
      for(let tier=0;tier<(bay===5?1:2);tier++){
        rod('cargo_lashing_tie',[lx-.2,6.96,side*5.35],[x+5.996,6.92+(tier+1)*2.896-.09,side*4.93],.027);
        cylinder('blue_tensioner',.058,.29,[lx-.16,7.17,side*5.3],blue,[0,0,-.32]);
      }
    }
  }
  // Real shell walls leave space for the bridge interior and transparent windows.
  box('bridge_front_wall',[.14,7.5,11.9],[-40.65,10.45,0],porcelain);
  box('bridge_rear_wall',[.14,7.5,9.7],[-50.5,10.45,0],porcelain);
  for(const side of [-1,1])box('bridge_side_wall',[9.8,7.5,.14],[-45.55,10.45,side*4.8],porcelain);
  for(const y of [6.78,9.2,11.6,14.15])box('bridge_internal_floor',[9.95,.13,9.8],[-45.55,y,0],porcelain);
  for(const side of [-1,1]){
    for(const y of [9.27,11.67,14.23]){
      box('stern_service_balcony',[4.75,.12,12.8],[-51.8,y,0],metal);
      for(const zz of [side*6.35]){for(const h of [.5,1.08])rod('balcony_side_rail',[-54.1,y+h,zz],[-49.4,y+h,zz],.025);for(let x=-54.1;x<-49.3;x+=1.17)rod('balcony_stanchion',[x,y,zz],[x,y+1.11,zz],.025);}
      for(const h of [.5,1.08])rod('balcony_stern_rail',[-54.1,y+h,-6.35],[-54.1,y+h,6.35],.025);
    }
    for(const x of [-53.75,-50.5])rod('balcony_structural_column',[x,6.65,side*5.8],[x,14.24,side*5.8],.09,porcelain);
    for(const y of [9.27,11.67,14.23])rod('balcony_diagonal_support',[-53.75,y-1.1,side*5.8],[-51,y,side*5.8],.048,metal);
    for(const x of [-49.2,-46,-42.5])for(const y of [8,10.4,12.8]){box('bridge_service_window',[.44,.62,.02],[x,y,side*4.884],dark);box('bridge_service_glass',[.33,.49,.025],[x,y,side*4.9],glass);}
    for(const z of [side*5.2,side*5.62])rod('bridge_service_ladder',[-49.15,7,z],[-49.15,14.1,z],.025);
    for(let y=7.15;y<14;y+=.3)rod('bridge_service_rung',[-49.15,y,side*5.2],[-49.15,y,side*5.62],.025);
  }
  for(const side of [-1,1]){
    for(const x of [-48,-44.6]){box('bridge_vent_frame',[.82,.96,.055],[x,11.16,side*4.904],metal);for(let y=10.75;y<11.6;y+=.09)box('bridge_vent_louver',[.72,.028,.052],[x,y,side*4.948],carbon,[.3*side,0,0]);}
    for(const x of [-48.6,-43.2])rod('external_bridge_pipe',[x,6.9,side*4.96],[x,14.05,side*4.96],.045,metal);
    for(const y of [7.1,9.5,11.9,13.9])for(const x of [-48.6,-43.2])box('pipe_bracket',[.18,.055,.12],[x,y,side*4.94],metal);
    for(let i=0;i<12;i++){const x=-53.4+i*.23,y=9.35+i*.2;box('stern_service_stair_tread',[.25,.055,.7],[x,y,side*5.03],metal);}
    for(const z of [side*4.65,side*5.42]){rod('stern_stair_stringer',[-53.55,9.22,z],[-50.6,11.67,z],.058,carbon);rod('stern_stair_handrail',[-53.5,10.15,z],[-50.6,12.6,z],.03,metal);}
    for(const x of [-52.2,-50.9]){box('aft_service_cabinet',[.64,1.15,.61],[x,7.25,side*3.7],carbon);box('aft_cabinet_handle',[.1,.2,.025],[x,7.25,side*4.02],metal);}
  }
  for(const x of [-52.4,-50.1])box('funnel_plate_seam',[.015,5.9,.012],[x,20.3,1.48],edge);
  const wheelPlan=[[-49.8,-5.95],[-41,-6.3],[-39.8,-5.7],[-39.8,5.7],[-41,6.3],[-49.8,5.95]];
  function polygonDeck(name,plan,y,h,m){const shape=new T.Shape();plan.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});g.rotateX(Math.PI/2); // shape (x,z) becomes (x,-height,z)
    return put(name,g,m,[0,y+h,0]);}
  polygonDeck('wheelhouse_floor',wheelPlan,14.3,.22,carbon);
  polygonDeck('wheelhouse_lower_porcelain_skirt',wheelPlan,14.5,.45,porcelain);
  polygonDeck('wheelhouse_roof',wheelPlan.map(([x,z])=>[x+(x>-41?.39:0),z*1.06]),17.05,.28,porcelain);
  for(let i=0;i<wheelPlan.length;i++){
    const a=wheelPlan[i],b=wheelPlan[(i+1)%wheelPlan.length],count=Math.max(2,Math.round(Math.hypot(a[0]-b[0],a[1]-b[1])/1.1));
    for(let j=0;j<count;j++){
      const t=j/count,u=(j+1)/count,ax=a[0]+(b[0]-a[0])*t,az=a[1]+(b[1]-a[1])*t,bx=a[0]+(b[0]-a[0])*u,bz=a[1]+(b[1]-a[1])*u;
      const length=Math.hypot(bx-ax,bz-az),yaw=-Math.atan2(bz-az,bx-ax);
      const pane=new T.BoxGeometry(length-.09,2.08,.035),pp=pane.attributes.position;for(let k=0;k<pp.count;k++)pp.setZ(k,pp.getZ(k)-(pp.getY(k)+1.04)/2.08*.32);pane.computeVertexNormals();put('solid_clear_wheelhouse_window',pane,glass,[(ax+bx)/2,16,(az+bz)/2],[0,yaw,0]);
      const nx=(bz-az)/length,nz=-(bx-ax)/length;
      rod('wheelhouse_window_mullion',[ax,14.92,az],[ax+nx*.32,17.08,az+nz*.32],.068,carbon);
      rod('wheelhouse_sill',[ax,14.93,az],[bx,14.93,bz],.058,carbon);rod('wheelhouse_header',[ax+nx*.32,17.06,az+nz*.32],[bx+nx*.32,17.06,bz+nz*.32],.085,carbon);
    }
  }
  for(const y of [9.21,11.61,13.7])box('front_bridge_plate_seam',[.012,.014,11.85],[-40.568,y,0],metal);
  for(const side of [-1,1]){
    box('bridge_forward_balcony',[1.15,.12,13.15],[-40.6,14.12,0],metal);
    for(const h of [.5,1.08])rod('forward_balcony_rail',[-39.99,14.18+h,side*.1],[-39.99,14.18+h,side*6.55],.025);
    for(let z=.3;z<6.5;z+=1.2)rod('forward_balcony_post',[-39.99,14.18,side*z],[-39.99,15.28,side*z],.025);
    for(const y of [8.1,10.5,12.8])box('forward_bridge_window',[.025,.52,.33],[-40.56,y,side*3.4],dark);
  }
  box('bridge_access_door',[.025,1.65,.72],[-40.557,7.55,-1.9],metal);box('bridge_door_window',[.03,.48,.45],[-40.53,7.94,-1.9],dark);
  // Coherent visible bridge interior: continuous consoles, screens and seats.
  for(const z of [-4,-2,0,2,4]){
    box('bridge_control_console',[.85,.65,1.45],[-41.2,15.25,z],carbon);
    box('bridge_console_screen',[.07,.39,.64],[-41.65,15.78,z],screen,[0,0,.18]);
    cylinder('bridge_seat_pedestal',.08,.66,[-42.8,15.1,z],metal);box('bridge_seat',[.5,.12,.53],[-42.8,15.51,z],dark);box('bridge_seat_back',[.12,.6,.5],[-43.04,15.85,z],dark);
    for(const side of [-1,1])rod('bridge_chair_arm',[-42.95,15.67,z+side*.31],[-42.6,15.67,z+side*.31],.026);
  }
  box('bridge_chart_table',[1.8,.12,2.3],[-47.4,15.4,0],porcelain);for(const z of [-.85,.85])rod('chart_table_leg',[-47.4,14.75,z],[-47.4,15.35,z],.06);
  for(let i=0;i<wheelPlan.length;i++){
    const a=wheelPlan[i],b=wheelPlan[(i+1)%wheelPlan.length],y=17.36;
    for(const h of [.45,1])rod('bridge_roof_rail',[a[0],y+h,a[1]],[b[0],y+h,b[1]],.024);
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5);for(let j=0;j<count;j++)rod('bridge_roof_stanchion',[a[0]+(b[0]-a[0])*j/count,y,a[1]+(b[1]-a[1])*j/count],[a[0]+(b[0]-a[0])*j/count,y+1.02,a[1]+(b[1]-a[1])*j/count],.024);
  }
  box('carbon_funnel',[3.35,6.6,3.15],[-51.05,20.28,-.1],carbon);
  box('blue_funnel_panel',[3.37,2.45,3.17],[-51.05,21.36,-.1],blue);
  box('funnel_exhaust_cap',[3.75,.18,3.5],[-51.05,23.62,-.1],carbon);
  for(let i=0;i<4;i++){
    const z=-1.2+i*.73;tube('curved_exhaust_pipe',[[-50.65,23.6,z],[-50.65,24.5,z],[-50.85,25.05,z],[-51.45,25.3,z]],.20,metal,18);
    cylinder('exhaust_dark_mouth',.17,.03,[-51.49,25.3,z],dark,[0,0,Math.PI/2]);ring('exhaust_lip',.205,.03,[-51.49,25.3,z],metal,[0,Math.PI/2,0]);
  }
  function mast(name,x,z,base,height,m=metal){
    cylinder(name+'_tapered_mast',.16,height,[x,base+height/2,z],m,[0,0,0],.055,12);
    for(const h of [height*.35,height*.65,height*.88]){
      box(name+'_platform',[1.9,.07,1.4],[x,base+h,z],metal);
      for(const side of [-1,1])for(const level of [.36,.73])rod(name+'_platform_rail',[x-.95,base+h+level,z+side*.7],[x+.95,base+h+level,z+side*.7],.015);
      for(const side of [-1,1])for(const dx of [-.95,.95])rod(name+'_rail_post',[x+dx,base+h,z+side*.7],[x+dx,base+h+.75,z+side*.7],.015);
      rod(name+'_antenna_arm',[x,base+h+.4,z-1.2],[x,base+h+.4,z+1.2],.03);
      for(const side of [-1,1]){cylinder(name+'_navigation_light',.1,.22,[x,base+h+.55,z+side*1.15],glow);rod(name+'_wire_aerial',[x,base+h,z+side*.35],[x,base+h+1.5,z+side*.35],.009);}
    }
    for(const zz of [-.25,.25])rod(name+'_ladder',[x+.25,base,z+zz],[x+.25,base+height,z+zz],.018);
    for(let y=base+.2;y<base+height;y+=.3)rod(name+'_rung',[x+.25,y,z-.25],[x+.25,y,z+.25],.016);
  }
  mast('bridge_signal',-46.7,0,17.4,10.7,carbon);
  box('radar_scanner',[.25,.15,3.3],[-46.7,26.35,0],carbon);
  for(const z of [-3.8,3.8]){rod('bridge_guyed_antenna',[-43.6,17.4,z],[-43.6,23.7,z],.048);sphere('radar_dome',.36,[-43.6,23.7,z],porcelain);for(const dz of [-.5,.5])rod('antenna_guy',[-43.6,17.4,z+dz],[-43.6,22.8,z],.01);}
  // Enclosed rescue boat and connected davits, retained from the approved master.
  sphere('enclosed_safety_lifeboat',1,[-51.9,10.45,5.18],orange,[1.52,.72,.68]);
  box('lifeboat_window_band',[1.8,.34,.07],[-51.9,10.79,5.82],dark);for(const x of [-52.5,-51.9,-51.3])box('lifeboat_glass',[.48,.22,.025],[x,10.8,5.87],glass);
  box('lifeboat_cradle',[3.3,.18,1.55],[-51.9,9.65,5.18],metal);for(const x of [-53,-50.8]){rod('lifeboat_davit',[x,9.6,4.9],[x,11.65,4.9],.09);rod('lifeboat_davit_overhang',[x,11.65,4.9],[x,11.65,5.48],.07);rod('lifeboat_attached_cable',[x,11.65,5.48],[x,10.8,5.48],.015);}
  // Bow equipment, bollards and anchor gear are supported by the foredeck.
  mast('foredeck',48.05,0,6.65,7.6,porcelain);
  for(const side of [-1,1]){
    for(const x of [45.1,49.9]){
      const z=side*(x===45.1?2.9:2.05);box('windlass_foundation',[1.8,.23,1.15],[x,6.77,z],carbon);
      for(const zz of [-.37,.37])box('windlass_bearing',[.18,.72,.16],[x,7.24,z+zz],blue);
      cylinder('windlass_drum',.38,1.03,[x,7.45,z],metal,[Math.PI/2,0,0]);for(const zz of [-.54,.54])cylinder('windlass_flange',.47,.09,[x,7.45,z+zz],metal,[Math.PI/2,0,0]);
      cylinder('windlass_motor',.26,.49,[x+.68,7.32,z],blue,[0,0,Math.PI/2]);
    }
    for(const [x,z] of [[43.7,5.1],[49.4,3.4],[52.6,1.35],[-53.4,4.3]]){
      box('bollard_foot',[.9,.12,.56],[x,6.72,side*z],metal);for(const dx of [-.25,.25]){cylinder('bollard_post',.105,.56,[x+dx,7.04,side*z],metal);cylinder('bollard_cap',.15,.07,[x+dx,7.34,side*z],metal);}
    }
    const x=51.65,z=side*3.3;
    box('anchor_hawse_recess',[.7,.45,.08],[x,4.7,z],dark,[0,side*.57,0]);ring('anchor_hawse_lip',.29,.055,[x,4.73,z+side*.07],metal,[0,side*.57,0]);
    rod('anchor_shank',[x,4.7,z+side*.2],[x-.22,3.2,z+side*.36],.11);
    rod('anchor_crown',[x-.65,3.28,z+side*.36],[x+.36,3.28,z+side*.36],.10);
    for(const sign of [-1,1])box('anchor_fluke',[.5,.15,.38],[x+sign*.37,3.38,z+side*.39],metal,[0,0,sign*.7]);
    tube('foredeck_anchor_chain_path',[[x,6.65,z],[50.1,6.83,side*2.05],[49.9,7.46,side*2.05]],.044,dark,20);
    for(let i=0;i<14;i++)ring('anchor_chain_link',.083,.025,[50.15+i*.095,6.8,side*2.1],metal,[Math.PI/2,i%2*Math.PI/2,0]);
  }
  cylinder('stern_propeller_shaft',.19,5.6,[-51.8,.32,0],metal,[0,0,Math.PI/2]);rod('propeller_shaft_strut',[-51.8,1.5,0],[-53,.32,0],.13,metal);sphere('propeller_hub',.37,[-54,.33,0],brass,[1.35,1,1]);
  for(let i=0;i<4;i++){
    const angle=i*Math.PI/2,shape=new T.Shape();shape.moveTo(.18,0);shape.bezierCurveTo(.6,-.28,1.7,-.45,1.65,.15);shape.bezierCurveTo(1.52,.67,.65,.54,.18,.12);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelThickness:.025,bevelSize:.035,bevelSegments:2});g.rotateY(Math.PI/2);g.rotateX(angle);put('swept_propeller_blade',g,brass,[-54,.33,0]);
  }
  box('stern_rudder_blade',[.36,1.95,1.15],[-54.9,.22,0],carbon);rod('rudder_stock',[-54.9,.3,0],[-54.9,2.2,0],.15);
  for(const [m,gs] of buckets){const g=mergeGeometries(gs,false);const mesh=new T.Mesh(g,m);mesh.name=m.name+'_solid_assemblies';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  root.userData={units:'meters',identity:'accepted_S01_S02',dimensions,cargo,heroAnchor:heroSupport};
  return {root,materials,textures,solids,cargo,dimensions};
}
