from pathlib import Path
import json,math,hashlib,time
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).parent
# Candidate inverse model: an antialiased square, with pose and intensity fitted
# from raster luminance. No animation time or onset is used during pose fitting.
luma=np.array([.2126,.7152,.0722])
def grid(n,ss):
 y,x=np.mgrid[:n,:n];o=(np.arange(ss)+.5)/ss
 return x[:,:,None,None]+o[None,None,None,:], y[:,:,None,None]+o[None,None,:,None]
def fit(a,seed,ss=8):
 n=a.shape[0];x,y=grid(n,ss)
 def render(p):
  cx,cy,side,angle=p;t=math.radians(angle);dx=x-cx;dy=y-cy
  u=dx*math.cos(t)+dy*math.sin(t);v=-dx*math.sin(t)+dy*math.cos(t)
  return ((abs(u)<side/2)&(abs(v)<side/2)).mean(axis=(2,3))
 def loss(p):
  m=render(p);amplitude=float(np.sum(a*m)/max(np.sum(m*m),1e-12))
  residual=a-amplitude*m
  return float(np.mean(residual**2)),amplitude,m,residual
 p=list(seed); best=loss(p)[0]
 for steps in [(1.,1.,.5,2.),(.5,.5,.25,1.),(.25,.25,.125,.5),(.125,.125,.0625,.25),(.0625,.0625,.03125,.125)]:
  for _ in range(12):
   candidates=[]
   for k,st in enumerate(steps):
    for sign in [-1,1]:
     q=p.copy();q[k]+=sign*st
     if 20<q[2]<38 and 0<q[3]<90:candidates.append((loss(q)[0],q))
   v,q=min(candidates,key=lambda z:z[0])
   if v>=best:break
   best,p=v,q
 error,amplitude,m,residual=loss(p)
 return {'center':p[:2],'sidePixels':p[2],'orientationDegreesModulo90':p[3],'amplitude':amplitude,'rmsResidual':math.sqrt(error),'maxAbsResidual':float(np.max(abs(residual)))},m*amplitude
# Held-out forward renderer uses PIL polygons at 32x supersampling, distinct
# from inverse membership samples; known poses and optional quantization/noise.
def synthetic(n,p):
 cx,cy,side,angle=p;t=math.radians(angle);verts=[]
 for dx,dy in [(-side/2,-side/2),(side/2,-side/2),(side/2,side/2),(-side/2,side/2)]:
  verts.append(((cx+dx*math.cos(t)-dy*math.sin(t))*32,(cy+dx*math.sin(t)+dy*math.cos(t))*32))
 im=Image.new('L',(n*32,n*32));ImageDraw.Draw(im).polygon(verts,fill=255)
 return np.asarray(im.resize((n,n),Image.Resampling.BOX)).astype(float)/255
valid=[];rng=np.random.default_rng(761)
for idx,angle in enumerate([31.37,36.18,41.63,46.42,51.29,56.71]):
 p=[24.15+.17*(idx%3),23.8+.11*(idx%2),28.04,angle];clean=synthetic(48,p)
 for noise in [0.,1/255,3/255]:
  obs=np.round(np.clip(clean+rng.uniform(-noise,noise,clean.shape),0,1)*255)/255
  r,_=fit(obs,[24.4,24.1,28.,round(angle/5)*5+2.])
  valid.append({'truth':p,'noiseAmplitude':noise,'result':r,'angleErrorDegrees':abs(r['orientationDegreesModulo90']-angle),'centerErrorPixels':math.dist(r['center'],p[:2])})
rows=json.load(open(root/'rotation-diagnostics.json'))['rows'];frames=json.load(open(root.parent/'task2-source-onset-frames.json'))['frames'];results=[]
for idx in range(60,76):
 candidates=[r for r in rows if r['frameIndex']==idx]
 # Centroid is only an ROI/initialization seed. Luminance fit has no binary mask.
 seed=min(candidates,key=lambda r:r['thresholdBlueExcess']);cx,cy=seed['centroid'];left=round(cx)-24;top=round(cy)-24
 fn=root/('frame-%03d.png'%(idx-57));rgb=np.asarray(Image.open(fn).convert('RGB')).astype(float)
 bg=np.median(rgb[:50,:50],axis=(0,1));fg=np.array([15,50,220]);contrast=float((bg-fg)@luma)
 a=((bg@luma)-(rgb[top:top+48,left:left+48]@luma))/contrast
 angle=seed['squareOrientationDegreesModulo90'];angle=angle if angle>0 else angle+90
 r,predicted=fit(a,[cx-left+.5,cy-top+.5,28.04,angle])
 r.update({'frameIndex':idx,'pts':frames[idx]['best_effort_timestamp'],'roi':[left,top,48,48],'imageSha256':hashlib.sha256(fn.read_bytes()).hexdigest(),'luminanceContrast':contrast})
 r['recordingCenterCropPixels']=[r['center'][0]+left,r['center'][1]+top]
 # This inversion is conditional on the locked 1.5s ease-out parent rotation.
 progress=(r['orientationDegreesModulo90']-30)/60
 def eased(x):
  lo,hi=0.,1.
  for _ in range(50):
   t=(lo+hi)/2
   if 3*(1-t)*t*t*.58+t**3<x:lo=t
   else:hi=t
  t=(lo+hi)/2;return 3*(1-t)*t*t+t**3
 lo,hi=0.,1.
 for _ in range(50):
  mid=(lo+hi)/2
  if eased(mid)<progress:lo=mid
  else:hi=mid
 r['conditionalOnsetMs']=r['pts']/6-1500*(lo+hi)/2
 results.append(r)
 # Diagnostic residual preview is saved with explicit fitted/observed distinction.
 preview=np.concatenate([a,predicted,abs(a-predicted)*5],axis=1)
 Image.fromarray((np.clip(preview,0,1)*255).astype('uint8')).resize((576,192)).save(root/('fit-frame-%03d.png'%idx))
values=[r['conditionalOnsetMs'] for r in results]
out={'status':'rejected for qualification: conditional spread exceeds one frame and recording residual exceeds tested error model','method':'Fit free square pose and amplitude to luminance using 8x subpixel coverage; invert CSS ease-out only after pose fit. Synthetic held-out forward render uses PIL polygon 32x BOX sampling.','syntheticValidation':valid,'recordingFits':results,'summary':{'syntheticCases':len(valid),'maxSyntheticAngleErrorDegrees':max(r['angleErrorDegrees'] for r in valid),'maxSyntheticCenterErrorPixels':max(r['centerErrorPixels'] for r in valid),'maxSyntheticRmsResidual':max(r['result']['rmsResidual'] for r in valid),'maxSyntheticAbsResidual':max(r['result']['maxAbsResidual'] for r in valid),'recordingFrames':len(results),'conditionalOnsetRangeMs':[min(values),max(values)],'conditionalOnsetSpreadMs':max(values)-min(values),'maxRecordingRmsResidual':max(r['rmsResidual'] for r in results),'maxRecordingAbsResidual':max(r['maxAbsResidual'] for r in results)},'limitations':['Synthetic validation does not establish a codec/antialiasing error bound for recorded pixels.','A free intensity/pose fit cannot establish the recording native effect identity or onset.','One best-fit parameter per frame is not a certified timing interval.','No mean/intersection is promoted to proof; no phase contract is filled.'],'nextAction':'If recording residuals exceed synthetic perturbation envelope or onset spread exceeds one frame, reject this cube estimator as qualification evidence; select another causal effect or establish stronger recording error evidence.'}
(root/'raster-fit-checkpoint.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out['summary']))
