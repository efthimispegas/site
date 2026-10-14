import {clamp,smooth} from './hero-opening-sequence.js';

// Physical scroll owns the exit, atmosphere and outcome. Time owns only the
// accepted opening and continuous globe rotation; no camera fit is performed.
export const EXIT_DEFAULTS=Object.freeze({textEnd:.20,wipeStart:.10,wipeEnd:.27,outcomeStart:.30,titlePin:.59});
export function exitState(progress,settings=EXIT_DEFAULTS,reduced=false){
 const p=clamp(progress),s={...EXIT_DEFAULTS,...settings};
 const track=(a,b)=>smooth((p-a)/(b-a));
 const wipe=track(s.wipeStart,s.wipeEnd);
 const titleTravel=clamp((p-s.outcomeStart)/(s.titlePin-s.outcomeStart));
 const metricTravel=clamp((p-s.outcomeStart)/(1-s.outcomeStart));
 const showOutcome=p>=s.outcomeStart;
 const state={progress:p,lineExit:[0,.025,.05].map(delay=>track(delay,s.textEnd+delay)),utilityExit:track(.025,.20),globeOpacity:1-track(.24,.27),sectionTravel:wipe,heroParallaxY:-.22*wipe,heroMaskBottom:1-.78*wipe,horizonY:-1-1.4*wipe*wipe,outcomeActive:showOutcome,titleY:1-.80*titleTravel,metricsY:1-2.34*metricTravel,counts:[1,2,3].map((n,i)=>Math.round(n*track(.36+i*.19,.48+i*.19))),phase:p<.10?'Hero · line exit':p<s.wipeEnd?'Atmospheric horizon':p<s.titlePin?'Outcome · statement arrives':p<.88?'Pinned statement · metric travel':'Outcome · final principle'};
 if(reduced){state.lineExit=[p>0?1:0,p>0?1:0,p>0?1:0];state.utilityExit=p>0?1:0;state.globeOpacity=p>0?0:1;state.sectionTravel=p>0?1:0;state.heroParallaxY=0;state.heroMaskBottom=p>0?0:1;state.horizonY=p>0?-2.4:-1;state.outcomeActive=p>0;state.titleY=.16;state.metricsY=.16;state.counts=[1,2,3];state.phase='Reduced motion · static chapter';}
 return state;
}
