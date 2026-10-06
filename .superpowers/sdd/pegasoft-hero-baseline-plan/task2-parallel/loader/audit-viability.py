import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[5]
base=root/'.superpowers/sdd/pegasoft-hero-baseline-plan'
paths=[base/'task2-loader-onset-evidence-contract.json',base/'task2-rotation-probe/raster-fit-manifest.json',base/'task2-loader-independent-review.json']
def pin(p):
 b=p.read_bytes(); return {'path':str(p.relative_to(root)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
contract=json.loads(paths[0].read_text()); fit=json.loads(paths[1].read_text())
linked=fit['inputs']+fit['artifacts']
for v in linked:
 p=root/v['path']; actual=pin(p)
 assert actual['sha256']==v['sha256'] and actual['bytes']==v['bytes'],v['path']
assert len(contract['states'])==2
assert all(s['source']['ageMs'] is None and s['source']['onsetIntervalPts'] is None for s in contract['states'])
out={'date':'2026-10-02','status':'blocked; no justified new loader execution identified','checks':{'retainedFitPins':len(linked),'sourceAgeContractsUnfilled':2,'repeatReconstructionAttempt':False},'basis':fit['ruling'],'prerequisiteOptions':[{'option':'Recording-session causal telemetry','requirement':'Evidence tying the original recording clock to effect-specific animation start and recorded sample; a new live page observation alone cannot retroactively bind the MOV.'},{'option':'Independently justified different estimator','requirement':'A recording-representative codec/antialiasing error envelope and effect identity, with conservative onset interval at most one frame; synthetic accuracy alone is insufficient.'}],'localFollowup':'After source qualification, an authorized current-input capture must bind named native animation target/currentTime to the same screenshot. Do not backfill anonymous historical IDs.','nextAction':'Keep loader stopped until a prerequisite supplies new causal evidence or a justified estimator. Continue independent landmark/beam/exit lanes.','inputs':[pin(p) for p in paths],'qualificationGranted':False,'runtimeEdits':False,'newCaptures':False}
dest=Path(__file__).parent; dest.joinpath('outcome.json').write_text(json.dumps(out,indent=2)+'\n')
manifest={'inputs':out['inputs'],'artifacts':[pin(Path(__file__).resolve()),pin(dest/'outcome.json')],'status':'verified diagnostic viability checkpoint; not loader qualification'}
dest.joinpath('manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(out['checks']))
