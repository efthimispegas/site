import * as T from '../../../review/vendor/three/build/three.module.js';

export const dimensions = {chassisLength:12.435,supportHeight:1.35,containerCenterX:-5.0575,kingpinX:0,tractorWheelbase:3.8,cabHeight:3.75};
export function makeTruck(lettering) {
  const root=new T.Group();root.name='T01_Pegasoft_truck';root.userData={units:'meters',axis:'X forward; Y up; Z transverse',origin:'ground below fifth wheel',staticApproval:'../static-family-approval.json'};
  const carbon=new T.MeshStandardMaterial({name:'Pegasoft_carbon_11151B',color:'#11151B',metalness:.40,roughness:.52});
  const blue=new T.MeshStandardMaterial({name:'Pegasoft_blue_147DFF',color:'#147DFF',metalness:.25,roughness:.37});
  const metal=new T.MeshStandardMaterial({name:'neutral_brushed_titanium',color:'#a7b2bd',metalness:.86,roughness:.49});
  const rubber=new T.MeshStandardMaterial({name:'natural_matte_rubber',color:'#121416',metalness:0,roughness:.92});
  const interior=new T.MeshStandardMaterial({name:'shared_cab_interior',color:'#242a30',metalness:.05,roughness:.88});
  const glass=new T.MeshPhysicalMaterial({name:'clear_cool_glass',color:'#61798b',metalness:0,roughness:.10,transmission:.78,thickness:.012,ior:1.46});
  const lamp=new T.MeshStandardMaterial({name:'clear_white_lamps',color:'#e9f4ff',metalness:.2,roughness:.28,emissive:'#b9e7ff',emissiveIntensity:.22});
  const amber=new T.MeshStandardMaterial({name:'amber_indicators',color:'#f4a923',roughness:.35});
  const red=new T.MeshStandardMaterial({name:'red_rear_lamps',color:'#a91124',roughness:.35});
  const label=new T.MeshStandardMaterial({name:'external_Pegasoft_Manrope_650',color:'#ffffff',map:lettering,transparent:true,depthWrite:false,roughness:.65});
  const roofPixels=new Uint8Array(256*4);for(let i=0;i<256;i++)roofPixels.set(i<45?[20,125,255,255]:[17,21,27,255],i*4);
  const roofPaint=new T.DataTexture(roofPixels,256,1,T.RGBAFormat);roofPaint.name='approved_roof_carbon_blue_paint';roofPaint.colorSpace=T.SRGBColorSpace;roofPaint.magFilter=T.NearestFilter;roofPaint.minFilter=T.NearestFilter;roofPaint.needsUpdate=true;
  const roofMaterial=new T.MeshStandardMaterial({name:'Pegasoft_roof_carbon_11151B_blue_147DFF',color:'#ffffff',map:roofPaint,metalness:.40,roughness:.52});
  const materials=[carbon,blue,metal,rubber,interior,glass,lamp,amber,red,label,roofMaterial];
  const tractor=new T.Group();tractor.name='tractor';root.add(tractor);
  const trailer=new T.Group();trailer.name='trailer_fifth_wheel_pivot';trailer.position.y=1.15;root.add(trailer);
  const cab=new T.Group();cab.name='approved_cab_assembly';cab.position.x=.35;tractor.add(cab);let activeParent=cab;
  const part=(name,g,m,p,parent=activeParent)=>{const n=new T.Mesh(g,m);n.name=name;n.position.fromArray(p);n.userData={construction:'closed solid primitive',role:name};parent.add(n);return n;};
  const box=(name,size,p,m=carbon,parent=activeParent)=>part(name,new T.BoxGeometry(...size),m,p,parent);
  const cylinder=(name,r,h,p,m=metal,parent=activeParent)=>part(name,new T.CylinderGeometry(r,r,h,24),m,p,parent);
  function shape(name,points,depth,z,m=carbon,parent=activeParent){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,z);return part(name,g,m,[0,0,0],parent);}
  function rod(name,a,b,r,m=metal,parent=activeParent){const d=new T.Vector3(...b).sub(new T.Vector3(...a)),n=cylinder(name,r,d.length(),new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray(),m,parent);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return n;}
  function roundedRect(x0,x1,zhalf,r){const out=[];for(const [x,z,a] of [[x1-r,zhalf-r,0],[x0+r,zhalf-r,Math.PI/2],[x0+r,-zhalf+r,Math.PI],[x1-r,-zhalf+r,Math.PI*1.5]])for(let i=0;i<=5;i++){const q=a+i*Math.PI/10;out.push([x+r*Math.cos(q),z+r*Math.sin(q)]);}return out;}
  function loft(name,sections,m=carbon){const pos=[],idx=[],N=24;for(const [y,x0,x1,w,r] of sections)for(const [x,z] of roundedRect(x0,x1,w/2,r))pos.push(x,y,z);for(let k=0;k<sections.length-1;k++)for(let i=0;i<N;i++){const a=k*N+i,b=k*N+(i+1)%N,c=b+N,d=a+N;idx.push(a,c,b,a,d,c);}for(const [row,reverse] of [[0,false],[sections.length-1,true]]){const start=pos.length/3;for(let i=0;i<N;i++)pos.push(...pos.slice((row*N+i)*3,(row*N+i)*3+3));const center=pos.length/3,points=sections[row];pos.push((points[1]+points[2])/2,points[0],0);for(let i=0;i<N;i++){const a=start+i,b=start+(i+1)%N;idx.push(...(reverse?[center,b,a]:[center,a,b]));}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));return part(name,g,m,[0,0,0]);}
  // Curved high roof and sculpted lower shell follow the accepted reference family.
  const lower=[[1.12,.75],[2.57,.75]];
  for(let i=0;i<=20;i++){const a=2.795-i*(2.795-.347)/20;lower.push([3.2+.68*Math.cos(a),.52+.68*Math.sin(a)]);}
  lower.push([4.20,.75],[4.25,1.05],[4.21,1.92],[4.13,2.09],[1.19,2.09],[1.10,1.87]);
  shape('contoured_closed_lower_cab',lower,2.38,-1.19);
  const roof=loft('rounded_high_roof',[[3.04,1.12,4.00,2.43,.18],[3.25,1.12,3.97,2.43,.18],[3.51,1.23,3.82,2.34,.22],[3.75,1.43,3.58,2.17,.25]],roofMaterial);
  const rp=roof.geometry.attributes.position,ruv=roof.geometry.attributes.uv;for(let i=0;i<rp.count;i++)ruv.setXY(i,(rp.getX(i)-1.12)/2.88,.5);
  box('cab_floor',[2.82,.12,2.16],[2.62,1.98,0],interior);
  box('rear_cab_wall',[.10,1.17,2.20],[1.20,2.47,0]);
  for(const s of [-1,1]){
    shape('blue_rear_door_pillar_'+s,[[1.10,1.02],[1.30,1.00],[1.39,2.03],[1.61,3.05],[1.33,3.30],[1.13,3.25]],.065,s===1?1.19:-1.255,blue);
    shape('front_window_pillar_'+s,[[3.79,2.06],[4.14,2.06],[3.98,3.05],[3.73,3.05]],.095,s===1?1.10:-1.195);
    shape('side_window_bottom_frame_'+s,[[1.42,2.04],[3.86,2.04],[3.85,2.16],[1.45,2.16]],.08,s===1?1.12:-1.20);
    shape('deep_side_glass_'+s,[[1.47,2.16],[3.78,2.16],[3.68,3.00],[1.64,3.00]],.012,s===1?1.133:-1.145,glass);
    box('side_window_divider_'+s,[.045,.84,.05],[2.06,2.58,s*1.155]);
    shape('sculpted_door_panel_'+s,[[1.52,1.29],[2.45,1.29],[2.51,1.47],[2.67,1.69],[3.25,1.84],[3.48,1.94],[1.48,2.035]],.025,s===1?1.185:-1.210);
    box('door_handle_recess_'+s,[.25,.07,.023],[1.87,1.79,s*1.214],rubber);box('door_handle_'+s,[.15,.023,.029],[1.87,1.785,s*1.229]);
    box('door_lower_seam_'+s,[1.25,.012,.02],[1.95,1.32,s*1.199],rubber);
    for(const [i,y] of [[0,.79],[1,1.04],[2,1.28]])box('access_step_'+s+'_'+i,[.75,.08,.25],[2.02,y,s*1.20],metal);
    box('lower_blue_fairing_'+s,[2.34,.14,.115],[1.20,.64,s*1.17],blue);
    box('fairing_inset_'+s,[2.34,.26,.085],[1.20,.87,s*1.15]);
    // Mirror brackets connect the two housings to the front window pillars.
    rod('mirror_arm_top_'+s,[3.84,2.99,s*1.14],[3.89,2.94,s*1.55],.025,carbon);
    rod('mirror_arm_bottom_'+s,[4.06,2.12,s*1.17],[4.11,2.19,s*1.53],.025,carbon);
    for(const [i,y,h] of [[0,2.78,.27],[1,2.43,.40]]){
      box('mirror_housing_'+s+'_'+i,[.18,h,.17],[3.94,y,s*1.53]);
      box('mirror_glass_'+s+'_'+i,[.018,h-.035,.125],[3.846,y,s*1.53],glass);
    }
    const f=new T.Shape();for(let i=0;i<=28;i++){const a=i*Math.PI/28;const x=3.2+.70*Math.cos(a),y=.52+.70*Math.sin(a);if(i===0)f.moveTo(x,y);else f.lineTo(x,y);}for(let i=28;i>=0;i--){const a=i*Math.PI/28;f.lineTo(3.2+.61*Math.cos(a),.52+.61*Math.sin(a));}f.closePath();const fg=new T.ExtrudeGeometry(f,{depth:.17,bevelEnabled:false});fg.translate(0,0,s===1?1.12:-1.29);part('wheel_arch_'+s,fg,carbon,[0,0,0]);
  }
  // Windshield is a real thin solid slanted pane above the dashboard.
  const wind=box('continuous_front_glass',[.012,.876,2.02],[4.045,2.58,0],glass);wind.rotation.z=.179;
  box('windshield_bottom_seal',[.08,.06,2.20],[4.142,2.14,0],rubber);
  const visor=box('blue_roof_visor',[.28,.12,2.45],[3.94,3.09,0],blue);visor.rotation.z=.08;
  box('front_label_panel',[.09,.24,1.84],[4.222,1.95,0]);
  const grille=new T.Shape();grille.moveTo(-.94,1.83);grille.lineTo(.94,1.83);grille.quadraticCurveTo(.90,1.39,.67,1.00);grille.lineTo(.54,.90);grille.lineTo(-.54,.90);grille.lineTo(-.67,1.00);grille.quadraticCurveTo(-.90,1.39,-.94,1.83);grille.closePath();
  const gg=new T.ExtrudeGeometry(grille,{depth:.045,bevelEnabled:false,curveSegments:12});gg.rotateY(Math.PI/2);part('sculpted_grille_aperture',gg,rubber,[4.247,0,0]);
  for(let i=0;i<4;i++)for(let j=0;j<20;j++)box('grille_mesh_cell_'+i+'_'+j,[.015,.010,.028],[4.297,1.1+i*.18,-.50+j*.052],carbon);

  for(let i=0;i<4;i++){
    const y=1.12+i*.19,w=1.25+i*.17;
    box('grille_rubber_inset_'+i,[.03,.13,w+.20],[4.258,y,0],rubber);
    box('brushed_grille_rib_'+i,[.042,.034,w],[4.281,y-.065,0],metal);
    for(const s of [-1,1])rod('grille_rib_return_'+i+'_'+s,[4.277,y-.065,s*w/2],[4.261,y-.025,s*(w/2+.10)],.017,metal);
  }
  box('blue_front_bumper',[.12,.14,2.43],[4.22,.75,0],blue);
  for(const s of [-1,1]){
    box('angular_headlamp_surround_'+s,[.08,.25,.39],[4.245,1.15,s*.99]);
    box('clear_headlamp_'+s,[.025,.085,.31],[4.295,1.20,s*.99],lamp);
    box('lower_running_light_'+s,[.025,.035,.29],[4.296,1.07,s*.99],lamp);
    box('front_indicator_'+s,[.029,.06,.055],[4.295,1.2,s*1.18],amber);
    rod('wiper_'+s,[4.17,2.18,s*.85],[4.159,2.23,s*.25],.012,rubber);
  }
  // Single coherent interior visible through all panes.
  for(const s of [-1,1]){
    box('seat_cushion_'+s,[.50,.14,.58],[2.06,2.16,s*.64],interior);
    const seat=box('seat_back_'+s,[.13,.62,.58],[1.79,2.48,s*.64],interior);seat.rotation.z=-.13;
    box('headrest_'+s,[.13,.18,.30],[1.74,2.90,s*.64],interior);
  }
  box('dashboard',[.52,.25,2.07],[3.61,2.16,0],interior);
  const steering=part('steering_wheel',new T.TorusGeometry(.18,.025,8,24),rubber,[3.30,2.38,-.63]);steering.rotation.y=Math.PI/2;steering.rotation.z=-.40;
  rod('steering_column',[3.29,2.34,-.63],[3.58,2.17,-.63],.025,rubber);
  box('central_console',[.54,.28,.36],[2.99,2.14,0],interior);
  // Author-created lettering applied externally, never painted into input images.
  function decal(name,size,p,axis,flip=false){const g=new T.BoxGeometry(...size),a=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<a.count;i++){const u=axis==='x'?.5+(flip?-1:1)*a.getZ(i)/size[2]:.5+(flip?-1:1)*a.getX(i)/size[0];uv.setXY(i,u,.5-a.getY(i)/size[1]);}return part(name,g,label,p);}
  decal('front_Pegasoft_wordmark',[.002,.155,.73],[4.270,1.99,0],'x',true);
  for(const s of [-1,1])decal('door_Pegasoft_wordmark_'+s,[.59,.125,.002],[2.12,1.63,s*1.217],'z',s===-1);
  activeParent=tractor;
  // Tractor chassis, dual rear tires, fifth wheel and attached kingpin.
  for(const s of [-1,1])box('tractor_rail_'+s,[5.2,.20,.12],[1.10,.82,s*.48]);
  for(const x of [-1.32,-.60,.3,1.42,2.48])box('tractor_crossmember_'+x,[.09,.14,1.05],[x,.80,0]);
  for(const s of [-1,1]){const tank=cylinder('fuel_tank_'+s,.22,1.15,[.70,.62,s*.81]);tank.rotation.z=Math.PI/2;box('rear_tractor_fender_'+s,[1.44,.09,.54],[-.25,1.125,s*.95]);}
  cylinder('fifth_wheel_pedestal',.30,.13,[0,1.015,0]);cylinder('fifth_wheel_plate',.48,.07,[0,1.115,0]);
  cylinder('attached_kingpin',.045,.20,[0,-.02,0],metal,trailer);
  const wheels=[],steeringPivots=[];
  function wheel(name,x,z,r=.52,w=.25,parent=tractor,steer=false,y=r+.0065){
    const pivot=new T.Group();pivot.name=name+'_steering';pivot.position.set(x,y,z);parent.add(pivot);if(steer)steeringPivots.push(pivot);
    const roll=new T.Group();roll.name=name+'_rotation';pivot.add(roll);roll.userData={role:'wheel rotation',radius:r};wheels.push(roll);
    const profile=[[.24,-w/2],[r-.08,-w/2],[r,-w*.28],[r,w*.28],[r-.08,w/2],[.24,w/2],[.24,-w/2]].map(([a,b])=>new T.Vector2(a,b));
    const tire=new T.LatheGeometry(profile,40);tire.rotateX(Math.PI/2);part(name+'_closed_tire',tire,rubber,[0,0,0],roll);
    const barrelProfile=[[.22,-w*.45],[.255,-w*.45],[.255,w*.45],[.22,w*.45],[.22,-w*.45]].map(([a,b])=>new T.Vector2(a,b));
    const barrel=new T.LatheGeometry(barrelProfile,32);barrel.rotateX(Math.PI/2);part(name+'_hollow_rim_barrel',barrel,metal,[0,0,0],roll);
    for(const s of [-1,1]){
      part(name+'_rim_lip_'+s,new T.TorusGeometry(.255,.025,8,32),metal,[0,0,s*w*.45],roll);
      const disc=new T.Shape();disc.absarc(0,0,.251,0,Math.PI*2,false);
      const central=new T.Path();central.absarc(0,0,.103,0,Math.PI*2,true);disc.holes.push(central);
      for(let i=0;i<10;i++){const a=i*Math.PI/5,h=new T.Path();h.absarc(.202*Math.cos(a),.202*Math.sin(a),.021,0,Math.PI*2,true);disc.holes.push(h);}
      const dg=new T.ExtrudeGeometry(disc,{depth:.020,bevelEnabled:false,curveSegments:12});part(name+'_vented_rim_face_'+s,dg,metal,[0,0,s>0?w*.43:-w*.43-.020],roll);
      const cap=cylinder(name+'_hub_'+s,.10,.03,[0,0,s*w*.48],metal,roll);cap.rotation.x=Math.PI/2;
      for(let i=0;i<6;i++){const a=i*Math.PI/3,n=cylinder(name+'_bolt_'+s+'_'+i,.014,.027,[.162*Math.cos(a),.162*Math.sin(a),s*w*.49],metal,roll);n.rotation.x=Math.PI/2;}
    }
    for(let i=0;i<32;i++)for(const j of [-1,1]){const a=i*Math.PI/16,n=box(name+'_tread_'+i+'_'+j,[.045,.012,w*.38],[r*Math.cos(a),r*Math.sin(a),j*w*.23],rubber,roll);n.rotation.z=a-Math.PI/2;}
  }
  for(const s of [-1,1]){wheel('tractor_front_'+s,3.55,s*1.095,.52,.25,tractor,true);for(const [j,z] of [[0,.76],[1,1.045]])wheel('tractor_rear_'+s+'_'+j,-.25,s*z);}
  for(const x of [3.55,-.25]){const axle=cylinder('tractor_axle_'+x,.085,2.03,[x,.5265,0]);axle.rotation.x=Math.PI/2;}
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
    for(let i=0;i<3;i++)box('trailer_fender_'+s+'_'+i,[1.10,.07,.49],[-7.2-[0,1.41,2.72][i],-.075,s*1.03],carbon,trailer);
    for(const x of [-2,-5,-8,-10.7])box('amber_chassis_marker_'+s+'_'+x,[.065,.035,.025],[x,.16,s*1.22],amber,trailer);
  }
  for(const [i,x] of [[0,-7.2],[1,-8.61],[2,-9.92]]){
    const axle=cylinder('trailer_axle_'+i,.075,2.10,[x,-.6435,0],metal,trailer);axle.rotation.x=Math.PI/2;
    for(const s of [-1,1]){wheel('trailer_'+i+'_'+s,x,s*1.055,.50,.32,trailer,false,-.6435);box('suspension_bogie_'+i+'_'+s,[.62,.14,.15],[x,-.24,s*.80],carbon,trailer);}
  }
  box('rear_underrun_bar',[.10,.09,2.40],[-11.24,-.65,0],metal,trailer);
  for(const s of [-1,1])box('rear_lamp_'+s,[.025,.085,.32],[-11.382,.045,s*.92],red,trailer);
  root.updateMatrixWorld(true);
  root.userData.supports=supports;
  return {root,tractor,cab,trailer,wheels,steeringPivots,supports,dimensions,materials,textures:[lettering,roofPaint]};
}
