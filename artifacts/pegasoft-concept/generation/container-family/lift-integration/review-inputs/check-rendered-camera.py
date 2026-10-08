"""Check dense actual replay camera data and the vacated right-edge raster band."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
root=Path(__file__).resolve().parents[3]
evidence=root/'evidence/lift-container-integration'
results=[]
for trace in sorted((evidence/'playback').glob('C01-camera-v4-*.json')):
 d=json.loads(trace.read_text());frames=d['frames'];interval=[x for x in frames if .719<=x['progress']<=.937];assert interval
 span=lambda k:max(x['camera'][k] for x in interval)-min(x['camera'][k] for x in interval)
 assert span('groundAnchorY')<1e-8 and span('hubAnchorY')<1e-8
 assert max(x['camera']['position'][1]for x in interval)-min(x['camera']['position'][1]for x in interval)<1e-10
 assert all(x['camera']['rollDegrees']==0 and x['camera']['supportVisible']for x in frames)
 ordered=sorted(interval,key=lambda x:x['progress']);assert all(b['camera']['azimuth']>=a['camera']['azimuth']-1e-8 for a,b in zip(ordered,ordered[1:]))
 visibility=[x['camera']['supportIntersectsView']for x in sorted([x for x in frames if x['progress']>=.65],key=lambda x:x['progress'])]
 assert not any(not a and b for a,b in zip(visibility,visibility[1:]))
 assert all(not x['camera']['supportIntersectsView']for x in frames if .919<=x['progress']<=.924)
 video=trace.with_suffix('.webm');w,h=d['canvas']['width'],d['canvas']['height'];band_w=16;band_h=h-167
 pts=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))['frames']
 elapsed=np.array([x['elapsedMs']/1000 for x in frames]);progress=np.array([x['progress']for x in frames]);proc=subprocess.Popen(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(video),'-vf',f'crop={band_w}:{band_h}:{w-band_w}:167','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 examined=0;max_delta=0;foreground=0;first_background=None
 for frame in pts:
  raw=proc.stdout.read(band_w*band_h*3);assert len(raw)==band_w*band_h*3
  p=float(np.interp(float(frame['best_effort_timestamp_time']),elapsed,progress))
  if .90<=p<=.937:
   pixels=np.frombuffer(raw,np.uint8).reshape(-1,3).astype(np.int16)
   # Flat porcelain background is established independently by the band's mode.
   values,counts=np.unique(pixels,axis=0,return_counts=True);background=values[counts.argmax()]
   if first_background is None:first_background=background
   delta=np.max(np.abs(pixels-first_background),axis=1);max_delta=max(max_delta,int(delta.max()));foreground+=int((delta>8).sum());examined+=1
 proc.stdout.close();assert proc.wait()==0 and examined>0 and foreground==0
 results.append({'trace':str(trace.relative_to(root)),'video':str(video.relative_to(root)),'trace_sha256':hashlib.sha256(trace.read_bytes()).hexdigest(),'video_sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'mode':d['mode'],'observations':len(frames),'reported_interval_observations':len(interval),'ground_anchor_pixel_span':span('groundAnchorY'),'hub_anchor_pixel_span':span('hubAnchorY'),'camera_roll_degrees':0,'turn_direction_reversals':0,'grounded_support_reentries':0,'near_921_support_outside_frustum':True,'right_edge_raster':{'progress_interval':[.90,.937],'roi':[w-band_w,167,band_w,band_h],'decoded_frames':examined,'foreground_pixels_above_predeclared_8_rgb_tolerance':foreground,'max_rgb_difference':max_delta,'background_rgb':first_background.tolist()},'canvas':d['canvas'],'elapsedMs':d['durationMs'],'grounded_container_kept_visible_in_scene':True})
assert len(results)==3, 'Require normal, quarter and reverse captures for this revision'
report={'status':'passed_rendered_camera_stability_and_no_edge_flash','inputs':{p:hashlib.sha256((root/p).read_bytes()).hexdigest()for p in ['review/lift-container.js','review/lift-container-contact.js','review/lift-container-replay.js','review/lift-container.html']},'check_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'limits':'Dense camera observations plus the actual vacated right-edge pixels check stability and the reported flash. This does not qualify full reference raster fidelity.','results':results}
(evidence/'camera-v4-rendered-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':report['status'],'results':[{'mode':x['mode'],'interval_observations':x['reported_interval_observations'],'right_edge_raster':x['right_edge_raster']}for x in results]}))
