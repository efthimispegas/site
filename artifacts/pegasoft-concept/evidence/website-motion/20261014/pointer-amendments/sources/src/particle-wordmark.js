/** A scoped 2D wordmark. The application supplies time; no private frame loop. */
export function createParticleWordmark({canvas,label='PEGASOFT'}){
 const context=canvas.getContext('2d'),document=canvas.ownerDocument;
 let disposed=false,points=[],width=1,height=1,pointer=null,dirty=true;
 function resize(){
  if(disposed||!context)return;
  width=canvas.clientWidth;height=canvas.clientHeight;const dpr=Math.min(2,document.defaultView.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);
  const mask=document.createElement('canvas');mask.width=Math.round(width);mask.height=Math.round(height);const ink=mask.getContext('2d');
  if(!ink)return;const size=Math.min(height*.88,width/(label.length*.67));ink.font=`750 ${size}px Manrope`;ink.textAlign='center';ink.textBaseline='middle';ink.fillText(label,width/2,height*.51);
  const pixels=ink.getImageData(0,0,mask.width,mask.height).data,spacing=width<600?3:4;points=[];
  for(let y=0;y<height;y+=spacing)for(let x=0;x<width;x+=spacing)if(pixels[(y*mask.width+x)*4+3]>100)points.push({x,y,homeX:x,homeY:y});
  dirty=true;canvas.dataset.interactionRadius=String(.8*Math.min(95,width*.17));canvas.dataset.ready=String(points.length>0);canvas.dataset.points=points.length;
 }
 return {async mount(){await document.fonts.ready;if(!disposed)resize();},resize,setPointer(value){pointer=value;dirty=true;},
  render(dt=0,reduced=false){
   if(disposed||!context)return;const rate=reduced?1:1-Math.exp(-Math.max(0,dt)*12);let movement=0;context.clearRect(0,0,width,height);context.fillStyle='#455d73';context.beginPath();
   for(const p of points){let tx=p.homeX,ty=p.homeY;if(pointer&&!reduced){const dx=tx-pointer.x,dy=ty-pointer.y,d=Math.hypot(dx,dy),radius=.8*Math.min(95,width*.17);if(d<radius){const force=(1-d/radius)**2*radius;tx+=dx/(d||1)*force;ty+=dy/(d||1)*force;}}
    p.x+=(tx-p.x)*rate;p.y+=(ty-p.y)*rate;movement+=Math.abs(p.x-p.homeX)+Math.abs(p.y-p.homeY);context.moveTo(p.x+.65,p.y);context.arc(p.x,p.y,.65,0,Math.PI*2);
   }
   context.fill();dirty=movement>.1;canvas.dataset.displacement=movement.toFixed(3);return dirty;
  },get dirty(){return dirty;},dispose(){disposed=true;points=[];if(context)context.clearRect(0,0,width,height);canvas.dataset.ready='false';canvas.dataset.disposed='true';}};
}
