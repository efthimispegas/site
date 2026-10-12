import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const stage=document.querySelector('#stage'),status=document.querySelector('#model-status'),loading=document.querySelector('#loading');
const scene=new T.Scene();scene.background=new T.Color('#11151b');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;stage.append(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight(0xeaf5ff,0x263344,.45));
for(const [intensity,p] of [[1.8,[0,80,50]],[.7,[-50,25,-35]]]){const l=new T.DirectionalLight(0xf4f8ff,intensity);l.position.set(...p);scene.add(l);}
const camera=new T.PerspectiveCamera(34,1,.1,1500),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=3;controls.maxDistance=650;controls.screenSpacePanning=true;
let ship,hero,bounds,view='oblique',surface='carbon',renders=0;
function render(){if(!ship)return;renderer.render(scene,camera);stage.dataset.view=view;stage.dataset.surface=surface;stage.dataset.drawCalls=renderer.info.render.calls;stage.dataset.triangles=renderer.info.render.triangles;stage.dataset.renders=++renders;stage.dataset.camera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()});}
controls.addEventListener('change',render);
const specs={
  oblique:{direction:[.85,.65,1.3]},side:{direction:[0,.035,1]},starboard:{direction:[0,.035,-1]},
  bow:{direction:[1,.13,.001]},stern:{direction:[-1,.16,.001]},upper:{direction:[0,1,.000001]},under:{direction:[.25,-.9,1]},
  bridge:{direction:[1,.33,1.6],box:[[-55,8,-7],[-39,28.8,7]]},
  foredeck:{direction:[1,.85,1.5],box:[[43,3,-6.3],[55,15,6.3]]},
  cargo:{direction:[.65,.65,-1.4],box:[[-11.6,6.6,-5.5],[2.1,13.2,5.5]]},
  propeller:{direction:[-.45,-.15,1],box:[[-56,-1.7,-2],[-49,2.3,2]]},
};
function fit(name){
  view=name;const spec=specs[name],b=spec.box?new T.Box3(new T.Vector3(...spec.box[0]),new T.Vector3(...spec.box[1])):bounds;
  const target=b.getCenter(new T.Vector3()),direction=new T.Vector3(...spec.direction).normalize();camera.up.set(0,1,0);if(name==='upper')camera.up.set(-1,0,0);
  camera.position.copy(target).add(direction);camera.lookAt(target);const rotation=new T.Matrix4().extractRotation(camera.matrixWorld).invert(),vfov=T.MathUtils.degToRad(camera.fov)/2,hfov=Math.atan(Math.tan(vfov)*camera.aspect);let distance=0;
  camera.updateMatrixWorld();rotation.extractRotation(camera.matrixWorld).invert();
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).sub(target).applyMatrix4(rotation);distance=Math.max(distance,p.z+Math.abs(p.x)/Math.tan(hfov),p.z+Math.abs(p.y)/Math.tan(vfov));}
  camera.position.copy(target).addScaledVector(direction,distance*1.13);controls.target.copy(target);controls.update();
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));render();
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(stage);resize();
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>fit(b.dataset.view)));
for(const name of ['carbon','porcelain'])document.querySelector('#'+name).addEventListener('click',()=>{surface=name;scene.background.set(name==='carbon'?'#11151b':'#edf2f7');document.querySelector('#carbon').setAttribute('aria-pressed',String(name==='carbon'));document.querySelector('#porcelain').setAttribute('aria-pressed',String(name==='porcelain'));render();});
for(const name of ['in','out'])document.querySelector('#zoom-'+name).addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(name==='in'?.8:1.25).add(controls.target);controls.update();render();});
for(const [name,yaw,pitch] of [['left',-.15,0],['right',.15,0],['up',0,-.12],['down',0,.12]])document.querySelector('#orbit-'+name).addEventListener('click',()=>{const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);s.theta+=yaw;s.phi=T.MathUtils.clamp(s.phi+pitch,.025,Math.PI-.025);camera.up.set(0,1,0);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();render();});
document.querySelector('#reset').addEventListener('click',()=>fit('oblique'));
const loader=new GLTFLoader();
try{
  const [s,c]=await Promise.all([loader.loadAsync('../generation/ship-family/model-draft/S01-ship.glb'),loader.loadAsync('../generation/container-family/model-draft/C01-container.glb')]);
  ship=s.scene;hero=c.scene;hero.name='C01_exact_approved';hero.position.set(-4.9,9.816,-1.269);hero.scale.set(1,1,1);ship.add(hero);scene.add(ship);bounds=new T.Box3().setFromObject(ship);
  let meshes=0,vertices=0;ship.traverse(n=>{if(n.isMesh){meshes++;vertices+=n.geometry.attributes.position.count;}});
  stage.dataset.loaded='true';stage.dataset.meshes=meshes;stage.dataset.vertices=vertices;stage.dataset.heroScale=JSON.stringify(hero.scale.toArray());stage.dataset.bounds=JSON.stringify({min:bounds.min.toArray(),max:bounds.max.toArray()});
  loading.hidden=true;document.querySelectorAll('button').forEach(b=>b.disabled=false);fit('oblique');
  status.textContent='Ship loaded · 110 m authored hull · four across / six groups · exact C01 · model awaiting your review.';
}catch(error){loading.textContent='Interactive model unavailable. Open the accepted images or download the GLB below.';document.querySelector('#fallback').hidden=false;renderer.domElement.hidden=true;status.textContent=error.message;stage.dataset.error=error.message;}
