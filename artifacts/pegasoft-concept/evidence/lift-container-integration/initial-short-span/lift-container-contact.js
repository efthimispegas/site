// C01 remains byte-identical. Convert its meter coordinates into the accepted
// lift's visual model coordinates with one scalar and a rigid quarter turn.
export const containerFit={length:12.192,width:2.438,height:2.896,spreaderSpan:.74,scale:.74/12.192,yaw:-Math.PI/2,roofClearance:.0006};
export function createContainerAttachment(T,productionScene,spreader){
 const {length:L,width:W,height:H,scale:s}=containerFit,source=spreader.children.filter(n=>n.isMesh),inverse=spreader.matrixWorld.clone().invert();
 const sourceBox=new T.Box3();for(const m of source){m.geometry.computeBoundingBox();sourceBox.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));}
 const center=sourceBox.getCenter(new T.Vector3()),xmin=center.x-W*s/2,xmax=center.x+W*s/2,zmin=center.z-L*s/2,zmax=center.z+L*s/2;
 // Clip actual spreader triangles against the complete roof footprint. The
 // lowest clipped surface sets roof clearance, including pieces between locks.
 const clip=(points,axis,value,greater)=>{const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],da=a[axis]-value,db=b[axis]-value,ia=greater?da>=0:da<=0,ib=greater?db>=0:db<=0;if(ia)out.push(a);if(ia!==ib)out.push(a.clone().lerp(b,da/(da-db)));}return out;};
 let underside=Infinity,roofTriangles=0;
 for(const m of source){const g=m.geometry,p=g.attributes.position,ix=g.index,matrix=inverse.clone().multiply(m.matrixWorld);for(let i=0;i<(ix?ix.count:p.count);i+=3){let polygon=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(matrix));for(const [axis,v,greater]of [['x',xmin,true],['x',xmax,false],['z',zmin,true],['z',zmax,false]]){if(!polygon.length)break;polygon=clip(polygon,axis,v,greater);}if(polygon.length){roofTriangles++;for(const p of polygon)underside=Math.min(underside,p.y);}}}
 if(!Number.isFinite(underside))throw Error('No actual spreader surface over container footprint');
 const roof=underside-containerFit.roofClearance,load=new T.Group();load.name='Approved C01 production container';load.position.set(center.x,roof-H*s,center.z);productionScene.rotation.y=containerFit.yaw;productionScene.scale.setScalar(s);load.add(productionScene);spreader.add(load);spreader.updateWorldMatrix(true,true);
 const adapter=new T.Group();adapter.name='C01 pickup lock interfaces';spreader.add(adapter);
 const carbon=new T.MeshStandardMaterial({name:'C01 lock interface carbon',color:'#11151B',metalness:.35,roughness:.61}),steel=new T.MeshStandardMaterial({name:'C01 lock pin titanium',color:'#bcc4cb',metalness:.91,roughness:.49});
 const part=(name,g,material,position)=>{const m=new T.Mesh(g,material);m.name=name;m.position.copy(position);m.userData={integrationInterface:true,construction:'closed solid',role:'pickup lock interface'};adapter.add(m);return m;};
 const ray=new T.Raycaster(),contacts=[],bottomPoints=[],pins=[];
 const containerLocal=p=>p.clone().applyAxisAngle(new T.Vector3(0,1,0),containerFit.yaw).multiplyScalar(s).add(load.position);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const id=`${sx}_${sz}`,caster=new T.Vector3(sx*(L/2-.1),H,sz*(W/2-.08)),top=containerLocal(caster),from=spreader.localToWorld(top.clone().add(new T.Vector3(0,.00001,0)));
  const up=new T.Vector3(0,1,0).transformDirection(spreader.matrixWorld);ray.set(from,up);ray.far=1;const hit=ray.intersectObjects(source,false)[0];if(!hit)throw Error('Missing actual spreader contact '+id);
  const upper=spreader.worldToLocal(hit.point.clone()),height=upper.y-top.y,plateThickness=.016*s;
  if(height<=plateThickness)throw Error('No lock interface clearance '+id);
  const plate=part('C01 pickup sole '+id,new T.BoxGeometry(.14*s,plateThickness,.19*s),carbon,top.clone().add(new T.Vector3(0,plateThickness/2,0)));
  const neck=part('C01 pickup neck '+id,new T.CylinderGeometry(.048*s,.048*s,height-plateThickness,24),carbon,top.clone().add(new T.Vector3(0,(height+plateThickness)/2,0)));
  const pin=part('C01 inserted lock pin '+id,new T.CylinderGeometry(.026*s,.026*s,.055*s,24),steel,top.clone().add(new T.Vector3(0,-.0275*s,0)));pins.push(pin);
  const rimModel=caster.clone();rimModel.x+=.077;const rim=containerLocal(rimModel),soleBottom=rim.clone();
  contacts.push({id,cornerModel:caster.toArray(),rimModel:rimModel.toArray(),roofLocal:rim.toArray(),spreaderLocal:upper.toArray(),neckHeightModel:height,nominalNeckHeightMeters:height/s,sole:plate.name,neck:neck.name,pin:pin.name});
  bottomPoints.push(containerLocal(new T.Vector3(rimModel.x,0,rimModel.z)).sub(load.position));
 }
 const profile={...containerFit,containerModelDimensions:[L,H,W],containerAxis:'long X meters -> lift Z visual coordinates; front doors face initial camera',roofLocal:roof,actualSpreaderUnderside:underside,clippedRoofTriangles:roofTriangles,contactCount:contacts.length,contacts,scaleIsUniform:true,originalContainerMeshes:0};productionScene.traverse(n=>{if(n.isMesh)profile.originalContainerMeshes++;});
 load.userData={asset:'C01-container.glb',originalUnchanged:true,uniformVisualScale:s,contacts:contacts.map(c=>c.id)};
 let support=null;const supportHeads=[];
 function bottomWorld(){return bottomPoints.map(p=>load.localToWorld(p.clone()));}
 function createSupport(scene){
  support=new T.Group();support.name='Pickup review support fixture';const feet=bottomWorld(),rubber=new T.MeshStandardMaterial({name:'pickup fixture rubber pads',color:'#17191c',roughness:.92,metalness:0});
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
