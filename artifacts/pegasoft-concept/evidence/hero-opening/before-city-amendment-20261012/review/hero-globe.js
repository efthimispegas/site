import * as THREE from './vendor/three/build/three.module.js';
import {cameraEnvelope} from './hero-opening-sequence.js';

const position=(lon,lat,r=1)=>{const a=THREE.MathUtils.degToRad(lon),b=THREE.MathUtils.degToRad(lat);return new THREE.Vector3(Math.cos(b)*Math.sin(a)*r,Math.sin(b)*r,Math.cos(b)*Math.cos(a)*r);};
const pointVertex=`uniform float size; varying float depth; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vec3 n=normalize(normalMatrix*normalize(position)); depth=n.z; gl_Position=projectionMatrix*p; gl_PointSize=size; }`;
const pointFragment=`uniform vec3 color; uniform float brightness; varying float depth; void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float aa=1.-smoothstep(.22,.5,d);float facing=.32+.68*max(depth,0.);gl_FragColor=vec4(color*brightness*facing,aa*.88);}`;
function points(coords,color,size){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  const material=new THREE.ShaderMaterial({uniforms:{size:{value:size},color:{value:new THREE.Color(color)},brightness:{value:1}},vertexShader:pointVertex,fragmentShader:pointFragment,transparent:true,depthWrite:false});
  return new THREE.Points(geometry,material);
}
function arcCurve(a,b,height){
  const start=position(...a),end=position(...b),angle=Math.acos(THREE.MathUtils.clamp(start.dot(end),-1,1));
  const samples=[];
  for(let i=0;i<=90;i++){const t=i/90;const p=start.clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(end,Math.sin(t*angle)).divideScalar(Math.sin(angle));samples.push(p.normalize().multiplyScalar(1.012+Math.sin(Math.PI*t)*height));}
  return new THREE.CatmullRomCurve3(samples);
}
export async function createGlobe(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,1.14,-1.14,.1,30);camera.position.set(0,0,6);
  const globe=new THREE.Group();scene.add(globe);
  // Solid opaque body occludes rear dots/arcs. A blue hemisphere adds depth without
  // animated lights, shadow-map shimmer or a planar globe texture.
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({color:0x030b18,roughness:.92,metalness:.08}));globe.add(body);
  scene.add(new THREE.AmbientLight(0x3163a2,.56));
  const light=new THREE.DirectionalLight(0x93d7ff,2);light.position.set(-2,-1.2,3);scene.add(light);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(1.035,96,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{intensity:{value:1}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;uniform float intensity;void main(){float f=1.-max(dot(normalize(n),normalize(v)),0.);float glow=pow(f,3.8);float band=pow(f,17.);float side=.48+.52*(1.-smoothstep(-.6,.6,n.y));gl_FragColor=vec4(vec3(.045,.38,1.)*glow*side*intensity*1.8+vec3(.18,.55,1.)*band*.28,glow*.74);}`}));globe.add(rim);
  const geography=await fetch('../generation/hero-globe/land-dots.json').then(r=>{if(!r.ok)throw Error('Land geometry unavailable');return r.json();});
  const landCoords=[];for(let i=0;i<geography.land_lon_lat.length;i+=2)landCoords.push(...position(geography.land_lon_lat[i],geography.land_lon_lat[i+1],1.007).toArray());
  const land=points(landCoords,0xa5cdfb,1.8);globe.add(land);
  const oceanCoords=[];
  for(let row=0;row<72;row++){const lat=-88+row*2.45;const count=Math.round(360*Math.cos(THREE.MathUtils.degToRad(lat))/2.45);for(let col=0;col<count;col++)oceanCoords.push(...position(-180+(col+(row%2)*.5)*360/count,lat,1.003).toArray());}
  const ocean=points(oceanCoords,0x22477e,1.05);globe.add(ocean);
  // Illustrative routes, without company offices or geographic labels.
  const routes=[[[0,49],[55,25],.21],[[11,43],[32,-27],.14],[[-76,40],[18,51],.30],[[26,53],[122,31],.22],[[40,21],[101,3],.15],[[20,-25],[116,-30],.25]];
  const arcGroup=new THREE.Group();globe.add(arcGroup);const travelers=[];
  for(const [a,b,h]of routes){const curve=arcCurve(a,b,h);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,90,.0017,5,false),new THREE.MeshBasicMaterial({color:0x268dff,transparent:true,opacity:.66}));arcGroup.add(mesh);for(const point of[a,b]){const node=new THREE.Mesh(new THREE.SphereGeometry(.007,12,8),new THREE.MeshBasicMaterial({color:0xb9e7ff}));node.position.copy(position(...point,1.014));arcGroup.add(node);}const dot=new THREE.Mesh(new THREE.SphereGeometry(.005,8,6),new THREE.MeshBasicMaterial({color:0xb9e7ff}));arcGroup.add(dot);travelers.push({dot,curve});}
  let envelope,width,height;let settings={dots:1,rim:1,arcs:1,speed:1};
  function resize(w,h){width=w;height=h;envelope=cameraEnvelope(w,h,matchMedia('(max-width:679px)').matches);const viewHeight=envelope.viewHeight,viewWidth=viewHeight*w/h;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);const scale=envelope.radiusHeight*viewHeight;globe.scale.setScalar(scale);globe.position.set((envelope.centerX-.5)*viewWidth,(.5-envelope.centerY)*viewHeight,0);const dpr=renderer.getPixelRatio();land.material.uniforms.size.value=1.65*dpr*h/488; ocean.material.uniforms.size.value=1.05*dpr*h/488;}
  function render(rotationTime,sceneTime,reduced=false){globe.rotation.set(.18,-.90+rotationTime*.025,0);land.material.uniforms.brightness.value=settings.dots;ocean.material.uniforms.brightness.value=.75*settings.dots;rim.material.uniforms.intensity.value=settings.rim;arcGroup.visible=settings.arcs>0;for(const child of arcGroup.children)if(child.material?.transparent)child.material.opacity=.66*settings.arcs;travelers.forEach(({dot,curve},i)=>dot.position.copy(curve.getPoint((reduced?.35:(sceneTime*.065+i*.19)%1))));renderer.render(scene,camera);return {camera:envelope,width,height,rotationRadians:globe.rotation.y,landPoints:landCoords.length/3};}
  return {resize,render,configure:s=>Object.assign(settings,s),dispose:()=>{scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();}};
}
