import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const app=resolve(import.meta.dirname,'..'),workspace=resolve(app,'../..'),source=resolve(workspace,'artifacts/pegasoft-concept'),check=process.argv.includes('--check');
const sha=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFileSync(resolve(source,p),'utf8');
const files=new Map();
for(const name of ['hero-opening-sequence.js','hero-city-routes.js'])files.set('src/'+name,read('review/'+name));
let globe=read('review/hero-globe.js').replace("'./vendor/three/build/three.module.js'","'../review/vendor/three/build/three.module.js'").replace('createGlobe(canvas){','createGlobe(canvas,{assetUrl,signal}={}){').replace("fetch('../generation/hero-globe/land-dots.json')","fetch(assetUrl,{signal})");
globe=globe.replace('return r.json();});','return r.json();}).catch(error=>{scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();renderer.forceContextLoss();throw error;});');
globe=globe.replace('renderer.dispose();}};','renderer.dispose();renderer.forceContextLoss();}};');
files.set('src/hero-globe.js',globe);
let css=read('review/hero-opening.css').replaceAll('Manrope','OpeningManrope').replaceAll('DM Sans','OpeningDM').replaceAll('url(fonts/','url(/assets/review/fonts/');
css=css.replace(/(^|[{}])([^{}]+)(?=\{)/g,(all,before,head)=>{
 if(head.trim().startsWith('@'))return all;
 const selectors=head.trim().split(',').map(s=>s.trim().startsWith('.stage')?s.trim().replace(/^\.stage/,'#opening-stage'):'#opening-stage '+s.trim());
 return before+selectors.join(',');
});
files.set('src/hero-opening.css','/* Accepted opening CSS, scoped to its homepage stage; font aliases avoid cross-chapter drift. */\n'+css+'\n#opening-stage{font:15px OpeningDM,sans-serif;color:#edf2f7;position:sticky;top:0;width:100%;height:100svh;min-height:0;aspect-ratio:auto;border:0;border-radius:0}\n');
files.set('public/assets/generation/hero-globe/land-dots.json',read('generation/hero-globe/land-dots.json'));
const manifestPath=resolve(app,'opening-packaging-manifest.json');
const records=[...files].map(([path,data])=>({path,sha256:sha(data)}));
const sources=['review/hero-globe.js','review/hero-city-routes.js','review/hero-opening-sequence.js','review/hero-opening.css','generation/hero-globe/land-dots.json'].map(path=>({path,sha256:sha(readFileSync(resolve(source,path)))}));
const manifest={sources,files:records,approval:'evidence/hero-opening/user-approval.json',approvalSha256:sha(readFileSync(resolve(source,'evidence/hero-opening/user-approval.json'))),treatment:'Same Three182, shaders, geography/cities, camera envelope and defaults. Import/asset addressing, abort/disposal and scoped CSS/font names only.'};
if(check){
 if(JSON.stringify(JSON.parse(readFileSync(manifestPath)))!==JSON.stringify(manifest))throw Error('Opening source/recipe drift');
 for(const [path,data]of files)if(sha(readFileSync(resolve(app,path)))!==sha(data))throw Error('Opening packaged drift: '+path);
}else{
 if(existsSync(manifestPath))throw Error('Opening already packaged; preserve its baseline');
 for(const [path,data]of files){mkdirSync(resolve(app,path,'..'),{recursive:true});writeFileSync(resolve(app,path),data);}
 writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
console.log(JSON.stringify({status:'opening_packaging_verified',files:records.length}));
