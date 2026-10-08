"""Audit actual rendered observations; never generate or inject motion states."""
from pathlib import Path
import json,math,hashlib
p=Path(__file__).resolve().parents[2]
files=sorted((p/'evidence/handoff-review/playback').glob('*.json'))
results=[]
for f in files:
    data=json.loads(f.read_text());frames=data['frames'];forward=data['direction']=='forward'
    errors=[]
    if len(frames)<50: errors.append('too few rendered observations')
    expected_start = 1 if not forward else (.36 if data.get('scope')=='connection_departure' else 0)
    expected_end = (.36 if data.get('scope')=='connection_departure' else 0) if not forward else 1
    if abs(frames[0]['progress']-expected_start)>.002 or abs(frames[-1]['progress']-expected_end)>1e-9:errors.append('incomplete requested playback range')
    for item in data['recorded_inputs']:
        if hashlib.sha256((p/item['path']).read_bytes()).hexdigest()!=item['sha256']:errors.append('recorded input changed: '+item['path'])
    ordered=frames if forward else list(reversed(frames))
    if any(b['progress']+1e-9<a['progress'] for a,b in zip(ordered,ordered[1:])):errors.append('progress reversed unexpectedly')
    if max(r['distance'] for r in frames)-min(r['distance'] for r in frames)>1e-9:errors.append('framing distance changed')
    straight=[r for r in ordered if .75<=r['progress']<=.85]
    if any(abs(r['steering'])>1e-12 or abs(r['articulation'])>1e-12 or abs(r['pitch']-math.atan(.085))>1e-12 for r in straight):errors.append('straight services interval changed')
    if any(r['servicesOpacity']<.999 for r in frames if .78<=r['progress']<=.85):errors.append('services overlay not held')
    departure=[r for r in ordered if r['progress']>=.75]
    if departure:
        if max(r['distance'] for r in departure)-min(r['distance'] for r in departure)>1e-9:errors.append('departure dolly changed')
        if any(b['pitch']+1e-9<a['pitch'] for a,b in zip(departure,departure[1:])):errors.append('camera pitch drifted backwards')
        if max(r['target'][1] for r in departure)-min(r['target'][1] for r in departure)>1e-9:errors.append('camera target bobbed')
    seated=[r for r in frames if r['progress']>=.67]
    if any(r['contactMax']>.001 or r['groundMax']>.001 for r in seated):errors.append('support/ground gap')
    if any('stackVisible' not in r for r in frames): errors.append('stack visibility not recorded')
    if any(r.get('stackVisible',False) for r in frames if r['progress']>.4):errors.append('stack re-entry')
    gaps=[];camera_steps=[]
    for a,b in zip(frames,frames[1:]):
        camera_steps.append(math.dist(a['camera'],b['camera']))
        if b['elapsed']<a['elapsed']:errors.append('observation time reversed')
        if b['progress']==a['progress'] and math.dist(a['camera'],b['camera'])>1e-9:errors.append('paused camera changed')
    duration=frames[-1]['elapsed']-frames[0]['elapsed']
    expected=abs(frames[-1]['progress']-frames[0]['progress'])*data['duration']/data['speed']
    if abs(duration-expected)>.5:errors.append('inspection cadence slowed by more than .5 seconds')
    results.append({'path':str(f.relative_to(p)),'status':'passed' if not errors else 'failed','errors':errors,'frames':len(frames),'progress_range':[frames[0]['progress'],frames[-1]['progress']],'elapsed_seconds':duration,'expected_inspection_seconds':expected,'observed_interval_median':sorted(r['dt'] for r in frames)[len(frames)//2],'max_camera_step':max(camera_steps,default=0),'departure_distance_range':[min((r['distance'] for r in departure),default=0),max((r['distance'] for r in departure),default=0)],'viewport':data['viewport']})
out={'status':'passed' if results and all(r['status']=='passed' for r in results) else 'failed','runs':results,'scope':'Observed browser rendering at the recorded viewport; not a representative-device performance certification.'}
(p/'evidence/handoff-review/playback-checks.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))

raise SystemExit(0 if out['status']=='passed' else 1)
