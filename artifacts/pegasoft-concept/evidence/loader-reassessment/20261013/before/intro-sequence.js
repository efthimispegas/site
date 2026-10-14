import {clamp,smooth} from './hero-opening-sequence.js';

/** Local native-scroll progress; the accepted opening clock is independent. */
export const INTRO_GATES=Object.freeze({horizonStart:.10,horizonEnd:.27,outcomeStart:.285,titlePin:.59});
export const introScrollDistance=height=>height*4.2;
export function introState(progress){
 const p=clamp(progress),g=INTRO_GATES,wipe=smooth((p-g.horizonStart)/(g.horizonEnd-g.horizonStart));
 return {progress:p,wipe,horizonY:1.10-2.30*wipe,heroY:0,
  lineExit:[0,.015,.03].map(delay=>smooth((p-delay)/.15)),utilityExit:smooth((p-.025)/.135),
  titleY:p<g.outcomeStart?1.04-.10*clamp((p-g.horizonEnd)/(g.outcomeStart-g.horizonEnd)):.94-.74*clamp((p-g.outcomeStart)/(g.titlePin-g.outcomeStart)),
  outcomeActive:p>g.horizonEnd};
}
