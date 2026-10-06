from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).parent
a=np.asarray(Image.open(root/'settled-logo-frame148.png')).astype(float)
bg=np.median(a[:50,:50],axis=(0,1));v=a[:,:,2]-a[:,:,0]-(bg[2]-bg[0]);o=[]
for th in [30,60,90]:
 y,x=np.nonzero(v>th);o.append({'threshold':th,'bboxInclusive':[int(x.min()),int(y.min()),int(x.max()),int(y.max())],'center':[(int(x.min())+int(x.max())+1)/2,(int(y.min())+int(y.max())+1)/2],'size':[int(x.max()-x.min()+1),int(y.max()-y.min()+1)]})
(root/'settled-logo-bounds.json').write_text(json.dumps({'status':'diagnostic; thresholds not certified antialias/codec bounds','frameIndex':148,'bounds':o},indent=2)+'\n')
