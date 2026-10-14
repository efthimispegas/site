from pathlib import Path
import hashlib,json
root=Path(__file__).parent
d=json.load(open(root/'raster-fit-checkpoint.json'));s=d['summary']
assert len(d['syntheticValidation'])==18
assert all(v['angleErrorDegrees']<=.25 and v['centerErrorPixels']<=.25 for v in d['syntheticValidation'])
assert len(d['recordingFits'])==16
for r in d['recordingFits']:
 p=root/('frame-%03d.png'%(r['frameIndex']-57))
 assert hashlib.sha256(p.read_bytes()).hexdigest()==r['imageSha256']
assert s['conditionalOnsetSpreadMs']>1000/60
assert s['maxRecordingAbsResidual']>s['maxSyntheticAbsResidual']
assert s['maxRecordingRmsResidual']>s['maxSyntheticRmsResidual']
print(json.dumps({'syntheticRecovery':'18/18 within 0.25 degree and 0.25px validation tolerances; not recording error bounds','recordingFrameHashes':'16/16 match','oneFrameSpreadGate':'FAIL','recordingErrorEnvelopeGate':'FAIL','phaseQualification':'BLOCKED','sourceOnsetContract':'unfilled'}))
