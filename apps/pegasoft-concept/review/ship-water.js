import { assets } from "./runtime-assets.js";
import * as T from './vendor/three/build/three.module.js';
export async function makeWater({scope,eventTarget=document,mediaParent=eventTarget.ownerDocument?.body||eventTarget.body,assetUrls=assets}={}){
 if(scope.disposed)throw new DOMException('Scene disposed','AbortError');
 const url=new URL(assetUrls["generation/ship-family/water-plate/ocean-motion.mp4"],import.meta.url).href;
 const videos=await Promise.all([0,1].map(()=>new Promise((resolve,reject)=>{
  const v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;v.preload='auto';v.setAttribute('aria-hidden','true');v.style.display='none';mediaParent.append(v);
  scope.defer(()=>{v.onloadeddata=null;v.onerror=null;v.pause();v.removeAttribute('src');v.load();v.remove();});
  const abort=()=>reject(new DOMException('Scene disposed','AbortError'));scope.signal.addEventListener('abort',abort,{once:true});scope.defer(()=>scope.signal.removeEventListener('abort',abort));
  v.onloadeddata=()=>resolve(v);v.onerror=()=>reject(Error('Generated ocean clip could not load.'));v.load();
 })));
 if(scope.disposed)throw new DOMException('Scene disposed','AbortError');
 const textures=videos.map(v=>{const t=new T.VideoTexture(v);t.wrapS=t.wrapT=T.MirroredRepeatWrapping;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;return t;});
 let active=0,started=false;
 const uniforms={scale:{value:1},shipInverse:{value:new T.Matrix4()},plateA:{value:textures[0]},plateB:{value:textures[1]},blend:{value:0}};
 const material=new T.ShaderMaterial({clipping:true,uniforms,vertexShader:`
 #include <common>
 #include <clipping_planes_pars_vertex>
 varying vec3 world;void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,fragmentShader:`
 #include <common>
 #include <clipping_planes_pars_fragment>
 uniform mat4 shipInverse;uniform sampler2D plateA;uniform sampler2D plateB;uniform float blend;varying vec3 world;
 float hashCell(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 vec3 plate(vec2 uv){return mix(texture2D(plateA,uv).rgb,texture2D(plateB,uv).rgb,blend);}
 vec3 oceanPatch(vec2 grid,vec2 cell){
  float choice=hashCell(cell),phase=hashCell(cell+vec2(11.0,27.0));
  vec2 p=grid-cell;
  float x=fract(p.x+phase),y=fract(p.y*.5+hashCell(cell+31.0));
  float x2=fract(x+.5),y2=fract(y+.5);
  float wx=pow(sin(3.14159265*x),2.0),wy=pow(sin(3.14159265*y),2.0);
  float edge=choice>.5?.70:.02;
  // Shifted pairs have zero weight at their respective wrap edges. No mirror
  // folds: water motion and wave shapes retain the source orientation.
  return mix(mix(plate(vec2(edge+.28*x2,y2)),plate(vec2(edge+.28*x,y2)),wx),mix(plate(vec2(edge+.28*x2,y)),plate(vec2(edge+.28*x,y)),wx),wy);
 }
 void main(){
 #include <clipping_planes_fragment>
 vec3 local=(shipInverse*vec4(world,1.0)).xyz;
 // Every sea sample has the original image's aspect and the same metre/pixel
 // density. Use only wake-free side patches, cross-blended at fixed positions
 // to prevent reflected stripes or extra vessel wakes across the ocean.
 vec2 grid=vec2(local.z/70.14,local.x/83.5),cell=floor(grid),f=smoothstep(0.0,1.0,fract(grid));
 vec3 sea=mix(mix(oceanPatch(grid,cell),oceanPatch(grid,cell+vec2(1.0,0.0)),f.x),mix(oceanPatch(grid,cell+vec2(0.0,1.0)),oceanPatch(grid,cell+vec2(1.0,1.0)),f.x),f.y);
 // Fit only whitewater to the hull. The underlying sea never switches to
 // the compressed wake mapping; its waves/reflections keep one common scale.
 vec3 wake=plate(vec2(.5+local.z/85.0,.5-local.x/167.0));
 float brightness=dot(wake,vec3(.2126,.7152,.0722));
 float wakeWidth=12.0+max(-local.x-50.0,0.0)*.16;
 float bounds=(1.0-smoothstep(wakeWidth,wakeWidth+4.0,abs(local.z)))*(1.0-smoothstep(66.0,76.0,local.x))*smoothstep(-160.0,-140.0,local.x);
 float foam=smoothstep(.14,.40,brightness)*bounds;
 gl_FragColor=vec4(mix(sea,wake,foam),1.0);
 }`});
 const water=new T.Mesh(new T.PlaneGeometry(15000,15000),material);water.rotation.x=-Math.PI/2;water.frustumCulled=false;
 function resume(){if(!scope.disposed&&!started){videos[active].play().then(()=>{started=true;}).catch(()=>{});}}
 scope.listen(eventTarget,'pointerdown',resume);scope.listen(eventTarget,'keydown',resume);resume();
 water.userData.tick=()=>{
  const current=videos[active],next=videos[1-active],overlap=.8;
  if(!started)return true;
  if(current.currentTime>=current.duration-overlap){
   if(next.paused)next.play().catch(()=>{});
   uniforms.blend.value=T.MathUtils.clamp((current.currentTime-current.duration+overlap)/overlap,0,1);
  }
  if(current.ended){current.pause();current.currentTime=0;active=1-active;uniforms.plateA.value=textures[active];uniforms.plateB.value=textures[1-active];uniforms.blend.value=0;}
  water.userData.time=videos[active].currentTime;return true;
 };
 return water;
}
