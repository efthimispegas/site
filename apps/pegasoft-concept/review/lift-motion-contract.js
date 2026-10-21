import {motionData as data} from './lift-motion-data.js';
const sourceOffsetVH=100/(typeof window==='undefined'?720:window.innerHeight);
export const motionSpanVH=150+sourceOffsetVH+(350-sourceOffsetVH)*176/225;
export const reviewDuration=9.13; // selectable inspection tempo, never a source wall-clock claim
export const sample=(array,index)=>{const n=Math.max(0,Math.min(array.length-1,index)),i=Math.floor(n);return array[i]+(array[Math.min(i+1,array.length-1)]-array[i])*(n-i);};
export function motionAt(progress){
 const p=Math.max(0,Math.min(1,progress)),vh=-50+p*motionSpanVH,frame=Math.max(0,(vh-100-sourceOffsetVH)/(350-sourceOffsetVH)*225),liftIndex=Math.min(79,frame),pivotIndex=Math.max(0,Math.min(96,frame-80)),attached=frame>=40-1e-9&&vh>=100;
 let balance=attached&&frame<80?sample(data.spreader_balance_degrees,liftIndex):frame>=80?data.spreader_balance_degrees.at(-1)*Math.max(0,1-pivotIndex/8)**2:0;
 const rollPhase=Math.max(0,Math.min(1,(vh-250)/83.125)),rollKeys=[[0,0],[.3,.5],[.7,-3],[1,0]];let roll=0;for(let n=1;n<rollKeys.length;n++){const[a,x]=rollKeys[n-1],[b,y]=rollKeys[n];if(rollPhase>=a&&rollPhase<=b)roll=x+(y-x)*(rollPhase-a)/(b-a);}
 return {progress:p,vh,frame,attached,elevation:vh<100?27:sample(data.lift_elevation_degrees_above_approved_pose,liftIndex),middle:0,inner:0,balance,approachOffset:.75*(1-Math.max(0,Math.min(1,(vh+50)/150))),yaw:sample(data.camera_yaw_degrees,pivotIndex),cameraRoll:roll,phase:vh<100?'01 / Approach':frame<40?'02 / Align and attach':frame<80?'03 / Lift and settle':'04 / Camera pivot',referenceIndex:frame<80?`Lift ${Math.round(liftIndex)*2} / 158`:`Pivot ${Math.round(pivotIndex)} / 96`};
}
export const progressForFrame=frame=>(150+sourceOffsetVH+(350-sourceOffsetVH)*frame/225)/motionSpanVH;
export const settleWindow=[progressForFrame(36),progressForFrame(88)];
