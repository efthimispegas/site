import {clamp,smooth} from './hero-opening-sequence.js';

/** Local native-scroll progress; the accepted opening clock is independent. */
export const INTRO_GATES=Object.freeze({horizonStart:.10,horizonEnd:.27,outcomeStart:.19,titlePin:.50});
const horizonSpan=INTRO_GATES.horizonEnd-INTRO_GATES.horizonStart;
/** Double only the horizon's physical scroll span: 50% response, no lag clock. */
export const introScrollDistance=height=>height*4.2*(1+horizonSpan);
export function introScrollAtProgress(progress,height){
 const p=clamp(progress),extra=clamp(p-INTRO_GATES.horizonStart,0,horizonSpan);
 return height*4.2*(p+extra);
}
export function introProgressAtScroll(offset,height){
 const p=offset/(height*4.2),start=INTRO_GATES.horizonStart;
 return clamp(p<=start?p:p<start+2*horizonSpan?start+(p-start)/2:p-horizonSpan);
}
export function introState(progress){
 const p=clamp(progress),g=INTRO_GATES,wipe=smooth((p-g.horizonStart)/(g.horizonEnd-g.horizonStart));
 return {progress:p,wipe,horizonY:1.10-2.30*wipe,heroY:0,
  lineExit:[0,.015,.03].map(delay=>smooth((p-delay)/.15)),utilityExit:smooth((p-.025)/.135),
  titleY:p<g.outcomeStart?1.04-.16*clamp((p-.17)/(g.outcomeStart-.17)):.88-.68*clamp((p-g.outcomeStart)/(g.titlePin-g.outcomeStart)),
  outcomeActive:p>.17};
}
