import * as T from '../review/vendor/three/build/three.module.js';

/** Register the outgoing road surface to the hull rim at the shared wipe plane.
 * Cargo, ship geometry and camera transforms remain owned by their controllers.
 */
export function createRoadDeckRegistration({road,ship,truck,camera,scale}){
  let hull;ship.traverse(n=>{if(n.isMesh&&n.material.name==='Pegasoft_carbon_marine_paint')hull=n;});
  if(!hull)throw Error('Ship hull rim unavailable for transition registration');
  // The accepted GLB merges solids by material. Locate the actual exported
  // rim vertices using its unchanged authoring stations (ship-model.mjs).
  const profile=[[-55,4.55],[-54,5.4],[-51,6.15],[-46,6.65],[-39,6.7],[39,6.7],[44,6.2],[48,4.9],[51,3.55],[53.5,1.9],[55,.09]];
  const positions=hull.geometry.attributes.position;
  const sorted=profile.map(([x,width])=>{
    const height=6.6+(x>43?Math.min(1.1,(x-43)/6*1.1):0),row={};
    for(let i=0;i<positions.count;i++){
      const p=new T.Vector3().fromBufferAttribute(positions,i);
      if(Math.abs(p.x-x)<1e-4&&Math.abs(p.y-height)<1e-4&&Math.abs(Math.abs(p.z)-width)<1e-4)row[p.z<0?'left':'right']=p;
    }
    if(!row.left||!row.right)throw Error('Exported hull station differs at '+x);
    return row;
  });
  road.matrixAutoUpdate=false;
  function rimIntersection(side,planeNormal,score){
    for(let i=1;i<sorted.length;i++){
      const a=hull.localToWorld(sorted[i-1][side].clone()),b=hull.localToWorld(sorted[i][side].clone());
      const da=planeNormal.dot(a)-score,db=planeNormal.dot(b)-score;
      if(da*db<=0&&Math.abs(da-db)>1e-9)return {point:a.lerp(b,da/(da-db)),parallel:i===5};
    }
  }
  function apply(trace,weight=1){
    road.matrix.identity();road.updateMatrixWorld(true);
    const up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    const view=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const planeNormal=up.clone().addScaledVector(view,-trace.cutNDC*Math.tan(T.MathUtils.degToRad(camera.fov)/2)).normalize();
    const score=planeNormal.dot(camera.position);
    const roadPlane=road.children.find(n=>n.isMesh).material.clippingPlanes[0];
    roadPlane.set(planeNormal,-score);
    hull.material.clippingPlanes[0].set(planeNormal.clone().negate(),score);
    const actualRims=['left','right'].map(side=>rimIntersection(side,planeNormal,score));
    // Register the parallel main-body beam, not the pointed bow/stern. Extend
    // these actual rim segments through the lead-in so the road cannot snap
    // or collapse as a curved end enters a taller viewport's wipe.
    const rims=['left','right'].map(side=>{
      const a=hull.localToWorld(sorted[4][side].clone()),b=hull.localToWorld(sorted[5][side].clone());
      return a.addScaledVector(b.sub(a),(score-planeNormal.dot(a))/planeNormal.dot(b));
    });
    const normal=new T.Vector3(0,0,1).applyQuaternion(truck.quaternion).setY(0).normalize();
    const forward=new T.Vector3(1,0,0).applyQuaternion(truck.quaternion).setY(0).normalize();
    const origin=truck.position.clone().addScaledVector(forward,-.25*scale).setY(.010);
    const oldEdges=[-1,1].map(side=>{
      const p=origin.clone().addScaledVector(normal,side*7*scale);
      return p.addScaledVector(forward,(score-planeNormal.dot(p))/planeNormal.dot(forward));
    });
    const targets=rims.map(p=>{
      const screen=p.clone().project(camera),ray=new T.Vector3(screen.x,trace.cutNDC,0).unproject(camera).sub(camera.position);
      return camera.position.clone().addScaledVector(ray,(.010-camera.position.y)/ray.y);
    });
    const old=oldEdges.map(p=>normal.dot(p)).sort((a,b)=>a-b),desired=targets.map(p=>normal.dot(p)).sort((a,b)=>a-b);
    const width=(desired[1]-desired[0])/(old[1]-old[0]),offset=(desired[0]+desired[1])/2-width*(old[0]+old[1])/2;
    const factor=1+(width-1)*weight,shift=offset*weight,n=normal,k=factor-1;
    road.matrix.set(1+k*n.x*n.x,0,k*n.x*n.z,shift*n.x,0,1,0,0,k*n.x*n.z,0,1+k*n.z*n.z,shift*n.z,0,0,0,1);
    road.updateMatrixWorld(true);
    const projected=oldEdges.map(p=>p.applyMatrix4(road.matrix).project(camera).x).sort((a,b)=>a-b);
    const hullEdges=rims.map(p=>p.clone().project(camera).x).sort((a,b)=>a-b);
    return {active:true,rimRegion:actualRims.every(r=>r?.parallel)?'parallel_body':actualRims.every(Boolean)?'curved_end':'outside_hull',weight,widthScale:factor,offset:shift,roadEdgesNDC:projected,hullEdgesNDC:hullEdges,maxErrorNDC:Math.max(...projected.map((x,i)=>Math.abs(x-hullEdges[i])))};
  }
  return {apply,reset(){road.matrix.identity();road.updateMatrixWorld(true);}};
}
