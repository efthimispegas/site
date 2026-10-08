"""Fit actual canvas-video door edges; geometric witnesses only bound the search."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
FOLDER=ROOT/'evidence/lift-container-integration/playback'
VIDEO=FOLDER/'C01-settling-forward-quarter.webm'
TRACE=FOLDER/'C01-settling-forward-quarter.json'
trace=json.loads(TRACE.read_text()); observed=trace['frames']; w=trace['canvas']['width']; h=trace['canvas']['height']
# The canvas uses DPR 1.5; witness coordinates are stage CSS pixels.
sx=w/470; sy=h/(567/1.5)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',str(VIDEO)]))
times=np.array([float(f['best_effort_timestamp_time']) for f in probe['frames']]); times-=times[0]
raf=np.array([f['elapsedMs']/1000 for f in observed]); decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(VIDEO),'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
records=[]
for n,time in enumerate(times):
 raw=decoder.stdout.read(w*h*3)
 if len(raw)!=w*h*3:break
 rgb=np.frombuffer(raw,dtype=np.uint8).reshape(h,w,3).astype(np.float32); gray=rgb@np.array([.299,.587,.114],np.float32)
 oi=int(np.argmin(abs(raf-time))); observation=observed[oi]; p=observation['projectedCastingWitnesses']
 # The nearer pair is selected by projection depth, then ordered left to right.
 pairs=sorted([(p[i]['z'],i) for i in range(0,8,2)])[:2]; pairs=sorted(pairs,key=lambda item:p[item[1]]['x']); fits=[]
 for _,i in pairs:
  top=np.array([p[i]['x']*sx,p[i]['y']*sy]); bottom=np.array([p[i+1]['x']*sx,p[i+1]['y']*sy]); ya=max(1,int(top[1]+30)); yb=min(h-2,int(bottom[1]-30)); ys=np.arange(ya,yb)
  if len(ys)<60:continue
  predicted=top[0]+(ys-top[1])*(bottom[0]-top[0])/(bottom[1]-top[1]); xs=[]; used=[]; strengths=[]
  for y,x in zip(ys,predicted):
   lo=max(2,int(x-24)); hi=min(w-3,int(x+24)); row=gray[y-1:y+2].mean(axis=0); foreground=np.flatnonzero(row[lo:hi]<220)
   if not len(foreground):continue
   k=int(foreground[0] if len(fits)==0 else foreground[-1]); strength=float(abs(row[lo+k+1]-row[lo+k-1]))
   xs.append(lo+k);used.append(y);strengths.append(strength)
  if len(xs)<len(ys)*.7:continue
  used=np.array(used); xs=np.array(xs); slope,intercept=np.polyfit(used,xs,1); residual=xs-(slope*used+intercept); keep=abs(residual)<3
  if keep.sum()<len(ys)*.7:continue
  slope,intercept=np.polyfit(used[keep],xs[keep],1); rms=float(np.sqrt(np.mean((xs[keep]-(slope*used[keep]+intercept))**2)))
  fits.append({'rasterTiltDegrees':float(np.degrees(np.arctan(slope))),'geometricTiltDegrees':float(np.degrees(np.arctan((bottom[0]-top[0])/(bottom[1]-top[1])))),'edgeRmsPixels':rms,'rows':int(keep.sum())})
 records.append({'videoFrame':n,'videoSeconds':float(time),'nearestRenderedObservation':oi,'referenceLiftFrame':observation['frame'],'appliedBalanceDegrees':observation['applied_pose']['balance'],'fits':fits})
decoder.stdout.close();decoder.wait()
paired=[r for r in records if len(r['fits'])==2];errors=[abs(f['rasterTiltDegrees']-f['geometricTiltDegrees']) for r in paired for f in r['fits']]; raster=[f['rasterTiltDegrees'] for r in paired for f in r['fits']]
result={'status':'qualified_raster_geometry_edge_correspondence' if len(paired)/len(records)>.9 and np.quantile(errors,.95)<.35 else 'unqualified_rendered_edge_measurements','inputs':{str(x.relative_to(ROOT)):hashlib.sha256(x.read_bytes()).hexdigest() for x in [VIDEO,TRACE,Path(__file__)]},'method':'Every decoded quarter-speed canvas frame; outer silver/background contour (luminance <220 on porcelain) in +-24 pixel casting-bounded side-edge bands, robust line fits excluding end castings. Angles come from raster pixels, not the motion labels. No clock or named-pose injection.','viewportCss':[470,378],'decodedFrames':len(records),'pairedEdgeFrames':len(paired),'pairedCoverage':len(paired)/len(records),'maxTiltDifferenceDegrees':max(errors),'p95TiltDifferenceDegrees':float(np.quantile(errors,.95)),'rasterTiltRangeDegrees':[min(raster),max(raster)],'limits':['Witness bands localize the actual edges; this is raster/geometry correspondence rather than independent recovery of reference world-space motion.','Recorder PTS starts at the first decoded frame; nearest RAF observation is used without time fitting.','Reference fidelity, absolute trajectory radius and overall appearance still require user review.'],'frames':records}
(ROOT/'evidence/lift-container-integration/rendered-edge-measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['decodedFrames','pairedEdgeFrames','pairedCoverage','maxTiltDifferenceDegrees','p95TiltDifferenceDegrees','rasterTiltRangeDegrees']}))
