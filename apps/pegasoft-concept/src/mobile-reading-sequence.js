import {chapters,duration,handoffEnd,scrollAtProgress} from './transport-timeline.js';
import {storyTime as shipTime} from '../review/ship-integration-sequence.js';
import {jetStart,jetDuration} from '../review/ship-jet-sequence.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const progressBetween=(position,start,end)=>clamp((position-start)/(end-start));
/** Presentation only: the renderer and chapter clocks never consume this state. */
export function mobileReadingState(trace,storyHeight){
 if(!trace||!Number.isFinite(trace.journeyProgress))return {section:'services',progress:0};
 const roadStart=scrollAtProgress(chapters[0].duration*.91/handoffEnd/duration,storyHeight);
 const shipStart=scrollAtProgress((chapters[0].duration+shipTime(.44))/duration,storyHeight);
 const trustStart=scrollAtProgress((chapters[0].duration+chapters[1].duration+jetStart+.23*jetDuration)/duration,storyHeight);
 const end=scrollAtProgress(1,storyHeight),position=scrollAtProgress(trace.journeyProgress,storyHeight);
 // Each content rail moves at a constant rate per scroll pixel across its
 // whole scene. The road rate stays continuous at the handoff/ship join.
 if(position<roadStart)return {section:'services',progress:progressBetween(position,0,roadStart)};
 if(position<shipStart)return {section:'road',progress:progressBetween(position,roadStart,shipStart)};
 if(position<trustStart)return {section:'ship',progress:progressBetween(position,shipStart,trustStart)};
 return {section:'trust',progress:progressBetween(position,trustStart,end)};
}
/** Same inputs always return the same offset, including backward scrolling. */
export function mobileReadingOffset(progress,contentHeight,viewportHeight){
 const position=clamp(progress),travel=contentHeight-viewportHeight;
 // Short final chapters enter from the bottom and finish at the top; longer
 // chapters reveal their final line at the bottom exactly at their scene end.
 return travel>0?-travel*position||0:-travel*(1-position)||0;
}
