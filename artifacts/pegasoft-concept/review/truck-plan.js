const preview=document.querySelector('#design-preview');
const toggle=document.querySelector('#load-toggle');
const state=document.querySelector('#design-state');
let view='side',loaded=false;
const captions={side:'Side / reference cab identity and full-length container chassis.',upper:'Upper / coherent roof, chassis rails and four support positions.',front:'Front / the same high-roof cab, grille, lamps and accent returns.'};
function refresh(){const container=preview.contentDocument?.querySelector('#container');if(container)container.setAttribute('visibility',loaded?'visible':'hidden');toggle.disabled=view==='front';toggle.setAttribute('aria-pressed',String(loaded));toggle.textContent=loaded?'Hide C01 fit':'Show C01 fit';state.textContent=captions[view]+(loaded&&view!=='front'?' C01 shown at its fixed proportions.':'');}
preview.addEventListener('load',refresh);
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;if(view==='front')loaded=false;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));preview.data=`truck-family/${view}.svg`;preview.setAttribute('aria-label',`Schematic ${view} design direction`);refresh();}));
toggle.addEventListener('click',()=>{loaded=!loaded;refresh();});
refresh();
