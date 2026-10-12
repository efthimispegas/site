import {ease} from './handoff-sequence.js';
export function shipContentLayout(progress,width,height,hull,cardWidth){
 const u=Math.max(0,Math.min(1,(progress-.60)/.40)),close=ease((progress-.60)/.18),gap=Math.max(12,width*.022);
 const left=hull.left-gap-cardWidth,right=hull.right+gap;
 const items=Array.from({length:5},(_,i)=>{
  const row=Math.floor(i/2),side=i===4?'centre':i%2?'right':'left';
  const destination=side==='centre'?(width-cardWidth)/2:side==='left'?left:right;
  const origin=side==='centre'?destination:side==='left'?-cardWidth-24:width+24;
  let y=height*(.92+row*.66-u*1.42);
  if(side==='centre')y=Math.max(y,hull.bottom+gap*.55);
  return {side,x:origin+(destination-origin)*close,y,width:cardWidth,hullGap:gap};
 });
 return {visible:progress>.60,entry:.60,closingComplete:.78,titleY:height*(1.05-u*1.32),items};
}
