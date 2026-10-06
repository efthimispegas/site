from pathlib import Path
import json,hashlib,re,math
root=Path(__file__).parent
html=(root/'source-html-candidate.html').read_bytes();css=Path('docs/hero-reference/live/locked-reference-loader.css').read_bytes()
assert hashlib.sha256(html).hexdigest()=='a0d66705e329aa59f646cadeccbbd4a99362a26dd65d82451233b3aa93882012'
assert hashlib.sha256(css).hexdigest()=='cc1ac4c193d083000320123bad183188ced2a082819dbd3a615dbad00ed5700c'
s=html.decode(); start=s.index('<div id="loader"'); svg=re.search(r'<svg.*?</svg>',s[start:]).group()
(root/'locked-loader-logo.svg').write_text(svg+'\n')
d=re.search(r'<path id="cube_01" d="([^"]+)"',svg).group(1)
assert d=='M40.0076 0H56.0038V15.9962H40.0076V0Z'
def easeout(x):
 x=max(0,min(x,1));lo,hi=0.,1.
 for _ in range(50):
  t=(lo+hi)/2
  if 3*(1-t)*t*t*.58+t**3<x:lo=t
  else:hi=t
 t=(lo+hi)/2;return 3*(1-t)*t*t+t**3
width=max(80,min(96,(1508-120)*.064,(761-60)*.12));scale=width*2/96
checks=[]
calibration=json.load(open(root/'settled-logo-bounds.json'))
centers=[r['center'] for r in calibration['bounds']]
calibratedCenter=[sum(c[i] for c in centers)/len(centers) for i in [0,1]]
for r in json.load(open(root/'rotation-diagnostics.json'))['rows']:
 if 'conditionalOnsetMs' not in r:continue
 age=r['pts']/6-r['conditionalOnsetMs'];theta=math.radians(-60*(1-easeout(age/1500)))
 x=(40.0076+56.0038)/2-48;y=15.9962/2-48-20*(1-easeout(age/400))
 predicted=[200+scale*(x*math.cos(theta)-y*math.sin(theta)),200+scale*(x*math.sin(theta)+y*math.cos(theta))]
 residual=math.dist(predicted,r['centroid'])
 calibratedPrediction=[predicted[i]+calibratedCenter[i]-200 for i in [0,1]]
 checks.append({'calibratedCentroidResidualPixels':math.dist(calibratedPrediction,r['centroid']),'frameIndex':r['frameIndex'],'thresholdBlueExcess':r['thresholdBlueExcess'],'conditionalAgeMs':age,'predictedCube01CentroidCropPixels':predicted,'observedCentroidCropPixels':r['centroid'],'centroidResidualPixels':residual})
def pin(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
out={'status':'hash-matched authored geometry recovered; recording binding remains diagnostic','sourceRetrieval':{'url':'https://www.vectrfl.com/?trace=1','method':'read-only HTTP download; no browser capture','historicalSourceEvidence':'docs/hero-reference/live/source-evidence.json#sources[id=live-trace-html-2026-07-28]','htmlHashMatches':True,'sandboxAttempt':'curl exit 6 DNS; permitted retry exit 0'},'geometry':{'targetSelector':'#loader .loader__logo #cube_01','parentTargetSelector':'#loader .loader__logo','cubePathD':d,'vertices':[[40.0076,0],[56.0038,0],[56.0038,15.9962],[40.0076,15.9962]],'authoredOrientation':'axis-aligned','viewBox':[0,0,96,96],'cubeAnimations':['cube-fade','cube-slide'],'cubeDelayMs':0,'parentAnimationName':'logo-rotate','parentDurationMs':1500,'parentEasing':'ease-out','parentRotationDegrees':[-60,0],'cssViewport':[1508,761],'recordingPixels':[3016,1522],'derivedLogoWidthCssPx':width,'derivedSvgUnitScaleRecordingPx':scale,'mobileOverrideApplies':False},'validation':{'eligibleConditionalRows':len(checks),'centroidResidualRangePixels':[min(r['centroidResidualPixels'] for r in checks),max(r['centroidResidualPixels'] for r in checks)],'independence':'Positions use ages inferred from orientation, so agreement is a diagnostic cross-check, not an independent onset proof.','staticFrameCalibration':calibration,'calibratedCenterCropPixels':calibratedCenter,'calibratedCentroidResidualRangePixels':[min(r['calibratedCentroidResidualPixels'] for r in checks),max(r['calibratedCentroidResidualPixels'] for r in checks)],'maskSensitivityMs':106.93094472034386,'requiredOnsetWidthMs':1000/60},'limitations':['Hash equality proves same HTML as the locked audit, not the recording runtime DOM or computed style.','Source cube identity is now explicit in HTML; raster component binding remains inferred.','Thresholded centroid/angle errors include codec, antialiasing, faint-opacity and raster quantization effects; they are not bounded.','No averaging or intersection of conditional estimates qualifies onset.','The local implementation lacks logo assembly/rotation; it cannot be assigned this source effect role.'],'nextAction':'Validate a geometry-based raster estimator and conservative error model on the retained recording, or switch to an effect with measurable timing; retain independent review before phase qualification.','checks':checks,'artifacts':[pin(root/'source-html-candidate.html'),pin(root/'locked-loader-logo.svg'),pin('docs/hero-reference/live/locked-reference-loader.css'),pin('docs/hero-reference/live/source-evidence.json'),pin(root/'settled-logo-frame148.png'),pin(root/'settled-logo-bounds.json')]}
(root/'source-geometry-checkpoint.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out['validation']))
