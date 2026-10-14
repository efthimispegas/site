import {createShipJetInspection} from './ship-jet-inspection.js';

const root=document.querySelector('main');
export const inspection=createShipJetInspection(root);
// Inspection-only lifecycle access for remount checks; production imports the scene controller.
root.querySelector('#stage').inspection=inspection;
const panel=document.createElement('section');panel.className='panel';
panel.innerHTML='<h2>Controller and lifecycle review</h2><p>The accepted scene is preserved. Use playback and scroll controls above, then remount to check that the scene restarts cleanly.</p><button id="controller-remount" type="button">Remount scene</button> <output role="status"></output>';
root.append(panel);
const remount=panel.querySelector('button'),status=panel.querySelector('output');
remount.onclick=async()=>{status.textContent='Remounting…';inspection.dispose();try{await inspection.mount();status.textContent='Scene ready.';}catch(error){status.textContent='Could not remount: '+error.message;}};
inspection.mount().catch(error=>console.error(error));
if(import.meta.hot)import.meta.hot.dispose(()=>{inspection.dispose();remount.onclick=null;panel.remove();});
