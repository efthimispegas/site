import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';

const workspace=resolve(import.meta.dirname,'../../..');
const evidence=resolve(workspace,'artifacts/pegasoft-concept/evidence/controller-refactor');
const manifest=JSON.parse(readFileSync(resolve(evidence,'accepted-reference.json')));
const files=new Map();
for(const row of manifest.build_files) files.set('/'+row.path,{path:resolve(evidence,'accepted-build',row.path),sha256:row.sha256});
for(const row of manifest.runtime_assets) files.set('/'+row.packaged.slice(7),{path:resolve(workspace,'artifacts/pegasoft-concept',row.source),sha256:row.sourceSha256});
for(const file of files.values()) {
  file.data=readFileSync(file.path);
  if(createHash('sha256').update(file.data).digest('hex')!==file.sha256)throw Error('Accepted reference drift: '+file.path);
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.glb':'model/gltf-binary','.mp4':'video/mp4','.txt':'text/plain'};
createServer((request,response)=>{
  const path=new URL(request.url,'http://127.0.0.1:8772').pathname;
  if(path==='/favicon.ico'){response.writeHead(204);response.end();return;}
  const file=files.get(path);
  if(!file){response.writeHead(404);response.end();return;}
  const range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start=range?Number(range[1]):0,end=range&&range[2]?Number(range[2]):file.data.length-1;
  response.writeHead(range?206:200,{'Content-Type':types[extname(file.path)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${file.data.length}`}:{})});
  response.end(file.data.subarray(start,end+1));
}).listen(8772,'127.0.0.1',()=>console.log('Frozen accepted reference: http://127.0.0.1:8772/review/ship-jet-integration.html#viewer'));
