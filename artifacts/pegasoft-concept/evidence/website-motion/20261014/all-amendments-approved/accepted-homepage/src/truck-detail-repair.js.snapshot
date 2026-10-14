import * as T from '../review/vendor/three/build/three.module.js';

/** Scoped repairs to the approved T01 instance; source GLB stays unchanged. */
export function repairTruckDetails(truck){
  const model=truck.getObjectByName('T01_Pegasoft_truck');
  if(model.userData.detailRepair)return model.userData.detailRepair;
  const tractor=model.getObjectByName('tractor'),trailer=model.getObjectByName('trailer_fifth_wheel_pivot');
  const carbon=model.getObjectByName('tractor_rail_1').material;
  const bounds=(node,frame)=>{
    node.updateWorldMatrix(true,false);frame.updateWorldMatrix(true,false);node.geometry.computeBoundingBox();
    return node.geometry.boundingBox.clone().applyMatrix4(frame.matrixWorld.clone().invert().multiply(node.matrixWorld));
  };
  const fairings=[];
  for(const side of [-1,1]){
    const clearance=bounds(model.getObjectByName('rear_tractor_fender_'+side),tractor).max.x+.035;
    for(const prefix of ['tractor_side_fairing_','fairing_lower_blue_trim_']){
      const panel=model.getObjectByName(prefix+side),before=bounds(panel,tractor),cut=Math.max(0,clearance-before.min.x);
      // Keep the forward edge, original material and bevel geometry. Retire
      // only the rear overlap that was rendering outside the wheel rim.
      panel.scale.x*=(before.max.x-clearance)/(before.max.x-before.min.x);panel.position.x+=cut/2;
      const after=bounds(panel,tractor);fairings.push({name:panel.name,rearEdge:after.min.x,wheelClearance:after.min.x-clearance+.035});
    }
  }
  let brakeDrums=0;
  model.traverse(n=>{if(/^tractor_rear_.*_rotation$/.test(n.name)){
    const drum=new T.Mesh(new T.CylinderGeometry(.275,.275,.080,48),carbon);
    drum.name=n.name+'_closed_brake_drum';drum.rotation.x=Math.PI/2;drum.userData.role='opaque brake drum behind original vented rim';n.add(drum);brakeDrums++;
  }});
  const mounts=[];
  function box(name,size,position){const mesh=new T.Mesh(new T.BoxGeometry(...size),carbon);mesh.name=name;mesh.position.fromArray(position);mesh.userData.role='guard-to-chassis mounting bracket';trailer.add(mesh);mounts.push(name);}
  for(const side of [-1,1]){
    // Positive overlap with the original rear bar and end bolster/I-beam.
    box('rear_underrun_mount_'+side,[.10,.79,.12],[-11.24,-.285,side*.79]);
    box('rear_underrun_mount_plate_'+side,[.18,.065,.22],[-11.24,.08,side*.79]);
    for(const x of [-1.68,-4,-6.32]){
      box('side_guard_chassis_hanger_'+side+'_'+x,[.06,.40,.075],[x,-.205,side*1.12]);
      box('side_guard_rail_outreach_'+side+'_'+x,[.08,.08,.44],[x,-.025,side*.955]);
    }
  }
  model.updateMatrixWorld(true);model.traverse(n=>{if(n.isMesh&&(n.userData.role?.includes('guard-to-chassis')||n.name.endsWith('_closed_brake_drum'))){n.castShadow=true;n.receiveShadow=true;}});
  const report={fairings,brakeDrums,mounts,sourceAssetUnchanged:true};model.userData.detailRepair=report;return report;
}
