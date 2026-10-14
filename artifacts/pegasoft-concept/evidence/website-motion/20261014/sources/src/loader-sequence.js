import {openingState,clamp,smooth} from './hero-opening-sequence.js';

import {APPROVED_LOADER_PRESET} from './approved-loader-preset.js';

export const LOADER_DEFAULTS=APPROVED_LOADER_PRESET;
export function loaderState(time,settings=LOADER_DEFAULTS,reduced=false){
 const s={...LOADER_DEFAULTS,...settings},state=openingState(time,s,reduced);
 const pulseAge=Math.max(0,time-s.pulseStart),arrival=smooth(pulseAge/s.pulseDuration),settleAge=Math.max(0,pulseAge-s.pulseDuration);
 const bounce=reduced||pulseAge<s.pulseDuration?0:s.bounce*Math.exp(-settleAge/Math.max(.01,s.settle))*Math.sin(settleAge/Math.max(.01,s.settle)*Math.PI*2);
 return {...state,ringScale:s.ringFrom+(s.ringTo-s.ringFrom)*smooth(time/s.ringEnd),ringOpacity:reduced?0:1-smooth((time-s.ringEnd+s.ringFadeLead)/s.ringFadeDuration),markOpacity:reduced?0:1-smooth((time-s.markStart)/s.markDuration),pulseScale:Math.max(0,arrival+bounce),pulseAge,phase:reduced?'Reduced motion':time<s.pulseStart?'Ring recession / mark fade':state.aperture<1?'Nested pulse / aperture':state.complete?'Opening complete':'Heading entrance',beatScale:1+s.beatAmount*(.5-.5*Math.cos(time/Math.max(.1,s.beatDuration)*Math.PI*2)),progress:clamp(time/state.end)};
}
