// Independent review implementation of vertically rolling decimal wheels.
// Reference: React Bits Counter; no React/runtime dependency is introduced.
export function digitOffset(value,digit){return ((digit-value%10+15)%10)-5;}
export function settleWheel(current,velocity,target,dt,frequency=20){
 const displacement=current-target,term=velocity+frequency*displacement,decay=Math.exp(-frequency*Math.max(0,dt));
 return {value:target+(displacement+term*dt)*decay,velocity:(velocity-frequency*term*dt)*decay};
}
export function createOdometer(element,finalValue){
 const document=element.ownerDocument;
 const places=String(finalValue).split('').map((_,i,a)=>10**(a.length-i-1));
 element.textContent='';element.setAttribute('role','img');
 const wheels=places.map(place=>{
  const column=document.createElement('span');column.className='counter-wheel';column.setAttribute('aria-hidden','true');
  const glyphs=Array.from({length:10},(_,digit)=>{const glyph=document.createElement('span');glyph.className='counter-glyph';glyph.textContent=digit;column.append(glyph);return glyph;});
  element.append(column);return {place,glyphs,value:0,velocity:0};
 });
 return {render(value,dt=0,reduced=false){
  element.setAttribute('aria-label',String(Math.round(value)));element.dataset.target=value;
  for(const wheel of wheels){
   const target=Math.floor(value/wheel.place);
   const next=reduced?{value:target,velocity:0}:settleWheel(wheel.value,wheel.velocity,target,dt);
   wheel.value=Math.abs(next.value-target)<1e-5?target:next.value;wheel.velocity=next.velocity;
   wheel.glyphs.forEach((glyph,digit)=>glyph.style.transform=`translateY(${digitOffset(wheel.value,digit)*100}%)`);
  }
  element.dataset.wheels=JSON.stringify(wheels.map(x=>x.value));
 }};
}
