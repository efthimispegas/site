const owners=new WeakMap();
/** One native scroll owner. Mobile keeps the document still, like the reference. */
export function createPageScroll(document){
 const window=document.defaultView,media=window.matchMedia('(max-width:760px)');
 const element=document.createElement('div');element.id='page-scroll-viewport';
 element.append(...document.body.childNodes);document.body.append(element);
 let mobile=media.matches,lastY=window.scrollY;
 const remember=()=>{if(media.matches===mobile)lastY=mobile?element.scrollTop:window.scrollY;};
 window.addEventListener('scroll',remember,{passive:true});element.addEventListener('scroll',remember,{passive:true});
 function sync(){
  const next=media.matches;if(next===mobile)return;
  // The old element becomes display:contents before resize events fire;
  // its scrollTop is already zero then. Retain the last native offset.
  const y=lastY;mobile=next;
  document.documentElement.dataset.mobileScroll=String(mobile);
  window.scrollTo({top:0,behavior:'instant'});if(mobile)element.scrollTop=y;else window.scrollTo({top:y,behavior:'instant'});
 }
 document.documentElement.dataset.mobileScroll=String(mobile);
 window.addEventListener('resize',sync);media.addEventListener('change',sync);
 const owner={get y(){return mobile?element.scrollTop:window.scrollY;},get mobile(){return mobile;},element,
  to(options){(mobile?element:window).scrollTo(options);remember();},
  listen(handler){window.addEventListener('scroll',handler,{passive:true});element.addEventListener('scroll',handler,{passive:true});return()=>{window.removeEventListener('scroll',handler);element.removeEventListener('scroll',handler);};},
  dispose(){window.removeEventListener('resize',sync);media.removeEventListener('change',sync);window.removeEventListener('scroll',remember);element.removeEventListener('scroll',remember);element.before(...element.childNodes);element.remove();delete document.documentElement.dataset.mobileScroll;owners.delete(document);}
 };owners.set(document,owner);return owner;
}
export function pageScroll(document){return owners.get(document)||{get y(){return document.defaultView.scrollY;},get mobile(){return false;},to(options){document.defaultView.scrollTo(options);},listen(handler){document.defaultView.addEventListener('scroll',handler,{passive:true});return()=>document.defaultView.removeEventListener('scroll',handler);}};}
