import {createJetCrossing,wingTrailingProfile} from '../review/jet-crossing.js';
import {mobileJetPose} from './mobile-reference-motion.js';
/** Homepage adapter; the frozen inspector and desktop passage stay original. */
export async function createMobileReferenceJet(stage,onChange,options){
 const original=await createJetCrossing(stage,onChange,options),root=options.root,$=s=>root.querySelector(s);
 function apply(p,gentle=false){
  const trace=original.apply(p,gentle),w=stage.clientWidth,h=stage.clientHeight;
  const inner=$('#trust .trust-inner'),evidence=$('#trust #trust-evidence');
  if(w>760){if(inner)inner.style.transform='';if(evidence)evidence.style.transform='';return trace;}
  const pose=mobileJetPose(p,w,h,wingTrailingProfile),{reveal,scale}=pose,settings=trace.shadow;
  $('#aircraft').style.transform=pose.transform;$('#shadow-aircraft').style.transform=pose.transform;
  const shadow=$('#shadow');shadow.style.transform=`translate(${settings.x/scale}px,${settings.y/scale}px) scale(${settings.width/100},${settings.height/100})`;shadow.style.filter=`blur(${settings.blur/scale}px)`;
  $('#trust').style.clipPath=gentle?'inset(0)':reveal.clip;$('#shadow-receiver').style.clipPath=reveal.clip;
  $('#aircraft').style.visibility=gentle||p===0||p===1?'hidden':'visible';
  $('#trust').setAttribute('aria-hidden',String(!gentle&&!reveal.visible));
  const contentTransform=`translateY(${Math.max(h*.12,pose.y+24)}px)`;
  if(inner)inner.style.transform=contentTransform;if(evidence)evidence.style.transform=contentTransform;
  const next={...trace,...pose,revealBoundary:reveal.boundary,revealClip:reveal.clip,revealComplete:reveal.complete,mobile:true};stage.dataset.jet=JSON.stringify(next);return next;
 }
 return {apply};
}
