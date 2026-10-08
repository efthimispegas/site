import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const stage=document.querySelector('#stage'),status=document.querySelector('#model-status');
let renderer,scene,camera,controls,truck,trailer,cargo,bounds,wheels=[],steers=[],currentView='oblique';
function render(){
  if(!renderer)return;
  stage.dataset.camera=camera.position.toArray().map(v=>v.toFixed(6)).join(',');
  stage.dataset.target=controls.target.toArray().map(v=>v.toFixed(6)).join(',');
  renderer.render(scene,camera);
}
function view(name){
  currentView=name;stage.dataset.view=name;camera.up.set(0,1,0);
  const targets={cab:[3.15,2.05,0],wheel:[3.55,.5265,1.095],seat:[.9385,1.35,1.139]};
  if(targets[name]){
    controls.target.set(...targets[name]);
    camera.position.copy(controls.target).add(new T.Vector3(...({cab:[4.3,1.6,4.6],wheel:[.8,.48,1.3],seat:[-.8,.65,1.05]}[name])));
  }else{
    const directions={oblique:[1.20,.42,1.5],side:[0,.025,1],front:[1,0,0],upper:[0,1,.00001],rear:[-1,.10,0],under:[0,-1,.00001]};
    const d=new T.Vector3(...directions[name]).normalize(),center=bounds.getCenter(new T.Vector3());
    if(name==='upper'||name==='under')camera.up.set(0,0,-1);
    const right=new T.Vector3().crossVectors(camera.up,d).normalize(),up=new T.Vector3().crossVectors(d,right).normalize();
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=1;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const v=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,v.dot(d)+1.12*Math.max(Math.abs(v.dot(up))/tan,Math.abs(v.dot(right))/(tan*camera.aspect)));
    }
    controls.target.copy(center);camera.position.copy(center).addScaledVector(d,distance);
  }
  camera.lookAt(controls.target);controls.update();
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));render();
}
function surface(name){scene.background.set(name==='carbon'?'#11151B':'#EDF2F7');stage.dataset.surface=name;document.querySelector('#carbon').setAttribute('aria-pressed',String(name==='carbon'));document.querySelector('#porcelain').setAttribute('aria-pressed',String(name==='porcelain'));render();}
function zoom(factor){const d=camera.position.clone().sub(controls.target).multiplyScalar(factor);if(d.length()>.35&&d.length()<100)camera.position.copy(controls.target).add(d);controls.update();render();}
function orbit(theta,phi){const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));spherical.theta+=theta;spherical.phi=T.MathUtils.clamp(spherical.phi+phi,.05,Math.PI-.05);camera.up.set(0,1,0);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));camera.lookAt(controls.target);controls.update();render();}
function parts(){
  const steer=Number(document.querySelector('#steering').value),yaw=Number(document.querySelector('#articulation').value),roll=Number(document.querySelector('#wheel-roll').value);
  steers.forEach(n=>n.rotation.y=T.MathUtils.degToRad(steer));trailer.rotation.y=T.MathUtils.degToRad(yaw);wheels.forEach(n=>n.rotation.z=T.MathUtils.degToRad(roll));
  for(const [id,value] of [['steering',steer],['articulation',yaw],['wheel-roll',roll]])document.querySelector('#'+id+'-value').textContent=value+'°';
  stage.dataset.steering=steer;stage.dataset.articulation=yaw;stage.dataset.wheelRoll=roll;render();
}
async function start(){
  renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;stage.append(renderer.domElement);
  scene=new T.Scene();scene.background=new T.Color('#11151B');
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xf4f8fc,0x536273,.45));
  const key=new T.DirectionalLight(0xf5f8fc,2.1);key.position.set(6,9,7);scene.add(key);
  const fill=new T.DirectionalLight(0xb9e7ff,.7);fill.position.set(-8,5,-5);scene.add(fill);
  camera=new T.PerspectiveCamera(36,1,.01,180);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.35;controls.maxDistance=100;controls.addEventListener('change',render);
  const loader=new GLTFLoader();const model=await loader.loadAsync('../generation/truck-family/model-draft/T01-truck.glb');truck=model.scene;scene.add(truck);trailer=truck.getObjectByName('trailer_fifth_wheel_pivot');
  truck.traverse(n=>{if(n.name.endsWith('_rotation'))wheels.push(n);if(n.name.startsWith('tractor_front_')&&n.name.endsWith('_steering'))steers.push(n);});
  const c01=await loader.loadAsync('../generation/container-family/model-draft/C01-container.glb');cargo=c01.scene;cargo.position.set(-5.0575,.2,0);trailer.add(cargo);truck.updateMatrixWorld(true);bounds=new T.Box3().setFromObject(truck);cargo.visible=false;
  stage.dataset.wheels=wheels.length;stage.dataset.containerScale=cargo.scale.toArray().join(',');stage.dataset.loaded='true';stage.dataset.container='false';
  let width=0,height=0;
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h||(w===width&&h===height))return;const first=width===0;width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(first)view(currentView);else render();}
  new ResizeObserver(resize).observe(stage);resize();surface('carbon');parts();
  document.querySelector('#loading').hidden=true;document.querySelectorAll('button,input').forEach(b=>b.disabled=false);
  status.textContent='Truck model ready for review · 12 tires · 2 tractor / 3 trailer axles · C01 remains at its approved scale';
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  document.querySelector('#carbon').onclick=()=>surface('carbon');document.querySelector('#porcelain').onclick=()=>surface('porcelain');
  document.querySelector('#zoom-in').onclick=()=>zoom(.8);document.querySelector('#zoom-out').onclick=()=>zoom(1.25);
  document.querySelector('#orbit-left').onclick=()=>orbit(-.15,0);document.querySelector('#orbit-right').onclick=()=>orbit(.15,0);document.querySelector('#orbit-up').onclick=()=>orbit(0,-.12);document.querySelector('#orbit-down').onclick=()=>orbit(0,.12);
  document.querySelector('#container').onclick=()=>{
    cargo.visible=!cargo.visible;stage.dataset.container=String(cargo.visible);document.querySelector('#container').setAttribute('aria-pressed',String(cargo.visible));
    parts();
  };
  document.querySelectorAll('input').forEach(input=>input.addEventListener('input',parts));
  document.querySelector('#reset').onclick=()=>{document.querySelectorAll('input').forEach(i=>i.value=0);cargo.visible=false;stage.dataset.container='false';document.querySelector('#container').setAttribute('aria-pressed','false');document.querySelector('#articulation').disabled=false;parts();view('oblique');surface('carbon');};
}
start().catch(error=>{stage.dataset.loaded='false';document.querySelector('#loading').textContent='Model preview unavailable. Use the accepted image and download links below.';document.querySelector('#fallback').hidden=false;status.textContent='Preview unavailable.';console.error(error);});
