// Elapsed opening time owns the loader/content only. Camera and globe rotation
// never depend on this state, DOM text bounds, or a moving object's bounds.
export const DEFAULTS = Object.freeze({ringEnd:1.45, markStart:1.05, pulseStart:1.45, apertureStart:1.78, apertureDuration:1.12, headlineStart:2.10, headlineDuration:.72});
export const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
export const smooth = v => {const x=clamp(v);return x*x*(3-2*x);};
export function openingState(t, settings=DEFAULTS, reduced=false) {
  const s={...DEFAULTS,...settings};
  const end=Math.max(3.8,s.apertureStart+s.apertureDuration,s.headlineStart+s.headlineDuration+.65);
  const track=(start,duration)=>reduced?1:smooth((t-start)/duration);
  const rings=track(0,s.ringEnd), mark=track(s.markStart,.38);
  const pulse=track(s.pulseStart,.42), aperture=track(s.apertureStart,s.apertureDuration);
  const lines=[0,.13,.26].map(delay=>track(s.headlineStart+delay,s.headlineDuration));
  return {end,ringScale:.7+1.16*rings,ringOpacity:reduced?0:1-track(s.ringEnd-.25,.3),markOpacity:1-mark,pulseScale:pulse,pulseVisible:!reduced&&t>=s.pulseStart&&aperture<1,aperture,nav:track(s.apertureStart+.10,.62),lines,body:track(s.headlineStart+.40,.75),cta:track(s.headlineStart+.65,.72),complete:reduced||t>=end};
}
export function cameraEnvelope(width,height,mobile=width<680) {
  return {aspect:width/height,viewHeight:2.28,centerX:mobile?.63:.925,centerY:mobile?.30:.50,radiusHeight:mobile?.32:.52};
}
