import json,hashlib
from pathlib import Path
base=Path('.superpowers/sdd/pegasoft-hero-baseline-plan'); dest=base/'task2-closure'
pins=[]
def read(relative):
 p=base/relative; b=p.read_bytes();pins.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});return json.loads(b)
onset=read('task2-loader-onset-evidence-contract.json');landmark=read('task2-landmark-candidate-refinement/review-packet.json');review=read('task2-landmark-candidate-refinement/independent-review.json');beam=read('task2-parallel/beam/outcome.json');exit=read('task2-parallel/exit/outcome.json');logs=read('task2-closure/loader-log-search.json')
gates=[{'gate':'reference/local loader age correspondence','status':'blocked' if any(s['source']['ageMs'] is None or s['source']['onsetIntervalPts'] is None for s in onset['states']) else 'requires independent qualification','missing':'Effect-specific source onset within one recording frame, equivalent effect role and named current local capture binding. Searched saved logs do not supply recording-session telemetry.'},{'gate':'semantic silhouettes and contour-error accuracy','status':'blocked' if any(s['qualification']=='blocked' for s in landmark['results']) else 'requires current provenance','missing':review['remainingPrerequisite']},{'gate':'equivalent core and independently calibrated halo','status':'blocked' if beam['separateCoreHaloQualification'] is False else 'requires current provenance','missing':beam['blockers']},{'gate':'exit boundary correspondence','status':exit['status'],'missing':exit['blockers']},{'gate':'current matching-input capture and ordered qualified comparison','status':'blocked','missing':'The latest selected 15-state packet is historical after input changes; no new matching packet with all qualified measurement contracts has been established. Do not backfill hashes or consume blocked geometry.'}]
capturePath=Path('apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6/capture-manifest.json')
captureBytes=capturePath.read_bytes();pins.append({'path':str(capturePath),'bytes':len(captureBytes),'sha256':hashlib.sha256(captureBytes).hexdigest()}); capture=json.loads(captureBytes)
changedInputs=[]
for record in capture['states'][0]['captureProvenance']['implementation']['untrackedInputFiles']:
 if record['path'].endswith(('hero-capture-clock.ts','hero-capture-clock.spec.ts')):
  p=Path(record['path']);b=p.read_bytes();actual=hashlib.sha256(b).hexdigest();pins.append({'path':str(p),'bytes':len(b),'sha256':actual})
  if actual!=record['sha256']:changedInputs.append({'path':str(p),'recordedSha256':record['sha256'],'currentSha256':actual})
assert changedInputs, 'Expected recorded/current telemetry changes require a new provenance decision'
profilePacket=base/'task2-profile-diagnostics/review-packet.json'
implementation={'landmark':'complete; independently accepted bounded veto only','profiles':'not yet packaged'}
if profilePacket.exists():
 d=read('task2-profile-diagnostics/review-packet.json');outcome=read('task2-profile-diagnostics/outcome.json');implementation['profiles']=outcome['implementationStatus'];implementation['profilesIndependentQualification']='not granted'
testLog=dest/'live-measurement.log';testBytes=testLog.read_bytes();pins.append({'path':str(testLog),'bytes':len(testBytes),'sha256':hashlib.sha256(testBytes).hexdigest()})
result={'date':'2026-10-02','task':2,'status':'blocked','complete':False,'implementation':implementation,'gates':gates,'blockedGateCount':sum(g['status']=='blocked' for g in gates),'inputs':pins,'closureRule':'Task 2 completes only when correspondence gates are independently qualified and a matching-input comparison provides the ordered repair list. Technical checks, diagnostic profiles or conservative vetoes cannot substitute.','recordedCaptureRunId':capture['runId'],'changedCapturedTelemetryInputs':changedInputs,'loaderLogSearch':{'logsSearched':logs['logsSearched'],'sourceAgeContractsUnfilled':logs['sourceAgeContractsUnfilled']}}
assert result['blockedGateCount']>0
(dest/'closure-packet.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'task2Complete':False,'blockedGates':result['blockedGateCount'],'implementation':implementation}))
