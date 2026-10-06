import json, math, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).parent
frames=json.load(open(root.parent/'task2-source-onset-frames.json'))['frames']
rows=[]
for p in sorted(root.glob('frame-*.png'))[:18]:
 index=57+int(p.stem.split('-')[1]); a=np.asarray(Image.open(p).convert('RGB')).astype(float)
 bg=np.median(a[:50,:50],axis=(0,1)); excess=(a[:,:,2]-a[:,:,0])-(bg[2]-bg[0])
 for threshold in [3,6,10]:
  mask=excess>threshold; seen=set(); comps=[]
  for y,x in zip(*np.nonzero(mask)):
   if (y,x) in seen: continue
   stack=[(int(y),int(x))]; seen.add((y,x)); pts=[]
   while stack:
    yy,xx=stack.pop();pts.append((xx,yy))
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
     ny,nx=yy+dy,xx+dx
     if 0<=ny<400 and 0<=nx<400 and mask[ny,nx] and (ny,nx) not in seen: seen.add((ny,nx));stack.append((ny,nx))
   if len(pts)>80: comps.append(np.array(pts))
  # First visible cube is the leftmost isolated component in these early frames.
  if not comps: continue
  pts=min(comps,key=lambda v:v[:,0].mean());center=pts.mean(axis=0); v=pts-center
  z=v[:,0]+1j*v[:,1]; moment=np.mean(z**4)
  angle=((np.angle(-moment)*180/math.pi/4)+45)%90-45
  rows.append({'frameIndex':index,'pts':frames[index]['best_effort_timestamp'],'thresholdBlueExcess':threshold,'pixelCount':len(pts),'centroid':center.tolist(),'squareOrientationDegreesModulo90':angle,'image':str(p.relative_to(root.parent)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
# CSS ease-out cubic-bezier(0,0,.58,1): use monotonic bisection.
def eased(x):
 lo,hi=0.,1.
 for _ in range(50):
  t=(lo+hi)/2; xx=3*(1-t)*t*t*.58+t**3
  if xx<x:lo=t
  else:hi=t
 t=(lo+hi)/2;return 3*(1-t)*t*t+t**3
for row in rows:
 # Assumption: cube's authored orientation is axis-aligned and inherits logo rotation.
 angle=row['squareOrientationDegreesModulo90'];rotation=angle-90 if angle>0 else angle
 progress=(rotation+60)/60
 if 0<=progress<=1:
  lo,hi=0.,1.
  for _ in range(50):
   mid=(lo+hi)/2
   if eased(mid)<progress:lo=mid
   else:hi=mid
  row['conditionalOnsetMs']=row['pts']/6-1500*(lo+hi)/2
out={'status':'diagnostic only; not independently qualified','method':'Fourth complex spatial moment of each thresholded isolated leftmost cube; invert locked 1.5s ease-out logo rotation assuming axis-aligned source cube geometry. Three color thresholds expose mask sensitivity.','assumptions':['Recorded cube inherits locked logo-rotate keyframes.','Cube authored orientation is axis-aligned; source SVG geometry has not been pinned.','Component selection tracks cube_01; native DOM identity is not recorded.','Raster orientation errors and source CSS version equivalence are not bounded.'], 'rows':rows}
(root/'rotation-diagnostics.json').write_text(json.dumps(out,indent=2)+'\n')
values=[r['conditionalOnsetMs'] for r in rows if 'conditionalOnsetMs' in r]
print(json.dumps({'observations':len(rows),'conditionalOnsetRangeMs':[min(values),max(values)],'rangeWidthMs':max(values)-min(values),'perFrame':[{'n':n,'range':[min(r['conditionalOnsetMs'] for r in rows if r['frameIndex']==n and 'conditionalOnsetMs'in r),max(r['conditionalOnsetMs'] for r in rows if r['frameIndex']==n and 'conditionalOnsetMs'in r)]} for n in sorted({r['frameIndex'] for r in rows if 'conditionalOnsetMs' in r})]}))
