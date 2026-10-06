import fs from 'node:fs';import sharp from 'sharp';
const dir=new URL('./',import.meta.url),b=fs.readFileSync(new URL('model-carbon-unified.glb',dir)),len=b.readUInt32LE(12),bin=b.subarray(28+len),j=JSON.parse(b.subarray(20,20+len));
function a(id){const x=j.accessors[id],v=j.bufferViews[x.bufferView],k={SCALAR:1,VEC2:2,VEC3:3}[x.type];return new ({5126:Float32Array,5125:Uint32Array}[x.componentType])(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(x.byteOffset||0),x.count*k);}
const im=j.images[j.textures[j.materials[0].pbrMetallicRoughness.baseColorTexture.index].source],bv=j.bufferViews[im.bufferView],dec=await sharp(bin.subarray(bv.byteOffset,bv.byteOffset+bv.byteLength)).removeAlpha().raw().toBuffer({resolveWithObject:true});
const sample=(u,v)=>{const x=Math.max(0,Math.min(dec.info.width-1,Math.floor(u*dec.info.width))),y=Math.max(0,Math.min(dec.info.height-1,Math.floor(v*dec.info.height))),i=(y*dec.info.width+x)*dec.info.channels;return [dec.data[i],dec.data[i+1],dec.data[i+2]];};
const baseline=JSON.parse(fs.readFileSync(new URL('wheel-ownership.json',dir))),axles=baseline.axles,roles={},counts={},bodyRejected={};
for(const[pi,q]of j.meshes[j.nodes[0].mesh].primitives.entries()){
 const p=a(q.attributes.POSITION),uv=a(q.attributes.TEXCOORD_0),ids=q.indices===undefined?Array.from({length:p.length/3},(_,i)=>i):a(q.indices),key=String(p.length/3);roles[key]={};
 for(let i=0;i<ids.length;i+=3){
  const ii=Array.from(ids.slice(i,i+3)),c=[0,1,2].map(k=>ii.reduce((s,id)=>s+p[id*3+k]/3,0));if(Math.abs(c[2])<=.135)continue;
  const axle=Object.entries(axles).find(([,v])=>((c[0]-v.x)/(v.rx*1.07))**2+((c[1]-v.y)/(v.ry*1.09))**2<1&&c[1]<-.289);if(!axle)continue;
  const colors=q.material===8?[[17,21,27]]:ii.map(id=>sample(uv[id*2],uv[id*2+1]));
  const painted=colors.filter(([r,g,b])=>b-r>30&&b>g*1.04).length>=2,marker=colors.filter(([r,g,b])=>r>120&&g>80&&b<g*.7).length>=2;
  const label= `${axle[0]}_wheel_${c[2]>0?'left':'right'}`;
  if(painted||marker||q.material===8){bodyRejected[label]=(bodyRejected[label]||0)+1;continue;}
  if(!roles[key][label])roles[key][label]=[];roles[key][label].push(i/3);counts[label]=(counts[label]||0)+1;
 }
}
// Retain every already-approved wheel face, and add only missed outer tire-band faces.
for(const[key,groups]of Object.entries(baseline.wheel_triangle_ranges_by_position_count))for(const[label,ranges]of Object.entries(groups)){const set=new Set(roles[key][label]||[]);for(const[a,b]of ranges)for(let i=a;i<=b;i++)set.add(i);roles[key][label]=[...set].sort((a,b)=>a-b);counts[label]=roles[key][label].length;}
for(const groups of Object.values(roles))for(const[key,ids]of Object.entries(groups)){const ranges=[];for(const id of ids){if(ranges.length&&id===ranges.at(-1)[1]+1)ranges.at(-1)[1]=id;else ranges.push([id,id]);}groups[key]=ranges;}
const crypto=await import('node:crypto'),hash=crypto.createHash('sha256').update(b).digest('hex');if(hash!=='d9fd9e83480be86d3b5ab7568e583f9a54341ad20769ea75a23a3fa5919c7067')throw Error('Approved source changed');
const manifest={date_local:'2026-10-05',approved_input_sha256:hash,method:'Approved wheel ownership retained; add missed outer tire-band faces within bounded enlarged silhouette below fenders, with atlas paint/safety protection. Original GLB and ownership remain unchanged.',axles,rotating_triangles:counts,paint_or_marker_faces_kept_stationary:bodyRejected,wheel_triangle_ranges_by_position_count:roles,limits:'Runtime ownership only. No source mesh, UV, material or attachment map modification. Axle fit requires rendered review.'};fs.writeFileSync(new URL('wheel-ownership-motion-amended.json',dir),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({rotating:counts,stationaryPaint:bodyRejected}));
