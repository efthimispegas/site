import { assets } from './runtime-assets.js';
const oceanPosterUrl =
  import.meta.env.BASE_URL + 'assets/water/ocean-first-frame.png';
import * as T from './vendor/three/build/three.module.js';
export async function makeWater({
  scope,
  eventTarget = document,
  mediaParent = eventTarget.ownerDocument?.body || eventTarget.body,
  assetUrls = assets,
} = {}) {
  if (scope.disposed) throw new DOMException('Scene disposed', 'AbortError');
  const url = new URL(
    assetUrls['generation/ship-family/water-plate/ocean-motion.mp4'],
    import.meta.url,
  ).href;
  // A mobile browser may suppress loadeddata or autoplay. Later-chapter media
  // must never hold the globe, loader or transport models behind that policy.
  const poster = await new T.TextureLoader().loadAsync(oceanPosterUrl);
  poster.wrapS = poster.wrapT = T.MirroredRepeatWrapping;
  poster.minFilter = T.LinearFilter;
  poster.magFilter = T.LinearFilter;
  scope.defer(() => poster.dispose());
  if (scope.disposed) throw new DOMException('Scene disposed', 'AbortError');
  let mobile =
    eventTarget.ownerDocument?.defaultView.matchMedia('(max-width:760px)')
      .matches ?? false;
  const videos = [0, 1].map(() => {
    const v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.preload = mobile ? 'none' : 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.style.display = 'none';
    mediaParent.append(v);
    scope.defer(() => {
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.remove();
    });
    v.src = url;
    if (!mobile) v.load();
    return v;
  });
  const textures = videos.map((v) => {
    const t = new T.VideoTexture(v);
    t.wrapS = t.wrapT = T.MirroredRepeatWrapping;
    t.minFilter = T.LinearFilter;
    t.magFilter = T.LinearFilter;
    return t;
  });
  scope.defer(() => textures.forEach((t) => t.dispose()));
  let active = 0,
    started = false;
  const uniforms = {
    scale: { value: 1 },
    shipInverse: { value: new T.Matrix4() },
    plateA: { value: poster },
    plateB: { value: poster },
    blend: { value: 0 },
  };
  const material = new T.ShaderMaterial({
    clipping: true,
    uniforms,
    vertexShader: `
 #include <common>
 #include <clipping_planes_pars_vertex>
 varying vec3 world;void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,
    fragmentShader: `
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
 }`,
  });
  const water = new T.Mesh(new T.PlaneGeometry(15000, 15000), material);
  water.rotation.x = -Math.PI / 2;
  water.frustumCulled = false;
  let starting = false;
  function resume() {
    if (!mobile && !scope.disposed && !started && !starting) {
      starting = true;
      videos[active]
        .play()
        .then(() => {
          if (!scope.disposed) started = true;
        })
        .catch(() => {})
        .finally(() => {
          starting = false;
        });
    }
  }
  scope.listen(eventTarget, 'pointerdown', resume);
  scope.listen(eventTarget, 'touchend', resume, { passive: true });
  scope.listen(eventTarget, 'keydown', resume);
  for (const v of videos) scope.listen(v, 'loadeddata', resume);
  resume();
  water.userData.setMobile = (value) => {
    if (value === mobile) return;
    mobile = value;
    if (mobile) {
      videos.forEach((v) => v.pause());
      started = false;
    } else {
      videos.forEach((v) => {
        v.preload = 'auto';
        v.load();
      });
      resume();
    }
  };
  water.userData.tick = () => {
    if (mobile) {
      uniforms.plateA.value = poster;
      uniforms.plateB.value = poster;
      uniforms.blend.value = 0;
      return false;
    }
    const current = videos[active],
      next = videos[1 - active],
      overlap = 0.8;
    uniforms.plateA.value = current.readyState >= 2 ? textures[active] : poster;
    uniforms.plateB.value =
      next.readyState >= 2 ? textures[1 - active] : uniforms.plateA.value;
    if (!started || current.readyState < 2) return true;
    if (
      next.readyState >= 2 &&
      current.currentTime >= current.duration - overlap
    ) {
      if (next.paused) next.play().catch(() => {});
      uniforms.blend.value = T.MathUtils.clamp(
        (current.currentTime - current.duration + overlap) / overlap,
        0,
        1,
      );
    }
    if (current.ended) {
      current.pause();
      current.currentTime = 0;
      if (next.readyState >= 2) active = 1 - active;
      uniforms.plateA.value =
        videos[active].readyState >= 2 ? textures[active] : poster;
      uniforms.plateB.value =
        videos[1 - active].readyState >= 2
          ? textures[1 - active]
          : uniforms.plateA.value;
      started = !videos[active].paused;
      uniforms.blend.value = 0;
      resume();
    }
    water.userData.time = videos[active].currentTime;
    return true;
  };
  return water;
}
