import {translate as t} from './locale-messages.js';
import {createScope} from '../review/runtime-lifecycle.js';
import {createParticleWordmark} from './particle-wordmark.js';
import {createPartnerWall} from './partner-wall.js';

const clamp=v=>Math.min(1,Math.max(0,v));
const sectors=['Fintech','Digital banking','Trade & transit','Health & wellness','Telecom','Booking & education'];
const services=['Product strategy','UX/UI design','Web engineering','Mobile applications','AI & automation','Cloud & platform'];
/** Native page content and pointer owner. Invoked by the existing journey scheduler. */
export function createWebsiteMotionController({root}){
 const scope=createScope(),document=root.ownerDocument,window=document.defaultView,$=s=>root.querySelector(s);
 const editorial=$('#insights'),closing=$('#closing-cta'),footer=$('#website-footer');if(!editorial||!closing||!footer)return null;
 const testimonials=$('#trust-evidence'),trust=$('#trust'),staticStory=$('#static-story');
 const wall=createPartnerWall({element:$('#partner-wall'),button:$('#partner-motion-toggle')});
 const fine=window.matchMedia('(hover:hover) and (pointer:fine)'),floating=$('#section-contact'),cursor=$('#closing-cursor'),trails=[...root.querySelectorAll('.closing-trail')];
 const header=$('#site-header'),headerContact=$('#site-header-contact'),headerLanguage=$('#site-header-language');let headerShown=true,headerReady=false,previousScroll=window.scrollY,scrollDirection=0,scrollTravel=0;
 function updateHeader(){
  if(!header)return;const y=Math.max(0,window.scrollY),delta=y-previousScroll;previousScroll=y;
  if(Math.abs(delta)>.1){const direction=Math.sign(delta);if(direction!==scrollDirection)scrollTravel=0;scrollDirection=direction;scrollTravel+=Math.abs(delta);if(scrollTravel>=4)headerShown=direction<0;}
  if(y<=4)headerShown=true;
  const opening=$('#opening-stage')?.dataset.motion;headerReady=headerReady||reduced||document.body.classList.contains('static-journey')||Boolean(opening&&JSON.parse(opening).opening.nav>=.95);
  const middle=header.clientHeight/2,stage=$('#stage'),stageRect=stage.getBoundingClientRect(),intro=$('#opening-stage'),introRect=intro?.getBoundingClientRect();let light=false;
  if(stageRect.top<=middle&&stageRect.bottom>middle){const motion=stage.dataset.motion&&JSON.parse(stage.dataset.motion);light=motion?.chapter==='handoff'||(motion?.chapter==='crossing'&&motion.jetProgress>.72);}
  else if(introRect&&introRect.top<=middle&&introRect.bottom>middle)light=Boolean(opening&&JSON.parse(opening).progress>=.19);
  else light=[$('#trust-evidence'),$('#partners'),$('#faq'),footer,...(!$('#static-story').hidden?[$('#static-story')]:[])].filter(Boolean).some(el=>{const r=el.getBoundingClientRect();return r.top<=middle&&r.bottom>middle;});
  header.dataset.tone=light?'light':'dark';
  const shown=headerReady&&(headerShown||header.contains(document.activeElement)||headerContact?.contains(document.activeElement)||headerLanguage?.contains(document.activeElement));header.dataset.ready=String(headerReady);header.dataset.visible=String(shown);header.inert=!shown;if(headerContact)headerContact.inert=!shown;if(headerLanguage)headerLanguage.inert=!shown;
 }
 let scrollAnchor;const wordmark=$('#particle-wordmark'),particles=createParticleWordmark({canvas:wordmark});
 let mounted=false,reduced=false,visible=false,closingVisible=false,footerVisible=false,elapsed=0,last=null,marqueeOffset=0,marqueePaused=false,mode='industries',selected=0;
 let positions=Array.from({length:trails.length+1},()=>({x:0,y:0})),pointerActive=false,pointer=null,keyboardActive=false;
 function paintPointer(bounds){
  if(!pointerActive)return;
  cursor.style.transform=`translate(${positions[0].x-bounds.left}px,${positions[0].y-bounds.top}px) translate(-50%,-50%)`;
  trails.forEach((trail,i)=>{const p=positions[i+1];trail.style.transform=`translate(${p.x-bounds.left}px,${p.y-bounds.top}px) translate(-50%,-50%)`;trail.style.opacity=String(.22*(1-i/trails.length));});
 }
 function syncPointer(bounds=closing.getBoundingClientRect()){
  const enabled=fine.matches&&!reduced&&bounds.width>760;
  const inside=enabled&&!keyboardActive&&pointer&&pointer.x>=bounds.left&&pointer.x<=bounds.right&&pointer.y>=Math.max(0,bounds.top)&&pointer.y<=Math.min(window.innerHeight,bounds.bottom);
  closing.dataset.pointerMode=String(enabled);closing.dataset.keyboard=String(keyboardActive);if(!enabled||keyboardActive)cursor.style.transform='';
  if(inside){if(!pointerActive)positions=positions.map(()=>({...pointer}));positions[0]={...pointer};}
  pointerActive=Boolean(inside);closing.dataset.pointer=String(pointerActive);
  if(pointerActive)paintPointer(bounds);else trails.forEach(trail=>trail.style.opacity='0');
 }
 function metrics(){syncPointer();}
 function selectPreview(index){selected=index;root.querySelectorAll('button[data-preview]').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));});root.querySelectorAll('[data-preview-image]').forEach((image,i)=>image.hidden=i!==index);editorial.dataset.preview=String(index);}
 function setMode(value){mode=value;marqueeOffset=0;const values=value==='industries'?sectors:services;root.querySelectorAll('[data-marquee-group]').forEach(group=>{group.replaceChildren(...values.map(text=>{const item=document.createElement('span');item.textContent=t(text);return item;}));});root.querySelectorAll('[data-footer-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.footerMode===value)));footer.dataset.mode=value;}
 function update({reducedMotion=reduced}={}){
  if(scope.disposed)return;reduced=reducedMotion||document.body.classList.contains('static-journey');const testimonialParent=reduced?staticStory:trust;if(testimonials.parentElement!==testimonialParent)testimonialParent.append(testimonials);wall.update({reducedMotion:reduced});const h=window.innerHeight,entry=editorial.getBoundingClientRect(),cta=closing.getBoundingClientRect(),end=footer.getBoundingClientRect();
  visible=entry.bottom>0&&entry.top<h;closingVisible=cta.bottom>0&&cta.top<h;footerVisible=end.bottom>0&&end.top<h;
  const arrival=clamp((h-entry.top)/(h*.85));editorial.style.setProperty('--arrival',reduced?1:arrival);editorial.style.setProperty('--arrival-shift',`${reduced?0:(1-arrival)*100}px`);
  const yielding=cta.top<h*.70,showLink=entry.top<h*.8&&!yielding;floating.hidden=!showLink;
  updateHeader();syncPointer(cta);closing.dataset.active=String(closingVisible);closing.dataset.reduced=String(reduced);footer.dataset.reduced=String(reduced);
  if(reduced){pointerActive=false;closing.dataset.pointer='false';$('#marquee-track').style.transform='none';particles.render(0,true);}
  const sections=[$('#trust-evidence'),$('#partners'),$('#faq'),editorial,closing,footer].filter(Boolean),coverage=el=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(h,r.bottom)-Math.max(0,r.top));},owner=sections.reduce((best,el)=>coverage(el)>coverage(best)?el:best,editorial),r=owner.getBoundingClientRect();scrollAnchor={element:owner,fraction:-r.top/Math.max(1,r.height)};
  root.dataset.websiteMotion=JSON.stringify({editorial:arrival,visible,closingVisible,footerVisible,headerCta:showLink,selected,mode,reduced,elapsed});
 }
 function resize(){metrics();particles.resize();wall.resize();update();}
 function tick(now){
  const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;if(scope.disposed||!mounted)return;updateHeader();wall.tick(dt);if(reduced)return;elapsed+=dt;
  if(closingVisible){
   const bounds=closing.getBoundingClientRect();syncPointer(bounds);
   if(pointerActive){trails.forEach((_,i)=>{const p=positions[i+1],ahead=positions[i];p.x+=(ahead.x-p.x)*(1-Math.exp(-dt*11));p.y+=(ahead.y-p.y)*(1-Math.exp(-dt*11));});paintPointer(bounds);}
   $('#closing-rings').style.transform=`scale(${.88+.09*Math.sin(elapsed*.62)})`;
  }
  if(footerVisible){if(!marqueePaused){const width=$('[data-marquee-group]').getBoundingClientRect().width;if(width>0)marqueeOffset=(marqueeOffset+dt*38)%width;$('#marquee-track').style.transform=`translateX(${-marqueeOffset}px)`;}particles.render(dt);}
 }
 function contact(event){event.preventDefault();const target=$('#contact');target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});target.focus({preventScroll:true});}
 function mount(){
  if(mounted||scope.disposed)return;mounted=true;wall.mount();scope.defer(()=>wall.dispose());metrics();selectPreview(0);setMode(mode);
  for(const target of [header,headerContact,headerLanguage])if(target){scope.listen(target,'focusin',updateHeader);scope.listen(target,'focusout',updateHeader);}
  scope.listen(window,'pointermove',event=>{if(event.pointerType==='touch')return;pointer={x:event.clientX,y:event.clientY};keyboardActive=false;syncPointer();},{passive:true});
  scope.listen(document,'pointerleave',()=>{pointer=null;syncPointer();});
  scope.listen(window,'blur',()=>{pointer=null;syncPointer();});
  scope.listen(closing,'pointerenter',event=>{if(event.pointerType==='touch')return;pointer={x:event.clientX,y:event.clientY};keyboardActive=false;syncPointer();});
  scope.listen(closing,'pointerleave',()=>{pointerActive=false;closing.dataset.pointer='false';trails.forEach(trail=>trail.style.opacity='0');});
  scope.listen(closing,'click',event=>{if(pointerActive&&!event.target.closest('[data-contact-action]'))contact(event);});
  scope.listen(cursor,'focus',()=>{keyboardActive=true;syncPointer();});
  scope.listen(cursor,'blur',()=>{keyboardActive=false;syncPointer();});
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
 return {mount,update,resize,tick,pause(){last=null;},dispose(){scope.dispose();floating.hidden=true;if(header){header.dataset.visible='false';header.inert=true;}if(headerContact)headerContact.inert=true;if(headerLanguage)headerLanguage.inert=true;mounted=false;},get scrollAnchor(){return scrollAnchor;},get mounted(){return mounted}};
}
