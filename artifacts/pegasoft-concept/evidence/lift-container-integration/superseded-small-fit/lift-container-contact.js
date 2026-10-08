// C01 remains byte-identical. Convert its meter coordinates into the accepted
// lift's visual model coordinates with one scalar and a rigid quarter turn.
export const containerFit={length:12.192,width:2.438,height:2.896,spreaderWidth:.30,scale:.30/2.438,yaw:-Math.PI/2,lockDrop:.012,extensionRailHeight:.022,extensionAnchorSpan:.296};
export function createContainerAttachment(T,productionScene,spreader,carbon){
 const {length:L,width:W,height:H,scale:s}=containerFit,source=spreader.children.filter(n=>n.isMesh),inverse=spreader.matrixWorld.clone().invert();
 const sourceBox=new T.Box3();for(const m of source){m.geometry.computeBoundingBox();sourceBox.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));}
 const center=sourceBox.getCenter(new T.Vector3()),xmin=center.x-W*s/2,xmax=center.x+W*s/2,zmin=center.z-L*s/2,zmax=center.z+L*s/2;
 // Clip actual spreader triangles against the complete roof footprint. The
 // lowest clipped surface sets roof clearance, including pieces between locks.
 const clip=(points,axis,value,greater)=>{const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],da=a[axis]-value,db=b[axis]-value,ia=greater?da>=0:da<=0,ib=greater?db>=0:db<=0;if(ia)out.push(a);if(ia!==ib)out.push(a.clone().lerp(b,da/(da-db)));}return out;};
 let underside=Infinity,roofTriangles=0;
 for(const m of source){const g=m.geometry,p=g.attributes.position,ix=g.index,matrix=inverse.clone().multiply(m.matrixWorld);for(let i=0;i<(ix?ix.count:p.count);i+=3){let polygon=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(matrix));for(const [axis,v,greater]of [['x',xmin,true],['x',xmax,false],['z',zmin,true],['z',zmax,false]]){if(!polygon.length)break;polygon=clip(polygon,axis,v,greater);}if(polygon.length){roofTriangles++;for(const p of polygon)underside=Math.min(underside,p.y);}}}
 if(!Number.isFinite(underside))throw Error('No actual spreader surface over container footprint');
 const roof=underside-containerFit.extensionRailHeight-containerFit.lockDrop,load=new T.Group();load.name='Approved C01 production container';load.position.set(center.x,roof-H*s,center.z);productionScene.rotation.y=containerFit.yaw;productionScene.scale.setScalar(s);load.add(productionScene);spreader.add(load);spreader.updateWorldMatrix(true,true);
 const adapter=new T.Group();adapter.name='C01 pickup lock interfaces';spreader.add(adapter);
 if(!carbon)throw Error('Approved shared carbon material unavailable');
 let steel,rubber;productionScene.traverse(n=>{if(n.isMesh){if(n.material.name==='neutral_titanium_hardware')steel=n.material;if(n.material.name==='door_seal_rubber')rubber=n.material;}});if(!steel||!rubber)throw Error('Approved C01 physical materials unavailable');
 const part=(name,g,material,position)=>{if(material===carbon){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,density=6/(.9408590198+.9435049891)*(12/.7);for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).add(position).add(new T.Vector3(-.7421,.327,0)),nn=new T.Vector3().fromBufferAttribute(n,i);if(Math.abs(nn.x)>Math.abs(nn.y)&&Math.abs(nn.x)>Math.abs(nn.z))uv.setXY(i,v.z*density,v.y*density);else if(Math.abs(nn.y)>Math.abs(nn.z))uv.setXY(i,v.x*density,v.z*density);else uv.setXY(i,v.x*density,v.y*density);}}const m=new T.Mesh(g,material);m.name=name;m.position.copy(position);m.userData={integrationInterface:true,construction:'closed solid',role:'pickup lock interface'};adapter.add(m);return m;};
 const ray=new T.Raycaster(),contacts=[],bottomPoints=[],pins=[];
 const containerLocal=p=>p.clone().applyAxisAngle(new T.Vector3(0,1,0),containerFit.yaw).multiplyScalar(s).add(load.position);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const id=`${sx}_${sz}`,caster=new T.Vector3(sx*(L/2-.1),H,sz*(W/2-.08)),top=containerLocal(caster),from=spreader.localToWorld(top.clone().add(new T.Vector3(0,.00001,0)));
  const up=new T.Vector3(0,1,0).transformDirection(spreader.matrixWorld),anchor=top.clone();anchor.x=center.x-sz*.088;anchor.z=center.z+sx*containerFit.extensionAnchorSpan;
  ray.set(spreader.localToWorld(anchor.clone().add(new T.Vector3(0,.00001,0))),up);ray.far=1;const anchorHit=ray.intersectObjects(source,false)[0];if(!anchorHit)throw Error('Missing original spreader extension anchor '+id);
  const anchorTop=spreader.worldToLocal(anchorHit.point.clone()),railBottom=roof+containerFit.lockDrop,railTop=railBottom+containerFit.extensionRailHeight,railStart=anchor.z-sx*.035,railEnd=top.z+sx*.015;
  const extension=part('C01 long-container extension rail '+id,new T.BoxGeometry(.036,containerFit.extensionRailHeight,Math.abs(railEnd-railStart)),carbon,new T.Vector3(top.x,(railBottom+railTop)/2,(railStart+railEnd)/2));
  const mountHeight=anchorTop.y-railTop;if(mountHeight<=0)throw Error('No solid original-head mount clearance '+id);
  part('C01 extension anchor mount '+id,new T.BoxGeometry(.032,mountHeight,.05),carbon,new T.Vector3(anchorTop.x,(anchorTop.y+railTop)/2,anchor.z));
  part('C01 extension cross tie '+id,new T.BoxGeometry(Math.abs(top.x-anchorTop.x)+.036,.015,.05),carbon,new T.Vector3((top.x+anchorTop.x)/2,railTop+.0075,anchor.z));adapter.updateWorldMatrix(true,true);
  ray.set(from,up);const hit=ray.intersectObject(extension,false)[0];if(!hit)throw Error('Missing extension pickup surface '+id);
  const upper=spreader.worldToLocal(hit.point.clone()),height=upper.y-top.y,plateThickness=.016*s;
  if(height<=plateThickness)throw Error('No lock interface clearance '+id);
  const plate=part('C01 pickup sole '+id,new T.BoxGeometry(.14*s,plateThickness,.19*s),carbon,top.clone().add(new T.Vector3(0,plateThickness/2,0)));
  const neck=part('C01 pickup neck '+id,new T.CylinderGeometry(.048*s,.048*s,height-plateThickness,24),carbon,top.clone().add(new T.Vector3(0,(height+plateThickness)/2,0)));
  const pin=part('C01 inserted lock pin '+id,new T.CylinderGeometry(.026*s,.026*s,.055*s,24),steel,top.clone().add(new T.Vector3(0,-.0275*s,0)));pins.push(pin);
  const rimModel=caster.clone();rimModel.x+=.077;const rim=containerLocal(rimModel),soleBottom=rim.clone();
  contacts.push({id,cornerModel:caster.toArray(),rimModel:rimModel.toArray(),roofLocal:rim.toArray(),spreaderLocal:upper.toArray(),originalHeadAnchor:anchorTop.toArray(),extensionRail:extension.name,neckHeightModel:height,nominalNeckHeightMeters:height/s,sole:plate.name,neck:neck.name,pin:pin.name});
  bottomPoints.push(containerLocal(new T.Vector3(rimModel.x,0,rimModel.z)).sub(load.position));
 }
 const profile={...containerFit,containerModelDimensions:[L,H,W],containerAxis:'long X meters -> lift Z visual coordinates; front doors face initial camera',roofLocal:roof,actualSpreaderUnderside:underside,clippedRoofTriangles:roofTriangles,contactCount:contacts.length,contacts,scaleIsUniform:true,originalContainerMeshes:0};productionScene.traverse(n=>{if(n.isMesh)profile.originalContainerMeshes++;});
 load.userData={asset:'C01-container.glb',originalUnchanged:true,uniformVisualScale:s,contacts:contacts.map(c=>c.id)};
 let support=null;const supportHeads=[];
 function bottomWorld(){return bottomPoints.map(p=>load.localToWorld(p.clone()));}
 function createSupport(scene){
  support=new T.Group();support.name='Pickup review support fixture';const feet=bottomWorld();
  for(const [i,p]of feet.entries()){
   if(p.y<=.12)throw Error('Support fixture cannot fit below container '+i);
   const padHeight=.09,baseHeight=p.y-padHeight;
   const base=new T.Mesh(new T.BoxGeometry(.11,baseHeight,.13),carbon);base.name='Pickup pedestal '+i;base.position.set(p.x,baseHeight/2,p.z);support.add(base);
   const pad=new T.Mesh(new T.BoxGeometry(.105,padHeight,.125),rubber);pad.name='Compliant pickup pad '+i;pad.position.set(p.x,baseHeight+padHeight/2,p.z);support.add(pad);
   supportHeads.push({pad,baseHeight,restTop:p.y,padHeight});
  }
  support.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});scene.add(support);return support;
 }
 function updateSupport(){
  if(!support)return;const feet=bottomWorld();let maxCompression=0,minClearance=Infinity;
  supportHeads.forEach(({pad,baseHeight,restTop,padHeight},i)=>{const top=Math.min(restTop,feet[i].y),height=top-baseHeight;if(height<=0)throw Error('Pickup pad compression exceeds its geometry');pad.scale.y=height/padHeight;pad.position.y=baseHeight+height/2;maxCompression=Math.max(maxCompression,restTop-top);minClearance=Math.min(minClearance,feet[i].y-top);});
  return {maxCompression,minClearance,feet:feet.map(p=>p.toArray()),padTops:supportHeads.map(h=>h.pad.position.y+h.padHeight*h.pad.scale.y/2)};
 }
 return {load,adapter,profile,contacts,bottomPoints,pins,createSupport,updateSupport,bottomWorld};
}
