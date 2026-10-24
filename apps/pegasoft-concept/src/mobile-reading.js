import './mobile-reading.css';
import {mobileContentOffset} from './mobile-reference-motion.js';
import {mobileReadingState,mobileReadingOffset} from './mobile-reading-sequence.js';

/** Connected mobile reading layout. Owns DOM only; adds no scroll or frame scheduler. */
export function createMobileReading({root,stage}){
 const document=root.ownerDocument,window=document.defaultView;
 // The original mobile composition remains available for side-by-side review.
 if(new URLSearchParams(window.location.search).get('mobile-reading')==='0')return {update(){},refresh(){},dispose(){}};
 const wrapper=document.createElement('div'),reading=document.createElement('section'),rail=document.createElement('div'),scrollViewport=root.querySelector('#story-scroll-viewport');
 wrapper.id='mobile-reading-frame';wrapper.dataset.mobileReference=String(window.matchMedia('(max-width:760px)').matches);reading.id='mobile-story-reading';reading.setAttribute('aria-label',stage.getAttribute('aria-label'));rail.className='mobile-reading-rail';
 stage.before(wrapper);wrapper.append(stage,reading);reading.append(rail);document.body.classList.add('mobile-reading-review');
 let sections={},active,lastTrace,measureKey,contentHeight=0,readingHeight=0;
 const text=node=>{if(!node)return '';const copy=node.cloneNode(true);copy.querySelectorAll?.('br').forEach(br=>br.replaceWith(document.createTextNode(' ')));return (copy.textContent||'').replace(/\s+/g,' ').trim();};
 const appendText=(parent,tag,value)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 function refresh(){
  const ship=root.querySelector('#ship-copy'),road=root.querySelector('#road-copy'),services=root.querySelector('#services-overlay'),trust=root.querySelector('#trust');
  const next={};
  for(const [name,source] of Object.entries({services,road,ship,trust})){
   const section=document.createElement('div');section.className='mobile-reading-section';section.dataset.section=name;section.hidden=true;
   const heading=source.querySelector('h2');appendText(section,'h2',text(heading));
   if(name==='services')appendText(section,'p',text(source.querySelector('.service-intro')));
   if(name==='trust')appendText(section,'p',text(source.querySelector('.trust-summary p')));
   const list=document.createElement('ol');
   for(const original of source.querySelectorAll(':scope > ol > li, #services-rail > ol > li')){
    const li=document.createElement('li'),title=original.querySelector('.block-title');
    const copy=original.cloneNode(true);copy.querySelectorAll('svg,span,p,small').forEach(node=>node.remove());
    const number=original.querySelector('span');if(number)appendText(li,'span',text(number));
    appendText(li,'h3',title?[...title.children].map(text).join(' '):text(copy));
    appendText(li,'p',text(original.querySelector('p,small')));list.append(li);
   }
   section.append(list);next[name]=section;
  }
  const combined=document.createElement('div');combined.append(...next.services.childNodes,...next.road.childNodes);next.road.replaceChildren(...combined.childNodes);
  sections=next;rail.replaceChildren(...Object.values(sections));active=null;measureKey=null;update(lastTrace);
 }
 function update(trace){
  lastTrace=trace;const reference=stage.clientWidth<=760&&trace?.mobileReference;
  const state=reference?trace.mobileReading:mobileReadingState(trace,scrollViewport?.clientHeight||stage.clientHeight);
  wrapper.dataset.mobileReference=String(reference);
  reading.hidden=reference&&!state.section;
  if(active!==state.section){for(const [name,section]of Object.entries(sections))section.hidden=name!==state.section;active=state.section;wrapper.dataset.readingSection=active;}
  const section=sections[active];if(!section)return;
  reading.setAttribute('aria-label',text(section.querySelector('h2')));
  const key=[active,reading.clientWidth,reading.clientHeight].join(':');
  if(key!==measureKey){const style=window.getComputedStyle(reading);readingHeight=reading.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);contentHeight=section.offsetHeight;measureKey=key;}
  const offset=reference?mobileContentOffset(state.progress,contentHeight,readingHeight):mobileReadingOffset(state.progress,contentHeight,readingHeight);
  rail.style.transform=`translateY(${offset}px)`;reading.dataset.progress=String(state.progress);
 }
 refresh();
 const observer=new ResizeObserver(()=>{measureKey=null;update(lastTrace);});observer.observe(reading);for(const section of Object.values(sections))observer.observe(section);
 return {update,measure(){
  const prior=active,priorHidden=reading.hidden,priorName=wrapper.dataset.readingSection,priorReference=wrapper.dataset.mobileReference,result={};reading.hidden=false;wrapper.dataset.mobileReference='true';
  for(const name of ['road','ship']){wrapper.dataset.readingSection=name;for(const [key,section]of Object.entries(sections))section.hidden=key!==name;result[name]=sections[name].offsetHeight;}
  for(const [key,section]of Object.entries(sections))section.hidden=key!==prior;wrapper.dataset.readingSection=priorName;wrapper.dataset.mobileReference=priorReference;reading.hidden=priorHidden;return result;
 },refresh(){refresh();observer.disconnect();observer.observe(reading);for(const section of Object.values(sections))observer.observe(section);},dispose(){observer.disconnect();wrapper.before(stage);wrapper.remove();document.body.classList.remove('mobile-reading-review');}};
}
