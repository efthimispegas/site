import * as T from './vendor/three/build/three.module.js';
export async function makeWater(){
 const url=new URL('../generation/ship-family/water-plate/ocean-motion.mp4',import.meta.url).href;
 const videos=await Promise.all([0,1].map(()=>new Promise((resolve,reject)=>{
  const v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;v.preload='auto';v.setAttribute('aria-hidden','true');v.style.display='none';document.body.append(v);
  v.onloadeddata=()=>resolve(v);v.onerror=()=>reject(Error('Generated ocean clip could not load.'));v.load();
 })));
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
 void main(){
 #include <clipping_planes_fragment>
 vec3 local=(shipInverse*vec4(world,1.0)).xyz;
 // Compress only the central wake field to the authored hull. The outer sea
 // retains a broad photographic field; no analytic ripples or specular glints.
 float z=abs(local.z),across=min(z,15.0)/85.0+max(z-15.0,0.0)/500.0;
 vec2 uv=vec2(.5+sign(local.z)*across,.5-local.x/167.0);
 gl_FragColor=vec4(mix(texture2D(plateA,uv).rgb,texture2D(plateB,uv).rgb,blend),1.0);
 }`});
 const water=new T.Mesh(new T.PlaneGeometry(15000,15000),material);water.rotation.x=-Math.PI/2;water.frustumCulled=false;
 function resume(){if(!started){videos[active].play().then(()=>{started=true;}).catch(()=>{});}}
 document.addEventListener('pointerdown',resume);document.addEventListener('keydown',resume);resume();
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
