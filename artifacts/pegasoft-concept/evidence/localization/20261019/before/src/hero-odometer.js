/** Vanilla DOM adapter of the user-supplied React Bits Counter (JS + CSS).
 * Numeric places, near-integer rounding and ten vertically wrapped glyphs
 * retain the component's scheme. The app scheduler drives the spring directly.
 */
export function digitOffset(value,digit){return ((digit-value%10+15)%10)-5;}
export function normalizeNearInteger(num){const nearest=Math.round(num),tolerance=1e-9*Math.max(1,Math.abs(num));return Math.abs(num-nearest)<tolerance?nearest:num;}
export const roundedToPlace=(value,place)=>Math.floor(normalizeNearInteger(value/place));
export function counterPlaces(value){
 const characters=String(value).split(''),decimal=characters.indexOf('.');
 return characters.map((ch,i,a)=>ch==='.'?'.':10**(decimal===-1?a.length-i-1:i<decimal?decimal-i-1:-(i-decimal)));
}
// Analytic underdamped spring. Retargeting retains velocity; no extra frame loop.
// Damping ratio .5 gives a visible overshoot followed by a diminishing bounce.
export function settleWheel(current,velocity,target,dt,{stiffness=100,damping=10,mass=1}={}){
 const decay=damping/(2*mass),frequency=Math.sqrt(stiffness/mass-decay*decay),x=current-target,t=Math.max(0,dt);
 const a=(velocity+decay*x)/frequency,s=Math.sin(frequency*t),c=Math.cos(frequency*t),e=Math.exp(-decay*t);
 const displacement=e*(x*c+a*s),speed=e*(-decay*(x*c+a*s)+frequency*(-x*s+a*c));
 if(Math.abs(displacement)<.0001&&Math.abs(speed)<.001)return {value:target,velocity:0};
 return {value:target+displacement,velocity:speed};
}
export function createCounter(element,{value,places=counterPlaces(value),padding=0,gap=8,borderRadius=4,horizontalPadding=8,textColor='inherit',fontWeight='inherit',fontSize=100,containerStyle={},counterStyle={},digitStyle={},gradientHeight=16,gradientFrom='black',gradientTo='transparent',topGradientStyle={},bottomGradientStyle={},suffix=''}={}){
 const document=element.ownerDocument;let disposed=false;
 element.textContent='';element.setAttribute('role','img');element.classList.add('counter-container');Object.assign(element.style,containerStyle);
 if(fontSize!=null)element.style.fontSize=fontSize+'px';
 const inner=document.createElement('span');inner.className='counter-counter';Object.assign(inner.style,{gap:gap+'px',borderRadius:borderRadius+'px',paddingLeft:horizontalPadding+'px',paddingRight:horizontalPadding+'px',color:textColor,fontWeight,...counterStyle});element.append(inner);
 const wheels=places.map(place=>{
  const column=document.createElement('span');column.className='counter-digit';column.setAttribute('aria-hidden','true');Object.assign(column.style,digitStyle);inner.append(column);
  if(place==='.'){column.textContent='.';column.style.width='fit-content';return {place,column};}
  const glyphs=Array.from({length:10},(_,digit)=>{const glyph=document.createElement('span');glyph.className='counter-number';glyph.textContent=digit;column.append(glyph);return glyph;});
  return {place,column,glyphs,value:0,velocity:0};
 });
 const gradients=document.createElement('span');gradients.className='gradient-container';gradients.setAttribute('aria-hidden','true');inner.append(gradients);
 for(const [name,direction,style]of [['top','bottom',topGradientStyle],['bottom','top',bottomGradientStyle]]){const overlay=document.createElement('span');overlay.className=name+'-gradient';Object.assign(overlay.style,{height:gradientHeight+'px',background:`linear-gradient(to ${direction},${gradientFrom},${gradientTo})`,...style});gradients.append(overlay);}
 if(suffix){const unit=document.createElement('span');unit.className='counter-suffix';unit.setAttribute('aria-hidden','true');unit.textContent=suffix;element.append(unit);}
 function resize(){const height=parseFloat(getComputedStyle(element).fontSize)+padding;for(const wheel of wheels)wheel.column.style.height=height+'px';}
 return {resize,render(target,dt=0,reduced=false){
  if(disposed)return;const rounded=Math.round(target*10)/10;element.setAttribute('aria-label',String(rounded)+suffix);element.dataset.target=rounded;
  const targets=[],values=[];
  for(const wheel of wheels){
   if(wheel.place==='.')continue;const n=roundedToPlace(rounded,wheel.place),next=reduced?{value:n,velocity:0}:settleWheel(wheel.value,wheel.velocity,n,dt);
   wheel.value=next.value;wheel.velocity=next.velocity;targets.push(n);values.push(wheel.value);
   wheel.glyphs.forEach((glyph,digit)=>glyph.style.transform=`translateY(${digitOffset(wheel.value,digit)*100}%)`);
  }
  element.dataset.wheels=JSON.stringify(values);element.dataset.wheelTargets=JSON.stringify(targets);
 },dispose(){disposed=true;}};
}
