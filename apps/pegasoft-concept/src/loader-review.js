import {createIntroController} from './intro-controller.js';
import {LOADER_DEFAULTS} from './loader-sequence.js';
import {createScope,createFrameLoop} from '../review/runtime-lifecycle.js';

const scope=createScope(),stage=document.querySelector('#opening-stage'),$=s=>document.querySelector(s),intro=createIntroController({stage});
let settings={...LOADER_DEFAULTS},running=true,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
$('#reduced').checked=reduced;intro.setPlayback({reduced});
function values(){
 document.querySelectorAll('[data-setting]').forEach(el=>{el.value=settings[el.dataset.setting];el.nextElementSibling.value=Number(el.value).toFixed(el.dataset.setting==='beatAmount'?3:2);});
 $('#preset').value=JSON.stringify(settings,null,2);
}
function readout(){
 if(!stage.dataset.motion)return;const {openingTime,opening}=JSON.parse(stage.dataset.motion);
 $('#timeline').max=opening.end;$('#timeline').value=openingTime;$('#time-label').value=`${openingTime.toFixed(2)}s / ${opening.end.toFixed(2)}s`;
 $('#readout').textContent=$('#waiting').checked?'Loading beat · compositor preview':opening.phase;
 $('#play').textContent=running?'Pause':'Play';$('#play').setAttribute('aria-pressed',String(running));
}
const loop=createFrameLoop(time=>{intro.tick(time);readout();});
scope.defer(()=>{loop.stop();intro.dispose();});
for(const el of document.querySelectorAll('[data-setting]'))scope.listen(el,'input',()=>{settings[el.dataset.setting]=Number(el.value);intro.configureLoader(settings);values();readout();});
scope.listen($('#play'),'click',()=>{running=!running;intro.setPlayback({running});readout();});
scope.listen($('#restart'),'click',()=>{running=true;intro.restart();readout();});
scope.listen($('#timeline'),'input',()=>{running=false;intro.seek(Number($('#timeline').value));readout();});
for(const [id,delta]of [['frame-back',-1/60],['frame-next',1/60]])scope.listen($('#'+id),'click',()=>{running=false;intro.seek(Number($('#timeline').value)+delta);readout();});
scope.listen($('#speed'),'change',()=>intro.setPlayback({speed:Number($('#speed').value)}));
scope.listen($('#reduced'),'change',()=>{reduced=$('#reduced').checked;running=false;intro.setPlayback({reduced});intro.seek(reduced?Number($('#timeline').max):0);readout();});
scope.listen($('#waiting'),'change',()=>{stage.dataset.waitPreview=String($('#waiting').checked);readout();});
scope.listen($('#reset'),'click',()=>{settings={...LOADER_DEFAULTS};intro.configureLoader(settings);values();intro.restart();running=true;readout();});
scope.listen(document,'visibilitychange',()=>{intro.pause();if(document.hidden)loop.stop();else loop.start();});
const observer=new ResizeObserver(()=>intro.resize());observer.observe(stage);scope.defer(()=>observer.disconnect());
values();intro.mount().then(()=>{if(!scope.disposed){loop.start();readout();}}).catch(error=>{if(scope.disposed)return;$('#render-error').hidden=false;$('#render-error').textContent='The live opening could not load: '+error.message;console.error(error);});
if(import.meta.hot)import.meta.hot.dispose(()=>scope.dispose());
