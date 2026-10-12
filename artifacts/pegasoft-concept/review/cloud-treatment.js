const stage=document.querySelector('#stage'),density=document.querySelector('#density'),softness=document.querySelector('#softness');
const response=await fetch('../generation/cloud-family/haze-treatment.json');if(!response.ok)throw Error('Cloud treatment settings unavailable');const contract=await response.json();
let treatment='diffuse',moment='banks';
function restoreMomentPreset(){density.value=contract.presets[moment].density;softness.value=contract.presets[moment].softness;}
function pose(){
 const width=stage.getBoundingClientRect().width,height=stage.getBoundingClientRect().height,d=Number(density.value),s=Number(softness.value),diffuse=treatment==='diffuse';
 stage.classList.toggle('raw',!diffuse);stage.dataset.treatment=treatment;stage.dataset.moment=moment;stage.dataset.density=d;stage.dataset.softness=s;
 for(const cloud of stage.querySelectorAll('[data-cloud]')){
  const id=cloud.dataset.cloud,setting=contract.moments[moment][id];cloud.style.width=setting.width*100+'%';cloud.style.left=setting.center[0]*100+'%';cloud.style.top=setting.center[1]*100+'%';
  const core=cloud.querySelector('.core'),halo=cloud.querySelector('.halo');
  core.style.filter=diffuse?`blur(${width*contract.core_blur_width_fraction*s}px)`:'none';
  core.style.opacity=diffuse?d*setting.density_weight*contract.core_opacity_weight:setting.raw_opacity;
  halo.style.filter=`blur(${width*contract.halo_blur_width_fraction*s}px)`;
  halo.style.transform=`scale(${contract.halo_scale})`;halo.style.opacity=d*setting.density_weight*contract.halo_opacity_weight;
 }
 document.querySelector('#density-value').textContent=Math.round(d*100)+'%';document.querySelector('#softness-value').textContent=Math.round(s*100)+'%';
 for(const id of ['diffuse','original'])document.querySelector('#'+id).setAttribute('aria-pressed',String(id===(diffuse?'diffuse':'original')));
 for(const id of ['veil','banks'])document.querySelector('#'+id).setAttribute('aria-pressed',String(id===moment));
 document.querySelector('#reference-image').src=`../evidence/ship-jet-proposal/reference/frame-${moment==='veil'?238:242}.jpg`;document.querySelector('#reference-title').textContent=moment==='veil'?'First veil · 03:58':'Cloud banks · 04:02';
 stage.dataset.settings=JSON.stringify({treatment,moment,density:d,softness:s,viewport:[width,height]});
}
document.querySelector('#diffuse').onclick=()=>{treatment='diffuse';pose()};document.querySelector('#original').onclick=()=>{treatment='original';pose()};
document.querySelector('#veil').onclick=()=>{moment='veil';restoreMomentPreset();pose()};document.querySelector('#banks').onclick=()=>{moment='banks';restoreMomentPreset();pose()};
document.querySelector('#background').onchange=event=>{stage.dataset.background=event.target.value;};density.oninput=softness.oninput=pose;
document.querySelector('#reset').onclick=()=>{treatment='diffuse';restoreMomentPreset();document.querySelector('#background').value='sea';stage.dataset.background='sea';pose()};
new ResizeObserver(pose).observe(stage);restoreMomentPreset();pose();
