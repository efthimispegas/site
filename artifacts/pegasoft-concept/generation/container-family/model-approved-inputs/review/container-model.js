import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const stage=document.querySelector('#stage'),status=document.querySelector('#model-status'),buttons=[...document.querySelectorAll('button')];
let renderer,scene,camera,controls,root,bounds,currentView='oblique';
function changed(){stage.dataset.camera=camera.position.toArray().map(v=>v.toFixed(5)).join(',');stage.dataset.target=controls.target.toArray().map(v=>v.toFixed(5)).join(',');renderer.render(scene,camera);}
function view(name){
  currentView=name;stage.dataset.view=name;
  const center=bounds.getCenter(new T.Vector3()),directions={oblique:[-1.7,.36,1.4],doors:[-1,0,0],far:[1,0,0],left:[0,0,-1],right:[0,0,1],roof:[0,1,.0001],under:[0,-1,.0001]};
  camera.up.set(0,1,0);
  if(name==='corner'){controls.target.set(-6.096+.1,2.896-.08,1.219-.08);camera.position.copy(controls.target).add(new T.Vector3(-.55,.36,.5));camera.lookAt(controls.target);}
  else{
    const d=new T.Vector3(...directions[name]).normalize();if(name==='roof')camera.up.set(1,0,0);if(name==='under')camera.up.set(1,0,0);
    const right=new T.Vector3().crossVectors(camera.up,d).normalize(),up=new T.Vector3().crossVectors(d,right).normalize(),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=1;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,v.dot(d)+1.15*Math.max(Math.abs(v.dot(up))/tan,Math.abs(v.dot(right))/(tan*camera.aspect)));}
    controls.target.copy(center);camera.position.copy(center).addScaledVector(d,distance);camera.lookAt(center);
  }
  controls.update();for(const b of document.querySelectorAll('button[data-view]'))b.setAttribute('aria-pressed',b.dataset.view===name);changed();
}
function surface(name){scene.background.set(name==='carbon'?'#11151B':'#EDF2F7');stage.dataset.surface=name;document.querySelector('#carbon').setAttribute('aria-pressed',name==='carbon');document.querySelector('#porcelain').setAttribute('aria-pressed',name==='porcelain');changed();}
function zoom(factor){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor);if(offset.length()>controls.minDistance&&offset.length()<controls.maxDistance)camera.position.copy(controls.target).add(offset);controls.update();changed();}
async function start(){
  renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;stage.append(renderer.domElement);
  scene=new T.Scene();scene.background=new T.Color('#11151B');const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xf5f8fc,0x526271,.35));const key=new T.DirectionalLight(0xf5f8fc,2.1);key.position.set(-6,9,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:6,bottom:-6,near:.1,far:40});key.shadow.normalBias=.006;key.shadow.bias=-.00005;scene.add(key);const fill=new T.DirectionalLight(0xb9e7ff,.7);fill.position.set(7,4,-5);scene.add(fill);
  camera=new T.PerspectiveCamera(36,1,.015,150);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.3;controls.maxDistance=75;controls.addEventListener('change',changed);controls.listenToKeyEvents(window);
  const loaded=await new GLTFLoader().loadAsync('../generation/container-family/model-draft/C01-container.glb');root=loaded.scene;root.updateMatrixWorld(true);scene.add(root);bounds=new T.Box3().setFromObject(root);
  let meshes=0,triangles=0;root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;meshes++;triangles+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3;}});
  const size=bounds.getSize(new T.Vector3());stage.dataset.modelMeshes=meshes;stage.dataset.modelTriangles=triangles;stage.dataset.modelDimensions=[size.x,size.y,size.z].join(',');
  let stageWidth=0,stageHeight=0;
  function resize(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height||(width===stageWidth&&height===stageHeight))return;
    const first=stageWidth===0;stageWidth=width;stageHeight=height;
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
    // Preserve an inspected orbit/zoom pose when the panel lays out again.
    if(first)view(currentView);else changed();
  }
  new ResizeObserver(resize).observe(stage);resize();surface('carbon');
  for(const b of buttons)b.disabled=false;document.querySelector('#loading').hidden=true;stage.dataset.loaded='true';
  status.textContent=`12.192 × 2.438 × 2.896 m · ${meshes} solid mesh primitives · ${triangles.toLocaleString()} triangles · Model approval pending`;
  for(const b of document.querySelectorAll('button[data-view]'))b.addEventListener('click',()=>view(b.dataset.view));
  document.querySelector('#carbon').onclick=()=>surface('carbon');document.querySelector('#porcelain').onclick=()=>surface('porcelain');document.querySelector('#zoom-in').onclick=()=>zoom(.8);document.querySelector('#zoom-out').onclick=()=>zoom(1.25);document.querySelector('#reset').onclick=()=>{view('oblique');surface('carbon');};
}
start().catch(error=>{stage.dataset.loaded='false';document.querySelector('#loading').textContent='Model could not load. The GLB and geometry checks remain available below.';status.textContent='Model preview unavailable.';console.error(error);});
