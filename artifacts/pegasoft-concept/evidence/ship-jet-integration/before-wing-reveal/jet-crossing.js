const clamp=x=>Math.max(0,Math.min(1,x));
// Exact accepted isolated-crossing translation, scale and reveal landmark.
export function jetPose(p,w,h){
 const scale=1+.3*p,x=(-1.1+2.245*p)*w,y=(h-w*(9/16)*scale)/2,edge=x+.55*w*scale;
 return {progress:p,scale,x,y,edge,reveal:clamp(edge/w)};
}
export async function createJetCrossing(stage,onChange){
 const $=s=>document.querySelector(s),response=await fetch('../generation/jet-family/shadow-measurements-approval.json');
 if(!response.ok)throw Error('Approved jet shadow settings unavailable');
 const approval=await response.json(),preset=approval.preset;
 const defaults={x:preset.transform_x_px,y:preset.transform_y_px,width:preset.width_percent,height:preset.height_percent,blur:preset.blur_px,opacity:preset.opacity_percent,visible:preset.visible};
 const key='pegasoft-concept.connected-jet-shadow.v1-approved';let settings={...defaults},trace;
 await $('#jet').decode();
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved)for(const name of Object.keys(defaults)){if(name==='visible'){if(typeof saved.visible==='boolean')settings.visible=saved.visible;}else{const field=$('[data-shadow="'+name+'"]');if(Number.isFinite(saved[name])&&saved[name]>=Number(field.min)&&saved[name]<=Number(field.max))settings[name]=saved[name];}}}catch{}
 function sync(){for(const field of document.querySelectorAll('input[data-shadow],input[data-slider]'))field.value=settings[field.dataset.shadow||field.dataset.slider];$('#shadow-visible').checked=settings.visible;}
 function save(){try{localStorage.setItem(key,JSON.stringify(settings));}catch{$('#shadow-message').textContent='Local saving unavailable; copy the settings.';}}
 for(const field of document.querySelectorAll('input[data-shadow],input[data-slider]'))field.addEventListener('input',()=>{
  if(field.value==='')return;const name=field.dataset.shadow||field.dataset.slider,value=Number(field.value);if(!Number.isFinite(value)||value<Number(field.min)||value>Number(field.max))return;
  settings[name]=value;sync();save();$('#shadow-message').textContent='';onChange();
 });
 $('#shadow-visible').onchange=()=>{settings.visible=$('#shadow-visible').checked;save();onChange();};
 $('#shadow-reset').onclick=()=>{settings={...defaults};sync();save();onChange();$('#shadow-message').textContent='Approved shadow preset restored.';};
 $('#shadow-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#shadow-json').value);$('#shadow-message').textContent='Measurements copied.';}catch{$('#shadow-json').parentElement.open=true;$('#shadow-json').focus();$('#shadow-json').select();$('#shadow-message').textContent='Select and copy the settings below.';}};
 sync();
 function apply(p,gentle=false){
  const w=stage.clientWidth,h=stage.clientHeight,pose=jetPose(p,w,h),{x,y,scale,edge}=pose,shadow=$('#shadow');
  $('#aircraft').style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';
  shadow.style.transform='translate('+settings.x/scale+'px,'+settings.y/scale+'px) scale('+settings.width/100+','+settings.height/100+')';shadow.style.filter='blur('+settings.blur/scale+'px)';shadow.style.opacity=settings.visible?settings.opacity/100:0;
  $('#trust').style.clipPath=gentle?'inset(0)':'inset(0 '+Math.max(0,w-clamp(edge/w)*w)+'px 0 0)';
  $('#aircraft').style.visibility=gentle?'hidden':'visible';$('#aircraft').setAttribute('aria-hidden',String(gentle||p===0||p===1));$('#trust').setAttribute('aria-hidden',String(!gentle&&edge<=0));
  const footprint={width:w*scale*settings.width/100,height:w*(9/16)*scale*settings.height/100},center={x:x+w*scale/2+settings.x,y:y+w*(9/16)*scale/2+settings.y},round=n=>Math.round(n*100)/100;
  $('#shadow-metrics').textContent='Footprint '+round(footprint.width)+' × '+round(footprint.height)+' px · Center ('+round(center.x)+', '+round(center.y)+')';
  $('#shadow-json').value=JSON.stringify({asset:'J02-overhead.png',units:'displayed scene pixels; sizes are percent of aircraft canvas',transformX:settings.x,transformY:settings.y,widthPercent:settings.width,heightPercent:settings.height,blur:settings.blur,opacity:settings.opacity/100,visible:settings.visible,color:preset.color,scene:{width:w,height:round(h)},crossingProgress:round(p),footprint:{width:round(footprint.width),height:round(footprint.height)},center:{x:round(center.x),y:round(center.y)}},null,2);
  trace={...pose,shadow:{...settings},footprint,center,gentle};stage.dataset.jet=JSON.stringify(trace);return trace;
 }
 return {apply};
}
