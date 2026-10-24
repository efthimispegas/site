import {pageScroll} from './page-scroll.js';
/** Keep early touch inertia and restoration out of the opening's scroll clock. */
export function lockStartupScroll(document,scope){
 const window=document.defaultView,root=document.documentElement;
 if(window.__pegasoftStartupWatchdog)globalThis.clearTimeout(window.__pegasoftStartupWatchdog);
 let locked=true;root.classList.add('journey-booting');
 const prevent=event=>{if(locked&&event.cancelable)event.preventDefault();};
 scope.listen(document,'touchmove',prevent,{passive:false});
 scope.listen(document,'wheel',prevent,{passive:false});
 scope.listen(document,'keydown',event=>{
  if(locked&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)&&!event.target.closest?.('input,textarea,select,[contenteditable="true"]'))prevent(event);
 });
 function release(){if(!locked)return;locked=false;root.classList.remove('journey-booting');pageScroll(document).to({top:0,left:0,behavior:'instant'});}
 scope.defer(release);
 return {release,get locked(){return locked;}};
}
