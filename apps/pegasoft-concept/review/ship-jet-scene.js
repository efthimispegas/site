import { assets } from "./runtime-assets.js";
import * as T from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/three/examples/jsm/environments/RoomEnvironment.js';
import {createLiftRig} from './handoff-lift-rig.js';
import {createSequence} from './handoff-sequence.js';
import {buildRoadAsync} from './ship-road.js';
import {createShipSequence} from './ship-jet-sequence.js';
import {makeWater} from './ship-water.js';
import {applyShipSurface} from './ship-surface.js';
import {disposeSceneResources} from './runtime-lifecycle.js';

/** Load the accepted scene without owning a frame loop or review controls. */
export async function loadShipJetScene({root,stage,viewport,scope,assetUrls=assets,onRendererReady,sequenceFactory=createShipSequence,alpha=false,pickupConfig,modelBuffers}){
 let renderer,scene,camera;const models=[];
 const ensureActive=()=>{if(scope.disposed)throw new DOMException('Scene disposed','AbortError');};
 const ownModel=promise=>promise.then(model=>{if(scope.disposed)disposeSceneResources([model.scene]);else models.push(model.scene);return model;});
 scope.defer(()=>{disposeSceneResources([scene,...models]);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();});
 renderer=new T.WebGLRenderer({antialias:true,alpha});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<=760?1:1.5));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;stage.append(renderer.domElement);
 scene=new T.Scene();scene.background=new T.Color('#061e3b');const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pm.fromScene(room,.04).texture;scene.environmentIntensity=.35;room.dispose();pm.dispose();scene.add(new T.HemisphereLight(0xf5f8fc,0x263344,.25));const key=new T.DirectionalLight(0xf5f8fc,2.3);key.position.set(0,12,7);key.castShadow=true;key.shadow.mapSize.set(4096,4096);key.shadow.camera.left=-48;key.shadow.camera.right=48;key.shadow.camera.top=48;key.shadow.camera.bottom=-48;key.shadow.camera.near=1;key.shadow.camera.far=160;key.shadow.bias=-.00015;key.shadow.normalBias=.015;key.shadow.radius=2;scene.add(key,key.target);scene.userData.shipLight=key;const fill=new T.DirectionalLight(0xb9e7ff,.3);fill.position.set(-8,5,-5);scene.add(fill);camera=new T.PerspectiveCamera(36,1,5,10000);onRendererReady({renderer,scene,camera});
 const loader=new GLTFLoader();
 const loadModel=url=>{
  const bytes=modelBuffers?.get(url);if(!bytes)return loader.loadAsync(url);
  return bytes.then(buffer=>{modelBuffers.delete(url);return loader.parseAsync(buffer,url.slice(0,url.lastIndexOf('/')+1));});
 };
 const [lift,c01,truck,ship,ownership,wheels]=await Promise.all([ownModel(loadModel(assetUrls["generation/lift-family/model-draft/model-carbon-unified.glb"])),ownModel(loadModel(assetUrls["generation/container-family/model-draft/C01-container.glb"])),ownModel(loadModel(assetUrls["generation/truck-family/model-draft/T01-truck.glb"])),ownModel(loadModel(assetUrls["generation/ship-family/model-draft/S01-ship.glb"])),fetch(assetUrls["generation/lift-family/model-draft/attachment-ownership.json"],{signal:scope.signal}).then(r=>r.json()),fetch(assetUrls["generation/lift-family/model-draft/wheel-ownership-motion-amended.json"],{signal:scope.signal}).then(r=>r.json())]);
 ensureActive();
 for(const asset of [ship.scene,c01.scene])asset.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});await stage.ownerDocument.fonts.load('650 160px Manrope');ensureActive();const canvas=stage.ownerDocument.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d');ctx.font='650 160px Manrope';ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing='4.92px';ctx.fillStyle='#B9E7FF';ctx.strokeStyle='rgba(6,30,59,.72)';ctx.lineWidth=4.3;ctx.strokeText('PEGASOFT Solutions',1024,128,1900);ctx.fillText('PEGASOFT Solutions',1024,128,1900);const wordmark=new T.CanvasTexture(canvas);wordmark.colorSpace=T.SRGBColorSpace;
 const rig=createLiftRig(T,scene,camera,c01.scene,ownership,wheels,wordmark,viewport,pickupConfig);await rig.buildAsync(lift,{signal:scope.signal});ensureActive();const legacy=createSequence({rig,truck:truck.scene,cargo:c01.scene,scene,camera}),road=await buildRoadAsync([T,scene,renderer,legacy],{signal:scope.signal}),floor=new T.Mesh(new T.PlaneGeometry(15000,15000),new T.MeshStandardMaterial({color:'#edf2f7',roughness:.97}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
 const sequence=sequenceFactory({legacy,rig,ship:ship.scene,cargo:c01.scene,road,floor,water:await makeWater({scope,eventTarget:root,assetUrls}),scene,camera,viewport,renderer});applyShipSurface(ship.scene);
 ensureActive();return {renderer,scene,camera,sequence};
}
