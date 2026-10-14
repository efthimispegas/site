import {createScope} from '../review/runtime-lifecycle.js';
import {createParticleWordmark} from './particle-wordmark.js';

const clamp=v=>Math.min(1,Math.max(0,v));
const sectors=['Fintech','Digital banking','Trade & transit','Health & wellness','Telecom','Booking & education'];
const services=['Product strategy','UX/UI design','Web engineering','Mobile applications','AI & automation','Cloud & platform'];
/** Native page content and pointer owner. Invoked by the existing journey scheduler. */
export function createWebsiteMotionController({root}){
 const scope=createScope(),document=root.ownerDocument,window=document.defaultView,$=s=>root.querySelector(s);
 const editorial=$('#insights'),closing=$('#closing-cta'),footer=$('#website-footer');if(!editorial||!closing||!footer)return null;
 const fine=window.matchMedia('(hover:hover) and (pointer:fine)'),floating=$('#section-contact'),cursor=$('#closing-cursor'),trails=[...root.querySelectorAll('.closing-trail')];
 let scrollAnchor;const wordmark=$('#particle-wordmark'),particles=createParticleWordmark({canvas:wordmark});
 let mounted=false,reduced=false,visible=false,closingVisible=false,footerVisible=false,elapsed=0,last=null,marqueeOffset=0,marqueePaused=false,mode='industries',selected=0;
 let target={x:0,y:0},positions=Array.from({length:trails.length+1},()=>({x:0,y:0})),pointerActive=false;
 function metrics(){const bounds=closing.getBoundingClientRect();target={x:bounds.width*.20,y:bounds.height*.50};positions=positions.map(()=>({...target}));}
 function selectPreview(index){selected=index;root.querySelectorAll('button[data-preview]').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));});root.querySelectorAll('[data-preview-image]').forEach((image,i)=>image.hidden=i!==index);editorial.dataset.preview=String(index);}
 function setMode(value){mode=value;marqueeOffset=0;const values=value==='industries'?sectors:services;root.querySelectorAll('[data-marquee-group]').forEach(group=>{group.replaceChildren(...values.map(text=>{const item=document.createElement('span');item.textContent=text;return item;}));});root.querySelectorAll('[data-footer-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.footerMode===value)));footer.dataset.mode=value;}
 function update({reducedMotion=reduced}={}){
  if(scope.disposed)return;reduced=reducedMotion;const h=window.innerHeight,entry=editorial.getBoundingClientRect(),cta=closing.getBoundingClientRect(),end=footer.getBoundingClientRect();
  visible=entry.bottom>0&&entry.top<h;closingVisible=cta.bottom>0&&cta.top<h;footerVisible=end.bottom>0&&end.top<h;
  const arrival=clamp((h-entry.top)/(h*.85));editorial.style.setProperty('--arrival',reduced?1:arrival);editorial.style.setProperty('--arrival-shift',`${reduced?0:(1-arrival)*100}px`);
  const yielding=cta.top<h*.70,showLink=entry.top<h*.8&&!yielding;floating.hidden=!showLink;
  closing.dataset.active=String(closingVisible);closing.dataset.reduced=String(reduced);footer.dataset.reduced=String(reduced);
  if(reduced){pointerActive=false;closing.dataset.pointer='false';$('#marquee-track').style.transform='none';particles.render(0,true);}
  const sections=[editorial,closing,footer],coverage=el=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(h,r.bottom)-Math.max(0,r.top));},owner=sections.reduce((best,el)=>coverage(el)>coverage(best)?el:best,editorial),r=owner.getBoundingClientRect();scrollAnchor={element:owner,fraction:-r.top/Math.max(1,r.height)};
  root.dataset.websiteMotion=JSON.stringify({editorial:arrival,visible,closingVisible,footerVisible,headerCta:showLink,selected,mode,reduced,elapsed});
 }
 function resize(){metrics();particles.resize();update();}
 function tick(now){
  const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;if(scope.disposed||!mounted||reduced)return;elapsed+=dt;
  if(closingVisible){
   const rate=1-Math.exp(-dt*17);positions[0].x+=(target.x-positions[0].x)*rate;positions[0].y+=(target.y-positions[0].y)*rate;
   cursor.style.transform=`translate(${positions[0].x}px,${positions[0].y}px) translate(-50%,-50%)`;
   trails.forEach((trail,i)=>{const p=positions[i+1],ahead=positions[i];p.x+=(ahead.x-p.x)*(1-Math.exp(-dt*11));p.y+=(ahead.y-p.y)*(1-Math.exp(-dt*11));trail.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;trail.style.opacity=pointerActive?String(.22*(1-i/trails.length)):0;});
   $('#closing-rings').style.transform=`scale(${.88+.09*Math.sin(elapsed*.62)})`;
  }
  if(footerVisible){if(!marqueePaused){const width=$('[data-marquee-group]').getBoundingClientRect().width;if(width>0)marqueeOffset=(marqueeOffset+dt*38)%width;$('#marquee-track').style.transform=`translateX(${-marqueeOffset}px)`;}particles.render(dt);}
 }
 function contact(event){event.preventDefault();const target=$('#contact');target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});target.focus({preventScroll:true});}
 function mount(){
  if(mounted||scope.disposed)return;mounted=true;metrics();selectPreview(0);setMode(mode);
  scope.listen(closing,'pointermove',event=>{if(!fine.matches||reduced||event.pointerType==='touch'||closing.clientWidth<=760)return;const r=closing.getBoundingClientRect();target={x:Math.min(r.width-60,Math.max(60,event.clientX-r.left)),y:Math.min(r.height-60,Math.max(60,event.clientY-r.top))};pointerActive=true;closing.dataset.pointer='true';});
  scope.listen(closing,'pointerleave',()=>{pointerActive=false;closing.dataset.pointer='false';metrics();});
  scope.listen(closing,'click',event=>{if(pointerActive&&!event.target.closest('[data-contact-action]'))contact(event);});
  scope.listen(cursor,'focus',()=>{pointerActive=false;closing.dataset.pointer='false';metrics();});
  root.querySelectorAll('[data-contact-action]').forEach(link=>scope.listen(link,'click',contact));
  root.querySelectorAll('button[data-preview]').forEach((button,i)=>{for(const event of ['pointerenter','focus','click'])scope.listen(button,event,()=>selectPreview(i));});
  root.querySelectorAll('[data-footer-mode]').forEach(button=>scope.listen(button,'click',()=>setMode(button.dataset.footerMode)));
  const marquee=$('#marquee');scope.listen(marquee,'pointerenter',()=>marqueePaused=true);scope.listen(marquee,'pointerleave',()=>marqueePaused=false);scope.listen(marquee,'focusin',()=>marqueePaused=true);scope.listen(marquee,'focusout',()=>marqueePaused=false);
  scope.listen(wordmark,'pointermove',event=>{if(!fine.matches||reduced||event.pointerType==='touch')return;const r=wordmark.getBoundingClientRect();particles.setPointer({x:event.clientX-r.left,y:event.clientY-r.top});});
  for(const event of ['pointerleave','blur'])scope.listen(wordmark,event,()=>particles.setPointer(null));
  scope.listen(wordmark,'focus',()=>{if(!reduced)particles.setPointer({x:wordmark.clientWidth/2,y:wordmark.clientHeight/2});});
  scope.listen(wordmark,'click',()=>particles.setPointer(null));
  scope.defer(()=>particles.dispose());
  particles.mount().then(()=>{if(!scope.disposed)update();});update();
 }
 return {mount,update,resize,tick,pause(){last=null;},dispose(){scope.dispose();floating.hidden=true;mounted=false;},get scrollAnchor(){return scrollAnchor;},get mounted(){return mounted}};
}
