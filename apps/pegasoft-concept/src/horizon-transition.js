import {INTRO_GATES,introState} from './intro-sequence.js';

/** Same horizon travel and scroll span, rotated into the incoming dark chapter. */
export function invertedHorizonLayout(top,height,{reduced=false}={}){
 const span=INTRO_GATES.horizonEnd-INTRO_GATES.horizonStart,runway=height*4.2*2*span;
 const progress=Math.min(1,Math.max(0,1-top/runway));
 const originY=(introState(INTRO_GATES.horizonStart+span*progress).horizonY+1.2)*height;
 return {progress,originY,translateY:originY-top,active:!reduced&&top>0&&top<runway};
}
