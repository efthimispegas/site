import {ease} from './handoff-sequence.js';
export function shipContentLayout(progress,width,height,hull,cardWidth,headingHeight){
 const u=Math.max(0,Math.min(1,(progress-.60)/.40)),rowSpacing=.66*.8,gap=Math.max(12,width*.022);
 const left=hull.left-gap-cardWidth,right=hull.right+gap,titleY=height*(1-u*1.7),titleGap=height*.18,firstY=titleY+headingHeight+titleGap;
 const items=Array.from({length:5},(_,i)=>{
  const row=Math.floor(i/2),side=i===4?'centre':i%2?'right':'left';
  const entry=.60+((headingHeight+titleGap)/height+row*rowSpacing)/1.7*.40,close=ease((progress-entry)/.18);
  if(side==='centre')return {side,x:(width-cardWidth)/2,y:firstY+row*rowSpacing*height,width:cardWidth,hullGap:gap,entry,originCentre:width*.5,animated:true,visible:progress>=entry};
  const originCentre=width*(side==='left'?.25:.75),origin=originCentre-cardWidth/2,destination=side==='left'?left:right;
  let x=origin+(destination-origin)*close;
  // Retain hull clearance on narrow screens as the bottom entry becomes visible.
  if(progress>entry)x=side==='left'?Math.min(x,left):Math.max(x,right);
  return {side,x,y:firstY+row*rowSpacing*height,width:cardWidth,hullGap:gap,entry,close,originCentre,animated:true,visible:progress>=entry};
 });
 return {visible:progress>.60,entry:.60,rowSpacing,rowEntries:items.filter((_,i)=>i===0||i===2).map(item=>item.entry),titleY,titleGap,items};
}
