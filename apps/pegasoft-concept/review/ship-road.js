// Derived from the accepted road renderer; approved source remains unchanged.
import {runInSlices} from '../src/cooperative-work.js';
import {road,roadForkIndex} from './handoff-sequence.js';
function* roadSteps(T,scene,renderer,sequence){
 let roadGroup;
 roadGroup=new T.Group();const scale=sequence.scale,width=14*scale;
 const aggregate=document.createElement('canvas');aggregate.width=aggregate.height=512;const ctx=aggregate.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=91273;
 for(let i=0;i<512*512;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const q=((seed>>>24)/255-.5)*8,v=37+q;pixels.data.set([v,v+2,v+4,255],i*4);}ctx.putImageData(pixels,0,0);const asphalt=new T.CanvasTexture(aggregate);asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const asphaltMaterial=new T.MeshStandardMaterial({color:'#ffffff',map:asphalt,roughness:.97,metalness:0,transparent:true,depthWrite:true,side:T.DoubleSide});

 function* ribbon(samples,extended=true,other=[]){
  const first=samples[0],end=samples.at(-1),display=extended?[...Array.from({length:600},(_,i)=>{const d=60-i*.1;return {...first,x:first.x-d*Math.cos(first.theta),z:first.z+d*Math.sin(first.theta)};}),...samples,...Array.from({length:1800},(_,i)=>{const d=(i+1)*.1;return {...end,x:end.x+d*Math.cos(end.theta),z:end.z-d*Math.sin(end.theta)};})]:samples,vertices=[],uvs=[],indices=[];
  for(let i=0;i<display.length;i++){if(i%256===0)yield;const r=display[i],pos=new T.Vector3(r.x-.25,0,r.z).multiplyScalar(scale).applyAxisAngle(new T.Vector3(0,1,0),sequence.startYaw).add(sequence.dock),normal=new T.Vector3(Math.sin(r.theta+sequence.startYaw),0,Math.cos(r.theta+sequence.startYaw));for(const side of [-1,1]){const v=pos.clone().addScaledVector(normal,side*width/2).setY(.010);vertices.push(...v.toArray());uvs.push(v.x/6,v.z/6);}if(i){const k=2*i;indices.push(k-2,k,k-1,k-1,k,k+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const surface=new T.Mesh(g,asphaltMaterial);surface.renderOrder=1;roadGroup.add(surface);
  function* marking(offset,color,broken){
   const points=display.map(r=>{const v=new T.Vector3(r.x-.25,0,r.z).multiplyScalar(scale).applyAxisAngle(new T.Vector3(0,1,0),sequence.startYaw).add(sequence.dock);return v.addScaledVector(new T.Vector3(Math.sin(r.theta+sequence.startYaw),0,Math.cos(r.theta+sequence.startYaw)),offset*scale).setY(.016);});
   const vertex=[],index=[];let arc=0;const otherCentres=other.filter((_,i)=>i%10===0).map(r=>new T.Vector3(r.x-.25,0,r.z).multiplyScalar(scale).applyAxisAngle(new T.Vector3(0,1,0),sequence.startYaw).add(sequence.dock).setY(.016));
   for(let i=1;i<points.length;i++){if(i%64===0)yield;const a=points[i-1],b=points[i],len=a.distanceTo(b);const covered=!(extended&&broken)&&otherCentres.some(q=>q.distanceToSquared(a)<(width*.5+.15*scale)**2);if(!covered&&(!broken||Math.floor(arc/(7*scale))===Math.floor((arc+3*scale)/(7*scale)))){const tangent=b.clone().sub(a).normalize(),n=new T.Vector3(tangent.z,0,-tangent.x).multiplyScalar(.065*scale),k=vertex.length/3;vertex.push(...a.clone().add(n).toArray(),...a.clone().sub(n).toArray(),...b.clone().add(n).toArray(),...b.clone().sub(n).toArray());index.push(k,k+2,k+1,k+1,k+2,k+3);}arc+=len;}
   const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(vertex,3));geom.setIndex(index);geom.computeVertexNormals();const line=new T.Mesh(geom,new T.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:T.DoubleSide}));line.renderOrder=2;roadGroup.add(line);
  }
  // Three same-direction lanes with shoulders; the truck occupies the centre
  // lane. Solid edges and broken lane dividers remain anchored to the asphalt.
  yield* marking(-5.4,'#D5BC57',false);yield* marking(5.4,'#DCE3E8',false);yield* marking(-1.8,'#DCE3E8',true);yield* marking(1.8,'#DCE3E8',true);

 }
 // The reference junction keeps a continuing right-hand branch while the
 // truck takes the downward lane. This branch is scenery, not its trajectory.
 const fork=road[roadForkIndex],start=new T.Vector3(fork.x,0,fork.z),curve=new T.CubicBezierCurve3(start,start.clone().add(new T.Vector3(15,0,15)),start.clone().add(new T.Vector3(35,0,40)),start.clone().add(new T.Vector3(75,0,40))),branch=[];
 for(let i=0;i<=1700;i++){const t=i/1700,v=curve.getPoint(t),d=curve.getTangent(t);branch.push({x:v.x,z:v.z,theta:Math.atan2(-d.z,d.x)});}yield* ribbon(road,true,branch);yield* ribbon(branch,false,road);scene.add(roadGroup);return roadGroup;
}

export function buildRoad(...args){const steps=roadSteps(...args);for(;;){const step=steps.next();if(step.done)return step.value;}}
export function buildRoadAsync(args,options){return runInSlices(roadSteps(...args),options);}
