import {chapters,duration} from './transport-timeline.js';
import {storyTime} from '../review/ship-integration-sequence.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export function mobileJourneyProgress(chapter,p){
 const i=chapters.findIndex(c=>c.id===chapter),start=chapters.slice(0,i).reduce((n,c)=>n+c.duration,0);
 return (start+(i===0?p*18.75:i===1?storyTime(p):p*26))/duration;
}
/** Content and scene share one reversible native-scroll map; no extra easing clock. */
export function createMobileScrollTimeline(height,{road=0,ship=0}={}){
 let pixels=0;const points=[{progress:0,pixels:0}];
 const add=(chapter,p,span)=>{pixels+=span;points.push({progress:mobileJourneyProgress(chapter,p),pixels});};
 add('handoff',.22,height*1.1);add('handoff',.35,height*.65);add('handoff',.60,height*1.2);
 add('handoff',.91,height+road);add('handoff',.97,height*.7);
 add('ship',.22,height*.9);add('ship',.38,height*.5);
 const reading=height+ship;
 add('ship',.84,reading*(.84-.38)/.62);add('crossing',.54,reading*.16/.62);
 add('crossing',1,height*1.35);
 function interpolate(value,key,out){
  if(value<=0)return 0;if(value>=points.at(-1)[key])return points.at(-1)[out];
  const i=points.findIndex(p=>p[key]>=value),a=points[i-1],b=points[i];
  return a[out]+(b[out]-a[out])*clamp((value-a[key])/(b[key]-a[key]));
 }
 return {distance:pixels,points,progressAt:offset=>interpolate(offset,'pixels','progress'),offsetAt:progress=>interpolate(progress,'progress','pixels')};
}
