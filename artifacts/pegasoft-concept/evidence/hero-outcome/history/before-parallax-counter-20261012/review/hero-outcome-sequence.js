import {clamp,smooth} from './hero-opening-sequence.js';

// Physical scroll owns the exit, atmosphere and outcome. Time owns only the
// accepted opening and continuous globe rotation; no camera fit is performed.
export const EXIT_DEFAULTS=Object.freeze({textEnd:.20,wipeStart:.10,wipeEnd:.44,outcomeStart:.43,titlePin:.68});
export function exitState(progress,settings=EXIT_DEFAULTS,reduced=false){
 const p=clamp(progress),s={...EXIT_DEFAULTS,...settings};
 const track=(a,b)=>smooth((p-a)/(b-a));
 const wipe=track(s.wipeStart,s.wipeEnd);
 const titleTravel=clamp((p-s.outcomeStart)/(s.titlePin-s.outcomeStart));
 const metricTravel=clamp((p-s.outcomeStart)/(1-s.outcomeStart));
 const showOutcome=p>=s.outcomeStart;
 const state={progress:p,lineExit:[0,.025,.05].map(delay=>track(delay,s.textEnd+delay)),utilityExit:track(.025,.20),globeOpacity:1-track(.24,.46),horizonY:1.05-3.05*wipe,outcomeActive:showOutcome,titleY:1.10-.90*titleTravel,metricsY:1.12-2.46*metricTravel,counts:[1,2,3].map((n,i)=>Math.round(n*track(.46+i*.17,.56+i*.17))),phase:p<.10?'Hero · line exit':p<s.wipeEnd?'Atmospheric horizon':p<s.titlePin?'Outcome · statement arrives':p<.88?'Pinned statement · metric travel':'Outcome · final principle'};
 if(reduced){state.lineExit=[p>0?1:0,p>0?1:0,p>0?1:0];state.utilityExit=p>0?1:0;state.globeOpacity=p>0?0:1;state.horizonY=p>0?-2:1.05;state.outcomeActive=p>0;state.titleY=.16;state.metricsY=.16;state.counts=[1,2,3];state.phase='Reduced motion · static chapter';}
 return state;
}
