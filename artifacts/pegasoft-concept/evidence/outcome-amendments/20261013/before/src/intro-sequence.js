import {clamp,smooth} from './hero-opening-sequence.js';

/** Local native-scroll progress; the accepted opening clock is independent. */
export const INTRO_GATES=Object.freeze({horizonStart:.10,horizonEnd:.27,outcomeStart:.30,titlePin:.59});
export const introScrollDistance=height=>height*4.2;
export function introState(progress){
 const p=clamp(progress),g=INTRO_GATES,wipe=smooth((p-g.horizonStart)/(g.horizonEnd-g.horizonStart));
 return {progress:p,wipe,horizonY:1.10-2.30*wipe,heroY:0,
  lineExit:[0,.015,.03].map(delay=>smooth((p-delay)/.15)),utilityExit:smooth((p-.025)/.135),
  titleY:1-.80*clamp((p-g.outcomeStart)/(g.titlePin-g.outcomeStart)),
  metricsY:1-2.34*clamp((p-g.outcomeStart)/(1-g.outcomeStart)),
  outcomeActive:p>=g.outcomeStart,counts:[1,2,3].map((n,i)=>Math.round(n*smooth((p-.36-i*.19)/.12)))};
}
