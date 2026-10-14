/** DriftWall native adaptation of React Bits by David Haz (2026).
 * License: /licenses/react-bits.txt — MIT + Commons Clause.
 * This controller receives time from the application scheduler and owns no frame loop.
 */
import {createScope} from '../review/runtime-lifecycle.js';
export function createPartnerWall({element,button}){
 const document=element.ownerDocument,window=document.defaultView,scope=createScope(),catalog=element.querySelector('ol'),items=[...catalog.children];
 items.forEach(item=>item.removeAttribute('tabindex'));catalog.className='partner-wall__catalog';element.tabIndex=0;
 let mounted=false,columns=0,tracks=[],meta=[],offsets=[],velocities=[],paused=false,reduced=false,visible=false,hovered=-1,activeTile=null,focused=false,pointer={x:0,y:0},damped={x:0,y:0};
 const plane=document.createElement('div');plane.className='partner-wall__plane';plane.setAttribute('aria-hidden','true');
 function resize(){
  const count=window.innerWidth<=760?2:5;if(count===columns)return;release();
  const old=offsets.map((v,i)=>v/meta[i]);columns=count;plane.replaceChildren();tracks=[];meta=[];offsets=[];velocities=[];
  for(let c=0;c<count;c++){
   const col=document.createElement('div'),track=document.createElement('div');col.className='partner-wall__col';track.className='partner-wall__track';const group=items.filter((_,i)=>i%count===c),height=group.length*150,copies=Math.max(3,Math.ceil(element.clientHeight*1.8/height)+2);
   for(let copy=0;copy<copies;copy++)for(const original of group){const tile=original.cloneNode(true);tile.dataset.copy='true';tile.removeAttribute('tabindex');track.append(tile);}
   col.append(track);plane.append(col);tracks.push(track);meta.push(height);offsets.push(height*(old[c]??((c*.37)%1)));velocities.push(0);
  }
  paint();
 }
 function paint(){tracks.forEach((track,c)=>track.style.transform=`translate3d(0,${-offsets[c]}px,0)`);plane.style.transform=reduced?'none':`translate(-50%,-50%) scale(1.18) rotateX(${16+damped.y}deg) rotateY(${-14+damped.x}deg) translateZ(-120px)`;}
 function update({reducedMotion=reduced}={}){reduced=reducedMotion;element.dataset.reduced=String(reduced);const r=element.getBoundingClientRect();visible=r.bottom>0&&r.top<window.innerHeight;button.disabled=reduced;button.textContent=paused?'Resume partner motion':'Pause partner motion';button.setAttribute('aria-pressed',String(paused));paint();}
 function tick(dt){
  if(!mounted||scope.disposed||!visible||reduced||paused||focused)return;
  // A stable column hit surface must not move underneath a hovering pointer.
  if(hovered<0){const damping=1-Math.exp(-dt/.12);damped.x+=(pointer.x*4.8-damped.x)*damping;damped.y+=(-pointer.y*4.8-damped.y)*damping;}
  tracks.forEach((_,c)=>{const pseudo=((c*.6180339887+.35)%1)*2-1,target=c===hovered?0:42*(1+.45*pseudo)*(c%2?-1:1);velocities[c]+=(target-velocities[c])*(1-Math.exp(-dt/(target===0?.16:.28)));offsets[c]=((offsets[c]+velocities[c]*dt)%meta[c]+meta[c])%meta[c];});paint();
 }
 function release(){hovered=-1;activeTile=null;pointer={x:0,y:0};element.querySelectorAll('.is-active').forEach(el=>el.classList.remove('is-active'));}
 function mount(){if(mounted||scope.disposed)return;mounted=true;catalog.hidden=false;element.append(plane);resize();
  scope.listen(button,'click',()=>{paused=!paused;update();});
  scope.listen(element,'pointermove',event=>{
   if(reduced||event.pointerType==='touch')return;
   const r=element.getBoundingClientRect();pointer={x:(event.clientX-r.left)/r.width-.5,y:(event.clientY-r.top)/r.height-.5};
   const col=event.target.closest('.partner-wall__col'),index=col?tracks.findIndex(track=>track.parentElement===col):-1;
   // The raised tile can project beyond its base column. Keep ownership over its footprint too.
   const active=activeTile?.querySelector('.partner-wall__inner').getBoundingClientRect(),overActive=active&&event.clientX>=active.left&&event.clientX<=active.right&&event.clientY>=active.top&&event.clientY<=active.bottom;
   if(hovered>=0&&(index===hovered||overActive))return;
   element.querySelectorAll('.is-active').forEach(tile=>tile.classList.remove('is-active'));activeTile=null;hovered=index;
   if(index<0)return;
   velocities[index]=0;
   // Choose the visible row once; neither gaps nor its lift animation can change this owner.
   const tiles=[...tracks[index].children];activeTile=tiles.reduce((best,tile)=>{const bounds=tile.getBoundingClientRect(),distance=Math.abs((bounds.top+bounds.bottom)/2-event.clientY);return !best||distance<best.distance?{tile,distance}:best;},null)?.tile;
   activeTile?.classList.add('is-active');
  });
  scope.listen(element,'pointerleave',release);scope.listen(element,'focusin',()=>focused=true);scope.listen(element,'focusout',event=>{focused=element.contains(event.relatedTarget);});scope.listen(window,'blur',release);update();
 }
 return {mount,resize,update,tick,dispose(){scope.dispose();catalog.replaceChildren(...items);catalog.hidden=false;plane.remove();mounted=false;}};
}
