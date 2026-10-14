/** A scoped 2D wordmark. The application supplies time; no private frame loop. */
export const PARTICLE_DEFAULTS=Object.freeze({radius:67,strength:2.23,dispersionDuration:.53,returnDuration:1.15,returnDelay:.26,falloff:2,size:.7,spacing:3});
export const PARTICLE_PREVIOUS=Object.freeze({...PARTICLE_DEFAULTS,radius:76,strength:1,dispersionDuration:Math.log(20)/12,returnDuration:Math.log(20)/12,returnDelay:0});
export function createParticleWordmark({canvas,label='PEGASOFT',settings:initial=PARTICLE_DEFAULTS}){
 const context=canvas.getContext('2d'),document=canvas.ownerDocument;
 let disposed=false,points=[],width=1,height=1,pointer=null,dirty=true,settings={...PARTICLE_DEFAULTS,...initial};
 let pointerDistance=0,pointerAge=1,pointerSpeed=0,previousActivity=0;
 const radius=()=>settings.radius;
 function resize(){
  if(disposed||!context)return;
  width=canvas.clientWidth;height=canvas.clientHeight;const dpr=Math.min(2,document.defaultView.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);
  const mask=document.createElement('canvas');mask.width=Math.round(width);mask.height=Math.round(height);const ink=mask.getContext('2d');
  if(!ink)return;const size=Math.min(height*.88,width/(label.length*.67));ink.font=`750 ${size}px Manrope`;ink.textAlign='center';ink.textBaseline='middle';ink.fillText(label,width/2,height*.51);
  const pixels=ink.getImageData(0,0,mask.width,mask.height).data,spacing=width<600?settings.spacing*.75:settings.spacing;points=[];
  for(let y=0;y<height;y+=spacing)for(let x=0;x<width;x+=spacing)if(pixels[(Math.round(y)*mask.width+Math.round(x))*4+3]>100)points.push({x,y,homeX:x,homeY:y,returnAge:0});
  dirty=true;canvas.dataset.interactionRadius=String(radius());canvas.dataset.ready=String(points.length>0);canvas.dataset.points=points.length;
 }
 return {async mount(){await document.fonts.ready;if(!disposed)resize();},resize,setPointer(value){if(value){const distance=pointer?Math.hypot(value.x-pointer.x,value.y-pointer.y):settings.radius/2;if(distance>.01){pointerDistance+=distance;pointerAge=0;}}else{pointerDistance=0;pointerSpeed=0;pointerAge=1;}pointer=value;dirty=true;},
  configure(values){const previous=settings.spacing;for(const [key,value]of Object.entries(values))if(key in PARTICLE_DEFAULTS&&Number.isFinite(value))settings[key]=Math.max(key==='returnDelay'?0:.01,value);if(settings.spacing!==previous)resize();canvas.dataset.interactionRadius=String(radius());dirty=true;},
  get settings(){return {...settings};},
  render(dt=0,reduced=false){
   if(disposed||!context)return;const step=Math.max(0,dt),r=radius();
   if(step>0){if(pointerDistance>0){pointerSpeed=pointerDistance/step;pointerDistance=0;}else{pointerAge+=step;pointerSpeed*=Math.exp(-step/ .035);}}
   const activity=pointer&&!reduced&&pointerAge<.08?Math.min(1,pointerSpeed/120):0,slowing=activity<previousActivity||activity===0;previousActivity=activity;
   let movement=0,dispersing=0,returning=0;context.clearRect(0,0,width,height);context.fillStyle='#455d73';context.beginPath();
   for(const p of points){let tx=p.homeX,ty=p.homeY,active=false;if(pointer&&activity>0&&!reduced){const dx=tx-pointer.x,dy=ty-pointer.y,d=Math.hypot(dx,dy);if(d<r){const force=(1-d/r)**settings.falloff*r*settings.strength*activity;tx+=dx/(d||1)*force;ty+=dy/(d||1)*force;active=true;}}
    if(active){p.returnAge=0;dispersing++;}else p.returnAge+=step;
    const duration=active&&!slowing?settings.dispersionDuration:settings.returnDuration;
    const rate=reduced?1:!active&&!pointer&&p.returnAge<settings.returnDelay?0:1-Math.exp(-step*Math.log(20)/duration);
    p.x+=(tx-p.x)*rate;p.y+=(ty-p.y)*rate;
    if(!active&&Math.hypot(p.x-p.homeX,p.y-p.homeY)<.025){p.x=p.homeX;p.y=p.homeY;}
    const distance=Math.abs(p.x-p.homeX)+Math.abs(p.y-p.homeY);movement+=distance;if(!active&&distance>.01)returning++;
    context.moveTo(p.x+settings.size,p.y);context.arc(p.x,p.y,settings.size,0,Math.PI*2);
   }
   context.fill();dirty=movement>.1;canvas.dataset.pointerActivity=activity.toFixed(3);canvas.dataset.displacement=movement.toFixed(3);canvas.dataset.dispersing=dispersing;canvas.dataset.returning=returning;canvas.dataset.settings=JSON.stringify(settings);return dirty;
  },get dirty(){return dirty;},dispose(){disposed=true;points=[];if(context)context.clearRect(0,0,width,height);canvas.dataset.ready='false';canvas.dataset.disposed='true';}};
}
