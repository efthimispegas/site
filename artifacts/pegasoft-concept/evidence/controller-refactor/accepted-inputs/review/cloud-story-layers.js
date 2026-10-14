import { assets } from "./runtime-assets.js";
import { createCloudPaths } from './cloud-motion.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
export async function createCloudLayers(stage,onChange){
 const response=await fetch(assets["generation/cloud-family/haze-treatment.json"]);if(!response.ok)throw Error('Reviewed haze presets unavailable');const contract=await response.json();
 const clouds=[...stage.querySelectorAll('[data-cloud]')],overrides={},controls={};
 await Promise.all(clouds.flatMap(c=>[...c.querySelectorAll('img')].map(img=>img.decode())));
 for(const cloud of clouds){const id=cloud.dataset.cloud;overrides[id]={};controls[id]={};for(const key of ['density','softness','opacity']){const input=document.querySelector(`#${id}-${key}`);controls[id][key]=input;input.oninput=()=>{overrides[id][key]=Number(input.value);onChange();};}}
 document.querySelector('#cloud-reset').onclick=()=>{for(const id of Object.keys(overrides))overrides[id]={};onChange();};
 const paths=createCloudPaths(contract);
 function apply(p){
  const width=stage.clientWidth,bank=smooth((p-.4)/.6),alpha=smooth(p/.15),trace=[];
  for(const cloud of clouds){
   const id=cloud.dataset.cloud,a=contract.moments.veil[id],b=contract.moments.banks[id],preset=contract.cloud_presets[id],params={...preset,...overrides[id]};
   const centre=paths[id](p),size=mix(a.width,b.width,bank),weight=mix(a.density_weight,b.density_weight,bank);
   cloud.style.left=centre[0]*100+'%';cloud.style.top=centre[1]*100+'%';cloud.style.width=size*100+'%';cloud.style.opacity=params.opacity*alpha;
   const core=cloud.querySelector('.core'),halo=cloud.querySelector('.halo');core.style.opacity=params.density*weight*contract.core_opacity_weight;halo.style.opacity=params.density*weight*contract.halo_opacity_weight;
   core.style.filter=`blur(${width*contract.core_blur_width_fraction*params.softness}px)`;halo.style.filter=`blur(${width*contract.halo_blur_width_fraction*params.softness}px)`;halo.style.transform=`scale(${contract.halo_scale})`;
   for(const key of ['density','softness','opacity']){controls[id][key].value=params[key];document.querySelector(`#${id}-${key}-value`).textContent=Math.round(params[key]*100)+'%';}
   cloud.dataset.settings=JSON.stringify({id,...params,overrides:{...overrides[id]},centre,width:size,densityWeight:weight,arrival:alpha});trace.push(JSON.parse(cloud.dataset.settings));
  }
  stage.dataset.clouds=JSON.stringify(trace);return trace;
 }
 return {apply};
}
