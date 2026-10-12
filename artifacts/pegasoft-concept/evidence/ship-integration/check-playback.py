"""Audit genuine browser recordings; do not replace rendered review with this check."""
from pathlib import Path
import json, hashlib, math
root=Path(__file__).resolve().parents[2]
folder=Path(__file__).resolve().parent
runs=[]
for path in sorted((folder/'playback').glob('ship-*.json')):
 data=json.loads(path.read_text());frames=data['frames'];assert frames, path
 for pin in data['recorded_inputs']:
  assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256'],pin['path']
 reverse=data['direction']=='reverse'
 assert all((b['progress']<=a['progress']+1e-8 if reverse else b['progress']>=a['progress']-1e-8) for a,b in zip(frames,frames[1:])),path
 if data['scope']=='full':assert abs(frames[0]['progress']-(1 if reverse else 0))<.01 and abs(frames[-1]['progress']-(0 if reverse else 1))<1e-8,path
 assert max(f['ownershipMatrixResidual'] for f in frames)<1e-9,path
 assert max(f['supportGap'] for f in frames)<1e-9,path
 scales=[f['cargoScale'] for f in frames];assert max(abs(v-scales[0][i]) for s in scales for i,v in enumerate(s))<1e-10,path
 assert all((b['distance']<=a['distance']+1e-8 if reverse else b['distance']>=a['distance']-1e-8) for a,b in zip(frames,frames[1:])),path
 quats=[f['quaternion'] for f in frames if f['progress']>.12]
 assert max(abs(v-quats[0][i]) for q in quats for i,v in enumerate(q))<1e-10,path
 rims=json.loads((root/'generation/container-family/model-draft/model-checks.json').read_text())['landmarks']
 rims=[p for p in rims if p['role']=='support rim']
 def transform(m,p):return [sum(m[c*4+i]*p[c] for c in range(3))+m[12+i] for i in range(3)]
 errors=[]
 for f in frames:
  if f['owner']!='deck':continue
  for r in rims:
   point=r['point'];a=transform(f['cargoMatrix'],point);b=transform(f['shipMatrix'],[point[0]-4.9,point[1]+9.816,point[2]-1.269]);errors.append(math.dist(a,b))
 assert not errors or max(errors)<1e-9,path
 ordered=sorted(frames,key=lambda f:f['progress']);retreat=[f for f in ordered if f['progress']>.85]
 if data['scope']=='full':assert retreat[-1]['distance']>retreat[0]['distance']+1,path
 intervals=sorted(f['dt'] for f in frames if f['dt']>0)
 runs.append({'path':str(path.relative_to(root)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'direction':data['direction'],'speed':data['speed'],'scope':data['scope'],'viewport':data['viewport'],'frames':len(frames),'range':[frames[0]['progress'],frames[-1]['progress']],'elapsed_seconds':frames[-1]['elapsed'],'pose_matrix_residual_max':max(f['ownershipMatrixResidual'] for f in frames),'seat_rim_residual_m_max':max(errors,default=0),'camera_orientation_delta_max':max(abs(v-quats[0][i]) for q in quats for i,v in enumerate(q)),'constant_C01_world_scale':scales[0],'monotonic_camera_distance':True,'tail_camera_keeps_receding':data['scope']=='full','median_rendered_tick_seconds':intervals[len(intervals)//2]})
assert any(r['direction']=='forward' and r['speed']==1 and r['scope']=='full' for r in runs),'Missing final normal run'
assert any(r['direction']=='reverse' and r['speed']==1 and r['scope']=='full' for r in runs),'Missing final reverse run'
assert any(r['speed']==.25 and r['scope']=='boundary' for r in runs),'Missing final quarter-speed boundary'
result={'status':'pass','runs':runs,'limits':'Browser render-tick intervals are this host/run only; they do not establish representative-device or production performance. Mathematical pose/support checks supplement personal playback review.'}
(folder/'playback-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'pass','runs':len(runs),'frame_counts':[r['frames'] for r in runs],'support_max_m':max(r['seat_rim_residual_m_max'] for r in runs)}))
