// C01 remains byte-identical. Convert its meter coordinates into the accepted
// lift's visual model coordinates with one scalar and a rigid quarter turn.
export const containerFit={length:12.192,width:2.438,height:2.896,scale:.225,yaw:-Math.PI/2,scaleBasis:{reference:'source-sequence/y-070.png at 960×540',containerEndHeightPixels:126,frontTireDiameterPixelsApprox:51,approvedFrontTireDiameterModel:.264,targetHeightToTire:126/51,appliedHeightToTire:2.896*.225/.264,limit:'Raster silhouette ratio; retained lift has no certified SI dimensions.'}};
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
 // Preserve the approved head exactly. The 40ft casting span cannot be
 // bridged at this size. Seat the head at the actual corrugated-roof crest;
 // this is a visual coupling review, not a qualified four-corner lock.
 let roofMesh;productionScene.traverse(n=>{if(n.isMesh&&n.name==='corrugated_roof')roofMesh=n;});
 if(!roofMesh)throw Error('Approved C01 roof unavailable');
 productionScene.rotation.y=containerFit.yaw;productionScene.scale.setScalar(s);productionScene.updateWorldMatrix(true,true);
 roofMesh.geometry.computeBoundingBox();
 const roofBox=roofMesh.geometry.boundingBox.clone().applyMatrix4(roofMesh.matrixWorld),roofCrest=roofBox.max.y;
 const load=new T.Group();load.name='Approved C01 production container';load.position.set(center.x,underside-roofCrest,center.z);load.add(productionScene);spreader.add(load);spreader.updateWorldMatrix(true,true);
 const adapter=new T.Group();adapter.name='No added grabber reach geometry';spreader.add(adapter);
 const stackCorners=[],bottomPoints=[],pins=[],contacts=[];
 const containerLocal=p=>p.clone().applyAxisAngle(new T.Vector3(0,1,0),containerFit.yaw).multiplyScalar(s).add(load.position);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const caster=new T.Vector3(sx*(L/2-.1),H,sz*(W/2-.08)),rim=caster.clone();rim.x+=.077;
  stackCorners.push({id:`${sx}_${sz}`,cornerModel:caster.toArray(),rimModel:rim.toArray()});
  bottomPoints.push(containerLocal(new T.Vector3(rim.x,0,rim.z)).sub(load.position));
 }
 // The roof is extruded along C01 length. Across its width the actual
 // folded surface is piecewise linear. Clip head triangles at those crease
 // planes and solve their exact minimum vertical separation, without pads.
 const rp=roofMesh.geometry.attributes.position,levels=new Map();
 for(let i=0;i<rp.count;i++){
  const p=spreader.worldToLocal(roofMesh.localToWorld(new T.Vector3().fromBufferAttribute(rp,i))),x=Number(p.x.toFixed(9));
  levels.set(x,Math.max(levels.get(x)??-Infinity,p.y));
 }
 const creases=[...levels].sort((a,b)=>a[0]-b[0]);let minimum=Infinity,witness=null;
 for(const m of source){const g=m.geometry,p=g.attributes.position,ix=g.index,matrix=inverse.clone().multiply(m.matrixWorld);
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
   const triangle=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(matrix)),txmin=Math.min(...triangle.map(p=>p.x)),txmax=Math.max(...triangle.map(p=>p.x));
   for(let j=0;j<creases.length-1;j++){
    const [x0,y0]=creases[j],[x1,y1]=creases[j+1];if(x1<txmin||x0>txmax||x1===x0)continue;
    let polygon=clip(triangle,'x',x0,true);if(!polygon.length)continue;polygon=clip(polygon,'x',x1,false);
    for(const p of polygon){const roofY=y0+(y1-y0)*(p.x-x0)/(x1-x0),gap=p.y-roofY;
     if(gap<minimum){minimum=gap;witness={headLocal:p.toArray(),roofLocal:[p.x,roofY,p.z],gap};}
    }
   }
  }
 }
 if(!witness||minimum<-.000001)throw Error('Invalid exact roof/head seating solution');
 load.position.y+=minimum;witness.roofLocal[1]+=minimum;witness.gap=0;spreader.updateWorldMatrix(true,true);

 const profile={...containerFit,containerModelDimensions:[L,H,W],containerAxis:'long X meters -> lift Z visual coordinates; front doors face initial camera',roofLocal:load.position.y+H*s,actualSpreaderUnderside:underside,clippedRoofTriangles:roofTriangles,contactCount:0,contacts:[],stackCorners,roofWitness:witness,roofSeatLift:minimum,roofSeatMethod:'Head triangles clipped against actual folded roof crease planes; minimum vertical separation solved with no added hardware.',grabber:{source:'approved lift GLB; identical head geometry and transforms',localBounds:{min:sourceBox.min.toArray(),max:sourceBox.max.toArray(),size:sourceBox.getSize(new T.Vector3()).toArray()},addedReachMeshes:0,scaleDuringMotion:[1,1,1],schema:'Retained closed frame, central yoke/rotator, original braces and feet.',cornerLockStatus:'unresolved: fixed approved head does not span the 40ft C01 corner castings',coupling:'Central roof seating and rigid visual parenting only; no four-corner mechanical-lock claim.'},scaleIsUniform:true,originalContainerMeshes:0};productionScene.traverse(n=>{if(n.isMesh)profile.originalContainerMeshes++;});
 load.userData={asset:'C01-container.glb',originalUnchanged:true,uniformVisualScale:s,coupling:'visual central roof seating; corner locks unresolved'};
 let support=null,lowerScene=null,rearScene=null,stackTop=0;
 function bottomWorld(){return bottomPoints.map(p=>load.localToWorld(p.clone()));}
 function createSupport(scene,{addBehind=false}={}){
  support=new T.Group();support.name='Stationary lower C01 container';productionScene.updateWorldMatrix(true,true);lowerScene=productionScene.clone(true);productionScene.matrixWorld.decompose(lowerScene.position,lowerScene.quaternion,lowerScene.scale);lowerScene.position.y-=H*lowerScene.scale.y;lowerScene.name='Approved C01 lower stack context';stackTop=H*lowerScene.scale.y;support.add(lowerScene);
  if(addBehind){
   rearScene=lowerScene.clone(true);
   const neighbourAxis=new T.Vector3(0,0,1).applyQuaternion(lowerScene.quaternion);
   if(neighbourAxis.x<0)neighbourAxis.negate();
   rearScene.position.addScaledVector(neighbourAxis,(W+.65)*lowerScene.scale.z);
   rearScene.name='Stationary rear Pegasoft C01';support.add(rearScene);
  }
  support.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});scene.add(support);return support;
 }
 function updateSupport(){
  if(!support)return;const feet=bottomWorld();return {stackTop,minClearance:Math.min(...feet.map(p=>p.y-stackTop)),feet:feet.map(p=>p.toArray()),lowerBaseY:lowerScene.position.y,lowerStatic:true};
 }
 return {load,adapter,profile,contacts,stackCorners,roofSource:roofMesh,headSource:source,bottomPoints,pins,createSupport,updateSupport,bottomWorld,get lowerScene(){return lowerScene;},get rearScene(){return rearScene;},get support(){return support;}};
}
